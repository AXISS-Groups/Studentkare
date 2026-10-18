# Contributing to Studentkare

Thank you for contributing to **Studentkare**! This guide covers everything you
need to set up, verify, and submit changes. End-user docs live in `README.md`;
environment details live in `docs/integration-guide.md`.

# Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick start — first-time setup (Docker)](#2-quick-start--first-time-setup-docker)
3. [Daily workflow — run & stop the project](#3-daily-workflow--run--stop-the-project)
4. [Configuration](#4-configuration)
5. [Native setup (no Docker, secondary)](#5-native-setup-no-docker-secondary)
6. [Verify before you push](#6-verify-before-you-push)
7. [Branching & pull request workflow](#7-branching--pull-request-workflow)
8. [Troubleshooting](#8-troubleshooting)
9. [Getting help](#9-getting-help)

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js + npm | 20.x / 10+ (see `.nvmrc`) | `node --version` |
| Python | 3.11 (see `.python-version`) | `python3 --version` (Bash) or `py --version` (PowerShell) |
| Git | any recent | `git --version` |
| Docker + Compose v2 | Desktop (Windows/macOS) or Engine (Linux) | `docker compose version` |

No WSL requirement — Docker Desktop on Windows/macOS or Docker Engine on
Linux is enough. Git Bash works wherever Bash commands are shown.

## 2. Quick start — first-time setup (Docker)

Root `docker-compose.yml` is the development default: Postgres 16 (the
`postgres` service, data on the `postgres-data` volume), the backend with
`APP_ENV=development`, the scheduled-jobs `worker`, the web app (a production
nginx build, so UI changes need `docker compose up --build frontend`) and a
local monitoring stack. Do this once per clone.

macOS / Linux / Git Bash:

```bash
git clone https://github.com/AXISS-Groups/Studentkare.git
cd Studentkare
cp .env.dev.example .env
docker compose up --build
```

Windows PowerShell:

```powershell
git clone https://github.com/AXISS-Groups/Studentkare.git
cd Studentkare
Copy-Item .env.dev.example .env
docker compose up --build
```

Windows CMD:

```cmd
git clone https://github.com/AXISS-Groups/Studentkare.git
cd Studentkare
copy .env.dev.example .env
docker compose up --build
```

Open **http://localhost:3000** in your browser.
API health: **http://localhost:8000/api/health**.
Sign in with a demo account (see [§9](#9-getting-help)).

## 3. Daily workflow — run & stop the project

Same `docker compose` commands on every OS and shell — run these every time
you develop. (`down` keeps the `postgres-data` volume, so your dev database
survives restarts.)

```bash
# Start (every day)
docker compose up --build     # first run, or after deps/Dockerfile changes
docker compose up             # foreground: logs in your terminal, Ctrl+C stops
docker compose up -d          # detached: runs in the background instead

# While running
docker compose ps             # status + health of every service
docker compose logs -f        # follow all logs (Ctrl+C to exit)
docker compose logs -f backend

# Stop (every time you finish)
docker compose down           # stops containers, keeps data volume
```

Rebuild cleanly when changing branches or chasing a stale build:

```bash
docker compose build --no-cache backend   # rebuild one service from scratch
docker compose up --build                 # rebuild + start
```

⚠️ `docker compose down -v` **deletes the `postgres-data` volume and your dev
database.** Only use it for a deliberate full reset — never as a normal stop.

Database schema: Docker dev creates tables from the models at startup.
Production applies Alembic migrations, and CI checks that the two agree
(`alembic check`). When you change a model, add a migration in the same PR:

```bash
cd backend
DATABASE_URL=postgresql://studentkare:studentkare@localhost:5432/studentkare?sslmode=disable \
  .venv/bin/alembic -c config/alembic.ini revision --autogenerate -m "describe the change"
```

## 4. Configuration

- Local dev: copy `.env.dev.example` to `.env`. Safe throwaway defaults:
  a local Postgres `DATABASE_URL` (Docker overrides it with its own
  `postgres` service), `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`,
  and the demo sign-in flags `SEED_DEMO_DATA=true` and `DEV_OTP_CONSOLE=true`,
  which the backend ignores unless `APP_ENV` is `development` or `testing`.
- Production: vault-injected env matching `.env.prod.example`
  (real Postgres `DATABASE_URL`, explicit FQDN `ALLOWED_ORIGINS`, stable
  `OTP_HASH_SECRET`, and the five feature keys listed there). Never commit or
  reuse the dev `.env`.
- Full variable reference: `docs/integration-guide.md`;
  backend schema: `backend/config/.env.example` (production reference only).
- Frontend dev proxy: Vite forwards `/api` to `http://127.0.0.1:8000`
  (override with `CARE_API_TARGET`). Production builds use
  `VITE_API_BASE_URL=/api`, proxied by Nginx to the backend container.

## 5. Native setup (no Docker, secondary)

The backend needs Postgres even natively; the simplest way is to run only the
database in Docker: `docker compose up -d postgres`. Then start the backend
and the frontend in separate terminals.

Note: if nothing answers on port 8000, `npm run dev` starts its own throwaway
backend (`scripts/start-dev-backend.py`: SQLite, `APP_ENV=testing`, demo mode
on). Start the real backend first so you work against Postgres.

macOS / Linux / Git Bash:

```bash
# Backend (first terminal)
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/config/requirements-dev.txt
DATABASE_URL=postgresql://studentkare:studentkare@localhost:5432/studentkare?sslmode=disable \
SEED_DEMO_DATA=true DEV_OTP_CONSOLE=true APP_ENV=development \
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 \
backend/.venv/bin/uvicorn app.main:app --app-dir backend --reload --port 8000

# Frontend (second terminal)
npm ci
npm run dev
```

Windows PowerShell:

```powershell
# Backend (first terminal)
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\pip install -r backend\config\requirements-dev.txt
$env:DATABASE_URL = 'postgresql://studentkare:studentkare@localhost:5432/studentkare?sslmode=disable'
$env:SEED_DEMO_DATA = 'true'
$env:DEV_OTP_CONSOLE = 'true'
$env:APP_ENV = 'development'
$env:ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
backend\.venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000

# Frontend (second terminal)
npm ci
npm run dev
```

Windows CMD:

```cmd
REM Backend (first window)
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\pip install -r backend\config\requirements-dev.txt
set DATABASE_URL=postgresql://studentkare:studentkare@localhost:5432/studentkare?sslmode=disable
set SEED_DEMO_DATA=true
set DEV_OTP_CONSOLE=true
set APP_ENV=development
set ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
backend\.venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000

REM Frontend (second window)
npm ci
npm run dev
```
(`set` applies to the current CMD window only — keep that window open.)

Mobile (Expo): see `src/native/README.md` for `EXPO_PUBLIC_API_BASE_URL`
and `npm run start:native`.

## 6. Verify before you push

Mirror CI (`.github/workflows/ci.yml`). All platforms; use Git Bash,
PowerShell, or CMD on Windows as shown.

```bash
npm run lint
npm run icons:check
npm run icons:ratchet
npx tsc --noEmit
npx tsc --noEmit -p config/tsconfig.native.json
npx vitest run
npm run build
```

Backend (run from `backend/`, exactly as CI does; the suite uses SQLite by
default, and Postgres-only tests skip unless `TEST_DATABASE_URL` is set):

```bash
# macOS / Linux / Git Bash
cd backend
PYTHONPATH=.:app:.. .venv/bin/python -m pytest tests/
```

```powershell
# Windows PowerShell
cd backend
$env:PYTHONPATH = '.;app;..'
.venv\Scripts\python -m pytest tests/
```

```cmd
REM Windows CMD
cd backend
set PYTHONPATH=.;app;..
.venv\Scripts\python -m pytest tests/
```

Backend lint (CI installs `ruff` separately; install it if missing):

```bash
# macOS / Linux / Git Bash
backend/.venv/bin/ruff check backend
```

```powershell
# Windows PowerShell
backend\.venv\Scripts\ruff check backend
```

```cmd
REM Windows CMD
backend\.venv\Scripts\ruff check backend
```

A PR is done when all of the above pass, no secrets or PHI are logged or
committed, and every interactive element keeps its accessible label and
44×44 target.

## 7. Branching & pull request workflow

We work trunk-style on `main`: short-lived branches, one PR each, merged
into `main` once CI is green and a reviewer approves.

```text
main  ───────────────────────────────────────────────▶  integration + releases, protected
         ▲
         │  PR + review + CI
feat/*, fix/*, docs/*, chore/*, ci/*  ───────────────▶  your work
```

(`development` is no longer used; it stopped receiving changes on
2026-10-08. Don't branch from it.)

Rules:

- **Never commit directly to `main`.** All work happens on a short-lived
  branch cut from the latest `main`.
- **One ticket per branch and PR** (see `CLAUDE.md`).
- **Branch names:** `feat/<slug>`, `fix/<slug>`, `docs/<slug>`,
  `chore/<slug>`, `ci/<slug>`.
- **Keep your branch fresh:** rebase on or merge `main` before opening the PR
  and again if review takes a while.
- **CI must be green** (lint, icon checks, both type-checks, unit tests,
  production build, backend suite on SQLite and on Postgres, secret scan)
  plus one reviewer approval.
- **Small, atomic commits** using Conventional Commits
  (`feat: ...`, `fix: ...`, `docs: ...`).

Start work:

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
# ... work, then run the §6 verification ...
git push -u origin feat/your-feature-name
```

Then open a PR with base `main`, fill out the Pull Request template
completely (including verification results), and request review.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose` reports a missing `DATABASE_URL` / `ALLOWED_ORIGINS` / `OTP_HASH_SECRET` | You skipped the env copy. Run the `cp`/`Copy-Item`/`copy` step for your shell, or rely on the built-in dev defaults in root `docker-compose.yml`. |
| Backend exits with `Postgres-only: set DATABASE_URL to a postgresql:// URL` | Native backend without a database. Run `docker compose up -d postgres` and set `DATABASE_URL` as in §5. |
| Sign-in says the code could not be sent (503) | Demo mode is off. Check that `.env` has `SEED_DEMO_DATA=true` and `DEV_OTP_CONSOLE=true` and `APP_ENV=development`, then restart the backend. |
| Super admin sign-in asks for an authenticator | Expected: super admins and counsellors must set up two-step sign-in. Scan the QR code with any authenticator app. |
| Port `3000` or `8000` already in use | Stop the other process or previous stack (`docker compose down`), then retry. |
| Wrong Node/Python version | Match `.nvmrc` (20.x) and `.python-version` (3.11); CI and Docker both pin these. |
| Stale frontend build | `rm -rf node_modules dist` (or `Remove-Item -Recurse node_modules,dist` in PowerShell), then `npm ci`. |
| `scripts/*.sh` fails with `bad interpreter` on Windows | Use Git Bash, or re-checkout after the `.gitattributes` LF fix. |
| Dev data gone after restart | You used `down -v`, which deletes the volume. Normal stop is `docker compose down` (no `-v`). |
| PR opened against `development` by mistake | Change the PR base to `main`; `development` is no longer used. |

## 9. Getting help

- Setup details: this file. Project overview: `README.md`.
- Environment reference: `docs/integration-guide.md`.
- Demo logins for local development. They need `APP_ENV=development` (or
  `testing`) **and** `SEED_DEMO_DATA=true` **and** `DEV_OTP_CONSOLE=true`, all
  three set in `.env.dev.example`; outside development and testing the flags
  are ignored and these accounts do not exist.
  - **OTP Code**: `123456`
  - **Student**: `demo.student@studentkare.test` (Email) or `9876543210` (WhatsApp)
  - **Super admin**: `demo.admin@studentkare.test` (Email) or `9876543211` (WhatsApp); sets up 2FA on first sign-in
  - **Partner (vendor)**: `demo.vendor@studentkare.test` (Email) or `9876543212` (WhatsApp)
  - **Doctor**: `demo.doctor@studentkare.test` (Email) or `9876543213` (WhatsApp)
  - **Campus admin**: `demo.campus@studentkare.test` (Email) or `9876543214` (WhatsApp)
- For anything else, open an issue with your OS, shell, and the full
  command output.
