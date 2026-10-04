# CareLink

Shared patient record and early-screening web app for the Philippine public
health system. Screening and care-coordination aid, **not a diagnostic tool**.
Demo data only (Data Privacy Act RA 10173).

## Stack

Vite + React 18 + TypeScript (strict), React Router v6, TanStack Query,
Tailwind CSS, Supabase (Postgres + Auth + RLS + RPC + Edge Functions),
Dexie (offline-first for barangay staff), vite-plugin-pwa.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # Vitest unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build (+ PWA service worker)
```

Environment: copy `.env.example` to `.env.local` and fill in your Supabase
project URL + anon/publishable key. Never commit real values.

## One-time backend setup (hosted Supabase)

These steps run in **your** terminal / the Supabase dashboard. They cannot be
done from the coding sandbox.

### 1. Apply migrations

Either via the CLI (if linked):

```bash
supabase db push
```

…or paste each file into the SQL Editor **in order**:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_feature_tables.sql
supabase/migrations/0004_functions.sql
supabase/migrations/0005_rls.sql   # (0006_rls.sql)
```

### 2. Seed demo data

Run `supabase/reset_demo.sql` (optional, clears demo data) then
`supabase/seed.sql`. Demo logins (password `CareLinkDemo123!`):

| Portal | URL | Email |
|---|---|---|
| Citizen | `/login` | `citizen.demo@carelink.test` |
| BHW | `/login/staff` | `bhw.demo@carelink.test` |
| Doctor | `/login/doctor` | `doctor.demo@carelink.test` |
| Admin | `/admin/login` (type it) | `admin.demo@carelink.test` |

### 3. Regenerate DB types after schema changes

```bash
supabase gen types typescript --linked > src/types/database.ts
```

### 4. Edge Functions

Set the required secrets (dashboard → Project Settings → Edge Functions, or CLI):

```bash
supabase secrets set QR_HMAC_SECRET=<your-secret>
```

Deploy the functions:

```bash
supabase functions deploy qr-sign
supabase functions deploy resolve-qr
supabase functions deploy citizen-claim
supabase functions deploy claim-code-issue
supabase functions deploy doctor-apply
supabase functions deploy seed-bhw
```

`seed-bhw` backs **Admin → Seed BHW**: the admin enters email + barangay, the
function creates the auth user (ID generated automatically), binds it via the
`seed_bhw` RPC, and shows a temporary password once.

### 5. Storage bucket for doctor documents

Create a **private** bucket named `doctor-docs` with admin-only RLS. Doctor
applications upload PRC ID + supporting files there; `doctor-apply` records the
paths.

## Project structure

See `.kiro/steering/structure.md`. Frontend in `src/`, backend in `supabase/`,
tests in `tests/`.

## Security notes

- QR payloads carry no personal data; signatures are HMAC-signed server-side.
- The pairing-key challenge (surname + birthdate) is verified server-side and
  never logged.
- PHI is cached only in IndexedDB (staff offline), never in Cache Storage.
- RLS is the real access boundary; UI role guards are convenience only.
- Clinical thresholds live in `risk_rules` + its client mirror `lib/risk.ts`
  and are placeholders pending licensed-physician approval.
