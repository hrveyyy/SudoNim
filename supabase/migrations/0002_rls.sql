-- CareLink RLS policies for the baseline tables (0002_rls.sql)
--
-- Default deny: RLS is enabled on every table and no policy implies no access.
-- Policies are added per role. snake_case throughout.
--
-- Scope summary:
--   admin          -> read-only reference data; NO table write policies here
--                     (admin privileged actions are RPC-only in later migrations).
--   barangay_staff -> full read/write within THEIR barangay only.
--   physician      -> reads come via grants/RPCs (added later); minimal here.
--   citizen        -> reads their own patient row(s) via patients.user_id.
--
-- The offline-first client (barangay_staff) relies on the barangay-scoped
-- policies below for masterlist, patients, checkups, and referrals.

-- ---------------------------------------------------------------------------
-- Enable RLS (default deny) on every baseline table.
-- ---------------------------------------------------------------------------
alter table facilities   enable row level security;
alter table barangays    enable row level security;
alter table puroks       enable row level security;
alter table profiles     enable row level security;
alter table households   enable row level security;
alter table patients     enable row level security;
alter table checkups     enable row level security;
alter table referrals    enable row level security;
alter table risk_rules   enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: a user can read their own profile. No client writes (profiles are
-- created by seed/RPC: seed_bhw, register_citizen, approve_doctor).
-- ---------------------------------------------------------------------------
create policy profiles_select_self
  on profiles for select
  to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reference data (facilities, barangays, puroks): readable by any
-- authenticated user. Writes are admin/seed only (no policy => denied here;
-- seeding runs as the postgres role which bypasses RLS).
-- ---------------------------------------------------------------------------
create policy facilities_select_authenticated
  on facilities for select
  to authenticated
  using (true);

create policy barangays_select_authenticated
  on barangays for select
  to authenticated
  using (true);

create policy puroks_select_authenticated
  on puroks for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- risk_rules: readable by any authenticated user (the client mirror needs the
-- active row). Writes are migration/RPC only (no write policy here).
-- ---------------------------------------------------------------------------
create policy risk_rules_select_authenticated
  on risk_rules for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- households: barangay_staff full CRUD within their own barangay.
-- ---------------------------------------------------------------------------
create policy households_staff_select
  on households for select
  to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

create policy households_staff_insert
  on households for insert
  to authenticated
  with check (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

create policy households_staff_update
  on households for update
  to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  )
  with check (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

-- ---------------------------------------------------------------------------
-- patients: barangay_staff full CRUD within their barangay; a citizen may read
-- their own linked patient row.
-- ---------------------------------------------------------------------------
create policy patients_staff_select
  on patients for select
  to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

create policy patients_staff_insert
  on patients for insert
  to authenticated
  with check (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

create policy patients_staff_update
  on patients for update
  to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  )
  with check (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

create policy patients_citizen_select_own
  on patients for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- checkups: append-only for barangay_staff within their barangay.
-- Select + insert only (no update/delete policy => append-only).
-- ---------------------------------------------------------------------------
create policy checkups_staff_select
  on checkups for select
  to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

create policy checkups_staff_insert
  on checkups for insert
  to authenticated
  with check (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

-- A citizen may read their own check-ups (via the linked patient row).
create policy checkups_citizen_select_own
  on checkups for select
  to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = checkups.patient_id
        and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- referrals: barangay_staff may read and CREATE within their barangay.
-- Status changes are server-authoritative (advance_referral RPC, later), so
-- there is deliberately NO update policy here.
-- ---------------------------------------------------------------------------
create policy referrals_staff_select
  on referrals for select
  to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );

create policy referrals_staff_insert
  on referrals for insert
  to authenticated
  with check (
    current_role_name() = 'barangay_staff'
    and barangay_id = current_barangay_id()
  );
