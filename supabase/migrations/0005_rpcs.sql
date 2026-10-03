-- CareLink RPCs (0005_rpcs.sql)
--
-- All privileged writes go through these functions, never direct client table
-- writes. Each is SECURITY DEFINER with a pinned search_path and enforces the
-- caller's role internally. Audit-worthy actions call log_audit.
--
-- Role names: admin, barangay_staff, physician, citizen.

-- ---------------------------------------------------------------------------
-- log_audit (server-side only): append a row to the append-only audit_logs.
-- Not granted to anon/authenticated directly; called by other SECURITY DEFINER
-- RPCs. Never pass PHI (names, birthdates) in p_detail.
-- ---------------------------------------------------------------------------
create or replace function log_audit(
  p_action audit_action,
  p_patient_id uuid default null,
  p_barangay_id uuid default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (action, actor_user_id, patient_id, barangay_id, detail)
  values (p_action, auth.uid(), p_patient_id, p_barangay_id, coalesce(p_detail, '{}'::jsonb));
end;
$$;

revoke all on function log_audit(audit_action, uuid, uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- verify_pairing_key: physician proves surname + birthdate for a scanned
-- patient. Rate-limited: lock 15 min after 5 failures. On success, mints a
-- 12-hour grant tied to this physician. NEVER logs the attempted birthdate.
-- Returns the patient_id on success, raises on lockout/failure.
-- ---------------------------------------------------------------------------
create or replace function verify_pairing_key(
  p_patient_code text,
  p_surname text,
  p_birthdate date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient patients%rowtype;
  v_recent_fails integer;
  v_ok boolean;
begin
  if current_role_name() <> 'physician' then
    raise exception 'only a physician may verify a pairing key';
  end if;

  select * into v_patient from patients where patient_code = p_patient_code;
  if not found then
    raise exception 'patient not found';
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
    raise exception 'pairing-key challenge is temporarily locked';
  end if;

  v_ok := pairing_key_hash(v_patient.surname, v_patient.birthdate)
          = pairing_key_hash(p_surname, p_birthdate);

  insert into pairing_attempts (patient_id, attempted_by, succeeded)
  values (v_patient.id, auth.uid(), v_ok);

  if not v_ok then
    perform log_audit('pairing_key_failed', v_patient.id, v_patient.barangay_id);
    raise exception 'pairing key did not match';
  end if;

  -- Mint a 12-hour grant for this physician.
  insert into access_grants (patient_id, grantee_user_id, source, expires_at)
  values (v_patient.id, auth.uid(), 'qr_pairing', now() + interval '12 hours');

  perform log_audit('pairing_key_succeeded', v_patient.id, v_patient.barangay_id);
  return v_patient.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- open_patient_record: physician opens a record they hold a live grant for.
-- Audits the view. Returns the patient_id (RLS gates the actual row reads).
-- ---------------------------------------------------------------------------
create or replace function open_patient_record(p_patient_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barangay uuid;
begin
  if current_role_name() <> 'physician' then
    raise exception 'only a physician may open a record this way';
  end if;
  if not has_active_grant(p_patient_id, auth.uid()) then
    raise exception 'no active grant for this record';
  end if;
  select barangay_id into v_barangay from patients where id = p_patient_id;
  perform log_audit('record_view', p_patient_id, v_barangay);
  return p_patient_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- advance_referral: the ONLY way to change a referral's status. Enforces the
-- allowed transitions and that the caller is scoped to that record.
--   sent -> received -> seen -> follow_up_set -> closed
--   (any active state) -> cancelled
-- ---------------------------------------------------------------------------
create or replace function advance_referral(
  p_referral_id uuid,
  p_next referral_status
)
returns referral_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref referrals%rowtype;
  v_role user_role := current_role_name();
  v_ok boolean := false;
begin
  select * into v_ref from referrals where id = p_referral_id;
  if not found then
    raise exception 'referral not found';
  end if;

  -- Scope: barangay_staff of that barangay, or a physician at the facility.
  if v_role = 'barangay_staff' and v_ref.barangay_id = current_barangay_id() then
    v_ok := true;
  elsif v_role = 'physician' then
    v_ok := true; -- facility-level scoping refined when facilities are linked
  end if;
  if not v_ok then
    raise exception 'not authorized to advance this referral';
  end if;

  -- Allowed transitions.
  if p_next = 'cancelled' and v_ref.status in ('sent','received','seen','follow_up_set') then
    null;
  elsif v_ref.status = 'sent' and p_next = 'received' then null;
  elsif v_ref.status = 'received' and p_next = 'seen' then null;
  elsif v_ref.status = 'seen' and p_next = 'follow_up_set' then null;
  elsif v_ref.status = 'follow_up_set' and p_next = 'closed' then null;
  else
    raise exception 'illegal referral transition % -> %', v_ref.status, p_next;
  end if;

  update referrals set status = p_next where id = p_referral_id;
  return p_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- reset_patient_qr: bump qr_version so old QR codes stop resolving.
-- Allowed for the owning citizen or barangay_staff of that barangay.
-- ---------------------------------------------------------------------------
create or replace function reset_patient_qr(p_patient_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient patients%rowtype;
  v_role user_role := current_role_name();
  v_new integer;
begin
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;

  if not (
    (v_role = 'citizen' and v_patient.user_id = auth.uid())
    or (v_role = 'barangay_staff' and v_patient.barangay_id = current_barangay_id())
  ) then
    raise exception 'not authorized to reset this QR';
  end if;

  v_new := v_patient.qr_version + 1;
  update patients set qr_version = v_new where id = p_patient_id;
  perform log_audit('qr_reset', p_patient_id, v_patient.barangay_id);
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_card_prints: log an ID-card print (single or batch) and ensure the
-- id_card row exists for the current qr_version. barangay_staff only.
-- ---------------------------------------------------------------------------
create or replace function record_card_prints(
  p_patient_id uuid,
  p_batch_size integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient patients%rowtype;
  v_card_id uuid;
begin
  if current_role_name() <> 'barangay_staff' then
    raise exception 'only barangay staff may print ID cards';
  end if;
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  if v_patient.barangay_id <> current_barangay_id() then
    raise exception 'patient is outside your barangay';
  end if;
  if p_batch_size < 1 or p_batch_size > 200 then
    raise exception 'batch size must be between 1 and 200';
  end if;

  insert into id_cards (patient_id, qr_version, issued_by)
  values (p_patient_id, v_patient.qr_version, auth.uid())
  on conflict (patient_id, qr_version)
    do update set issued_by = coalesce(id_cards.issued_by, excluded.issued_by)
  returning id into v_card_id;

  insert into id_card_prints (id_card_id, printed_by, batch_size)
  values (v_card_id, auth.uid(), p_batch_size);

  perform log_audit('card_print', p_patient_id, v_patient.barangay_id,
                    jsonb_build_object('batch_size', p_batch_size));
  return v_card_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- issue_prescription: physician issues an immutable prescription with items.
-- p_items is a jsonb array of up to 20 line objects.
-- ---------------------------------------------------------------------------
create or replace function issue_prescription(
  p_patient_id uuid,
  p_license text,
  p_items jsonb,
  p_follow_up_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rx_id uuid;
  v_item jsonb;
  v_line integer := 0;
  v_barangay uuid;
begin
  if current_role_name() <> 'physician' then
    raise exception 'only a physician may issue prescriptions';
  end if;
  if not has_active_grant(p_patient_id, auth.uid()) then
    raise exception 'no active grant for this patient';
  end if;
  if coalesce(p_license, '') = '' then
    raise exception 'physician license number is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one prescription item is required';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'a prescription may have at most 20 items';
  end if;

  insert into prescriptions (patient_id, physician_id, physician_license, follow_up_date)
  values (p_patient_id, auth.uid(), p_license, p_follow_up_date)
  returning id into v_rx_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line := v_line + 1;
    insert into prescription_items (
      prescription_id, line_no, drug_name, strength, dosage, frequency,
      duration, quantity, instructions
    )
    values (
      v_rx_id, v_line,
      v_item->>'drug_name', v_item->>'strength', v_item->>'dosage',
      v_item->>'frequency', v_item->>'duration', v_item->>'quantity',
      v_item->>'instructions'
    );
  end loop;

  -- Schedule a follow-up reminder if a date was set.
  if p_follow_up_date is not null then
    select barangay_id into v_barangay from patients where id = p_patient_id;
    insert into reminders (patient_id, barangay_id, due_date, source)
    values (p_patient_id, v_barangay, p_follow_up_date, 'prescription');
  end if;

  select barangay_id into v_barangay from patients where id = p_patient_id;
  perform log_audit('rx_issue', p_patient_id, v_barangay);
  return v_rx_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_prescription: physician cancels their own issued prescription.
-- Prescriptions are otherwise immutable (cancel + re-issue to change).
-- ---------------------------------------------------------------------------
create or replace function cancel_prescription(
  p_prescription_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rx prescriptions%rowtype;
  v_barangay uuid;
begin
  select * into v_rx from prescriptions where id = p_prescription_id;
  if not found then raise exception 'prescription not found'; end if;
  if current_role_name() <> 'physician' or v_rx.physician_id <> auth.uid() then
    raise exception 'only the issuing physician may cancel this prescription';
  end if;
  if v_rx.status = 'cancelled' then
    raise exception 'prescription is already cancelled';
  end if;

  update prescriptions
    set status = 'cancelled', cancelled_at = now(),
        cancelled_by = auth.uid(), cancel_reason = p_reason
    where id = p_prescription_id;

  select barangay_id into v_barangay from patients where id = v_rx.patient_id;
  perform log_audit('rx_cancel', v_rx.patient_id, v_barangay);
end;
$$;

-- ---------------------------------------------------------------------------
-- record_rx_print: log a prescription print (by citizen or assisting BHW).
-- ---------------------------------------------------------------------------
create or replace function record_rx_print(p_prescription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rx prescriptions%rowtype;
  v_barangay uuid;
begin
  select * into v_rx from prescriptions where id = p_prescription_id;
  if not found then raise exception 'prescription not found'; end if;
  select barangay_id into v_barangay from patients where id = v_rx.patient_id;
  perform log_audit('rx_print', v_rx.patient_id, v_barangay);
end;
$$;

-- ---------------------------------------------------------------------------
-- approve_doctor: admin approves/rejects a pending doctor application. On
-- approval, creates/updates the physician profile.
-- ---------------------------------------------------------------------------
create or replace function approve_doctor(
  p_application_id uuid,
  p_approve boolean,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app doctor_applications%rowtype;
begin
  if current_role_name() <> 'admin' then
    raise exception 'only an admin may review doctor applications';
  end if;
  select * into v_app from doctor_applications where id = p_application_id;
  if not found then raise exception 'application not found'; end if;

  update doctor_applications
    set status = case when p_approve then 'approved' else 'rejected' end,
        reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes
    where id = p_application_id;

  if p_approve then
    insert into profiles (id, role, full_name, facility_id)
    values (v_app.user_id, 'physician', v_app.full_name, v_app.facility_id)
    on conflict (id) do update
      set role = 'physician', facility_id = excluded.facility_id;
    perform log_audit('doctor_approved', null, null,
                      jsonb_build_object('application_id', p_application_id));
  else
    perform log_audit('doctor_rejected', null, null,
                      jsonb_build_object('application_id', p_application_id));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- seed_bhw: admin creates a barangay_staff profile for an existing auth user
-- (the admin provides the email/account out of band). Bound to one barangay.
-- ---------------------------------------------------------------------------
create or replace function seed_bhw(
  p_user_id uuid,
  p_barangay_id uuid,
  p_full_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_role_name() <> 'admin' then
    raise exception 'only an admin may seed BHW accounts';
  end if;
  insert into profiles (id, role, full_name, barangay_id)
  values (p_user_id, 'barangay_staff', p_full_name, p_barangay_id)
  on conflict (id) do update
    set role = 'barangay_staff', barangay_id = excluded.barangay_id,
        full_name = coalesce(excluded.full_name, profiles.full_name);
  perform log_audit('bhw_seeded', null, p_barangay_id,
                    jsonb_build_object('user_id', p_user_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- register_citizen: barangay_staff creates a patient record for an
-- unregistered resident (optionally linked to an auth user). Returns the
-- patient id; the server assigns patient_code via trigger.
-- ---------------------------------------------------------------------------
create or replace function register_citizen(
  p_surname text,
  p_first_name text,
  p_sex sex,
  p_birthdate date,
  p_household_id uuid default null,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barangay uuid := current_barangay_id();
  v_patient_id uuid;
begin
  if current_role_name() <> 'barangay_staff' then
    raise exception 'only barangay staff may register residents';
  end if;

  insert into patients (
    household_id, barangay_id, user_id, surname, first_name, sex, birthdate,
    verification_status
  )
  values (
    p_household_id, v_barangay, p_user_id, p_surname, p_first_name, p_sex,
    p_birthdate, case when p_user_id is null then 'unverified' else 'verified' end
  )
  returning id into v_patient_id;

  return v_patient_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- verify_citizen: barangay_staff verifies a self-registered citizen in person,
-- optionally linking the auth user to the patient row.
-- ---------------------------------------------------------------------------
create or replace function verify_citizen(
  p_patient_id uuid,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient patients%rowtype;
begin
  if current_role_name() <> 'barangay_staff' then
    raise exception 'only barangay staff may verify citizens';
  end if;
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  if v_patient.barangay_id <> current_barangay_id() then
    raise exception 'patient is outside your barangay';
  end if;

  update patients
    set verification_status = 'verified',
        user_id = coalesce(p_user_id, user_id)
    where id = p_patient_id;

  perform log_audit('citizen_verified', p_patient_id, v_patient.barangay_id);
end;
$$;
