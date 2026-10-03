-- CareLink server-side functions + triggers (0004_functions.sql)
--
-- Risk computation (authoritative), patient_code assignment, and pairing-key
-- hashing. The client mirror of compute_risk lives in src/lib/risk.ts and must
-- stay identical. QR HMAC signing stays in the qr-sign Edge Function (the
-- secret never reaches Postgres or the browser); the DB only tracks qr_version.

-- ---------------------------------------------------------------------------
-- compute_risk: screening outcome from vitals, reading the ACTIVE risk_rules.
--   needs_referral: systolic >= cutoff OR diastolic >= cutoff
--                   OR fasting_glucose >= cutoff
--   monitor:        at/above monitor thresholds but below referral cutoffs
--   normal:         otherwise
-- NEVER a diagnosis — these are screening tags only.
-- ---------------------------------------------------------------------------
create or replace function compute_risk(
  p_systolic integer,
  p_diastolic integer,
  p_fasting_glucose numeric
)
returns screening_outcome
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r risk_rules%rowtype;
  needs_referral boolean := false;
  monitor boolean := false;
begin
  select * into r from risk_rules where is_active limit 1;
  if not found then
    -- No active rules: cannot screen; treat as normal but this should not
    -- happen in a seeded environment.
    return 'normal';
  end if;

  -- Referral-level thresholds.
  if (p_systolic is not null and p_systolic >= r.bp_systolic_cutoff)
     or (p_diastolic is not null and p_diastolic >= r.bp_diastolic_cutoff)
     or (p_fasting_glucose is not null and p_fasting_glucose >= r.fasting_glucose_cutoff)
  then
    needs_referral := true;
  end if;

  -- Monitor-level thresholds (below referral).
  if (p_systolic is not null and p_systolic >= r.bp_monitor_systolic)
     or (p_diastolic is not null and p_diastolic >= r.bp_monitor_diastolic)
     or (p_fasting_glucose is not null and p_fasting_glucose >= r.fasting_glucose_monitor)
  then
    monitor := true;
  end if;

  if needs_referral then
    return 'needs_referral';
  elsif monitor then
    return 'monitor';
  else
    return 'normal';
  end if;
end;
$$;

-- Trigger: set checkups.outcome from the active risk rules on write.
create or replace function checkups_set_outcome()
returns trigger
language plpgsql
as $$
begin
  new.outcome := compute_risk(new.systolic, new.diastolic, new.fasting_glucose);
  return new;
end;
$$;

create trigger checkups_compute_outcome
  before insert or update of systolic, diastolic, fasting_glucose on checkups
  for each row execute function checkups_set_outcome();

-- ---------------------------------------------------------------------------
-- Assign patient_code on insert when missing. Offline-created rows arrive with
-- patient_code null ("code pending") and get a server code here.
-- ---------------------------------------------------------------------------
create or replace function patients_assign_code()
returns trigger
language plpgsql
as $$
begin
  if new.patient_code is null then
    new.patient_code := 'CL-' || lpad(nextval('patient_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger patients_assign_code_trg
  before insert on patients
  for each row execute function patients_assign_code();

-- ---------------------------------------------------------------------------
-- Pairing-key hashing. The pairing key is surname + birthdate (YYYYMMDD),
-- normalized. We store only a hash so the raw value is never persisted, and
-- verify in constant time. The attempted birthdate is NEVER logged.
-- ---------------------------------------------------------------------------
create or replace function pairing_key_hash(p_surname text, p_birthdate date)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      lower(btrim(p_surname)) || ':' || to_char(p_birthdate, 'YYYYMMDD'),
      'sha256'
    ),
    'hex'
  );
$$;
