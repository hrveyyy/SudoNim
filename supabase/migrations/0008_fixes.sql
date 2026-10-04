-- CareLink fixes, group A (0008_fixes.sql)
--
-- Incremental migration; earlier migrations are not edited.
--
--  1. Doctors can read the record they unlocked (live pairing-key grant), and
--     the referrals sent to their hospital.
--  2. pairing_key_hash can find pgcrypto's digest(). Supabase installs
--     pgcrypto in the `extensions` schema, and the callers pin search_path to
--     public. Adding `extensions` is harmless if pgcrypto lives in public.
--  3. verify_pairing_key returns a status instead of raising, so failed
--     attempts are kept: the 5-try / 15-minute lockout and the audit entries
--     now actually work.
--  4. Every doctor record open needs the pairing key: only live qr_pairing
--     grants count as access.
--  5. reminders.barangay_id is nullable (citizens may have no barangay).
--  6. Admin aggregate counts, without giving admin any table reads.
--  7. Barangays and facilities are readable before sign-in (sign-up forms).
--  8. Citizen self-registration saves the barangay they chose.

-- ---------------------------------------------------------------------------
-- Helper: the caller's facility (set on physician profiles).
-- ---------------------------------------------------------------------------
create or replace function current_facility_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select facility_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 4. Physician access always requires a live pairing-key grant. Other grant
--    sources (referral, consent) are recorded but no longer open a record on
--    their own. Every RPC and policy that calls has_active_grant follows this.
-- ---------------------------------------------------------------------------
create or replace function has_active_grant(p_patient_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from access_grants g
    where g.patient_id = p_patient_id
      and g.grantee_user_id = p_user_id
      and g.source = 'qr_pairing'
      and g.revoked_at is null
      and g.expires_at > now()
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. pgcrypto lookup for the pairing-key hash.
-- ---------------------------------------------------------------------------
create or replace function pairing_key_hash(p_surname text, p_birthdate date)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(
    digest(
      lower(btrim(p_surname)) || ':' || to_char(p_birthdate, 'YYYYMMDD'),
      'sha256'
    ),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. verify_pairing_key returns a status object instead of raising.
--      {"status":"ok","patient_id":"..."} | {"status":"mismatch"} | {"status":"locked"}
--    Raising after the insert used to roll back the failed attempt and its
--    audit entry, so the lockout never triggered. The return type changes, so
--    the old function is dropped first. The attempted birthdate is never logged.
-- ---------------------------------------------------------------------------
drop function if exists verify_pairing_key(text, text, date);

create function verify_pairing_key(
  p_patient_code text,
  p_surname text,
  p_birthdate date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient patients%rowtype;
  v_recent_fails integer;
  v_ok boolean;
begin
  if current_role_name() is distinct from 'physician' then
    raise exception 'only a physician may verify a pairing key';
  end if;

  select * into v_patient from patients where patient_code = p_patient_code;
  if not found then
    -- Same answer as a wrong key, so valid patient codes can't be probed.
    return jsonb_build_object('status', 'mismatch');
  end if;

  -- Lockout: 5+ failures in the last 15 minutes.
  select count(*) into v_recent_fails
  from pairing_attempts
  where patient_id = v_patient.id
    and succeeded = false
    and attempted_at > now() - interval '15 minutes';

  if v_recent_fails >= 5 then
    perform log_audit('pairing_key_failed', v_patient.id, v_patient.barangay_id,
                      jsonb_build_object('reason', 'locked'));
    return jsonb_build_object('status', 'locked');
  end if;

  v_ok := pairing_key_hash(v_patient.surname, v_patient.birthdate)
          = pairing_key_hash(p_surname, p_birthdate);

  insert into pairing_attempts (patient_id, attempted_by, succeeded)
  values (v_patient.id, auth.uid(), v_ok);

  if not v_ok then
    perform log_audit('pairing_key_failed', v_patient.id, v_patient.barangay_id);
    return jsonb_build_object('status', 'mismatch');
  end if;

  -- Mint a 12-hour grant for this physician.
  insert into access_grants (patient_id, grantee_user_id, source, expires_at)
  values (v_patient.id, auth.uid(), 'qr_pairing', now() + interval '12 hours');

  perform log_audit('pairing_key_succeeded', v_patient.id, v_patient.barangay_id);
  return jsonb_build_object('status', 'ok', 'patient_id', v_patient.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Doctor read access. Only with a live pairing-key grant for the patient,
--    so a doctor sees the full combined history only after the key.
-- ---------------------------------------------------------------------------
create policy patients_physician_select
  on patients for select to authenticated
  using (
    current_role_name() = 'physician'
    and has_active_grant(id, auth.uid())
  );

create policy checkups_physician_select
  on checkups for select to authenticated
  using (
    current_role_name() = 'physician'
    and has_active_grant(patient_id, auth.uid())
  );

-- All notes on the unlocked record (not only the ones this doctor wrote).
create policy patient_notes_physician_select
  on patient_notes for select to authenticated
  using (
    current_role_name() = 'physician'
    and has_active_grant(patient_id, auth.uid())
  );

-- All prescriptions on the unlocked record (not only this doctor's).
create policy prescriptions_physician_select
  on prescriptions for select to authenticated
  using (
    current_role_name() = 'physician'
    and has_active_grant(patient_id, auth.uid())
  );

create policy prescription_items_physician_select
  on prescription_items for select to authenticated
  using (
    current_role_name() = 'physician'
    and exists (
      select 1 from prescriptions rx
      where rx.id = prescription_items.prescription_id
        and has_active_grant(rx.patient_id, auth.uid())
    )
  );

-- Referrals sent to the doctor's hospital (the referral inbox). Opening the
-- patient's record still needs the pairing key.
create policy referrals_physician_select
  on referrals for select to authenticated
  using (
    current_role_name() = 'physician'
    and facility_id = current_facility_id()
  );

-- ---------------------------------------------------------------------------
-- 5. Reminders for citizens without a barangay.
-- ---------------------------------------------------------------------------
alter table reminders alter column barangay_id drop not null;

-- ---------------------------------------------------------------------------
-- 6. Admin aggregate counts. Counts only, never names. Admin keeps no table
--    read policies on patient data.
-- ---------------------------------------------------------------------------
create or replace function admin_aggregate_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if current_role_name() is distinct from 'admin' then
    raise exception 'only an admin may view aggregate reports';
  end if;
  return jsonb_build_object(
    'patients', (select count(*) from patients),
    'checkups', (select count(*) from checkups),
    'referrals', (select count(*) from referrals),
    'prescriptions', (select count(*) from prescriptions)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Reference data readable before sign-in. Barangay and hospital names are
--    not personal data; the citizen and doctor sign-up forms list them.
-- ---------------------------------------------------------------------------
create policy barangays_select_anon
  on barangays for select to anon
  using (true);

create policy facilities_select_anon
  on facilities for select to anon
  using (true);

-- ---------------------------------------------------------------------------
-- 8. Self-registration saves the chosen barangay, so the citizen shows up in
--    that barangay's masterlist. Only a real barangay id is accepted; anything
--    else is stored as null rather than failing the sign-up.
-- ---------------------------------------------------------------------------
create or replace function handle_new_citizen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := v_meta->>'intended_role';
  v_surname text := v_meta->>'surname';
  v_first_name text := v_meta->>'first_name';
  v_sex text := v_meta->>'sex';
  v_birthdate text := v_meta->>'birthdate';
  v_barangay_text text := v_meta->>'barangay_id';
  v_barangay_id uuid;
begin
  -- Only self-registering citizens with the required details.
  if v_role is distinct from 'citizen' then
    return new;
  end if;
  if v_surname is null or v_first_name is null or v_sex is null or v_birthdate is null then
    return new;
  end if;

  if v_barangay_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_barangay_id from barangays where id = v_barangay_text::uuid;
  end if;

  -- Profile (role citizen). Idempotent.
  insert into profiles (id, role, full_name)
  values (new.id, 'citizen', btrim(v_surname || ', ' || v_first_name))
  on conflict (id) do nothing;

  -- Verified patient row linked to this user, in the chosen barangay.
  insert into patients (
    user_id, barangay_id, surname, first_name, sex, birthdate, verification_status
  )
  values (
    new.id, v_barangay_id, v_surname, v_first_name, v_sex::sex, v_birthdate::date, 'verified'
  )
  on conflict do nothing;

  return new;
end;
$$;
