-- CareLink RLS for feature tables (0006_rls.sql)
--
-- Default deny on every 0003 table. Privileged tables (audit_logs,
-- access_grants, id_cards, id_card_prints, prescriptions, prescription_items,
-- claim_codes, doctor_applications, pairing_attempts) have NO client write
-- policies — all writes go through the SECURITY DEFINER RPCs in 0005.
--
-- Reads are scoped per role. Helper: has_active_grant(patient, user).

alter table doctor_applications enable row level security;
alter table claim_codes         enable row level security;
alter table access_grants       enable row level security;
alter table consents            enable row level security;
alter table pairing_attempts    enable row level security;
alter table id_cards            enable row level security;
alter table id_card_prints      enable row level security;
alter table prescriptions       enable row level security;
alter table prescription_items  enable row level security;
alter table patient_notes       enable row level security;
alter table audit_logs          enable row level security;
alter table reminders           enable row level security;

-- ---------------------------------------------------------------------------
-- doctor_applications: the applicant reads their own; admin reads all.
-- Writes via doctor-apply Edge Function / approve_doctor RPC.
-- ---------------------------------------------------------------------------
create policy doctor_apps_self_select
  on doctor_applications for select to authenticated
  using (user_id = auth.uid());

create policy doctor_apps_admin_select
  on doctor_applications for select to authenticated
  using (current_role_name() = 'admin');

-- ---------------------------------------------------------------------------
-- access_grants: the grantee physician reads their own grants; the owning
-- citizen reads grants on their record ("who looked at my record").
-- No client writes.
-- ---------------------------------------------------------------------------
create policy access_grants_grantee_select
  on access_grants for select to authenticated
  using (grantee_user_id = auth.uid());

create policy access_grants_citizen_select
  on access_grants for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = access_grants.patient_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- consents: the owning citizen reads and manages their consents.
-- ---------------------------------------------------------------------------
create policy consents_citizen_select
  on consents for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = consents.patient_id and p.user_id = auth.uid()
    )
  );

create policy consents_citizen_insert
  on consents for insert to authenticated
  with check (
    exists (
      select 1 from patients p
      where p.id = consents.patient_id and p.user_id = auth.uid()
    )
  );

create policy consents_citizen_update
  on consents for update to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = consents.patient_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from patients p
      where p.id = consents.patient_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- id_cards / id_card_prints: barangay_staff of the patient's barangay read;
-- writes via record_card_prints RPC only.
-- ---------------------------------------------------------------------------
create policy id_cards_staff_select
  on id_cards for select to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and exists (
      select 1 from patients p
      where p.id = id_cards.patient_id and p.barangay_id = current_barangay_id()
    )
  );

create policy id_card_prints_staff_select
  on id_card_prints for select to authenticated
  using (
    current_role_name() = 'barangay_staff'
    and exists (
      select 1 from id_cards c join patients p on p.id = c.patient_id
      where c.id = id_card_prints.id_card_id and p.barangay_id = current_barangay_id()
    )
  );

-- ---------------------------------------------------------------------------
-- prescriptions / prescription_items: readable by the owning citizen, the
-- issuing physician, and barangay_staff of the patient's barangay (assisted
-- print). Writes via issue_prescription / cancel_prescription RPCs only.
-- ---------------------------------------------------------------------------
create policy prescriptions_read
  on prescriptions for select to authenticated
  using (
    physician_id = auth.uid()
    or exists (
      select 1 from patients p
      where p.id = prescriptions.patient_id
        and (
          p.user_id = auth.uid()
          or (current_role_name() = 'barangay_staff' and p.barangay_id = current_barangay_id())
        )
    )
  );

create policy prescription_items_read
  on prescription_items for select to authenticated
  using (
    exists (
      select 1 from prescriptions rx
      where rx.id = prescription_items.prescription_id
        and (
          rx.physician_id = auth.uid()
          or exists (
            select 1 from patients p
            where p.id = rx.patient_id
              and (
                p.user_id = auth.uid()
                or (current_role_name() = 'barangay_staff' and p.barangay_id = current_barangay_id())
              )
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- patient_notes: clinical_note is doctor + patient only; BHW sees only the
-- follow-up flag. RLS gates row access; column-level visibility (hiding
-- clinical_note from BHW) is enforced by exposing a BHW view in a later
-- migration. For now: physician who wrote it, and the owning citizen, read full
-- rows; barangay_staff read rows in their barangay (UI must hide clinical_note).
-- ---------------------------------------------------------------------------
create policy patient_notes_read
  on patient_notes for select to authenticated
  using (
    physician_id = auth.uid()
    or exists (
      select 1 from patients p
      where p.id = patient_notes.patient_id
        and (
          p.user_id = auth.uid()
          or (current_role_name() = 'barangay_staff' and p.barangay_id = current_barangay_id())
        )
    )
  );

-- Physician with an active grant may write a note (append-only: no update/del).
create policy patient_notes_physician_insert
  on patient_notes for insert to authenticated
  with check (
    current_role_name() = 'physician'
    and physician_id = auth.uid()
    and has_active_grant(patient_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- reminders: barangay_staff of the barangay read/manage; the owning citizen
-- reads their own.
-- ---------------------------------------------------------------------------
create policy reminders_staff_select
  on reminders for select to authenticated
  using (
    current_role_name() = 'barangay_staff' and barangay_id = current_barangay_id()
  );

create policy reminders_citizen_select
  on reminders for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = reminders.patient_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- audit_logs: admin reads (pseudonymized at the application layer — this
-- migration grants row read to admin; the admin UI shows user_id only, never
-- names). No client insert/update/delete (append-only via log_audit).
-- ---------------------------------------------------------------------------
create policy audit_logs_admin_select
  on audit_logs for select to authenticated
  using (current_role_name() = 'admin');

-- claim_codes and pairing_attempts: no client policies at all (RPC-only).
-- Leaving RLS enabled with no policy = default deny for clients.
