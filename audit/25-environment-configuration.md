# 25 — Environment, Configuration & Secrets Management

**New dimension, created 2026-10-17** (`main` @ `ad01230`). Revalidated 2026-10-17 (revalidation 2) against `main` @ `d333afe`; the newest block below wins.

## 2026-10-17 revalidation 2 (`d333afe`)

| Variable | Change since `ad01230` | Set by any deploy config? |
|---|---|---|
| `TWO_FACTOR_ENCRYPTION_KEY` | Now also blocks **COUNSELLOR** (default `TWOFA_ENFORCED_ROLES=SUPER_ADMIN,COUNSELLOR`, `integration_config.py:57`) | **no** (TD-40) |
| `DPDP_ARCHIVE_KEY`, `_RETENTION_DAYS` | Also needed by the new `worker` (runs `account_erasure`) | **no** (TD-40); blocked runs raise no alert (JOB-04) |
| `RULE_L_REQUIRE_GRANTS` | **New.** `1` refuses commerce requests when `sk_commerce` is unusable; unset passes through (fail-open, alerted in prod) | **no** (TD-03) |
| `SCHEDULER_IN_PROCESS` | **New.** Runs the job loop in the backend for single-container deploys | documented in `DEPLOYMENT_GUIDE.md`; default off |
| `TWOFA_ENFORCED_ROLES` | **New default** includes COUNSELLOR | not set (default applies) |
| `OLLAMA_URL`, `LLM_MODEL`, `LLM_TIMEOUT_SECONDS`, `LLM_RETRY_AFTER_SECONDS` | `OLLAMA_URL` is now opt-in (commented out in `backend/config/.env.example`); unset means no model | not set: generation off everywhere (30) |
| `APP_ENV` | Unchanged split (ENV-01). The worker in dev compose uses `${APP_ENV:-development}` | |

ENV-01 OPEN, ENV-02 (= TD-40) OPEN and wider, ENV-03 (= TD-41) OPEN. ENV-04: the number of places to configure grew by one (the worker env block in three deploy files duplicates the backend's). ENV-05 OPEN.

**New finding: ENV-06 — Worker and backend environment blocks are copied by hand**
- **Severity:** Low
- **Location:** `docker-compose.yml` `worker`, `docker-compose.prod.yml` `worker`, `deploy/helm/studentkare/templates/04-worker.yaml`
- **Evidence:** Each target repeats the backend's secret list for the worker. Dokploy instructions say "copy every environment variable".
- **Impact:** When TD-40 is fixed, the keys must be added in six places, not three. Missing one on the worker silently pauses erasures.
- **Recommendation:** Use one shared `env_file` or YAML anchor in compose, and one Helm helper template for backend and worker env.

---

### Revalidation 1 (`ad01230`) content


## Why this needs its own report

The original audit folded configuration into 09 (installation) and 17 (security). Since the baseline, the backend has added at least six fail-closed features that each depend on a dedicated key: two-factor sealing, check-in pass signing, DPDP erasure archives, consent signing, integration-secret sealing and demo opt-in. Whether these features work in a given environment now depends almost entirely on configuration. That is its own operational boundary. It needs one place that tracks which variable does what, where it is set, and what happens when it is missing.

## Inventory: security-relevant variables (verified in code)

| Variable | Used by | Missing → | Documented in | Set by any deploy config? |
|---|---|---|---|---|
| `APP_ENV` | `app/main.py:17` (default `development`); `workflow_auth.py`, `demo_seed.py`, `twofa_store.py` (unset ⇒ production) | **Inconsistent** — see ENV-01 | `.env.*.example`, CONTRIBUTING | compose: `development` (dev) / `production` (prod overlay); Helm `production` |
| `OTP_HASH_SECRET` / `JWT_SECRET` | `workflow_auth.py:33-35`; startup guard | refuse to start outside dev/test | yes | prod overlay `:?` required; Helm secret |
| `DATABASE_URL` | `services/db_sql.py` | refuse to start | yes | yes |
| `SEED_DEMO_DATA` | `demo_seed.py:40-49` | no demo accounts (correct default) | `backend/config/.env.workflow.example`, integration guide | **no** (dev compose too — TD-41) |
| `DEV_OTP_CONSOLE` | `workflow_auth.py:251-261` | no console codes (correct default) | integration guide, CONTRIBUTING | **no** (TD-41) |
| `TWO_FACTOR_ENCRYPTION_KEY` | `services/twofa_store.py` `_fernet()` | 2FA setup refused outside dev/test; SUPER_ADMIN held at setup gate | `.env.workflow.example` only | **no** (TD-40) |
| `PASS_SIGNING_SECRET` | `services/check_in_pass.py:41-46` | check-in pass cannot be issued | review docs only | **no** (TD-40) |
| `DPDP_ARCHIVE_KEY`, `DPDP_ARCHIVE_RETENTION_DAYS` | `services/erasure.py:70-82` | erasure stays paused | `backend/config/.env.example` | **no** (TD-40) |
| `INTEGRATIONS_ENCRYPTION_KEY` | `services/integration_secret_vault.py:38` | integration secrets not storable sealed | `backend/config/.env.example` | **no** |
| `CONSENT_SIGNING_KEY` | `core/consent_engine.py:37` (module unreachable from `app.main`) | n/a today | `backend/config/.env.example` | no |
| `PAYMENT_WEBHOOK_SECRET`, Razorpay secrets | webhook verification (reject if unset) | webhooks rejected (correct) | partial | no |
| `ALERTMANAGER_WEBHOOK_SECRET` | `services/alerts.py:77-80` (verifies **only if set**) | webhook accepted unsigned | `.env.dev.example` comment | prod overlay required |
| `EXPO_PUBLIC_API_BASE_URL` | native app | config error screen | `.env.dev.example`, `src/native/README.md` | n/a |

The 2026-10-08 audit counted 106 backend env vars, 35 of them undocumented (09 §7). It was not recounted here.

## Findings

### Finding: ENV-01 — `APP_ENV` has two different defaults
- **Severity:** Medium
- **Status:** OPEN (residual of TD-01)
- **Location:** `backend/app/main.py:17,28-38,81-88`; `backend/services/workflow_auth.py:93`; `backend/services/otp_delivery.py:47` vs `workflow_auth.py:33-35,74-77`, `demo_seed.py:47`, `twofa_store.py` `_dev_or_test()`
- **Evidence:** In auth, demo and 2FA code, an unset `APP_ENV` counts as production. But `main.py` reads unset as `development`, so it skips the production secret guard and Alembic migrations (running `create_all_tables()` instead). Cookies are `Secure` only when the value is exactly `production`, and `available_channels()` offers dev channels unless it is exactly `production`.
- **Previous assessment:** part of TD-01 (CRITICAL).
- **Change since last audit:** the demo backdoor itself was fixed (`d92e2ef`). Startup and cookie defaults were not changed.
- **Impact:** A deploy that forgets `APP_ENV` gets non-Secure session cookies and no migrations. Auth still fails closed.
- **Recommendation:** Add one `core/env.py` with `app_env()` that maps unset or unknown values to `production`, and use it everywhere.
- **Related reports:** 17, 16, 22 (TD-01)

### Finding: ENV-02 — Feature keys absent from deploy configs
See **TD-40** in 22 (authoritative). Summary: six keys that production features need are missing from `docker-compose.prod.yml`, Helm and `.env.prod.example`, and the startup guard does not check them.

### Finding: ENV-03 — Local dev env does not opt into demo mode
See **TD-41** in 22 (authoritative).

### Finding: ENV-04 — No single source of truth for configuration
- **Severity:** Medium
- **Status:** OPEN
- **Location:** `.env.dev.example`, `.env.prod.example`, `backend/config/.env.example`, `backend/config/.env.workflow.example`, `docs/integration-guide.md`, `src/native/README.md`, compose files, Helm values
- **Evidence:** Variables are spread over seven places. New keys land in whichever file the author touched (for example, `TWO_FACTOR_ENCRYPTION_KEY` appears only in `.env.workflow.example`).
- **Impact:** Drift is guaranteed as the team grows. TD-40 and TD-41 are both drift.
- **Recommendation:** Have one typed settings module (for example a pydantic `BaseSettings`) declare every variable, its default, and whether it is required in production. Generate the env table and `.env.prod.example` from it in CI.
- **Related reports:** 09, 18

### Finding: ENV-05 — Alertmanager webhook fails open when its secret is unset
- **Severity:** Low
- **Status:** OPEN (unchanged)
- **Location:** `backend/services/alerts.py:77-80`
- **Recommendation:** Reject the request when the secret is unset outside dev/test.

## What is good
- New features fail closed on missing keys, and their docstrings explain why (`check_in_pass.py`, `erasure.py`, `twofa_store.py`).
- `EXPO_PUBLIC_API_BASE_URL` has no silent fallback; a missing value shows an error (`src/native/README.md`).
- The prod overlay uses `${VAR:?}` for its core secrets.
