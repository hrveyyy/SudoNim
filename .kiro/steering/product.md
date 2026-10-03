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

1. Barangay staff screen residents and record check-ups, even offline, working from a searchable **masterlist** of patients grouped by household.
2. The system flags risk automatically and tracks referrals to hospitals.
3. Every patient has a QR code. Barangay staff issue it and print it on an ID card (name, patient code, QR only). A doctor scans it and sees the combined history, so tests are not repeated.
4. Doctors issue **e-prescriptions**. The patient sees them in their account. A pharmacist scans the same QR to see the active prescription and mark it dispensed.
5. Barangay staff see coverage, high-risk patients, and auto-generated monthly reports for their own barangay.
6. Patients download their own health card, see who opened their record, and control facility access.

## Users and roles

| Role | Purpose |
|---|---|
| `barangay_staff` | One role covering the former health worker and health officer. Registers households and patients, records check-ups, creates referrals, issues activation codes, prints QR ID cards, views the dashboard and monthly reports. Own barangay only, with patient names. |
| `physician` | Opens records by QR scan or referral (access grant required), records check-ups with a grant, manages referrals for their facility, writes and cancels e-prescriptions (license number required). |
| `pharmacist` | Scans the citizen's QR for a limited view (name, birth date, patient code, active prescriptions) and marks prescriptions dispensed. Never sees the full record. |
| `citizen` | Own record only. Downloads health card, sees prescriptions, visits, and access history, grants or revokes facility access, resets own QR. |
| `admin` | Manages users, facilities, risk rules; reads the audit log. |

Role names in code are exactly: `admin`, `barangay_staff`, `physician`, `pharmacist`, `citizen`.

## Key features

- Masterlist grouped by household: search, filters, sorting, CSV and print export, works offline.
- Check-up form with live risk preview (client) and authoritative risk computation (server).
- Referral workflow: `sent` -> `received` -> `seen` -> `follow_up_set` -> `closed` (or `cancelled`).
- Signed QR codes with no personal data inside; physician (12 hours) and pharmacist (2 hours, scope `prescriptions`) scan grants.
- Printed QR ID cards (CR80), single and batch (max 200), with a print log.
- E-prescriptions (A5 print, up to 20 medicine lines, never edited after issue, no diagnosis field).
- Audit log and patient consent with "Who looked at my record".
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
- **Privacy by default.** Nothing identifying appears in QR payloads, SMS text, logs, or printed ID cards beyond name and patient code.
- **Risk is never shown by color alone.** Always include a text label.

## Explicitly out of scope

- Household map (replaced by the masterlist).
- A separate health officer role, and a municipality-wide totals-only view (add deliberately as an aggregate-only role if ever needed).
- FHIR or national health information exchange mapping (possible later step; keep the schema simple).
- Partial prescription fills and refills.

## Undecided: ask before implementing

Do not pick an answer for these without asking the developer:

- Citizen sign-in: email magic link or phone OTP.
- SMS provider: Semaphore or Twilio, sender-name registration, cost.
- Frontend hosting: Vercel or Netlify.
- Whether the masterlist shows "has an active prescription" for barangay staff.
- Whether the printed ID card shows a barangay name or return address.
- Pharmacist verification (PRC license) and whether community pharmacies are allowed.
- Retention, export approval, and data-sharing agreements.