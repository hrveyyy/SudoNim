-- CareLink: citizen self-registration activates immediately (0008_citizen_auto_activate.sql)
--
-- Supersedes the 0007 behaviour where a self-registered citizen stayed
-- `unverified` with no profile until a BHW ran verify_citizen in person.
-- Now sign-up, in one transaction:
--   1. creates the patient row as `verified`, linked to the new auth user;
--   2. creates the `citizen` profile, so the user can enter /me right away;
--   3. appends a `citizen_verified` audit row (source: self_registration).
--
-- Unchanged safeguards:
--   - Metadata never grants any role other than `citizen`.
--   - Birthdate is still stripped from auth metadata (strip_signup_birthdate).
--   - If the dedup key already matches an existing record (e.g. BHW-created),
--     that record is NOT auto-linked. The account still gets a citizen profile;
--     the existing record is claimed via a BHW claim code (citizen-claim) or
--     verify_citizen.
--   - verify_citizen / register_citizen stay for BHW-created residents.

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
  v_patient_id  uuid;
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

  insert into patients (
    barangay_id, user_id, surname, first_name, sex, birthdate,
    verification_status
  )
  values (
    v_barangay_id, new.id, v_surname, v_first_name, v_sex::sex, v_birthdate,
    'verified'
  )
  on conflict do nothing
  returning id into v_patient_id;

  -- Active citizen from the start: no BHW confirmation step.
  insert into profiles (id, role, full_name)
  values (new.id, 'citizen', v_first_name || ' ' || v_surname)
  on conflict (id) do nothing;

  -- auth.uid() is null inside the sign-up trigger, so write the audit row
  -- directly with the new user as actor. No PHI in detail.
  insert into audit_logs (action, actor_user_id, patient_id, barangay_id, detail)
  values ('citizen_verified', new.id, v_patient_id, v_barangay_id,
          jsonb_build_object('source', 'self_registration',
                             'linked', v_patient_id is not null));

  perform set_config('carelink.signup_birthdate', '', true);
  return new;
end;
$$;

-- Backfill: activate citizens who self-registered under 0007 and are still
-- waiting (linked, unverified, no profile yet).
insert into profiles (id, role, full_name)
select p.user_id, 'citizen', p.first_name || ' ' || p.surname
from patients p
where p.user_id is not null
  and p.verification_status = 'unverified'
  and not exists (select 1 from profiles pr where pr.id = p.user_id)
on conflict (id) do nothing;

update patients p
  set verification_status = 'verified'
  where p.user_id is not null
    and p.verification_status = 'unverified'
    and exists (select 1 from profiles pr where pr.id = p.user_id and pr.role = 'citizen');
