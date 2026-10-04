-- CareLink: citizen sign-up hardening (0010_citizen_signup_hardening.sql)
--
-- Incremental migration; earlier migrations are not edited. Ports the
-- sign-up behaviour from feat/patient-services onto main's single
-- handle_new_citizen trigger (0007 / 0008) instead of adding a second one.
--
--  1. Birthdate never persists in auth metadata (it would sit in the user
--     object and the JWT). A BEFORE trigger stashes it transaction-locally
--     for handle_new_citizen and strips the key on insert and update.
--  2. Sign-up writes a `citizen_verified` audit row (source
--     self_registration). No PHI in detail.
--  3. If the dedup key already matches an existing record (e.g. one a BHW
--     created), that record is NOT auto-linked. The account still gets a
--     citizen profile; the record is claimed through a BHW claim code
--     (citizen-claim) or verify_citizen.
--  4. verify_citizen also creates the citizen profile for the linked account
--     and refuses to link a staff / doctor / admin account.
--  5. Cleanup in case feat/patient-services' 0007_auth_signup /
--     0008_citizen_auto_activate were ever applied: their second sign-up
--     trigger is dropped so only handle_new_citizen runs.
--  6. Backfill: strip birthdates already stored in auth metadata.
--
-- Anon read of barangay names is already granted by 0008_fixes
-- (barangays_select_anon), so it is not repeated here.

-- ---------------------------------------------------------------------------
-- 5. Remove the branch's parallel sign-up trigger, if present.
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 1. Strip the birthdate from auth metadata.
-- ---------------------------------------------------------------------------
create or replace function strip_signup_birthdate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'birthdate' then
    if tg_op = 'INSERT'
       and new.raw_user_meta_data ->> 'intended_role' = 'citizen' then
      -- Read by handle_new_citizen (AFTER INSERT, same transaction).
      perform set_config('carelink.signup_birthdate',
                         coalesce(new.raw_user_meta_data ->> 'birthdate', ''), true);
    end if;
    new.raw_user_meta_data := new.raw_user_meta_data - 'birthdate';
  end if;
  return new;
end;
$$;

drop trigger if exists before_auth_user_write on auth.users;
create trigger before_auth_user_write
  before insert or update of raw_user_meta_data on auth.users
  for each row execute function strip_signup_birthdate();

-- ---------------------------------------------------------------------------
-- 1-3. handle_new_citizen (replaces the 0008_fixes version; same trigger).
--      Barangay handling is unchanged: a real barangay id is stored, anything
--      else becomes null rather than failing the sign-up.
-- ---------------------------------------------------------------------------
create or replace function handle_new_citizen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_surname       text  := nullif(btrim(v_meta ->> 'surname'), '');
  v_first_name    text  := nullif(btrim(v_meta ->> 'first_name'), '');
  v_sex           text  := v_meta ->> 'sex';
  v_birthdate_txt text  := nullif(current_setting('carelink.signup_birthdate', true), '');
  v_barangay_text text  := v_meta ->> 'barangay_id';
  v_birthdate     date;
  v_barangay_id   uuid;
  v_patient_id    uuid;
begin
  -- Clear the stash right away (for every sign-up, citizen or not) so nothing
  -- later in the transaction sees it.
  perform set_config('carelink.signup_birthdate', '', true);

  -- Metadata never grants any role other than citizen.
  if v_meta ->> 'intended_role' is distinct from 'citizen' then
    return new;
  end if;

  if v_surname is null or v_first_name is null
     or v_sex is null or v_sex not in ('male', 'female')
     or v_birthdate_txt is null then
    return new;
  end if;

  begin
    v_birthdate := v_birthdate_txt::date;
  exception when others then
    return new;
  end;
  if v_birthdate > today_manila() then
    return new;
  end if;

  if v_barangay_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_barangay_id from barangays where id = v_barangay_text::uuid;
  end if;

  -- Profile (role citizen). Idempotent.
  insert into profiles (id, role, full_name)
  values (new.id, 'citizen', btrim(v_surname || ', ' || v_first_name))
  on conflict (id) do nothing;

  -- Verified patient row linked to this user. If the dedup key matches an
  -- existing record, nothing is inserted and nothing is linked (3).
  insert into patients (
    user_id, barangay_id, surname, first_name, sex, birthdate, verification_status
  )
  values (
    new.id, v_barangay_id, v_surname, v_first_name, v_sex::sex, v_birthdate, 'verified'
  )
  on conflict do nothing
  returning id into v_patient_id;

  -- auth.uid() is null inside the sign-up trigger, so write the audit row
  -- directly with the new user as actor. No PHI in detail.
  insert into audit_logs (action, actor_user_id, patient_id, barangay_id, detail)
  values ('citizen_verified', new.id, v_patient_id, v_barangay_id,
          jsonb_build_object('source', 'self_registration',
                             'linked', v_patient_id is not null));

  return new;
end;
$$;

-- Same trigger as 0007; re-created so ordering is explicit after the cleanup.
drop trigger if exists on_auth_user_created_citizen on auth.users;
create trigger on_auth_user_created_citizen
  after insert on auth.users
  for each row execute function handle_new_citizen();

-- ---------------------------------------------------------------------------
-- 4. verify_citizen: main's null-safe checks (0009) + profile creation and a
--    guard against linking a non-citizen account.
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
  v_user_id uuid;
begin
  if current_role_name() is distinct from 'barangay_staff' then
    raise exception 'only barangay staff may verify citizens';
  end if;
  if current_barangay_id() is null then
    raise exception 'your account is not assigned to a barangay';
  end if;
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  if v_patient.barangay_id is distinct from current_barangay_id() then
    raise exception 'patient is outside your barangay';
  end if;

  v_user_id := coalesce(p_user_id, v_patient.user_id);

  -- Never let verification attach a record to a staff/doctor/admin account.
  if v_user_id is not null and exists (
    select 1 from profiles where id = v_user_id and role is distinct from 'citizen'
  ) then
    raise exception 'account already has a non-citizen role';
  end if;

  update patients
    set verification_status = 'verified',
        user_id = v_user_id
    where id = p_patient_id;

  if v_user_id is not null then
    insert into profiles (id, role, full_name)
    values (v_user_id, 'citizen',
            btrim(v_patient.surname || ', ' || v_patient.first_name))
    on conflict (id) do nothing;
  end if;

  perform log_audit('citizen_verified', p_patient_id, v_patient.barangay_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Backfill: remove birthdates stored in metadata by earlier sign-ups.
--    (before_auth_user_write would strip them on any update anyway.)
-- ---------------------------------------------------------------------------
update auth.users
  set raw_user_meta_data = raw_user_meta_data - 'birthdate'
  where raw_user_meta_data ? 'birthdate';
