-- CareLink demo seed (dev/staging only). DEMO DATA ONLY (RA 10173).
--
-- Run this in the Supabase SQL Editor AFTER 0001_init.sql and 0002_rls.sql.
-- It is idempotent: safe to run more than once.
--
-- Creates:
--   * one facility, one barangay, one purok
--   * one active risk_rules row (placeholder thresholds)
--   * one demo barangay_staff auth user + profile bound to that barangay
--
-- Demo credentials (CHANGE for anything beyond local demo):
--   email:    bhw.demo@carelink.test
--   password: CareLinkDemo123!
--
-- NOTE: creating auth users via SQL writes directly to auth.users. This is a
-- demo convenience. In real environments use the Auth admin API / dashboard.

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
insert into facilities (id, name, kind)
values ('11111111-1111-1111-1111-111111111111', 'Demo District Hospital', 'hospital')
on conflict (id) do nothing;

insert into barangays (id, name, facility_id)
values (
  '22222222-2222-2222-2222-222222222222',
  'Barangay Demo',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into puroks (id, barangay_id, name)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Purok 1'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Active risk rules (version 1). Placeholder thresholds — needs physician
-- approval before real use. Must match src/lib/risk.ts.
-- ---------------------------------------------------------------------------
insert into risk_rules (version, is_active)
values (1, true)
on conflict (version) do update set is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Demo barangay_staff auth user + profile.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id uuid := '44444444-4444-4444-4444-444444444444';
  v_barangay_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  -- Create the auth user if it does not already exist.
  if not exists (select 1 from auth.users where id = v_user_id) then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bhw.demo@carelink.test',
      crypt('CareLinkDemo123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '',
      '',
      '',
      ''
    );

    -- Email identity (required for email/password sign-in).
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      format('{"sub":"%s","email":"%s"}', v_user_id, 'bhw.demo@carelink.test')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  end if;

  -- Profile bound to the demo barangay.
  insert into profiles (id, role, full_name, barangay_id)
  values (v_user_id, 'barangay_staff', 'Demo BHW', v_barangay_id)
  on conflict (id) do update
    set role = excluded.role,
        full_name = excluded.full_name,
        barangay_id = excluded.barangay_id;
end
$$;

-- ---------------------------------------------------------------------------
-- A couple of demo patients in the barangay (so the masterlist/delta pull has
-- something to show). Demo data only.
-- ---------------------------------------------------------------------------
insert into patients (
  id, barangay_id, patient_code, surname, first_name, sex, birthdate, verification_status
)
values
  (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'CL-DEMO-0001',
    'Santos', 'Maria', 'female', '1980-05-12', 'verified'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222222',
    'CL-DEMO-0002',
    'Dela Cruz', 'Juan', 'male', '1975-11-03', 'verified'
  )
on conflict (id) do nothing;
