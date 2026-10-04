-- CareLink fixes, group B: security (0009_security_fixes.sql)
--
-- Incremental migration; earlier migrations are not edited.
--
-- Critical: role checks written as `current_role_name() <> 'admin'` let any
-- account WITHOUT a profile through, because the role is NULL and a NULL
-- comparison never raises. With email confirmation off, anyone could create
-- such an account and call seed_bhw (become a BHW), approve_doctor (approve
-- themselves), or verify_citizen (attach someone else's record to their own
-- account). Every role check below uses `is distinct from`, which is false
-- only for the exact role.
--
-- Also:
--   9.  Barangay checks are null-safe too (`is distinct from`), and a BHW
--       account without a barangay is refused.
--   10. record_rx_print only for the prescribing/unlocked doctor, the patient,
--       or a BHW of the patient's barangay.
--   11. advance_referral: doctors only for referrals sent to their hospital
--       (or a record they unlocked with the key).
--   12. BHWs no longer read the notes table (clinical notes are doctor +
--       patient only). They get patient instructions + follow-up through
--       staff_patient_notes().

-- ---------------------------------------------------------------------------
-- open_patient_record
-- ---------------------------------------------------------------------------
create or replace function open_patient_record(p_patient_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barangay uuid;
begin
  if current_role_name() is distinct from 'physician' then
    raise exception 'only a physician may open a record this way';
  end if;
  if not has_active_grant(p_patient_id, auth.uid()) then
    raise exception 'no active grant for this record';
  end if;
  select barangay_id into v_barangay from patients where id = p_patient_id;
  perform log_audit('record_view', p_patient_id, v_barangay);
  return p_patient_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. advance_referral: BHW of the referral's barangay, or a doctor at the
--     receiving hospital / with the record unlocked.
-- ---------------------------------------------------------------------------
create or replace function advance_referral(
  p_referral_id uuid,
  p_next referral_status
)
returns referral_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref referrals%rowtype;
  v_role user_role := current_role_name();
  v_ok boolean := false;
begin
  select * into v_ref from referrals where id = p_referral_id;
  if not found then
    raise exception 'referral not found';
  end if;

  if v_role = 'barangay_staff' and v_ref.barangay_id = current_barangay_id() then
    v_ok := true;
  elsif v_role = 'physician'
        and (v_ref.facility_id = current_facility_id()
             or has_active_grant(v_ref.patient_id, auth.uid())) then
    v_ok := true;
  end if;
  if not v_ok then
    raise exception 'not authorized to advance this referral';
  end if;

  -- Allowed transitions.
  if p_next = 'cancelled' and v_ref.status in ('sent','received','seen','follow_up_set') then
    null;
  elsif v_ref.status = 'sent' and p_next = 'received' then null;
  elsif v_ref.status = 'received' and p_next = 'seen' then null;
  elsif v_ref.status = 'seen' and p_next = 'follow_up_set' then null;
  elsif v_ref.status = 'follow_up_set' and p_next = 'closed' then null;
  else
    raise exception 'illegal referral transition % -> %', v_ref.status, p_next;
  end if;

  update referrals set status = p_next where id = p_referral_id;
  return p_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_card_prints (+ 9: null-safe barangay check)
-- ---------------------------------------------------------------------------
create or replace function record_card_prints(
  p_patient_id uuid,
  p_batch_size integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient patients%rowtype;
  v_card_id uuid;
begin
  if current_role_name() is distinct from 'barangay_staff' then
    raise exception 'only barangay staff may print ID cards';
  end if;
  if current_barangay_id() is null then
    raise exception 'your account is not assigned to a barangay';
  end if;
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  if v_patient.barangay_id is distinct from current_barangay_id() then
    raise exception 'patient is outside your barangay';
  end if;
  if p_batch_size < 1 or p_batch_size > 200 then
    raise exception 'batch size must be between 1 and 200';
  end if;

  insert into id_cards (patient_id, qr_version, issued_by)
  values (p_patient_id, v_patient.qr_version, auth.uid())
  on conflict (patient_id, qr_version)
    do update set issued_by = coalesce(id_cards.issued_by, excluded.issued_by)
  returning id into v_card_id;

  insert into id_card_prints (id_card_id, printed_by, batch_size)
  values (v_card_id, auth.uid(), p_batch_size);

  perform log_audit('card_print', p_patient_id, v_patient.barangay_id,
                    jsonb_build_object('batch_size', p_batch_size));
  return v_card_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- issue_prescription
-- ---------------------------------------------------------------------------
create or replace function issue_prescription(
  p_patient_id uuid,
  p_license text,
  p_items jsonb,
  p_follow_up_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rx_id uuid;
  v_item jsonb;
  v_line integer := 0;
  v_barangay uuid;
begin
  if current_role_name() is distinct from 'physician' then
    raise exception 'only a physician may issue prescriptions';
  end if;
  if not has_active_grant(p_patient_id, auth.uid()) then
    raise exception 'no active grant for this patient';
  end if;
  if coalesce(p_license, '') = '' then
    raise exception 'physician license number is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one prescription item is required';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'a prescription may have at most 20 items';
  end if;

  insert into prescriptions (patient_id, physician_id, physician_license, follow_up_date)
  values (p_patient_id, auth.uid(), p_license, p_follow_up_date)
  returning id into v_rx_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line := v_line + 1;
    insert into prescription_items (
      prescription_id, line_no, drug_name, strength, dosage, frequency,
      duration, quantity, instructions
    )
    values (
      v_rx_id, v_line,
      v_item->>'drug_name', v_item->>'strength', v_item->>'dosage',
      v_item->>'frequency', v_item->>'duration', v_item->>'quantity',
      v_item->>'instructions'
    );
  end loop;

  select barangay_id into v_barangay from patients where id = p_patient_id;

  -- Schedule a follow-up reminder if a date was set.
  if p_follow_up_date is not null then
    insert into reminders (patient_id, barangay_id, due_date, source)
    values (p_patient_id, v_barangay, p_follow_up_date, 'prescription');
  end if;

  perform log_audit('rx_issue', p_patient_id, v_barangay);
  return v_rx_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_prescription
-- ---------------------------------------------------------------------------
create or replace function cancel_prescription(
  p_prescription_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rx prescriptions%rowtype;
  v_barangay uuid;
begin
  select * into v_rx from prescriptions where id = p_prescription_id;
  if not found then raise exception 'prescription not found'; end if;
  if current_role_name() is distinct from 'physician'
     or v_rx.physician_id is distinct from auth.uid() then
    raise exception 'only the issuing physician may cancel this prescription';
  end if;
  if v_rx.status = 'cancelled' then
    raise exception 'prescription is already cancelled';
  end if;

  update prescriptions
    set status = 'cancelled', cancelled_at = now(),
        cancelled_by = auth.uid(), cancel_reason = p_reason
    where id = p_prescription_id;

  select barangay_id into v_barangay from patients where id = v_rx.patient_id;
  perform log_audit('rx_cancel', v_rx.patient_id, v_barangay);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. record_rx_print: only people allowed to see the prescription.
-- ---------------------------------------------------------------------------
create or replace function record_rx_print(p_prescription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rx prescriptions%rowtype;
  v_patient patients%rowtype;
  v_role user_role := current_role_name();
  v_ok boolean := false;
begin
  select * into v_rx from prescriptions where id = p_prescription_id;
  if not found then raise exception 'prescription not found'; end if;
  select * into v_patient from patients where id = v_rx.patient_id;

  if v_role = 'physician'
     and (v_rx.physician_id = auth.uid() or has_active_grant(v_rx.patient_id, auth.uid())) then
    v_ok := true;
  elsif v_role = 'citizen' and v_patient.user_id = auth.uid() then
    v_ok := true;
  elsif v_role = 'barangay_staff' and v_patient.barangay_id = current_barangay_id() then
    v_ok := true;
  end if;
  if not v_ok then
    raise exception 'not authorized to print this prescription';
  end if;

  perform log_audit('rx_print', v_rx.patient_id, v_patient.barangay_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- approve_doctor
-- ---------------------------------------------------------------------------
create or replace function approve_doctor(
  p_application_id uuid,
  p_approve boolean,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app doctor_applications%rowtype;
begin
  if current_role_name() is distinct from 'admin' then
    raise exception 'only an admin may review doctor applications';
  end if;
  select * into v_app from doctor_applications where id = p_application_id;
  if not found then raise exception 'application not found'; end if;

  update doctor_applications
    set status = case when p_approve then 'approved' else 'rejected' end,
        reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes
    where id = p_application_id;

  if p_approve then
    insert into profiles (id, role, full_name, facility_id)
    values (v_app.user_id, 'physician', v_app.full_name, v_app.facility_id)
    on conflict (id) do update
      set role = 'physician', facility_id = excluded.facility_id;
    perform log_audit('doctor_approved', null, null,
                      jsonb_build_object('application_id', p_application_id));
  else
    perform log_audit('doctor_rejected', null, null,
                      jsonb_build_object('application_id', p_application_id));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- seed_bhw
-- ---------------------------------------------------------------------------
create or replace function seed_bhw(
  p_user_id uuid,
  p_barangay_id uuid,
  p_full_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_role_name() is distinct from 'admin' then
    raise exception 'only an admin may seed BHW accounts';
  end if;
  if p_barangay_id is null then
    raise exception 'a barangay is required';
  end if;
  insert into profiles (id, role, full_name, barangay_id)
  values (p_user_id, 'barangay_staff', p_full_name, p_barangay_id)
  on conflict (id) do update
    set role = 'barangay_staff', barangay_id = excluded.barangay_id,
        full_name = coalesce(excluded.full_name, profiles.full_name);
  perform log_audit('bhw_seeded', null, p_barangay_id,
                    jsonb_build_object('user_id', p_user_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- register_citizen (BHW registers a resident without a phone or internet)
-- ---------------------------------------------------------------------------
create or replace function register_citizen(
  p_surname text,
  p_first_name text,
  p_sex sex,
  p_birthdate date,
  p_household_id uuid default null,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barangay uuid := current_barangay_id();
  v_patient_id uuid;
begin
  if current_role_name() is distinct from 'barangay_staff' then
    raise exception 'only barangay staff may register residents';
  end if;
  if v_barangay is null then
    raise exception 'your account is not assigned to a barangay';
  end if;

  insert into patients (
    household_id, barangay_id, user_id, surname, first_name, sex, birthdate,
    verification_status
  )
  values (
    p_household_id, v_barangay, p_user_id, p_surname, p_first_name, p_sex,
    p_birthdate, case when p_user_id is null then 'unverified' else 'verified' end
  )
  returning id into v_patient_id;

  return v_patient_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- verify_citizen (+ 9: null-safe barangay check)
-- ---------------------------------------------------------------------------
create or replace function verify_citizen(
  p_patient_id uuid,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient patients%rowtype;
begin
  if current_role_name() is distinct from 'barangay_staff' then
    raise exception 'only barangay staff may verify citizens';
  end if;
  if current_barangay_id() is null then
    raise exception 'your account is not assigned to a barangay';
  end if;
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  if v_patient.barangay_id is distinct from current_barangay_id() then
    raise exception 'patient is outside your barangay';
  end if;

  update patients
    set verification_status = 'verified',
        user_id = coalesce(p_user_id, user_id)
    where id = p_patient_id;

  perform log_audit('citizen_verified', p_patient_id, v_patient.barangay_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Clinical notes: doctor (author, or with the record unlocked — see 0008)
--     and the patient only. BHWs read instructions + follow-up through
--     staff_patient_notes() and never see clinical_note.
-- ---------------------------------------------------------------------------
drop policy if exists patient_notes_read on patient_notes;

create policy patient_notes_read
  on patient_notes for select to authenticated
  using (
    physician_id = auth.uid()
    or exists (
      select 1 from patients p
      where p.id = patient_notes.patient_id and p.user_id = auth.uid()
    )
  );

create or replace function staff_patient_notes(p_patient_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  patient_instructions text,
  has_follow_up boolean,
  follow_up_date date
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if current_role_name() is distinct from 'barangay_staff' then
    raise exception 'only barangay staff may read visit notes this way';
  end if;
  return query
    select n.id, n.created_at, n.patient_instructions, n.has_follow_up, n.follow_up_date
    from patient_notes n
    join patients p on p.id = n.patient_id
    where n.patient_id = p_patient_id
      and p.barangay_id = current_barangay_id()
    order by n.created_at desc;
end;
$$;
