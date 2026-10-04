-- CareLink full demo seed (dev/staging only). DEMO DATA ONLY (RA 10173).
--
-- Run in the Supabase SQL Editor AFTER 0001..0006 are applied. Idempotent.
--
-- Seeds the four roles and enough data for the demo story:
--   admin, barangay_staff (BHW), physician, citizen
--   + facility, barangay, purok, active risk_rules
--   + households, patients, a checkup, a referral, an id_card,
--     a prescription (+ items), a note, a consent, a reminder.
--
-- Demo credentials (CHANGE outside local demo):
--   admin:    admin.demo@carelink.test   / CareLinkDemo123!
--   bhw:      bhw.demo@carelink.test     / CareLinkDemo123!
--   doctor:   doctor.demo@carelink.test  / CareLinkDemo123!
--   citizen:  citizen.demo@carelink.test / CareLinkDemo123!

-- ---------------------------------------------------------------------------
-- Fixed demo UUIDs
-- ---------------------------------------------------------------------------
--   facility  11111111...  barangay 22222222...  purok 33333333...
--   bhw user  44444444...  patients 55555555.. / 66666666..
--   admin     77777777...  doctor   88888888..  citizen 99999999..
--   citizen patient aaaa...

-- Reference data -------------------------------------------------------------
insert into facilities (id, name, kind) values
  ('11111111-1111-1111-1111-111111111111', 'Demo District Hospital', 'hospital')
on conflict (id) do nothing;

insert into barangays (id, name, facility_id) values
  ('22222222-2222-2222-2222-222222222222', 'Barangay Demo',
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into puroks (id, barangay_id, name) values
  ('33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222222', 'Purok 1')
on conflict (id) do nothing;

insert into risk_rules (version, is_active) values (1, true)
on conflict (version) do update set is_active = excluded.is_active;

-- Auth users + profiles ------------------------------------------------------
-- Helper block creates an email/password auth user if missing.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('77777777-7777-7777-7777-777777777777'::uuid, 'admin.demo@carelink.test'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'bhw.demo@carelink.test'),
      ('88888888-8888-8888-8888-888888888888'::uuid, 'doctor.demo@carelink.test'),
      ('99999999-9999-9999-9999-999999999999'::uuid, 'citizen.demo@carelink.test')
    ) as t(uid, email)
  loop
    if not exists (select 1 from auth.users where id = rec.uid) then
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        rec.uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
        'authenticated', rec.email, crypt('CareLinkDemo123!', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      );
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), rec.uid, rec.uid::text,
        format('{"sub":"%s","email":"%s"}', rec.uid, rec.email)::jsonb,
        'email', now(), now(), now()
      );
    end if;
  end loop;
end $$;

-- Profiles (roles) -----------------------------------------------------------
insert into profiles (id, role, full_name, barangay_id, facility_id) values
  ('77777777-7777-7777-7777-777777777777', 'admin', 'Demo Admin', null, null),
  ('44444444-4444-4444-4444-444444444444', 'barangay_staff', 'Demo BHW',
   '22222222-2222-2222-2222-222222222222', null),
  ('88888888-8888-8888-8888-888888888888', 'physician', 'Dr. Demo', null,
   '11111111-1111-1111-1111-111111111111'),
  ('99999999-9999-9999-9999-999999999999', 'citizen', 'Maria Santos', null, null)
on conflict (id) do update
  set role = excluded.role, full_name = excluded.full_name,
      barangay_id = excluded.barangay_id, facility_id = excluded.facility_id;

-- Household + patients -------------------------------------------------------
insert into households (id, barangay_id, purok_id, name, address) values
  ('12121212-1212-1212-1212-121212121212',
   '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', 'Santos Household', '1 Demo St.')
on conflict (id) do nothing;

-- Clean up the earlier demo seed's patient rows so re-seeding does not collide
-- on the dedup index (barangay + surname + first_name + birthdate + sex).
-- These ids were used by the first draft of this seed. Child rows cascade.
delete from patients
where id = '55555555-5555-5555-5555-555555555555';

-- Patient linked to the citizen auth user.
insert into patients (
  id, household_id, barangay_id, patient_code, user_id,
  surname, first_name, sex, birthdate, verification_status
) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '12121212-1212-1212-1212-121212121212',
   '22222222-2222-2222-2222-222222222222', 'CL-000001',
   '99999999-9999-9999-9999-999999999999',
   'Santos', 'Maria', 'female', '1980-05-12', 'verified'),
  ('66666666-6666-6666-6666-666666666666',
   '12121212-1212-1212-1212-121212121212',
   '22222222-2222-2222-2222-222222222222', 'CL-000002', null,
   'Dela Cruz', 'Juan', 'male', '1975-11-03', 'verified')
on conflict (id) do nothing;

-- A check-up (outcome set by trigger) ---------------------------------------
insert into checkups (
  id, patient_id, barangay_id, recorded_by, checkup_date,
  systolic, diastolic, fasting_glucose, notes
) values
  ('cc000001-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222',
   '44444444-4444-4444-4444-444444444444', today_manila(),
   150, 95, 130.0, 'Demo screening — elevated readings.')
on conflict (id) do nothing;

-- A referral (hospital) ------------------------------------------------------
insert into referrals (
  id, patient_id, barangay_id, facility_id, created_by, status, reason
) values
  ('dd000001-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   '44444444-4444-4444-4444-444444444444', 'sent',
   'Elevated BP and fasting glucose on screening.')
on conflict (id) do nothing;

-- An ID card for the current qr_version -------------------------------------
insert into id_cards (id, patient_id, qr_version, issued_by) values
  ('ee000001-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1,
   '44444444-4444-4444-4444-444444444444')
on conflict (patient_id, qr_version) do nothing;

-- No seeded access grant: every doctor record open needs the pairing key
-- (scan the QR, then enter the patient's surname + birthdate).

-- A prescription + items (demo; immutable after issue) -----------------------
insert into prescriptions (
  id, patient_id, physician_id, physician_license, status, follow_up_date
) values
  ('ab000001-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '88888888-8888-8888-8888-888888888888', 'PRC-DEMO-0001', 'issued',
   (today_manila() + 14))
on conflict (id) do nothing;

insert into prescription_items (
  prescription_id, line_no, drug_name, strength, dosage, frequency, duration, instructions
) values
  ('ab000001-0000-0000-0000-000000000001', 1, 'Amlodipine', '5 mg', '1 tablet',
   'once daily', '30 days', 'Take in the morning.')
on conflict (prescription_id, line_no) do nothing;

-- A per-visit note (split) ---------------------------------------------------
insert into patient_notes (
  id, patient_id, physician_id, patient_instructions, clinical_note,
  has_follow_up, follow_up_date
) values
  ('ac000001-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '88888888-8888-8888-8888-888888888888',
   'Reduce salt intake; return in 2 weeks for a recheck.',
   'Stage 1 hypertension pattern on screening; monitor glucose.',
   true, (today_manila() + 14))
on conflict (id) do nothing;

-- A consent row --------------------------------------------------------------
insert into consents (id, patient_id, grantee_user_id, status) values
  ('ad000001-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '88888888-8888-8888-8888-888888888888', 'granted')
on conflict (id) do nothing;

-- A follow-up reminder -------------------------------------------------------
insert into reminders (id, patient_id, barangay_id, due_date, source) values
  ('ae000001-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222', (today_manila() + 14), 'prescription')
on conflict (id) do nothing;
