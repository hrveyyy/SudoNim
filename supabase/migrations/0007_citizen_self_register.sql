-- CareLink: citizen self-registration without BHW verification (0007)
--
-- Product decision: self-registered citizens are usable immediately — no
-- in-person BHW verification step. On signup we auto-create:
--   * a profiles row (role = 'citizen')
--   * a verified patients row from the signup metadata
--     (surname, first_name, sex, birthdate), linked to the auth user.
--
-- Only applies to users whose signup metadata sets intended_role = 'citizen'
-- (set by the client in signUpCitizen). Other users (doctors, seeded BHWs,
-- admins) are unaffected: doctors have intended_role = 'physician' and get no
-- profile here (they wait for admin approval); BHW/admin are seeded by RPC.
--
-- Note: the citizen still needs a barangay for RLS-scoped barangay features,
-- but their OWN-record reads work via patients.user_id = auth.uid(), which does
-- not depend on a barangay. We leave barangay_id null for self-registered
-- patients until a BHW assigns one (self-registration has no barangay context).

-- Self-registered citizens have no barangay context at signup, so barangay_id
-- must be nullable. A BHW can assign a barangay later (verify/assign flow).
alter table patients alter column barangay_id drop not null;

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
begin
  -- Only self-registering citizens with the required details.
  if v_role is distinct from 'citizen' then
    return new;
  end if;
  if v_surname is null or v_first_name is null or v_sex is null or v_birthdate is null then
    return new;
  end if;

  -- Profile (role citizen). Idempotent.
  insert into profiles (id, role, full_name)
  values (new.id, 'citizen', btrim(v_surname || ', ' || v_first_name))
  on conflict (id) do nothing;

  -- Verified patient row linked to this user. barangay_id is nullable for
  -- self-registered citizens (no barangay context at signup).
  insert into patients (
    user_id, surname, first_name, sex, birthdate, verification_status
  )
  values (
    new.id, v_surname, v_first_name, v_sex::sex, v_birthdate::date, 'verified'
  )
  on conflict do nothing;

  return new;
end;
$$;

-- Fire after a new auth user is created.
drop trigger if exists on_auth_user_created_citizen on auth.users;
create trigger on_auth_user_created_citizen
  after insert on auth.users
  for each row execute function handle_new_citizen();
