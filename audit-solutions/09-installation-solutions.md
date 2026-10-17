# 09 — Installation & Setup: Solutions

Answers [audit/09-installation-audit.md](../audit/09-installation-audit.md). Owns **TD-14** (wrong setup docs) and **TD-41** (Docker quick start cannot sign in). The dev compose profile with hot reload is owned by [21](21-developer-experience-solutions.md).

---

## TD-41 — Local sign-in works out of the box

**Goal:** After `cp .env.dev.example .env && docker compose up --build`, a developer can sign in as a demo student, admin, vendor or doctor. Production and shared environments stay unaffected.

**Approach:** Opt into demo mode in the local-only example file. The code already refuses demo mode unless `APP_ENV` is `development` or `testing` (`services/demo_seed.py:40-49`, `workflow_auth.py:251-261`), so this is safe.

**Proposed change: `.env.dev.example`**
```dotenv
APP_ENV=development
# Local only. Both are ignored unless APP_ENV is development or testing.
# Seeds demo.*@studentkare.test accounts and accepts OTP 123456 for them.
SEED_DEMO_DATA=true
DEV_OTP_CONSOLE=true
```
`docker-compose.yml` already loads `.env` via `env_file` for the backend, so no compose change is needed. Confirm while implementing that `env_file` values reach the container when `environment:` does not override them.

**Verify:**
- Docker quick start, then sign in with `demo.student@studentkare.test` and OTP `123456`: succeeds.
- The same backend with `APP_ENV` unset: no demo accounts, and the OTP send returns 503 without a provider. That is correct.
- Add a smoke step (see [13](13-testing-solutions.md)) that performs this sign-in against compose.

**Effort:** S. **Risk:** None for production; the flags are ignored outside dev and test.

---

## TD-14 — Rewrite the setup docs to match the repo

**Goal:** README and CONTRIBUTING describe what the repository actually does. Each statement is checkable.

**Corrections (each item maps to a step in the audit report)**

| # | File / location | Change |
|---|---|---|
| 1 | `docs/guides/CONTRIBUTING.md:41,50` | Clone URL → `https://github.com/AXISS-Groups/Studentkare.git` |
| 3 | `README.md:9-10`, `CONTRIBUTING.md:35-36,71,96,263` | "SQLite on the `care-data` volume" → "Postgres 16 (`postgres` service, `postgres-data` volume)". `down -v` deletes `postgres-data`. Remove the SQLite troubleshooting row, or rewrite it |
| 4 | README quick start | State what starts. Point to the lean dev profile from [21](21-developer-experience-solutions.md) once it exists: `docker compose up` (app only) vs `--profile observability` |
| 5 | CONTRIBUTING §5 native frontend | Document that `npm run dev` auto-starts a SQLite `testing` backend if nothing listens on `:8000`, or remove that behaviour per [21](21-developer-experience-solutions.md) |
| 6 | CONTRIBUTING §5 native backend | Add the prerequisite: Postgres running, with `DATABASE_URL=postgresql://studentkare:studentkare@localhost:5432/studentkare?sslmode=disable` (works with `docker compose up postgres`). Add `SEED_DEMO_DATA=true` alongside `DEV_OTP_CONSOLE=true` |
| 7 | env reference | Link to the generated `docs/configuration.md` ([25](25-environment-configuration-solutions.md) ENV-04) |
| 8 | new section "Database changes" | Explain `alembic revision --autogenerate -m "…"` and `alembic upgrade head` (run from `backend/` with `-c config/alembic.ini`). See [16](16-database-solutions.md) |
| 9 | CONTRIBUTING §9 | "Demo logins need `SEED_DEMO_DATA=true` and `DEV_OTP_CONSOLE=true` with `APP_ENV=development` (already set in `.env.dev.example`)" |
| 11 | CONTRIBUTING §6 backend tests | Match CI: `cd backend && PYTHONPATH=.:app:.. DATABASE_URL=postgresql://… pytest tests/` |
| 14 | README | Add a "Mobile" section linking `src/native/README.md` (`EXPO_PUBLIC_API_BASE_URL`, `npm run start:native`) |
| — | `README.md:51-80` | Delete the pasted Java/Maven "Code review checklist bundle" section |

**Make the docs self-checking**
- Add `scripts/check-docs.mjs` (or a CI step) that greps README and CONTRIBUTING for known-bad strings (`care-data`, `kktejas07`, `SQLite on`) and fails if any is found. It's cheap and stops regressions.
- Add a CI job `quickstart` (nightly, or on changes to `docker-compose.yml` or `.env.dev.example`) that runs the README commands verbatim, waits for `/api/health`, and performs the demo sign-in. This is the only real proof that the guide is correct.

**Verify:** A new team member follows README on a clean machine and reaches a signed-in dashboard without asking anyone. Record the time; it is the onboarding metric in [24](24-new-developer-test-solutions.md).
**Effort:** S (docs) + S (quickstart job).

---

## Production deploy section (audit step 13)
Owned elsewhere: overlay fixes in [17](17-security-solutions.md) (TD-16), keys in [25](25-environment-configuration-solutions.md) (TD-40), and the "which deploy target is real" decision in [10](10-documentation-solutions.md) (ADR-001).
