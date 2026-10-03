---
inclusion: always
---

# CareLink: Product Overview

CareLink is a shared patient record and early-screening web app for the Philippine public health system. It is built for the **Code Vitality hackathon (Health and Well-being track)** and submitted as a website.

CareLink is a **screening and care-coordination aid, not a diagnostic tool.**

## Problem

- Patient records are scattered across clinics and hospitals, causing repeated tests and lost histories.
- Barangay health workers are buried in paperwork.
- Many people with hypertension or diabetes are never diagnosed.

## Solution

One shared patient record that follows the patient.

1. Barangay staff screen residents and record check-ups, even offline, working from a searchable **masterlist** of patients grouped by household. Citizens self-register with name, sex, and birthdate; barangay staff verify identity in person, create accounts for unregistered residents, and tag screening outcomes as `normal` or `needs referral` (never a diagnosis).
2. The system flags risk automatically and tracks referrals to hospitals.
3. Every patient has a QR code. Barangay staff issue it and print it on an ID card (name, patient code, QR only). A doctor scans it, then completes a **pairing-key challenge** (patient's surname + birthdate as `YYYYMMDD`, stated verbally by the patient and typed by the doctor) before the combined history opens, so a leaked or photographed QR alone grants nothing.
4. Doctors issue **e-prescriptions** and a per-visit note. The patient views them digitally in their account, prints them at home, or asks the Barangay Health Center to print for them. There is no pharmacy dispensing module.
5. Barangay staff see coverage, high-risk patients, and auto-generated monthly reports for their own barangay.
6. Patients download their own health card, see who opened their record, and confirm each access via the pairing key. Birthdates are never printed, messaged, or logged.

## Users and roles

| Role | Purpose |
|---|---|
| `barangay_staff` | Seeded by admin (no self-registration). Registers households and patients, creates accounts for unregistered residents, verifies self-registered citizens in person, records check-ups, creates referrals, issues activation codes, prints QR ID cards and prescriptions on request, views the dashboard and monthly reports. Own barangay only, with patient names. |
| `physician` | Self-registers with email + PRC ID + supporting documents, activated only after admin approval. Opens records by QR scan **plus pairing-key challenge** (surname + birthdate `YYYYMMDD`), records check-ups, manages referrals for their facility, writes per-visit notes and e-prescriptions (license number required). |
| `citizen` | Self-registers with name, sex, birthdate (account is `unverified` until BHW verifies in person). Own record only. Downloads health card, sees prescriptions, visits, and access history, confirms each access via pairing key, views/prints prescriptions, resets own QR. |
| `admin` | Read-only except doctor approvals and BHW seeding. Generates aggregate reports and views audit logs (userID only, no names; doctor-approval queue is the sole exception and is audit-logged). Does not edit facilities or risk rules. |

Role names in code are exactly: `admin`, `barangay_staff`, `physician`, `citizen`. There is no pharmacist role.

## Key features

- Masterlist grouped by household: search, filters, sorting, CSV and print export, works offline. Self-registered citizens appear as `unverified` until BHW verifies; dedup key is normalized surname + firstname + birthdate + sex + barangay, with BHW merge.
- Check-up form with live risk preview (client) and authoritative risk computation (server). Passing screens are tagged `normal`; others `needs referral` / `monitor`.
- Referral workflow: `sent` -> `received` -> `seen` -> `follow_up_set` -> `closed` (or `cancelled`).
- Signed QR codes with no personal data inside plus a mandatory server-verified **pairing-key challenge** (surname + birthdate `YYYYMMDD`) on every physician record open; 12-hour scan grants tied to that physician. Failed pairing attempts are rate-limited and audit-logged without storing the birthdate.
- Printed QR ID cards (CR80), single and batch (max 200), with a print log.
- E-prescriptions (A5 print, up to 20 medicine lines, never edited after issue, no diagnosis field) viewed digitally or printed at home or at the Barangay Health Center (assisted prints are audit-logged as `rx_print` with a confirm warning).
- Per-visit doctor's note split in two: `patient_instructions` (visible to patient, BHW, doctor) and `clinical_note` (doctor + patient only; BHW sees only a follow-up flag).
- Single `/login` page (one email + password form, no role selector; server routes by role after auth). BHW accounts are seeded by admin; doctors register with PRC ID + supporting documents into a private admin-only queue.
- Audit log and patient consent with "Who looked at my record".
- SMS reminders for follow-ups; missed follow-ups surface in a "Needs a home visit" list.
- Offline-first PWA for barangay staff.
- SMS reminders for follow-ups; missed follow-ups surface in a "Needs a home visit" list.
- Offline-first PWA for barangay staff.
- English first, Filipino second.

## Business objectives and success measures

Use these to judge whether a technical decision serves the product:

- Households screened per month.
- Share of high-risk patients with a referral sent within 7 days.
- Referrals seen within 14 days.
- Missed follow-ups recovered.
- Repeated tests avoided.

## Product guardrails (do not violate)

- **Clinical thresholds are placeholders.** Blood pressure 140/90 and fasting blood sugar 126 mg/dL are common screening cut-offs, stored in the configurable `risk_rules` table. They need approval by a licensed physician before any real use. Never hard-code thresholds in UI text or logic outside `risk_rules` and its client mirror in `lib/risk.ts`.
- **Never imply diagnosis.** Copy says "needs referral", "monitor", or "normal", never a diagnosis.
- **E-prescription legality is unverified.** Philippine requirements are not confirmed. The feature is labeled a demo, and the form states that controlled drugs are not supported. Do not add controlled or dangerous drug handling, partial fills, or refills.
- **Demo data only** until privacy and legal requirements are met (Data Privacy Act of 2012, RA 10173). Health data is sensitive personal information.
- **Privacy by default.** Nothing identifying appears in QR payloads, SMS text, logs, or printed ID cards beyond name and patient code. Birthdates appear only inside the pairing-key challenge input and are never stored in logs, SMS, or printouts.
- **Risk is never shown by color alone.** Always include a text label.
- **Admin is aggregate-only.** Audit log and reports show userID only, never names, except the doctor-approval queue (PRC ID + documents, admin-only, audit-logged).

## Explicitly out of scope

- Household map (replaced by the masterlist).
- A separate health officer role, and a municipality-wide totals-only view (add deliberately as an aggregate-only role if ever needed).
- FHIR or national health information exchange mapping (possible later step; keep the schema simple).
- Partial prescription fills and refills.
- Any pharmacist / dispensing module (removed; prescriptions are view-or-print only).
- Facility or risk-rule editing by admin (admin is read-only except approvals + BHW seeding).

## Undecided: ask before implementing

Do not pick an answer for these without asking the developer:

- Citizen sign-in: email magic link or phone OTP.
- SMS provider: Semaphore or Twilio, sender-name registration, cost.
- Frontend hosting: Vercel or Netlify.
- Whether the masterlist shows "has an active prescription" for barangay staff.
- Whether the printed ID card shows a barangay name or return address.
- Retention, export approval, and data-sharing agreements.
- Who owns `risk_rules` edits now that admin is read-only (proposed: licensed physician-admin or migration-only).
- Doctor document retention period for PRC ID + supporting files.