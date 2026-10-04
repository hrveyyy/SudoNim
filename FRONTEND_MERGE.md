# CareLink Frontend — Merge Guide

A reference for merging this frontend into the main CareLink application. It describes
what this project is, what it ships today, and the gaps between it and the target
architecture defined in the steering docs (`product.md`, `tech.md`, `structure.md`).

> **Scope note.** This project is a **single-file UI prototype** generated inside Figma
> Make. All screens live in one `src/App.tsx`. The canonical CareLink architecture is a
> multi-feature React + Supabase app. Merging means lifting the UI/UX from here into the
> structured feature folders described in `structure.md`.

---

## 1. What this project is

- **Name:** `figma-make-app` (prototype), representing the **CareLink** product.
- **Type:** Static React SPA, UI-only. No backend, no routing library, no data layer.
- **Purpose:** A clickable demonstration of the full CareLink experience (landing, auth,
  and the four role dashboards) using fictional in-memory data.
- **Status:** Demo / prototype. Authentication, storage, screening rules, and audit
  logging are all simulated.

---

## 2. Tech stack (as built here)

| Concern | This prototype | Canonical target (`tech.md`) |
|---|---|---|
| Build | Vite 8 | Vite |
| UI library | React 19 + React DOM 19 | React 18 |
| Language | TypeScript 5.7 (strict) | TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + hand-written CSS in `index.css` | Tailwind + shadcn/ui (Radix) |
| Routing | None — local `useState` screen switching | React Router v6, lazy per-role groups |
| Server state | None | TanStack Query |
| Forms | Raw controlled inputs | React Hook Form + Zod |
| Backend | None | Supabase (Postgres, Auth, RLS, RPC, Storage, Realtime, Edge Functions) |
| Package manager | pnpm (`pnpm-lock.yaml`) + mise toolchain | npm (per `tech.md`) |
| Formatting | oxfmt | ESLint + Prettier |

> **Version conflicts to resolve on merge:** React 19 here vs React 18 in `tech.md`;
> pnpm here vs npm in `tech.md`; oxfmt here vs ESLint/Prettier in `tech.md`. Decide which
> wins before merging — the target repo's choices should normally win.

---

## 3. File inventory

```
SudoNim - Copy/
├─ index.html              # Vite shell, #root, loads /src/main.tsx. Has CareLink meta/title.
├─ src/
│  ├─ main.tsx             # React entrypoint. StrictMode → <App/>. Imports index.css.
│  ├─ App.tsx              # ★ ENTIRE APP — ~1,119 lines. All screens + components here.
│  ├─ index.css            # ★ ALL STYLES — ~1,021 lines. Design tokens + every component.
│  └─ vite-env.d.ts        # Vite type shim.
├─ public/
│  └─ carelinkpng.png      # Brand logo lockup (icon + wordmark), referenced as /carelinkpng.png.
├─ vite.config.ts          # React + Tailwind v4 + Figma Make plugins. @ alias → src.
├─ tsconfig.json           # strict, @/* path alias, bundler resolution.
├─ package.json            # deps + dev/build/preview/format scripts.
├─ .mise.toml              # Node + pnpm toolchain versions.
├─ product.md tech.md structure.md   # Steering docs (canonical architecture spec).
├─ AGENTS.md CLAUDE.md     # Figma Make agent instructions.
└─ .figma/make/            # Figma Make tooling (dev, deploy, site.json). Not app code.
```

**The only two files that carry the frontend you want to merge are `src/App.tsx` and
`src/index.css`.** Everything else is scaffolding or spec.

---

## 4. What `src/App.tsx` contains

One default-exported `App` component plus a set of in-file building blocks and screens.

### Shared primitives (reusable, good merge candidates)
- `Icon` — inline SVG icon set (~40 named paths: home, dashboard, people, card, rx, shield, qr, etc.).
- `Logo` — renders `/carelinkpng.png`, with a `compact` variant.
- `Button` — variants `primary | secondary | ghost | danger`, optional icon.
- `Badge` — tones `blue | teal | green | amber | red | gray`.
- `Card`, `Field`, `Modal` — layout/form/dialog wrappers.
- `QRCode` — a simulated (decorative) QR block grid, **not** a real encoder.
- `FontSizeSlider`, `ThemeTools`, `QuickSettings` — appearance controls (theme, text size,
  reduced motion, notifications), persisted to the browser.

### Screens / flows
- `Landing` — marketing hero, feature cards, `CareFlowVisual` (Patient → BHW → Physician).
- `RoleSelect` — registration step 1 (patient / staff / physician).
- `Login` — single sign-in card with a prototype **role selector** (citizen / barangay_staff / physician).
- `Registration` — patient self-register, physician apply (PRC ID + doc upload), and a
  staff "by invitation only" notice. Includes an in-memory `physicianApplicationStore`.
- Role dashboards for `citizen`, `barangay_staff`, `physician`, `admin`, driven by the
  `nav` and `roleMeta` maps and local `useState` for the active screen.

### Domain types defined inline
`Role` (`citizen | barangay_staff | physician | admin`), `FontSize`, `Density`,
`Appearance`, `Tone`, `RegKind`. These match the role names in `product.md`.

### Demo data (hard-coded, replace on merge)
- `patients` array (Maria Santos, Rogelio Dela Cruz, etc.).
- `physicianApplicationStore` — in-memory store with a snapshot/subscribe pattern.

---

## 5. What `src/index.css` contains

- **Design tokens** under `:root` and `[data-theme="dark"]`: brand blue `#1557d6`, teal,
  accent, green/amber/red semantic colors, ink/heading/muted text, surfaces, borders,
  radius, shadows, and a signature `--brand-gradient`. Light + dark both defined.
- **Preference hooks** via data attributes: `[data-font]`, `[data-density]`, `[data-motion="reduced"]`.
- **Component styles** for every piece of UI: buttons, badges, cards, auth/login layouts,
  app shell (sidebar, topbar, bottom nav), tables, masterlist rows, stats, dashboard grid,
  timeline, modals, stepper, ID card, screening outcome cards, and more.
- Fonts: **Bricolage Grotesque** (headings) + **Figtree** (body), loaded from Google Fonts
  at the top of the file. This matches the `tech.md` typography requirement.

> The color tokens here are close to but not identical with the exact hex values listed in
> `tech.md` (e.g. primary `#1557d6` here vs `#1B6FD1` in `tech.md`). Reconcile the token
> palette with the design system during merge.

---

## 6. Gap analysis: prototype vs canonical architecture

What exists here and what must be built or wired during the merge.

| Area | Prototype state | Needed for merge (per `structure.md` / `tech.md`) |
|---|---|---|
| Routing | `useState` screen switch | React Router v6 with role-guarded, lazy route groups (`/staff`, `/doctor`, `/me`, `/admin`) |
| File layout | 1 file (`App.tsx`) | Split into `src/features/*`, `src/components/*`, `src/lib/*`, `src/hooks/*`, `src/app/*` |
| Auth | Prototype role selector | Single `/login`, server-side role routing, no selector; Supabase Auth |
| Data | Hard-coded arrays | TanStack Query + Supabase; IndexedDB (Dexie) + outbox for offline staff screens |
| Forms | Raw inputs | React Hook Form + Zod (schemas mirror DB constraints) |
| QR | Decorative block grid | Signed QR payload `CL1.<code>.<ver>.<sig>`; `qrcode` for render, scanning via `BarcodeDetector` |
| Pairing key | Not implemented | Server-verified surname + birthdate (`YYYYMMDD`) gate on every physician record open |
| Risk | Static labels | `lib/risk.ts` client preview mirroring server `compute_risk` |
| i18n | Hard-coded English strings | react-i18next (`en.json`, `fil.json`), all user-facing text keyed |
| UI primitives | Hand-rolled `Button`/`Card`/etc. | shadcn/ui (Radix) — decide whether to adopt or keep the custom components |
| Icons | Inline SVG `Icon` | Keep as-is or swap for the project icon library |
| Mobile nav | CSS `.bottom-nav` exists | Wire bottom nav + bottom sheets for staff on phones |

---

## 7. Suggested merge approach

1. **Decide the target repo's stack wins.** Align React version, package manager (npm),
   and formatter (ESLint/Prettier) before copying code.
2. **Lift the design system first.** Move the token blocks and component CSS from
   `index.css` into the target's global stylesheet (`styles/tokens.css` + `index.css`),
   reconciling hex values with `tech.md`. This gives every migrated screen its look.
3. **Extract shared primitives** (`Icon`, `Button`, `Badge`, `Card`, `Field`, `Modal`,
   appearance controls) into `src/components/`. Decide per-component whether to keep the
   custom version or replace with shadcn/ui.
4. **Split screens into features.** Map each prototype screen to a `src/features/<feature>/`
   folder per `structure.md` (auth, masterlist, checkups, patients, referrals, scan,
   dashboard, citizen, admin, idcards, prescriptions).
5. **Introduce real routing** with React Router role groups, replacing the `useState`
   screen switch and the login role selector.
6. **Replace demo data** with the data layer: Supabase client (`lib/supabase.ts`), Dexie
   schema (`lib/db.ts`), outbox, and TanStack Query hooks. Remove `patients` and
   `physicianApplicationStore`.
7. **Wire the security-critical pieces** that the prototype only mocks: signed QR,
   pairing-key challenge, RLS-backed reads/writes, audit logging, and i18n.
8. **Carry over the Figma Make assets you need** (the logo `public/carelinkpng.png`) and
   drop Figma-only tooling (`.figma/`, the Figma Vite plugins in `vite.config.ts`,
   `.mise.toml`, `AGENTS.md`, `CLAUDE.md`) from the merged result.

---

## 8. Things to carry over verbatim

- `public/carelinkpng.png` — the brand logo lockup.
- Google Fonts import for Bricolage Grotesque + Figtree.
- The full color token system (light + dark) from `index.css`.
- The role model and labels from `App.tsx` — they already match `product.md`.

## 9. Things to drop or rebuild (do not copy as-is)

- The login **role selector** (canonical auth routes by role server-side).
- `QRCode` decorative grid (needs a real signed-QR renderer).
- In-memory `patients` and `physicianApplicationStore` demo data.
- `.figma/` tooling and the three Figma Vite plugins in `vite.config.ts`.
- `simulated`/`alert()` interactions (e.g. "Forgot password?").

---

*Generated as a merge reference. The canonical architecture lives in `product.md`,
`tech.md`, and `structure.md`; this prototype's UI lives entirely in `src/App.tsx` and
`src/index.css`.*
