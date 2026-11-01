# AlumniConnect

AlumniConnect is an AI-based digital ecosystem that bridges the gap between students, alumni, universities, and industry. It enables intelligent mentorship, knowledge sharing, real-world project challenges, career opportunities, professional networking, and immersive 3D collaboration, empowering students to develop skills and build successful futures.

**Real Problems. Student Solutions. Alumni Recognition.**
Alumni post real-world challenges, students solve them, alumni evaluate and recognize the work, and companies discover demonstrated talent — with student consent at every step.

---

## Current status

The implementation covers the planned 15 phases and is verified against the local development stack (SQLite, local Express API, Vite build, headless-Chrome audits). It has **not** been launched to production. Deployment scaffolding — Dockerfiles, nginx reverse proxy, Compose with PostgreSQL, CI, backup/restore tooling — is in place, but the container stack has not been executed in this environment.

Per-phase status and verification evidence:

| Document | Purpose |
| --- | --- |
| [`docs/MASTER_PHASE_COMPLETION_TRACKER.md`](docs/MASTER_PHASE_COMPLETION_TRACKER.md) | Requirement-by-requirement status, evidence and remaining work |
| [`docs/PHASE-1-7_PENDING_BUILD_REPORT.md`](docs/PHASE-1-7_PENDING_BUILD_REPORT.md) | Phase 1–7 build report, verification commands and environment limits |
| [`docs/PHASE-1-REQUIREMENTS.md`](docs/PHASE-1-REQUIREMENTS.md) | Requirements, roles, workflows, architecture, data model and roadmap |

All demo content (challenges, metrics, events, certificates, dashboards) is explicitly labelled as sample data, including records served from the database. No university partnership, statistic, testimonial or accreditation claim is fabricated.

## What is implemented

- Four portals — student, alumni, university and admin — sharing one identity, database and design system.
- Challenges with draft/publish, rubrics, submissions, evaluation and certificates; public certificate verification.
- Mentorship, opportunities with consent gating, portfolios, discovery, events, knowledge resources and support.
- Alumni AI representative with moderation controls (Level 1–2 assistance, not an autonomous agent).
- Metaverse rooms with 2D avatar fallback and server-owned presence over SSE.
- Multi-locale UI (en/hi/es/fr/ar) with RTL support and locale-aware dates.
- Web Push device notifications, service-worker offline shell, admin MFA (TOTP), optional ClamAV upload scanning and OTLP trace export.
- Reliability console with latency/error metrics, webhook alerts, backup creation/verification and a restore drill.

## Stack

- React 18 + TypeScript + Vite 5, custom path routing
- Tailwind CSS 3 with a token-based theme (`ink`, `brand`, `azure`, `mint`, `cream`, `mist`, `ash`)
- Express 4 + Prisma 6 — SQLite for development, PostgreSQL schema for deployment
- Three.js static metaverse app served from the web app's `public/` directory
- Node 24 (Node 18.18+ should work), npm workspaces

## Run it

```bash
npm install          # installs both workspaces
npm run db:migrate   # apply Prisma migrations (SQLite dev database)
npm run db:seed      # seed synthetic demo records (idempotent)
npm run dev          # API :4000 + web :5173 in parallel
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:5173 |
| API health | http://localhost:4000/api/health |
| Metaverse hub | http://localhost:5173/metaverse/index.html |

Configuration lives in `apps/api/.env` (see `apps/api/.env.example`). Never commit real secrets; the example file keeps VAPID and SMTP values empty.

## Demo portal logins

Run `npm run db:seed` before using these accounts. They are synthetic local-development accounts only and must not be used in a deployed environment.

All four portals use the demo password `DemoPass123!`:

| Portal | Email | Login route |
| --- | --- | --- |
| Student | `student1@example.edu` | `/student/login` |
| Alumni | `meera.nair@example.edu` | `/alumni/login` |
| University | `registrar@demo.edu` | `/university/login` |
| Admin | `admin@example.edu` | `/admin/login` |

## Tests and verification

```bash
npm run typecheck      # web + API TypeScript
npm run build          # production web build
npm run test:unit      # module-level node:test suites
npm run test:smoke     # API smoke suite (spawns API + mock integrations)
npm run test:ui        # headless-Chrome route, accessibility and contrast audit
npm run test:rtl       # Arabic RTL layout checks
npm run test:config    # deployment configuration consistency checks
npm run test:staging   # production-shaped build + API + proxy checks
npm run test:push-matrix  # browser push capability and layout matrix
npm run test:load      # load smoke test
```

`test:ui`, `test:staging` and `test:push-matrix` expect Chrome and a running dev server (see each tool's header). The unit, smoke and config suites run in CI; see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Structure

```
apps/
  api/
    prisma/          schema, migrations, PostgreSQL schema, seed
    src/routes/      auth, challenges, mentorship, certificates, metaverse,
                     notifications, admin, platform/ops, public API
    src/lib/         notify, push, storage, clamav, telemetry, totp, ...
    test/            smoke suite and node:test unit suites
  web/
    src/             portals, components, i18n, API client, design tokens
    public/          PWA manifest, service worker, metaverse app and 3D assets
deploy/              nginx config and deployment assets
docs/                requirements, architecture, operations, phase reports
tools/               audits, backups, load/perf, config and staging checks
```

## Scope limits

- Payments are out of MVP scope.
- Alumni AI stays at assistance Level 1–2 by design.
- Push delivery and mobile behaviour are verified in emulated Chromium and FCM; a physical Android/iOS device matrix and real-user Phase 5 validation remain outstanding (see [`docs/PUSH_DEVICE_MATRIX.md`](docs/PUSH_DEVICE_MATRIX.md) and the tracker).
- Upload malware scanning requires a clamd daemon; trace export requires an OTLP collector.

## Licence

Private project. All rights reserved.
