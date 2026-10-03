-- CareLink feature tables (0003_feature_tables.sql)
--
-- Adds the remaining domain tables: doctor applications, claim codes, access
-- grants, consents, pairing-key attempts, ID cards + print log, prescriptions
-- + items, per-visit notes, audit logs, and reminders.
--
-- snake_case end to end. RLS for these tables is in 0006_rls.sql. Privileged
-- writes go through RPCs (0005), never direct client writes.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type grant_source as enum ('referral', 'qr_pairing', 'consent');

create type prescription_status as enum ('issued', 'cancelled');

create type reminder_status as enum ('scheduled', 'sent', 'failed', 'cancelled');

create type consent_status as enum ('granted', 'revoked');

-- Audit action vocabulary (security rule 5). Append-only.
create type audit_action as enum (
  'record_view', 'qr_scan', 'pairing_key_succeeded', 'pairing_key_failed',
  'consent_granted', 'consent_revoked', 'record_export', 'card_print',
  'rx_print', 'rx_view', 'qr_reset', 'rx_issue', 'rx_cancel',
  'citizen_verified', 'doctor_approved', 'doctor_rejected', 'bhw_seeded',
  'sign_in', 'sign_out', 'role_change'
);

-- ---------------------------------------------------------------------------
-- doctor_applications
--  - Self-registered physicians land here as `pending`. PRC ID + document
--    paths (private Storage bucket). Admin approves/rejects via approve_doctor.
-- ---------------------------------------------------------------------------
create table doctor_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  prc_id        text not null,
  full_name     text,
  facility_id   uuid references facilities (id) on delete set null,
  -- Paths into the private doctor-docs Storage bucket (no public URLs).
  document_paths text[] not null default '{}',
  status        doctor_application_status not null default 'pending',
  reviewed_by   uuid references auth.users (id) on delete set null,
  reviewed_at   timestamptz,
  review_notes  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id)
);

create index doctor_applications_status_idx on doctor_applications (status);

create trigger doctor_applications_set_updated_at
  before update on doctor_applications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- claim_codes
--  - One-time codes for BHW-created citizen accounts. Valid 7 days, stored
--    HASHED (plain code returned once by the issuing RPC). Lock after 5 fails.
-- ---------------------------------------------------------------------------
create table claim_codes (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients (id) on delete cascade,
  code_hash     text not null,
  expires_at    timestamptz not null,
  consumed_at   timestamptz,
  failed_attempts integer not null default 0,
  locked        boolean not null default false,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index claim_codes_patient_id_idx on claim_codes (patient_id);

-- ---------------------------------------------------------------------------
-- access_grants
--  - A physician's time-boxed access to a patient record. Minted by
--    verify_pairing_key (12h, QR), advance_referral (180d), or consent.
--  - NO direct client writes (RPC/Edge Function only).
-- ---------------------------------------------------------------------------
create table access_grants (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients (id) on delete cascade,
  grantee_user_id uuid not null references auth.users (id) on delete cascade,
  source        grant_source not null,
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz
);

create index access_grants_patient_idx on access_grants (patient_id);
create index access_grants_grantee_idx on access_grants (grantee_user_id);
create index access_grants_expiry_idx on access_grants (expires_at);

-- Is there a live (unexpired, unrevoked) grant for this user+patient?
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
      and g.revoked_at is null
      and g.expires_at > now()
  );
$$;

-- ---------------------------------------------------------------------------
-- consents
--  - Patient-granted access, and the "who looked at my record" trail is in
--    audit_logs. A consent can grant a specific physician access.
-- ---------------------------------------------------------------------------
create table consents (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients (id) on delete cascade,
  grantee_user_id uuid references auth.users (id) on delete set null,
  status        consent_status not null default 'granted',
  granted_at    timestamptz not null default now(),
  revoked_at    timestamptz
);

create index consents_patient_idx on consents (patient_id);

-- ---------------------------------------------------------------------------
-- pairing_attempts
--  - Rate limiting for the pairing-key challenge. NEVER stores the attempted
--    birthdate (security rule 5). Lock 15 min after 5 failures.
-- ---------------------------------------------------------------------------
create table pairing_attempts (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients (id) on delete cascade,
  attempted_by  uuid references auth.users (id) on delete set null,
  succeeded     boolean not null,
  attempted_at  timestamptz not null default now()
);

create index pairing_attempts_patient_time_idx
  on pairing_attempts (patient_id, attempted_at);

-- ---------------------------------------------------------------------------
-- id_cards + id_card_prints
--  - A patient's issued QR ID card and its print log. NO direct client writes.
-- ---------------------------------------------------------------------------
create table id_cards (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients (id) on delete cascade,
  qr_version    integer not null,
  issued_by     uuid references auth.users (id) on delete set null,
  issued_at     timestamptz not null default now(),
  unique (patient_id, qr_version)
);

create index id_cards_patient_idx on id_cards (patient_id);

create table id_card_prints (
  id            uuid primary key default gen_random_uuid(),
  id_card_id    uuid not null references id_cards (id) on delete cascade,
  printed_by    uuid references auth.users (id) on delete set null,
  printed_at    timestamptz not null default now(),
  batch_size    integer not null default 1
);

create index id_card_prints_card_idx on id_card_prints (id_card_id);

-- ---------------------------------------------------------------------------
-- prescriptions + prescription_items
--  - Immutable after issue (no updates). To change: cancel + issue new.
--  - No diagnosis field. Up to 20 item lines. NO direct client writes.
-- ---------------------------------------------------------------------------
create table prescriptions (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients (id) on delete cascade,
  physician_id   uuid not null references auth.users (id) on delete restrict,
  -- Required license number captured at issue time.
  physician_license text not null,
  status         prescription_status not null default 'issued',
  issued_at      timestamptz not null default now(),
  cancelled_at   timestamptz,
  cancelled_by   uuid references auth.users (id) on delete set null,
  cancel_reason  text,
  -- Follow-up date set at issue (drives reminders).
  follow_up_date date
);

create index prescriptions_patient_idx on prescriptions (patient_id);
create index prescriptions_physician_idx on prescriptions (physician_id);
create index prescriptions_status_idx on prescriptions (status);

create table prescription_items (
  id             uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions (id) on delete cascade,
  line_no        integer not null,
  drug_name      text not null,
  strength       text,
  dosage         text,
  frequency      text,
  duration       text,
  quantity       text,
  instructions   text,
  unique (prescription_id, line_no),
  -- Up to 20 lines per prescription.
  check (line_no between 1 and 20)
);

create index prescription_items_rx_idx on prescription_items (prescription_id);

-- ---------------------------------------------------------------------------
-- patient_notes
--  - Per-visit doctor's note, split: patient_instructions (patient/BHW/doctor)
--    and clinical_note (doctor + patient only; BHW sees only follow_up flag).
-- ---------------------------------------------------------------------------
create table patient_notes (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients (id) on delete cascade,
  physician_id   uuid references auth.users (id) on delete set null,
  patient_instructions text,
  clinical_note  text,
  has_follow_up  boolean not null default false,
  follow_up_date date,
  created_at     timestamptz not null default now()
);

create index patient_notes_patient_idx on patient_notes (patient_id);

-- ---------------------------------------------------------------------------
-- audit_logs (APPEND-ONLY)
--  - No client insert right; writes via log_audit (server-side). Trigger
--    blocks update/delete. Admin reads pseudonymized (user_id only, no names).
-- ---------------------------------------------------------------------------
create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  action        audit_action not null,
  actor_user_id uuid,                       -- who did it (pseudonymous to admin)
  patient_id    uuid,                        -- subject record, if any
  barangay_id   uuid,
  -- Small non-PHI detail bag (never names, never birthdates).
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index audit_logs_action_idx on audit_logs (action);
create index audit_logs_actor_idx on audit_logs (actor_user_id);
create index audit_logs_patient_idx on audit_logs (patient_id);
create index audit_logs_created_idx on audit_logs (created_at);

-- Block any update or delete: audit_logs are append-only.
create or replace function audit_logs_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

create trigger audit_logs_no_update
  before update on audit_logs
  for each row execute function audit_logs_block_mutation();

create trigger audit_logs_no_delete
  before delete on audit_logs
  for each row execute function audit_logs_block_mutation();

-- ---------------------------------------------------------------------------
-- reminders
--  - SMS follow-up reminders. Text is short, no diagnosis (enforced by the
--    send-reminders Edge Function). Missed follow-ups surface in a home-visit
--    list computed from these + referrals.
-- ---------------------------------------------------------------------------
create table reminders (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients (id) on delete cascade,
  barangay_id   uuid not null references barangays (id) on delete restrict,
  due_date      date not null,
  status        reminder_status not null default 'scheduled',
  sent_at       timestamptz,
  -- Reference to the source (prescription follow-up, referral, etc.).
  source        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index reminders_patient_idx on reminders (patient_id);
create index reminders_barangay_due_idx on reminders (barangay_id, due_date);
create index reminders_status_idx on reminders (status);

create trigger reminders_set_updated_at
  before update on reminders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- patient_code sequence (server-assigned codes). Format: CL-<zero-padded>.
-- ---------------------------------------------------------------------------
create sequence if not exists patient_code_seq start 1000;
