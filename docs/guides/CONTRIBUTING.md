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

Root `docker-compose.yml` is the development default (SQLite on the
`care-data` volume, `APP_ENV=development`). Do this once per clone.

macOS / Linux / Git Bash:

```bash
git clone https://github.com/kktejas07/Studentkare.git
cd Studentkare
cp .env.dev.example .env
docker compose up --build
```

Windows PowerShell:

```powershell
git clone https://github.com/kktejas07/Studentkare.git
cd Studentkare
Copy-Item .env.dev.example .env
docker compose up --build
```

Windows CMD:

```cmd
git clone https://github.com/kktejas07/Studentkare.git
cd Studentkare
copy .env.dev.example .env
docker compose up --build
```

Open **http://localhost:3000** in your browser.
API health: **http://localhost:8000/api/health**.

## 3. Daily workflow — run & stop the project

Same `docker compose` commands on every OS and shell — run these every time
you develop. (`down` keeps the `care-data` volume, so your dev database
survives restarts.)

```bash
# Start (every day)
docker compose up --build     # first run, or after deps/Dockerfile changes
docker compose up             # foreground: logs in your terminal, Ctrl+C stops
docker compose up -d          # detached: runs in the background instead

# While running
docker compose ps             # status + health of both services
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

⚠️ `docker compose down -v` **deletes the `care-data` volume and your dev
database.** Only use it for a deliberate full reset — never as a normal stop.

## 4. Configuration

- Local dev: copy `.env.dev.example` to `.env`. Safe throwaway defaults
  (`DATABASE_URL=sqlite:////data/studentkare.db`,
  `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`).
- Production: vault-injected env matching `.env.prod.example`
  (real Postgres `DATABASE_URL`, explicit FQDN `ALLOWED_ORIGINS`, stable
  `OTP_HASH_SECRET`). Never commit or reuse the dev `.env`.
- Full variable reference: `docs/integration-guide.md`;
  backend schema: `backend/config/.env.example` (production reference only).
- Frontend dev proxy: Vite forwards `/api` to `http://127.0.0.1:8000`
  (override with `CARE_API_TARGET`). Production builds use
  `VITE_API_BASE_URL=/api`, proxied by Nginx to the backend container.

## 5. Native setup (no Docker, secondary)

Frontend first, then backend in a separate terminal.

macOS / Linux / Git Bash:

```bash
# Frontend
npm ci
npm run dev

# Backend (in a separate terminal tab)
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/config/requirements-dev.txt
DEV_OTP_CONSOLE=true APP_ENV=development ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 backend/.venv/bin/uvicorn app.main:app --app-dir backend --reload --port 8000
```

Windows PowerShell:

```powershell
# Frontend
npm ci
npm run dev

# Backend (in a separate terminal)
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\pip install -r backend\config\requirements-dev.txt
$env:DEV_OTP_CONSOLE = 'true'
$env:APP_ENV = 'development'
$env:ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
backend\.venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000
```

Windows CMD:

```cmd
REM Frontend
npm ci
npm run dev

REM Backend (in a separate window)
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\pip install -r backend\config\requirements-dev.txt
set DEV_OTP_CONSOLE=true
set APP_ENV=development
set ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
backend\.venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000
```
(`set` applies to the current CMD window only — keep that window open.)

## 6. Verify before you push

Mirror CI (`.github/workflows/ci.yml`). All platforms; use Git Bash,
PowerShell, or CMD on Windows as shown.

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

Backend (from repo root):

```bash
# macOS / Linux / Git Bash
PYTHONPATH=backend backend/.venv/bin/pytest
```

```powershell
# Windows PowerShell
$env:PYTHONPATH = 'backend'
backend\.venv\Scripts\pytest
```

```cmd
REM Windows CMD
set PYTHONPATH=backend
backend\.venv\Scripts\pytest
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

We use a `main` / `development` / feature-branch flow (GitFlow-lite):

```text
main  ───────────────────────────────────────────────▶  production, protected
         ▲                                    │
         │  release PR (maintainers)          │
development  ─────────────────────────────────▶  integration, protected
         ▲                                    │
         │  feature PR + review + CI          │
feat/*, fix/*, docs/*  ──────────────────────▶  your work
```

Rules:

- **Never commit directly to `main` or `development`.** All work happens on
  a short-lived branch cut from the latest `development`.
- **Branch names:** `feat/<slug>`, `fix/<slug>`, `docs/<slug>`,
  `chore/<slug>` (matches the existing `feat/*` branches and CI).
- **Keep your branch fresh:** rebase or merge `development` into it before
  opening the PR and again if review takes a while.
- **PR base is `development`, never `main`.** `development` flows into
  `main` only through a reviewed release PR (maintainers).
- **CI must be green** (lint, typecheck, unit tests, production build,
  backend suite, secret scan) plus one reviewer approval.
- **Small, atomic commits** using Conventional Commits
  (`feat: ...`, `fix: ...`, `docs: ...`).

Start work:

```bash
git fetch origin
git checkout development
git pull origin development
git checkout -b feat/your-feature-name
# ... work, then run the §6 verification ...
git push -u origin feat/your-feature-name
```

Then open a PR with base `development`, fill out the Pull Request template
completely (including verification results), and request review.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose` reports a missing `DATABASE_URL` / `ALLOWED_ORIGINS` / `OTP_HASH_SECRET` | You skipped the env copy. Run the `cp`/`Copy-Item`/`copy` step for your shell, or rely on the built-in dev defaults in root `docker-compose.yml`. |
| Backend exits complaining about SQLite in production | You are running the production overlay without Postgres. For local dev use plain `docker compose up --build` (defaults `APP_ENV=development`). |
| Port `3000` or `8000` already in use | Stop the other process or previous stack (`docker compose down`), then retry. |
| Wrong Node/Python version | Match `.nvmrc` (20.x) and `.python-version` (3.11); CI and Docker both pin these. |
| Stale frontend build | `rm -rf node_modules dist` (or `Remove-Item -Recurse node_modules,dist` in PowerShell), then `npm ci`. |
| `scripts/*.sh` fails with `bad interpreter` on Windows | Use Git Bash, or re-checkout after the `.gitattributes` LF fix. |
| Dev data gone after restart | You used `down -v`, which deletes the volume. Normal stop is `docker compose down` (no `-v`). |
| PR opened against `main` by mistake | Change the PR base to `development` — `main` only receives release PRs. |

## 9. Getting help

- Setup details: this file. Project overview: `README.md`.
- Environment reference: `docs/integration-guide.md`.
- Demo logins for local development (`DEV_OTP_CONSOLE=true` or seeded accounts):
  - **OTP Code**: `123456`
  - **Student**: `demo.student@studentkare.test` (Email) or `9876543210` (WhatsApp)
  - **Admin**: `demo.admin@studentkare.test` (Email) or `9876543211` (WhatsApp)
  - **Vendor**: `demo.vendor@studentkare.test` (Email) or `9876543212` (WhatsApp)
- For anything else, open an issue with your OS, shell, and the full
  command output.
