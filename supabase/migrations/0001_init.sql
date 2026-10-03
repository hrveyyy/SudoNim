-- CareLink baseline schema (0001_init.sql)
--
-- BASELINE MIGRATION. Once applied, this file is NEVER edited. Every later
-- schema change is a new numbered migration.
--
-- snake_case end to end. Dates/times: store timestamptz; "today" on the server
-- is computed in Asia/Manila via today_manila(), never the UTC server date.
--
-- RLS is enabled and policies are defined in 0002_rls.sql. This file creates
-- structure only. Demo data only (Data Privacy Act RA 10173).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- case-insensitive text (emails)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'barangay_staff', 'physician', 'citizen');

create type citizen_verification_status as enum ('unverified', 'verified');

create type doctor_application_status as enum ('pending', 'approved', 'rejected');

create type sex as enum ('male', 'female');

-- Screening outcome. NEVER a diagnosis.
create type screening_outcome as enum ('normal', 'monitor', 'needs_referral');

create type referral_status as enum (
  'sent', 'received', 'seen', 'follow_up_set', 'closed', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- The current date in Asia/Manila. Use this instead of current_date (UTC).
create or replace function today_manila()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;

-- Touch trigger: keep updated_at current on every write.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reference tables: facilities, barangays, puroks
-- ---------------------------------------------------------------------------
create table facilities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'hospital',  -- hospital | health_center
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table barangays (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- The health center facility that serves this barangay (optional).
  facility_id uuid references facilities (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table puroks (
  id           uuid primary key default gen_random_uuid(),
  barangay_id  uuid not null references barangays (id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (barangay_id, name)
);

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, carrying role + barangay scope.
-- id matches auth.users.id. Barangay staff are bound to exactly one barangay.
-- ---------------------------------------------------------------------------
create table profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  role               user_role not null,
  full_name          text,
  -- Scope for barangay_staff (null for admin/physician/citizen).
  barangay_id        uuid references barangays (id) on delete set null,
  -- Facility for physician (null otherwise).
  facility_id        uuid references facilities (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index profiles_barangay_id_idx on profiles (barangay_id);
create index profiles_role_idx on profiles (role);

-- Convenience accessors used throughout RLS policies (0002).
create or replace function current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_barangay_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select barangay_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table households (
  id           uuid primary key default gen_random_uuid(),
  barangay_id  uuid not null references barangays (id) on delete restrict,
  purok_id     uuid references puroks (id) on delete set null,
  name         text,                        -- household/family label
  address      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index households_barangay_id_idx on households (barangay_id);
create index households_purok_id_idx on households (purok_id);
create index households_updated_at_idx on households (updated_at);

create trigger households_set_updated_at
  before update on households
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- patients
--  - patient_code is assigned by the server (null => "code pending" offline).
--  - optional link to an auth user (self-registered citizen).
--  - dedup key: normalized surname + first_name + birthdate + sex + barangay.
-- ---------------------------------------------------------------------------
create table patients (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid references households (id) on delete set null,
  barangay_id          uuid not null references barangays (id) on delete restrict,
  -- Server-assigned human-friendly code. Unique when present.
  patient_code         text unique,
  -- Optional link to the citizen's auth account.
  user_id              uuid references auth.users (id) on delete set null,
  surname              text not null,
  first_name           text not null,
  middle_name          text,
  sex                  sex not null,
  birthdate            date not null,
  verification_status  citizen_verification_status not null default 'unverified',
  -- QR versioning: resetting the QR bumps this; old codes stop resolving.
  qr_version           integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index patients_household_id_idx on patients (household_id);
create index patients_barangay_id_idx on patients (barangay_id);
create index patients_updated_at_idx on patients (updated_at);

-- Dedup support: normalized natural key per barangay.
create unique index patients_dedup_idx
  on patients (
    barangay_id,
    lower(btrim(surname)),
    lower(btrim(first_name)),
    birthdate,
    sex
  );

create trigger patients_set_updated_at
  before update on patients
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- checkups (append-only screening records)
--  - vitals + screening outcome. Risk computed server-side (later migration).
-- ---------------------------------------------------------------------------
create table checkups (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references patients (id) on delete cascade,
  barangay_id        uuid not null references barangays (id) on delete restrict,
  -- Who recorded it (barangay_staff or physician).
  recorded_by        uuid references auth.users (id) on delete set null,
  checkup_date       date not null default today_manila(),
  systolic           integer,
  diastolic          integer,
  fasting_glucose    numeric(5, 1),
  -- Set by compute_risk (added in a later migration). Nullable until then.
  outcome            screening_outcome,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index checkups_patient_id_idx on checkups (patient_id);
create index checkups_barangay_id_idx on checkups (barangay_id);
create index checkups_checkup_date_idx on checkups (checkup_date);

create trigger checkups_set_updated_at
  before update on checkups
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- referrals
--  - status transitions are server-authoritative (advance_referral RPC, later).
-- ---------------------------------------------------------------------------
create table referrals (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references patients (id) on delete cascade,
  barangay_id        uuid not null references barangays (id) on delete restrict,
  -- Receiving facility (hospital).
  facility_id        uuid references facilities (id) on delete set null,
  created_by         uuid references auth.users (id) on delete set null,
  status             referral_status not null default 'sent',
  reason             text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index referrals_patient_id_idx on referrals (patient_id);
create index referrals_barangay_id_idx on referrals (barangay_id);
create index referrals_status_idx on referrals (status);

create trigger referrals_set_updated_at
  before update on referrals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- risk_rules
--  - PLACEHOLDER clinical thresholds. Need licensed-physician approval before
--    real use. The client mirror lives in src/lib/risk.ts and must match the
--    active row exactly. Exactly one row is active at a time.
-- ---------------------------------------------------------------------------
create table risk_rules (
  version                integer primary key,
  is_active              boolean not null default false,
  -- Thresholds (placeholders; see product guardrails).
  bp_systolic_cutoff     integer not null default 140,
  bp_diastolic_cutoff    integer not null default 90,
  bp_monitor_systolic    integer not null default 130,
  bp_monitor_diastolic   integer not null default 85,
  fasting_glucose_cutoff numeric(5, 1) not null default 126.0,
  fasting_glucose_monitor numeric(5, 1) not null default 110.0,
  -- Family-history risk applies at this age and above.
  family_history_min_age integer not null default 40,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Enforce at most one active row.
create unique index risk_rules_single_active_idx
  on risk_rules (is_active)
  where is_active;

create trigger risk_rules_set_updated_at
  before update on risk_rules
  for each row execute function set_updated_at();
