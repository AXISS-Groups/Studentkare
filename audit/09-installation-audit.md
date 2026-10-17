# 09 — Installation Guide Validation

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

`README.md`, `docs/guides/CONTRIBUTING.md`, `docker-compose.yml`, `deploy/*` are **unchanged** since baseline, so steps 1–8 and 10–14 keep their status. Changes:

| Step | New status | Why |
|---|---|---|
| 7 Environment variables | PARTIALLY CORRECT (worse) | new required keys `TWO_FACTOR_ENCRYPTION_KEY`, `PASS_SIGNING_SECRET`, `DPDP_ARCHIVE_KEY`, `DPDP_ARCHIVE_RETENTION_DAYS`, `INTEGRATIONS_ENCRYPTION_KEY`, `SEED_DEMO_DATA` not in any deploy config (TD-40, report 25) |
| 9 Demo login | **INCORRECT** (was CORRECT) | needs `SEED_DEMO_DATA=true` and `DEV_OTP_CONSOLE=true`; Docker dev sets neither; CONTRIBUTING §9 not updated (TD-41) |
| 14 Mobile | PARTIALLY CORRECT (was MISSING) | `src/native/README.md` documents Expo start and API base; not linked from README |
| 13 Production deploy | PARTIALLY CORRECT (unchanged) + missing feature keys (TD-40) |

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Sources compared: `README.md`, `docs/guides/CONTRIBUTING.md`, `.cursorrules`, against `docker-compose.yml`, `.env.dev.example`, `backend/app/main.py`, `backend/services/db_sql.py`, `vite.config.ts`, `scripts/start-dev-backend.py`, `backend/tests/conftest.py`, `.github/workflows/ci.yml`. Nothing was installed or run (read-only audit), so runtime success is inferred and marked where uncertain.

---

### 1. Clone URL
Documentation says: `git clone https://github.com/kktejas07/Studentkare.git` (`CONTRIBUTING.md:41,50`); README says `git clone <repo>`.
Repository actually requires: `origin` is `https://github.com/AXISS-Groups/Studentkare`.
Status: **INCORRECT** (CONTRIBUTING points to a different, possibly personal fork).

### 2. Prerequisites
Documentation says: Node 20.x / npm 10+, Python 3.11, Git, Docker Compose v2 (`CONTRIBUTING.md` §1).
Repository actually requires: `.nvmrc` = 20, `.python-version` = 3.11, `engines.node` = `20.x`; matches. Not enforced (`engine-strict` unset).
Status: **CORRECT**

### 3. Development database
Documentation says: "Root `docker-compose.yml` is the development default (SQLite on the `care-data` volume)" (`README.md:9-10`, `CONTRIBUTING.md:35-36,71,96`); `.env.dev.example` copy gives "`DATABASE_URL=sqlite:////data/studentkare.db`" (`CONTRIBUTING.md` §4).
Repository actually requires: `docker-compose.yml` runs a `postgres:16-alpine` service and hard-sets backend `DATABASE_URL=postgresql://studentkare:studentkare@postgres:5432/studentkare`. There is no `care-data` volume (volumes: `postgres-data`, `prometheus-data`, `loki-data`, `grafana-data`). `.env.dev.example` contains a Postgres placeholder URL (`postgresql://studentkare-user:<PASSWORD>@<HOST>…`). `main.py:30-33` refuses to start outside `testing` without a `postgresql://` URL.
Status: **INCORRECT** — the documented database, volume name and reset command (`down -v` "deletes the `care-data` volume") are all wrong.

### 4. Docker quick start (`cp .env.dev.example .env && docker compose up --build`)
Documentation says: opens app at `http://localhost:3000`, API health at `:8000/api/health`.
Repository actually requires: works in principle — compose `environment:` overrides the placeholder `DATABASE_URL` from `.env`. But it also starts **10 containers** (postgres, backend, pgbouncer, frontend, otel-collector, prometheus, loki, promtail, grafana, alertmanager). `pgbouncer` points at `dokploy-postgres` by default (`docker-compose.yml`, `UPSTREAM_DATABASE_URL` default), which does not exist locally, so it will fail/restart (nothing depends on it). Promtail mounts host `/var/log`, which does not exist the same way on Docker Desktop for Windows. Frontend is a **production nginx build** (`deploy/Dockerfile`), so there is no hot reload; every UI change needs a rebuild.
Status: **PARTIALLY CORRECT** (likely starts; undocumented heavy footprint, a failing pgbouncer, and no HMR).

### 5. Native setup — frontend
Documentation says: `npm ci && npm run dev`.
Repository actually requires: `npm run dev` runs Vite with `autoBackendPlugin` (`vite.config.ts:8-34`), which **silently spawns** `python scripts/start-dev-backend.py` if nothing answers on `:8000`. That script sets `APP_ENV=testing` and, via `db_sql.py:26-28`, uses SQLite `./studentkare_test.db` in the current directory — the opposite of the "Postgres-only" rule. It uses whatever `python` is on PATH (not the documented venv), so it fails if backend deps are not installed globally.
Status: **PARTIALLY CORRECT** (command right, behaviour undocumented and environment-dependent).

### 6. Native setup — backend
Documentation says (`CONTRIBUTING.md` §5): `DEV_OTP_CONSOLE=true APP_ENV=development ALLOWED_ORIGINS=… uvicorn app.main:app --app-dir backend --reload --port 8000`.
Repository actually requires: a `postgresql://` `DATABASE_URL` (no default). `main.py:30-33` raises `RuntimeError("Postgres-only: set DATABASE_URL to a postgresql:// URL.")` before the app is created. The guide never mentions installing or starting Postgres for native mode.
Status: **INCORRECT** — the documented command fails at import.

### 7. Environment variables
Documentation says: "Full variable reference: `docs/integration-guide.md`; backend schema: `backend/config/.env.example`".
Repository actually requires: 106 distinct env vars are read by non-test backend code; 35 appear in none of `backend/config/.env.example`, `docs/integration-guide.md`, `.env.dev.example`, `.env.prod.example`, including `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLUS_PLAN_ID`, `STRIPE_SECRET_KEY`, `AUDIT_HMAC_SECRET`, `MASTER_KMS_KEY_ID`, `KMS_REGION`, `POSTAL_WEBHOOK_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `USE_PGBOUNCER`, `MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY`, `N8N_WEBHOOK_BASE_URL`. Frontend reads `VITE_API_BASE_URL`, `VITE_ALLOW_OFFLINE_AUTH`, `VITE_DEMO_DATA`, `VITE_SENTRY_DSN`, `VITE_APP_VERSION`; only some are documented.
Status: **PARTIALLY CORRECT**

### 8. Migrations / seed
Documentation says: nothing for local dev; demo logins listed in `CONTRIBUTING.md` §9.
Repository actually requires: non-production startup runs `create_all_tables()` and `seed_demo_data()` automatically (`main.py:79-106`); Alembic only runs in production. `backend/scripts/seed_catalog.py`, `seed_demo.py`, `provision_account.py` exist without documentation.
Status: **MISSING** (no instructions for running Alembic locally or creating a migration).

### 9. Demo login
Documentation says: OTP `123456` for `demo.*@studentkare.test` and `98765432xx` numbers (`CONTRIBUTING.md` §9, `.cursorrules`).
Repository actually requires: matches `workflow_auth.py:292-293,348-349` (active whenever `APP_ENV != "production"`).
Status: **CORRECT** (but see 17: this is a security risk outside dev).

### 10. Frontend tests / lint / build
Documentation says: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
Repository actually requires: same as CI. `npm run build` = `tsc && vite build && node scripts/prerender-public-routes.js`. On a stale `node_modules` (as on the audit machine), `tsc` fails on missing `expo-camera` / `expo-local-authentication` types.
Status: **CORRECT** (commands), outcome UNKNOWN without running.

### 11. Backend tests
Documentation says: `PYTHONPATH=backend backend/.venv/bin/pytest` from repo root.
Repository actually requires: CI runs from `backend/` with `PYTHONPATH=.:app:..` and a Postgres `DATABASE_URL` (`ci.yml` step 8). The pytest config lives in `backend/config/pyproject.toml`, which pytest will not discover from the repo root; `backend/tests/conftest.py:11-13` defaults to SQLite `APP_ENV=testing`. Running from root with only `PYTHONPATH=backend` will likely fail to import `tests`-relative helpers (`workflow_server`, `postgres_support`) — the exact problem CI's comment describes.
Status: **PARTIALLY CORRECT / likely INCORRECT** (UNKNOWN without execution).

### 12. Backend lint
Documentation says: `ruff check backend`.
Repository actually requires: CI runs `ruff check .` inside `backend/` so that `backend/ruff.toml` is found. From the root, `ruff check backend` also discovers `backend/ruff.toml`. 
Status: **CORRECT**

### 13. Production deployment
Documentation says: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build` with vault-injected env (`docker-compose.prod.yml:2`), `docs/DEPLOYMENT_GUIDE.md`.
Repository actually requires: the overlay **does not remove** the dev `postgres` service (published on `5432` with password `studentkare`) or `pgbouncer` (`:latest`, published on `6432`). `tempo` publishes `4317/4318`, which `otel-collector` already publishes → host port conflict. `frontend` sets `replicas: 2` with a fixed host port `3000:80` → second replica cannot bind outside Swarm. A Helm chart (`deploy/helm`) also exists; which path is production is not stated.
Status: **PARTIALLY CORRECT** (see 18).

### 14. Mobile
Documentation says: nothing in README/CONTRIBUTING.
Repository actually requires: `npm run start:native` (Expo), `config/mobile/app.json`, `config/metro.config.cjs`, `config/babel.config.cjs`, root `app.json`.
Status: **MISSING**

## Summary

| Step | Status |
|---|---|
| Clone URL | INCORRECT |
| Prerequisites | CORRECT |
| Dev database description | INCORRECT |
| Docker quick start | PARTIALLY CORRECT |
| Native frontend | PARTIALLY CORRECT |
| Native backend | INCORRECT |
| Env vars | PARTIALLY CORRECT |
| Migrations / seed | MISSING |
| Demo login | CORRECT |
| Frontend checks | CORRECT |
| Backend tests | PARTIALLY CORRECT |
| Backend lint | CORRECT |
| Production deploy | PARTIALLY CORRECT |
| Mobile | MISSING |
