---
inclusion: always
---

# CareLink: Technology Stack

Prefer this stack over alternatives. Do not introduce new libraries when one below already covers the need. Use **npm** only (no yarn or pnpm).

## Stack

| Concern | Choice |
|---|---|
| Build | Vite, React 18, TypeScript (strict) |
| Routing | React Router v6, lazy-loaded route groups per role |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod (Zod schemas mirror DB check constraints) |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| Backend | Supabase: Postgres, Auth, RLS, RPC, Storage, Realtime, Edge Functions (Deno), `pg_cron`, `pg_net` |
| Supabase region | Singapore |
| Offline | `vite-plugin-pwa` (Workbox) + Dexie (IndexedDB) |
| QR generate | `qrcode` (SVG for cards, PNG export) |
| QR scan | native `BarcodeDetector`, fallback `html5-qrcode` (needs HTTPS and camera permission) |
| Masterlist | TanStack Table + TanStack Virtual |
| Export and print | PapaParse (CSV), CSS `@page` print stylesheets (ID cards CR80, prescriptions A5) |
| Charts | Recharts |
| Dates | date-fns, time zone `Asia/Manila` |
| i18n | react-i18next (`en.json`, `fil.json`) |
| SMS | Provider undecided (Semaphore or Twilio): keep behind the `send-reminders` Edge Function |
| Hosting | Vercel or Netlify (static), undecided, plus Supabase cloud |

## Language and conventions

- TypeScript `strict` on. No `any` without a comment explaining why.
- **snake_case end to end** for database columns, generated types, and fields in the data layer. Do not map to camelCase.
- Generated DB types live in `src/types/database.ts` via `supabase gen types typescript`. Never hand-edit.
- All UI text goes through i18n keys from day one. No hard-coded user-facing strings.
- Dates and times use `Asia/Manila`. On the server use `today_manila()`, never the UTC server date.

## Tooling

- **ESLint and Prettier** are required. CI runs lint, `tsc --noEmit`, unit tests, pgTAP, and Playwright.
- No commit message convention is enforced.
- Environment file: `.env.example` documents every variable; never commit real values.

## Supabase and database rules

- **Local development:** use the Supabase CLI local stack (Docker). Hosted projects: `dev`, `staging`, `prod`. Seed data only in dev and staging.
- **Migrations are incremental.** `supabase/migrations/0001_init.sql` is the baseline and is never edited after it is applied. Every schema change is a new numbered migration. Re-run type generation after each.
- **Row-level security on every table, default deny.** Every policy is tested with pgTAP per role (what it can and cannot read or write).
- Views use `security_invoker` and repeat the barangay scope in a `where` clause as a second guard. Keep both.
- **No direct client writes** to `audit_logs`, `access_grants`, `id_cards`, `prescriptions`, or `prescription_items`. Writes go through RPCs or Edge Functions only.
- `audit_logs` is append-only (trigger blocks update and delete; clients have no insert right). Admin reads audit logs pseudonymized (userID only); full identifiers never leave the server.
- Admin has no table policies except `approve_doctor` and `seed_bhw`. It cannot write facilities, risk rules, or health records. Doctor verification documents live in a private Storage bucket with admin-only RLS.
- Referral status changes only through `advance_referral`.
- Every physician record open requires the pairing key in addition to a valid grant: `verify_pairing_key` checks surname + birthdate (`YYYYMMDD`) server-side, then mints the 12-hour grant.
- Risk is computed by `compute_risk` and a trigger on `checkups`, reading the active `risk_rules` row. The client preview in `lib/risk.ts` must mirror it exactly.
- Idempotent offline sync: rows use client-generated UUIDs (`client_uuid`, `id`), insert with `ignoreDuplicates`.
- `patient_code` is assigned by the server; offline-created patients show "code pending".

### RPC functions

`compute_risk`, `open_patient_record`, `verify_pairing_key`, `advance_referral`, `log_audit` (server-side only), `record_card_prints`, `record_rx_print`, `reset_patient_qr`, `issue_prescription`, `cancel_prescription`, `approve_doctor`, `seed_bhw`, `register_citizen`, `verify_citizen`.

### Edge Functions (Deno, `supabase/functions/`)

`qr-sign`, `resolve-qr`, `citizen-claim`, `claim-code-issue`, `doctor-apply`, `invite-staff`, `send-reminders`, `sms-webhook` (optional). Shared helpers live in `_shared/` (`cors.ts`, `auth.ts`, `rateLimit.ts`, `hmac.ts`). `citizen-claim` and `claim-code-issue` handle BHW-created accounts; `doctor-apply` handles PRC ID + document upload intake.

### Environment variables

- Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.
- Edge Functions only: `SUPABASE_SERVICE_ROLE_KEY`, `QR_HMAC_SECRET`, `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_NAME`.

## Data layer rules

- **Barangay staff** masterlist, patient panels, check-ups, and referrals read from IndexedDB first and refresh from Supabase when online. Writes go to IndexedDB and the outbox, then sync.
- **Doctor, citizen** screens, plus the staff dashboard and reports, read from Supabase directly. No PHI cached offline.
- **Online only:** ID-card printing (QR signed on the server), pairing-key verification, e-prescriptions, prescription printing, dashboard, reports, doctor approvals.
- Staff mutations (check-ups, referrals) enqueue to the outbox. Doctor actions call RPCs directly.
- Conflict rules: check-ups, lab tests, notes, and referrals are append-only; household and patient edits are last-write-wins on `updated_at`; referral status changes are online-only and server-authoritative.
- Realtime subscriptions: referral changes (staff), new referrals (doctor inbox), prescription status (citizen).
- Dexie schema, outbox flush, and triggers (app start, `online` event, Background Sync, manual "Sync now") follow section 8 of the blueprint.

## Security and privacy rules (always apply)

1. **QR payload** is `CL1.<patient_code>.<qr_version>.<sig>` with `sig` = first 16 chars of base64url(HMAC-SHA256(secret, `patient_code.qr_version`)). It contains no personal data. Verify the signature in constant time.
2. **Secrets** live only in Edge Function environment. The service role key and HMAC secret never reach the browser or the repo.
3. **PHI** is stored only in IndexedDB. The service worker precaches the app shell and static assets only. Never put API responses in Cache Storage.
4. **Never log patient data** in the console, analytics, or error trackers. Error tracking must scrub PHI.
5. **Every record open is audited**: `record_view`, `qr_scan`, `pairing_key_succeeded`, `pairing_key_failed` (never log the attempted birthdate), `consent_granted`, `consent_revoked`, `record_export` (includes masterlist CSV), `card_print`, `rx_print`, `rx_view`, `qr_reset`, `rx_issue`, `rx_cancel`, `citizen_verified`, `doctor_approved`, `doctor_rejected`, `bhw_seeded`, sign-ins, role changes.
6. **Access grants:** physician via referral (180 days), QR scan + pairing key (12 hours, tied to that physician), or patient consent. There is no pharmacist grant. BHW access is barangay-scoped and seeded, never self-granted.
7. **Rate limit** `resolve-qr`, `verify_pairing_key`, `citizen-claim`, and manual lookup (patient code + birth date). Lock claim codes after 5 failed attempts; lock pairing-key challenges for 15 minutes after 5 failed attempts.
8. **Citizen activation:** self-registration (name, sex, birthdate) creates an `unverified` account seeing only a pending-verification screen; BHW verifies in person (or creates the account directly for unregistered residents) via `verify_citizen` / `register_citizen`. One-time claim codes for BHW-created accounts are valid 7 days, stored hashed. The plain code is returned once. Patient ID + birth date alone is never a login.
9. **Sessions:** short JWT lifetime, auto-logout after inactivity, optional app PIN, wipe local data on sign-out. Single `/login` form (no role selector); role routing happens server-side after auth.
10. **Exports and printouts** (masterlist CSV, ID cards, prescriptions incl. BHW-assisted prints) contain patient names, are limited to barangay staff and the owning citizen/doctor as appropriate, show a confirm warning, and are audit-logged.
11. **SMS text** is short and contains no diagnosis.
12. Printed ID cards carry only name, patient code, QR, and an optional small wordmark. Birthdates never appear on printouts.
13. **Auth model:** citizens self-register; doctors apply with email + PRC ID + supporting documents to a private bucket and wait for `pending → approved/rejected`; BHW accounts are created only via `seed_bhw` by admin and bound to one barangay.

## UI and accessibility

- Mobile-first at 360 px. Staff screens use a bottom nav and bottom sheets; masterlist rows become cards on phones; tablet and desktop use a left side nav. Minimum touch target 44 px.
- WCAG 2.1 AA: real table markup for the masterlist, keyboard-reachable row actions, visible focus, `prefers-reduced-motion` respected.
- Light and dark themes via tokens in `styles/tokens.css`. Fonts: Bricolage Grotesque (headings), Figtree (body), with system fallbacks.
- Core colors (light / dark): primary blue `#1B6FD1` / `#2F7BE0`, teal `#0E9A9A` / `#2CC3C0`, screened green `#2FAE68` / `#34B873`, monitor amber `#E39A0B` / `#F0B13A`, needs-referral red `#D6403A` / `#F0645E`. Role badges: Barangay staff = teal, Hospital = blue, Patients = green.

## Testing

- Vitest and Testing Library for unit tests. Risk-rule tests cover boundaries (139/89, 140/90, 125, 126, family history at age 39 and 40).
- pgTAP for RLS and RPCs.
- Playwright for end-to-end on a phone viewport and a desktop viewport. axe accessibility checks on every route group.
- The demo story must pass end to end: citizen self-registers -> BHW verifies from the masterlist -> staff screen -> refer -> print QR ID card -> doctor scans + pairing key and sees history -> doctor writes note and issues e-prescription and sets follow-up -> citizen views/prints it (or BHW prints it) -> reminders and dashboard update.

## Deployment

- Static frontend over HTTPS (required for camera and service worker). Supabase cloud in Singapore. Migrations through the Supabase CLI.
- Monitoring: error tracking with PHI scrubbing, uptime check, alert on failed SMS rate.