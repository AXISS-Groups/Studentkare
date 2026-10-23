# Studentkare Backend — Architecture Guide

> Reference for anyone working on the backend. Every statement here was checked
> against the code on 2026-10-17 (base `ad01230`). Where something is imported by
> nothing the running app loads, it says so. If you change what runs, change this file.

---

## 1. Overview

A **FastAPI + SQLAlchemy 2.0** monolith on **PostgreSQL**, serving the React web app
and the Expo app. `app/main.py` refuses to start without a `postgresql://` `DATABASE_URL`
unless `APP_ENV=testing` (the test suite runs on SQLite; see §8).

**What runs:** OTP sign-in with server sessions, persisted two-step sign-in, DPDP consent
at signup, health records and documents, the pharmacy catalogue and orders (as requests;
see payments below), appointments, prescriptions, dispensing, lab orders with doctor
review before release, encounter notes, campus and SOS workflows, erasure, the rotating
check-in pass, Agent Ayush (extractive; optional model rephrasing, §6), and a durable job scheduler (§7).

**What does not run:**

- **No LLM call unless `OLLAMA_URL` is set.** The only model path is
  `services/llm_gateway.py` (the AI constitution: Rule-A mandate, prompt guardrail,
  output sanitising, fail-closed). Its only caller is Agent Ayush's stage 5, which may
  ask the model to rephrase retrieved passages; unset, Ayush answers extractively.
- **Order payments go through a provider.** `services/payment_gateway.py` holds the
  `PaymentProvider` interface (mock for dev/test, refused in production; Razorpay
  otherwise) and `services/payments.py` the flow: provider order for the server total,
  signature + provider-fetched verify, signed webhook as source of truth, expiry of
  unpaid stock, idempotent refunds. Razorpay without keys reports `UNAVAILABLE`. The
  Student Plus subscription (`/api/billing/subscription/*`) shares the Razorpay client
  (`services/razorpay_client.py`) and calls it only when the keys are set, else 503.
- **No video.** `/api/consultation/*` keeps a waiting room and stores one WebRTC
  offer/answer on the session row; there is no media relay and every payload says
  `liveMedia: false`.
- **No ABDM / ABHA.** `services/abdm_gateway.py` exists; nothing imports it.
- **No M18.** Clinician prediction / risk stratification must be a separate service
  with its own Postgres role (AGENTS.md guardrail 5). Nothing in this repo implements
  it; the in-app decision support was deleted (`c7efe3a`).
- **No Rule L Postgres grants.** AGENTS.md guardrail 4 says the commerce firewall is
  enforced at Postgres grants. No migration contains a `GRANT` or `REVOKE`; the app
  connects with one role.

### Tech stack (from `config/requirements.txt`)

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.141.1, Pydantic 2.13.5, uvicorn 0.52.4 |
| ORM / DB | SQLAlchemy 2.0, psycopg 3, Alembic; Postgres 16 in `docker-compose.yml` |
| Auth | `sacare_session` HTTP-only cookie, HMAC-hashed OTP, `X-CSRF-Token`, TOTP (PyJWT only in the legacy `core/deps.py` / `core/security.py`) |
| Background | `services/workflow_scheduler.py` (DB-polled, 8 jobs) |
| Python | 3.11 (`Dockerfile`, CI) |
| Tests | pytest, 85 `tests/test_*.py` files |

---

## 2. Directory structure

```
backend/
├── app/main.py            FastAPI app, lifespan, middleware, router mounts
├── core/                  models (workflow_models, billing_models, preventive_models,
│                          models_sql), crypto, rate limiter, telemetry, sentry, guardrails
├── services/              routers and services (52 modules); agents/ holds 30 agent modules
├── alembic/versions/      21 migrations, one head (e5a7b3c90d14)
├── migrations/            raw SQL schemas kept for reference; not applied by the app
├── scripts/               workflow_worker.py, provision_account.py, seed_catalog.py, seed_demo.py
├── config/                requirements*.txt, alembic.ini, pyproject.toml, .env examples
└── tests/                 pytest suite
```

---

## 3. Build and run

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r config/requirements-dev.txt
export DATABASE_URL=postgresql://studentkare:studentkare@localhost:5432/studentkare
export OTP_HASH_SECRET=...            # required unless APP_ENV is development/testing
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

`scripts/start-dev-backend.py` (repo root) wraps this for local development.

- **Schema.** `APP_ENV=production`: the lifespan runs `services.migrations.run_migrations()`
  (Alembic to head) and never calls `create_all`. Any other `APP_ENV`: `create_all_tables()`.
- **Demo accounts** (`services/demo_seed.py`) need `APP_ENV=development|testing` **and**
  `SEED_DEMO_DATA=true`. The fixed demo code additionally needs `DEV_OTP_CONSOLE=true`
  (default `false`). Identifiers are listed in `DEMO_IDENTIFIERS`.
- **Docker:** `cp .env.dev.example .env && docker compose up --build` (postgres,
  pgbouncer, backend, frontend and the monitoring stack).

### Environment variables (read by the code)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | none | Postgres URL; required outside `APP_ENV=testing` |
| `APP_ENV` | `development` in `app/main.py` | `production` runs migrations and the production guard |
| `OTP_HASH_SECRET` | falls back to `JWT_SECRET` | OTP hashing; startup fails without one outside dev/test |
| `ALLOWED_ORIGINS` | localhost:3000, :4173 | CORS allow-list |
| `SEED_DEMO_DATA` / `DEV_OTP_CONSOLE` | `false` / `false` | demo accounts / console OTP, dev and test only |
| `PASS_SIGNING_SECRET` | none | signs the rotating check-in pass; required outside dev/test |
| `TWO_FACTOR_ENCRYPTION_KEY` | none | Fernet key sealing TOTP secrets; without it, set-up returns 503 outside dev/test |
| `TWOFA_ENFORCED_ROLES` | `SUPER_ADMIN` | roles held to 2FA set-up before any other route |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | none | Student Plus subscription checkout and order payments |
| `PAYMENT_PROVIDER` | `mock` in dev/test, `razorpay` in production | order payments; `mock` refuses to start in production |
| `EMBEDDING_PROVIDER` | `local` | only `local` is implemented (hashed character n-grams) |
| `RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE` | unset (registry: 300) | per-session API budget; pins `platform.api_rate_per_account_per_minute` |
| `RATE_LIMIT_API_PER_IP_PER_MINUTE` | unset (registry: 3000) | per-IP API ceiling; pins `platform.api_rate_per_ip_per_minute` |
| `SENTRY_DSN` | none | Sentry, off without it |

`OLLAMA_URL` (unset = no model), `LLM_MODEL` (default `llama3.1:8b`),
`LLM_TIMEOUT_SECONDS` (8) and `LLM_RETRY_AFTER_SECONDS` (30, cool-off after a failed
call) are read by `llm_gateway.py` at call time (§6).

---

## 4. Request lifecycle and auth

### Middleware (outermost first, from `app.user_middleware`)

1. `response_headers` — `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`
2. `ActivityTelemetryMiddleware` — non-PHI per-route counters (`care_activity_counters`)
3. `GlobalRateLimitMiddleware` — per-IP sliding window, in memory, per process
4. `BodyLimitMiddleware` — 12 MB request limit
5. `CORSMiddleware`

Because CORS is innermost, a 429 from the rate limiter or a 413 from the body limit
carries no CORS headers. Exception handlers turn `SQLAlchemyError` into 503 and anything
else into 500. `core/middleware.py` (`register_security_middleware`) is not wired.

### Auth (`services/workflow_auth.py`)

- OTP send/verify → `sacare_session` HTTP-only cookie (hashed in `care_sessions`) plus a
  CSRF token that mutating requests must echo in `X-CSRF-Token`.
- Signup requires the current consent version and all required purposes; the account
  and its `care_consent_records` row are written in one transaction.
- Two-step sign-in is persisted (`care_two_factor`, `care_two_factor_pending`; secrets
  sealed with Fernet). Accounts in `TWOFA_ENFORCED_ROLES` without 2FA get a held session:
  only 2FA set-up and sign-out answer (`deny_until_two_factor`).
- Remembered devices (`care_remembered_devices`) change what the sign-in screen offers;
  they never create a session without a code.
- Roles: `STUDENT`, `CAMPUS_ADMIN`, `VENDOR`, `NMC_DOCTOR`, `SUPER_ADMIN`. Gates:
  `require_staff`, `require_super_admin`, `require_campus_admin`, `require_clinician`.
- `core/deps.py` / `core/security.py` (JWT) are legacy; no mounted router uses them.
- `tests/test_reachability.py` fails when a backend module is unreachable from the
  entry points (`app.main`, the worker, the seed/provision scripts) and is not on its
  allow-list with a reason, or when a `services/` router is defined but not mounted.

---

## 5. Routers (`app/main.py`)

Operation counts are from the generated OpenAPI schema (289 operations on 259 paths).

| Module | Prefix | Ops | Covers |
|--------|--------|-----|--------|
| `workflow_auth.py` | `/api/auth` | 13 | OTP, signup + consent, sessions, remembered devices |
| `workflow_api.py` | `/api` | 138 | records, documents, catalogue, orders, appointments, consultation, encounters, blood, meds, ops, Ayush, v1 admin |
| `clinical_api.py` | `/api` | 36 | prescriptions, dispensing, lab orders, lab review and release, crisis follow-up |
| `student_requests.py` | `/api` | 19 | returns, hostel visits, refills |
| `billing.py` | `/api/billing` | 16 | Student Plus subscription, enterprise contracts |
| `preventive_care.py` | `/api/preventive` | 15 | providers, vaccines, preferences, report reviews |
| `integrations.py` | `/api` | 12 | integration settings, platform assets, `/auth/2fa/*` |
| `apilayer.py` | `/api/apilayer` | 12 | APILayer proxy, `SUPER_ADMIN` only |
| `emergency_api.py` | `/api` | 9 | SOS alerts and deliveries, security contacts |
| `member_profile_api.py` | `/api` | 6 | profile, check-in pass (`/identity`, `/identity/verify`) |
| `erasure.py` | `/api` | 5 | DPDP account erasure and sealed archives |
| `campus_departure.py` | `/api` | 3 | graduating / transferring / break |
| `alerts.py` | `/api/alerts` | 2 | Alertmanager webhook |

Plus `GET /api/health`, `GET /api/info`, `GET /api/persistence/status` in `main.py`.

### Services the app does not load

Checked by importing `app.main` and listing `sys.modules` (lazy imports inside handlers
counted): `abdm_gateway` (kept for planned ABDM work). AGENTS.md guardrail 3 treats
it as a bug to report, not a feature. `llm_gateway` is now loaded: it is the constitution
module Agent Ayush calls for optional rephrasing. `ai_client`, `rag_vector_store` and
`universal_rag_engine` were loaded by nothing and have been deleted, as were
`claims_engine`, `n8n_dispatch`, `profile_service`, `repository`, `stores` and `seed`
(no script, compose file, Dockerfile or CI job ran them either); `demo_seed` is a
different module and is live.
Every module left in `services/agents/` is loaded by the app (§6). The 20 agent modules
nothing loaded (`accreditation_agent`, `agent_scheduler`, `ambassador_kit_agent`,
`autopilot`, `career_copilot_agent`, `certificate_ai_agent`, `cicd_pr_evaluator_agent`,
`code_health_agent`, `code_health_rules`, `daily_audit_agents`, `echo_profile_loop_agent`,
`graph_rag_agent`, `hackathon_grader_agent`, `matchmaker_agent`, `newsletter_ai_agent`,
`qa_agent`, `routing_agent`, `specialized`, `talent_scraper_ai_agent`, `voice_coach_agent`)
were deleted with their tests, as was `services/job_runner.py`, their only other importer,
which nothing loaded either.

---

## 6. AI

### Agent Ayush (`services/agent_ayush.py`, `POST /api/agents/ayush/ask`)

A seven-stage pipeline over approved knowledge only; it never reads the student's record.

1. Crisis gate (`services/crisis_gate.py`) — fails closed, returns crisis resources
2. Scope guard — refuses diagnosis, prescribing and dosage
3. Personal-record refusal — questions about the student's own results go to a clinician
4. Retrieval — `services/vector_store.py` over approved, reviewed sources
5. Grounding check — no passage, no answer
6. Generation — `compose_extractive()` quotes the top passage and names the others; it
   is output-guarded first and is the fallback for everything below. With `OLLAMA_URL`
   set, `generate()` asks the model, via `llm_gateway.invoke(rule_id="Rule-A")`, to
   rephrase the retrieved passages only (prompt = question + passages; never the
   student's name or record; neither prompt nor answer is logged). The rephrasing must
   pass the output guard and `rephrasing_is_grounded()`: every sentence ≥ 75% supported
   by the passages (`vector_store.support`, the retrieval overlap measure), no number
   absent from them, a negation only where a source sentence has one, and `[n]`
   citations that exist. Any failure, timeout, unreachable model, guardrail block or
   rejection returns the extractive answer.
7. Output guard, then the turn is recorded (`care_agent_turns`) for
   `GET /api/ops/agents/ayush/quality`, with `generator` = `extractive`, `rephrased` or
   `fallback:<reason>`; the quality report adds `generationBreakdown` and
   `fallbackReasons`.

Embeddings come from `services/embeddings.py`: a deterministic local embedder (hashed
character 3/4-grams). It is not semantic, and `is_semantic()` says so.

### Other agent modules still mounted

Six modules from `services/agents/` load with the app (five imported by
`workflow_api.py`; `phlebotomist_dispatch_agent` has no endpoint since `/lab/book-slot`
was removed). None calls a model.

| Endpoint | Module | What it returns |
|----------|--------|-----------------|
| `/api/blood/*` | `blood_emergency_agent` | donor matching; SOS queued as `BLOOD_SOS` outbox events |
| `/api/meds/*` | `medication_adherence_loop_agent` | plans and dose logs in Postgres |
| `/api/ops/approvals`, `/api/v1/ops/kill-switch` | `hitl_approval_agent`, `medical_guard` | approvals from a module-level list; kill switch is a process flag |

Removed, because they gave any signed-in user fixed, clinical-looking output
(clinician decision support belongs to M18, AGENTS.md guardrail 5): `POST
/api/triage/council-eval`, `POST /api/records/generate-soap`, `POST
/api/ai/voice-prescription`, `POST /api/v1/agents/mesh-triage` and `GET
/api/v1/agents/system-log` (hardcoded counters), with their modules
`triage_council_agent`, `soap_notes_agent`, `swarm` and `ai_observability`. They now
answer 404.

`POST /api/ai/medication-lookup` searches the medicine master (`care_medicines`, see
`services/medicine_master.py`) by name or salt, as text only: no match returns
`{"status": "NO_MATCH"}`, never a stand-in medicine, and there is no image recognition
(an `imageFileName` field is refused with 422). It returns only master facts
(composition, form, pack, manufacturer, schedule); the old hardcoded "mock" drug table,
its invented advisor approvals and Jan Aushadhi prices are gone. It has no web caller
since the unrouted `StudentDashboardScreen` and its modals were deleted.

**Medicine master.** `care_medicines` + `care_medicine_ingredients` (commerce plane)
hold each medicine's salts and strengths, dosage form, pack, manufacturer and Indian
schedule (OTC | H | H1 | X); `requires_prescription` is derived from the schedule.
`care_catalog.medicine_id` links a product listing to it. `GET /api/catalog?query=`
also matches salts. `GET /api/catalog/{id}/alternatives` returns same salts + strengths
+ form listings, cheapest first, for OTC listings only; a prescription-schedule
listing gets none on that route. `GET /api/work/catalog/{id}/alternatives` returns all
of them to pharmacy partners and prescribers. Super admins manage records with
`/api/ops/medicines` and link listings with `PUT /api/ops/catalog/{id}/medicine`. Demo
medicines exist only in the dev seed (`services/demo_medicines.py`).

---

## 7. Background jobs (`services/workflow_scheduler.py`)

Eight allow-listed jobs in `PERIODIC_JOBS`, default interval 7,200 s:

| Key | Handler | Interval |
|-----|---------|----------|
| `integration_health` | probe configured integrations | 2 h |
| `reminder_reconcile` | process `care_outbox_events` (OpenWA / email) | 2 h |
| `document_intake_reconcile` | pending / failed intake | 2 h |
| `knowledge_freshness` | expire stale knowledge sources | 2 h |
| `care_followup` | overdue care requests | 2 h |
| `slack_selftest` | Slack channel self-test and digest | 1 h |
| `campus_departures` | complete departures whose date has arrived | 2 h |
| `account_erasure` | erase accounts past the 7-day window, destroy expired archives | 2 h |

**When they run:** once at app start-up (`lifespan` → `ensure_scheduled_jobs`,
`run_due_jobs`), on `POST /api/ops/jobs/{key}/run` (super admin), or via
`python -m scripts.workflow_worker --once | --max-cycles N`. There is no in-process
timer and no worker service in `docker-compose*.yml`, so without a cron or worker
calling the CLI, due jobs wait for the next restart. Runs are recorded in
`care_agent_runs`.

---

## 8. Data and migrations

- 88 tables in `Base.metadata` (`care_*` plus legacy `tenants`, `app_users`,
  `audit_logs`, `break_glass_sessions`, `department_states`, `code_health_findings`,
  `agent_runs` from `core/models_sql.py`).
- Production applies Alembic migrations only; development uses `create_all_tables()`,
  which also adds `care_catalog.image_id` / `image_mime` by hand.
- **Known drift:** no migration adds `care_catalog.image_id` / `image_mime`, so a
  database built only from migrations lacks columns the model selects. `alembic check`
  also reports two index differences (`care_programmes`, `care_substitution_requests`).
- **Tests** default to SQLite (`tests/conftest.py`) and most build their own in-memory
  engines. CI's `backend-postgres` job migrates an empty Postgres 15 to head, runs a
  report-only `alembic check`, then runs the suite with `DATABASE_URL` on that server and
  `REQUIRE_POSTGRES=1`, so the Postgres-only tests fail instead of skipping.

```bash
cd backend && PYTHONPATH=.:app:.. pytest tests/ -q     # SQLite
ruff check .
```

---

## 9. Observability

- Prometheus metrics in `core/telemetry.py`: `http_requests_total`,
  `http_request_duration_seconds`, `http_requests_in_flight`, `db_pool_checked_out` /
  `_idle` / `_overflow`, `db_query_duration_seconds`, `slack_alerts_total`,
  `guardrail_violations_total`, `activity_telemetry_errors_total`; mounted at `/metrics`.
- OpenTelemetry instrumentors (FastAPI, HTTPX, psycopg, SQLAlchemy) load only if their
  packages are installed; they are not in `config/requirements.txt`.
- Sentry via `core/sentry.py` when `SENTRY_DSN` is set. `core/logging_middleware.py` is
  not wired.
- Compose defines Prometheus, Loki, Promtail, Grafana, Alertmanager, Tempo (prod
  override), the OTel collector and Blackbox (prod override). Alert rules:
  `deploy/alerts.yml`. Helm chart: `deploy/helm/studentkare`. Runbooks: `docs/runbooks/`.
