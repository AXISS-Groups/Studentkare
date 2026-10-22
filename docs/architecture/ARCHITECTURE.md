# Studentkare Architecture

> Checked against the code on 2026-10-17 (base `ad01230`). The backend detail —
> routers, jobs, agents, environment — is in [`backend/ARCHITECTURE.md`](../../backend/ARCHITECTURE.md);
> this page is the system view. It describes what runs, not what is planned.

## Overview

A student health records and care platform for Indian campuses: a React web app and an
Expo app sharing one codebase, over a FastAPI + PostgreSQL backend. Roles: `STUDENT`,
`CAMPUS_ADMIN`, `VENDOR` (pharmacy / lab / clinic counters), `NMC_DOCTOR`, `SUPER_ADMIN`.

```
   React 18 + Vite (web)          Expo 52 / React Native 0.76 (native)
             └──────────── shared stores + ViewModels ────────────┘
                                      │ HTTPS, session cookie + X-CSRF-Token
                                      ▼
                     FastAPI (backend/app/main.py, 13 routers)
                      │                │                    │
                      ▼                ▼                    ▼
             PostgreSQL (Alembic)   Outbox → OpenWA / email   Agent Ayush
                                    (8 scheduled jobs)        (extractive, no model)
```

Not in the picture because they do not exist in this repo: an LLM in any request path,
order payments, video, ABDM / ABHA, and M18 (clinician prediction), which AGENTS.md
guardrail 5 requires to be a separate service with its own Postgres role.

---

## 1. Backend (`backend/`)

- **Stack:** Python 3.11, FastAPI 0.141, Pydantic 2, SQLAlchemy 2 + psycopg 3, Alembic
  (21 migrations, one head).
- **Auth:** OTP → HTTP-only `sacare_session` cookie with a CSRF token; DPDP consent
  recorded at signup; persisted TOTP two-step sign-in, enforced for
  `TWOFA_ENFORCED_ROLES` (default `SUPER_ADMIN`); opt-in remembered devices that never
  create a session without a code.
- **Clinical flows:** appointments the doctor confirms, completes or marks no-show;
  encounter notes the authoring doctor edits and signs; prescriptions and a live pharmacy
  dispense queue; lab orders where the lab files the report and a doctor reviews and
  releases it before the student sees it (a super admin assigns a reviewer when there is
  no ordering or treating doctor).
- **Identity:** the check-in pass is a server-signed code that rotates every 30 s, is
  single use, and is verified at partner counters through `POST /api/identity/verify`.
- **Notifications:** an outbox table (`care_outbox_events`) delivered by the
  `reminder_reconcile` job through OpenWA or email; super admins see it at `/admin/outbox`.
- **Background jobs:** eight allow-listed jobs in `services/workflow_scheduler.py`. They
  run at start-up, on a super-admin trigger, or through `scripts/workflow_worker.py`;
  there is no in-process timer.
- **Payments:** order checkout and refunds report `UNAVAILABLE`. Only the Student Plus
  subscription can reach Razorpay, and only when its keys are set.

### AI

**Agent Ayush** (`services/agent_ayush.py`) runs seven stages: crisis gate, scope guard
(no diagnosis, prescribing or dosage), personal-record refusal, retrieval over approved
knowledge, grounding check, extractive generation, output guard plus a recorded turn.
Generation quotes the retrieved passage; no model is called. Embeddings are a local
hashed n-gram space (`services/embeddings.py`), not a semantic model.

`services/llm_gateway.py` (an Ollama client) and `services/ai_client.py` exist, but
nothing the app loads imports them. The older endpoints that returned fixed,
clinical-looking output (triage council, SOAP generator, voice prescription, mesh
triage, agent system log) have been removed; `backend/ARCHITECTURE.md` §6 lists what
is still mounted.

---

## 2. Data

PostgreSQL in every environment except the test suite. Production applies Alembic
migrations and never calls `create_all`; development calls `create_all_tables()`.
88 tables, almost all `care_*` (accounts, sessions, consent records, two-factor,
remembered devices, documents, readings, catalogue, orders, appointments, consultation
sessions, prescriptions, dispenses, lab orders, encounter notes, outbox, audit, SOS,
erasure archives, knowledge chunks and agent turns, among others).

Known gaps: no migration adds `care_catalog.image_id` / `image_mime`, and no migration
contains the Postgres grants AGENTS.md guardrail 4 relies on for the Rule L commerce
firewall.

---

## 3. Request path

```
client ─▶ response headers ─▶ activity telemetry ─▶ per-IP rate limit ─▶ 12 MB body limit ─▶ CORS ─▶ route
                                                                                                     │
                                         session cookie → 2FA hold check → role gate → CSRF on writes
```

Records and orders are scoped to the signed-in account; staff routes check role and,
for doctors, the care relationship (own appointments, ordering or treating doctor).

---

## 4. Frontend (`src/`)

Feature modules with MVVM: MobX stores and ViewModels contain no DOM or React, so the
same code serves web and native.

```
src/features/<domain>/
  store/        MobX model: observable state + actions (DOM-free)
  viewmodel/    ViewModel: computed projections + view actions
  screens/ or views/   observer() components
  module.ts     route registration (path + role access)
```

- `src/store/AppStores.tsx` composes `StudentStore`, `RecordsStore`, `EmergencyStore`,
  `CampStore`, `FabricStore`, `ClaimsStore`, `ChatStore`, `LifeShareStore` and
  `MedicalIncidentStore`.
- `src/core/routing/registry.ts` holds `FeatureModule` / `FeatureRoute`;
  `src/core/routing/Router.tsx` builds the route tree and applies the role guard.
- `src/core/navigation/navigation.ts` is the only module that imports
  `react-router-dom`; features use the facade (`useRoutePath`, `useNavigate`). The web
  app mounts a `BrowserRouter` in `src/App.tsx`.
- Design system: tokens from `design/tokens/studentkare.tokens.json`, components in
  `src/design-system/`, icons only through `src/design-system/icons` (see `DESIGN.md`).

### Web and native

| Concern | Web | Native |
| --- | --- | --- |
| Entry | `src/main.tsx` → `src/App.tsx` | `src/native/index.ts` → `src/native/App.tsx` |
| Router | `src/core/navigation` (react-router) | `src/native/navigation.tsx` (React Navigation) |
| `react-native` | Vite alias → `react-native-web` | Metro (`metro.config.cjs`, `babel.config.cjs` at the repo root) |
| Typecheck | `tsconfig.json` | `config/tsconfig.native.json` |

`src/core/store/__tests__/crossPlatform.test.ts` instantiates `AppStores` and the
feature ViewModels in a non-DOM Node environment. Environment access is split through
`src/core/env.ts` / `src/core/env.web.ts`.

---

## 5. Build, deploy, CI

- **Containers:** `backend/Dockerfile` (python:3.11-slim, uvicorn) and
  `deploy/Dockerfile` (frontend). `docker-compose.yml` adds Postgres 16, PgBouncer and
  the monitoring stack; `docker-compose.prod.yml` overrides for production. Helm chart:
  `deploy/helm/studentkare`.
- **Node:** `package.json` pins `node` 20.x.
- **CI** (`.github/workflows/ci.yml`): lint, icon checks, `tsc`, knip, Vitest, the
  production build, ruff, the backend suite on SQLite, gitleaks, the production
  start-up guard, a non-blocking `npm audit`, and compose validation; plus a
  `backend-postgres` job that migrates an empty Postgres 15 to head and runs the backend
  suite against it.
- **Environment:** see the table in `backend/ARCHITECTURE.md` §3 and `.env.dev.example`
  / `.env.prod.example`.
