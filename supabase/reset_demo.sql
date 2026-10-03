-- CareLink demo data reset (dev/staging only). DESTRUCTIVE.
--
-- Wipes all demo/domain data but KEEPS the schema (tables, RPCs, RLS) and the
-- risk_rules. Run this, then run seed.sql for a clean demo dataset.
--
-- Safe to run repeatedly. Does NOT drop tables or migrations.

-- Domain data. TRUNCATE ... CASCADE clears dependent rows (checkups,
-- referrals, prescriptions, grants, notes, etc.) in one shot.
truncate table
  audit_logs,
  reminders,
  consents,
  access_grants,
  pairing_attempts,
  patient_notes,
  prescription_items,
  prescriptions,
  id_card_prints,
  id_cards,
  claim_codes,
  checkups,
  referrals,
  patients,
  households,
  doctor_applications
restart identity cascade;

-- Reset the patient_code sequence so codes start fresh.
alter sequence if exists patient_code_seq restart with 1000;

-- Remove the demo auth users (and their profiles cascade via FK).
-- Only the four fixed demo UUIDs are touched; real users are untouched.
delete from auth.users
where id in (
  '77777777-7777-7777-7777-777777777777', -- admin
  '44444444-4444-4444-4444-444444444444', -- bhw
  '88888888-8888-8888-8888-888888888888', -- doctor
  '99999999-9999-9999-9999-999999999999'  -- citizen
);

-- Note: reference data (facilities, barangays, puroks) and risk_rules are left
-- in place. If you want those gone too, uncomment:
-- truncate table puroks, barangays, facilities restart identity cascade;
-- delete from risk_rules;
