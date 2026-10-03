-- CareLink: auth sign-up wiring (0007_auth_signup.sql)
--
-- 1. Citizen self-registration creates an `unverified` patient row linked to
--    the new auth user. No profile is created, so the app shows the
--    pending-verification screen until a BHW verifies in person.
-- 2. verify_citizen now also creates the citizen profile, which is what lets a
--    verified citizen into /me.
-- 3. Barangay names are readable by anon so the register form can offer them.
--
-- Metadata never grants a role: only `citizen` is ever acted on here. Doctors
-- wait for approve_doctor; BHWs are created by seed_bhw.

-- ---------------------------------------------------------------------------
-- 1. Sign-up trigger on auth.users
-- ---------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_surname     text  := nullif(btrim(v_meta ->> 'surname'), '');
  v_first_name  text  := nullif(btrim(v_meta ->> 'first_name'), '');
  v_sex         text  := v_meta ->> 'sex';
  v_birthdate   date;
  v_barangay_id uuid;
begin
  if v_meta ->> 'intended_role' is distinct from 'citizen' then
    return new;
  end if;

  if v_surname is null or v_first_name is null
     or v_sex not in ('male', 'female') then
    raise exception 'citizen sign-up requires surname, first_name, and sex';
  end if;

  begin
    -- Stashed by strip_signup_birthdate (BEFORE INSERT) for this transaction.
    v_birthdate   := nullif(current_setting('carelink.signup_birthdate', true), '')::date;
    v_barangay_id := (v_meta ->> 'barangay_id')::uuid;
  exception when others then
    raise exception 'citizen sign-up has an invalid birthdate or barangay';
  end;

  if v_birthdate is null or v_birthdate > today_manila() then
    raise exception 'citizen sign-up has an invalid birthdate';
  end if;
  if not exists (select 1 from barangays where id = v_barangay_id) then
    raise exception 'citizen sign-up has an unknown barangay';
  end if;

  -- If the dedup key already exists (e.g. a BHW-created record), do not
  -- auto-link: claiming an existing record needs in-person verification.
  -- The BHW links the account through verify_citizen instead.
  insert into patients (
    barangay_id, user_id, surname, first_name, sex, birthdate,
    verification_status
  )
  values (
    v_barangay_id, new.id, v_surname, v_first_name, v_sex::sex, v_birthdate,
    'unverified'
  )
  on conflict do nothing;

  perform set_config('carelink.signup_birthdate', '', true);
  return new;
end;
$$;

-- Birthdate must never persist in auth metadata (it would sit in the user
-- object and JWT). BEFORE INSERT stashes it transaction-locally for the
-- trigger above, and both INSERT and UPDATE strip the key, because GoTrue can
-- rewrite metadata after the insert.
create or replace function strip_signup_birthdate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'birthdate' then
    if tg_op = 'INSERT' then
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. verify_citizen: also create the citizen profile for the linked user
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
  if current_role_name() <> 'barangay_staff' then
    raise exception 'only barangay staff may verify citizens';
  end if;
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  if v_patient.barangay_id <> current_barangay_id() then
    raise exception 'patient is outside your barangay';
  end if;

  v_user_id := coalesce(p_user_id, v_patient.user_id);

  -- Never let verification promote a staff/doctor/admin account.
  if v_user_id is not null and exists (
    select 1 from profiles where id = v_user_id and role <> 'citizen'
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
            v_patient.first_name || ' ' || v_patient.surname)
    on conflict (id) do nothing;
  end if;

  perform log_audit('citizen_verified', p_patient_id, v_patient.barangay_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Barangay names for the public register form (non-sensitive reference)
-- ---------------------------------------------------------------------------
create policy barangays_select_anon
  on barangays for select
  to anon
  using (true);
