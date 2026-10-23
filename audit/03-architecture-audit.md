# 03 — Overall Architecture Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Item | Status | Evidence |
|---|---|---|
| Backend layering / monolith files | OPEN, worse (TD-07) | `workflow_api.py` 3,235, `clinical_api.py` 1,815, `workflow_models.py` 1,101, plus `workflow_scheduler.py` 1,027 |
| Unreachable backend surface | PARTIALLY RESOLVED (TD-08) | 18 unreachable library modules (~3.0K LOC), down from 56. AI agent swarm, RAG engines, repository and stores deleted |
| Rule L at the repository boundary | **New architecture**, PARTIALLY RESOLVED (TD-03) | `commerce_db` dependency on 42 commerce endpoints; table plane registry `core/rule_l.py` enforced by test |
| Background processing | **New component** | A dedicated worker with per-job leases replaces startup-only job runs ([31](31-background-jobs-and-outbox.md)). The original text's "in-process scheduler at startup" still exists as a one-off pass in `main.py:103-112`, with an opt-in loop (`SCHEDULER_IN_PROCESS`) |
| AI safety policy at model calls | RESOLVED for backend (TD-31) | One gateway, `llm_gateway.invoke()` ([30](30-ai-llm-integration.md)) |
| Startup does too much | OPEN (TD-12, ENV-01) | Production startup now also re-applies Rule L grants and computes Rule L status |
| FE/BE contract | OPEN (TD-13) | |

Dependency direction for new code is sound: commerce routers depend on `commerce_session`, which depends on `core/rule_l`. The clinician console depends on the design-system shell, and its sources are injected for testing.

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

| Original finding | Status | Evidence |
|---|---|---|
| Backend has no layering; `workflow_api.py` is the product | OPEN (TD-07) | 3,167 lines (+83); `clinical_api.py` 1,412 (+208); `workflow_models.py` 1,063 (+188). New domains (erasure, SOS, student requests, campus departure) were built as separate routers — good precedent |
| DPDP router not mounted; test self-mounts | SUPERSEDED → RESOLVED (TD-18) | `dpdp.py` deleted; `services/erasure.py` mounted `main.py:260`; 13 routers mounted now (`main.py:252-264`) |
| Large unreachable backend surface | OPEN (TD-08) | 56/126 modules unreachable (≈6.0K LOC); `clinical_assist.py` deleted (decision documented in `docs/remediation-plan-2026-10-09.md`) |
| Startup does too much / env-dependent | OPEN (TD-11, TD-12, ENV-01) | `main.py:81-88` unchanged; demo seeding now opt-in |
| No FE/BE contract | OPEN (TD-13) | |
| M18 separate service | Unmet, now **explicitly** so | Client-side clinician decision support removed (`c7efe3a`); certificate withdrawn; `src/modules/m18-clinician` deleted |

New architectural areas since baseline have dedicated reports: 25 (configuration), 26 (design system), 27 (i18n/a11y), 28 (privacy/DPDP), 29 (mobile/offline).

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## What exists

A React/React-Native-Web SPA talks REST+cookies to one FastAPI process, which owns one Postgres schema through one SQLAlchemy model module. A background worker (`backend/scripts/workflow_worker.py`) and an in-process scheduler (`services/workflow_scheduler.py`, run at startup in `app/main.py:84-93`) handle periodic jobs. Observability is a full Grafana stack. This is the right *shape* for a startup: a modular monolith. The problems are inside the modules.

## Where business logic lives

| Concern | Expected home | Actual home | Evidence |
|---|---|---|---|
| HTTP routing | thin routers | routers **are** the business layer | `backend/services/workflow_api.py` — 3,084 lines, ~150 route handlers covering health readings, documents, records sharing, insurance, catalog, cart, orders, payments, support, campus verification, camps, knowledge, meds, appointments, WebRTC signalling, earnings, notifications, blood SOS, encounters, kill switch, Razorpay, pharmacy review, outbox, movement sync, sentinel |
| Data access | repository layer | inline SQLAlchemy in handlers | e.g. `workflow_api.py:135-139` builds `select(M.Reading)` inside the route; `services/repository.py` (233 lines) exists but is **unreachable from `app.main`** |
| Domain model | per-domain modules | single 875-line `core/workflow_models.py` imported as `M` everywhere | every service does `from core import workflow_models as M` |
| Frontend business logic | ViewModels | split between ViewModels (`src/features/*/viewmodel`, 62 files), 190 screens with local `useState` logic, and components that call APIs | see 04 |
| AI safety policy | one constitution module at every model call | backend `services/ai_client.py` (unreachable), frontend `src/ai/core/client.ts` (`executeAIModelCall` unused; it echoes the prompt) | see 06, 17 |

## How components connect

- Frontend → backend: hand-written `fetch` wrappers in `src/data/services/api.ts` (658 lines) and `src/data/services/http.ts`; no OpenAPI-generated client, no shared types. FastAPI's OpenAPI schema exists at runtime but is not consumed.
- Backend → DB: one `SessionLocal` (`services/db_sql.py:89`), `NullPool` for all Postgres (`db_sql.py:71`).
- Backend → external: Razorpay, SMTP/Postal, OpenWA, Slack, Ollama via direct `httpx` calls inside services.
- Startup side effects: migrations (prod), `create_all_tables()` (non-prod), integration config load, scheduler run, demo seeding (every non-`production` env), telemetry (`app/main.py:72-122`).

## Findings

**Severity: HIGH — Backend has no layering; one file is the whole product**
Location: `backend/services/workflow_api.py`
Evidence: 3,084 lines; Pydantic input models, SQL queries, audit writes, ops-feed publishing, payment signature verification (`_verify_webhook_signature`, line 888), WebRTC signalling and AI endpoints in one router module.
Problem: No separation between transport, domain rules and persistence.
Impact: Every backend feature PR touches this file, so merge conflicts become routine (see 07). Business rules cannot be unit-tested without HTTP. A reviewer cannot see a domain's full surface.
Recommendation: Split by domain into `backend/app/<domain>/{router.py,service.py,schemas.py}`, keep `workflow_models` but split it per domain afterwards. Do it incrementally, one domain per PR, starting with the highest-churn areas (orders/payments, appointments, records).

**Severity: HIGH — Router-level features exist in code but are not mounted**
Location: `backend/app/main.py:249-257`, `backend/services/dpdp.py`, `backend/core/email_quality.py`
Evidence: `main.py` mounts 9 routers. `services/dpdp.py` defines `/api/v1/dpdp/erasure-queue`, `/erasure/{id}/process`, `/consent-policy`; it is never included. `backend/tests/test_dpdp.py:12-13` mounts it onto the app *inside the test*, so the test passes while production returns 404.
Impact: DPDP erasure and consent-policy features (a legal requirement under India's DPDP Act) appear "done and tested" but are unreachable. The admin UI route `/admin/erasure` and `/admin/consent-policy` exist in `src/features/health/module.ts`.
Recommendation: Mount `dpdp.router` in `main.py`; add a test that asserts every `APIRouter` defined under `services/` is reachable from `app.routes` (no self-mounting in tests).

**Severity: HIGH — Large unreachable backend surface**
Location: `backend/core/*`, `backend/services/*`, `backend/services/agents/*`
Evidence: Import-graph walk from `app.main` (non-test, non-alembic): 58 of 123 modules (≈6,200 LOC) unreachable, including `services/ai_client.py`, `services/llm_gateway.py`, `services/repository.py`, `services/abdm_gateway.py`, `services/claims_engine.py`, `core/consent_engine.py`, `core/audit_chain.py`, `core/crypto_service.py`, `core/roles.py`, `core/middleware.py`, and foreign-domain code: `core/career_intelligence.py`, `core/skill_*`, `core/resume_parser.py`, `core/roadmap_*`, `services/agents/{hackathon_grader_agent,talent_scraper_ai_agent,career_copilot_agent,newsletter_ai_agent,ambassador_kit_agent,...}.py`.
Problem: Names like `consent_engine`, `audit_chain`, `crypto_service`, `ai_client` suggest safety controls that do not run. Many have unit tests (`test_talent_scraper_ai_agent_unit.py`, `test_ai_constitution.py`), so coverage numbers include dead code.
Impact: Reviewers and auditors over-estimate what is enforced. New developers extend dead modules.
Recommendation: Delete foreign-domain modules and their tests. For each safety-named module, either wire it into the live path with a test that goes through `app.main`, or delete it.

**Severity: MEDIUM — Startup does too much and differs by environment**
Location: `backend/app/main.py:72-122`
Evidence: production runs `run_migrations()` in the app lifespan; every other env runs `create_all_tables()`; demo seeding runs whenever `APP_ENV != "production"`; failures of config load, scheduler and seeding are caught and printed (`except Exception as e: print(...)`).
Impact: (1) With `replicas: 2` (`docker-compose.prod.yml`) or `replicaCount > 1` (Helm), two pods run Alembic concurrently. (2) Dev never exercises migrations, so schema drift is found in production. (3) Scheduler failure at boot is silent.
Recommendation: Run migrations as a one-shot job/init container; use Alembic in dev too; fail startup (or mark unhealthy) when the scheduler cannot initialise.

**Severity: MEDIUM — No API contract between frontend and backend**
Location: `src/data/services/api.ts`, `src/data/workflowTypes.ts`
Evidence: TypeScript response types are written by hand; `api.ts` methods often return `res.json()` cast to a type, or `null` on any error.
Impact: Backend renames break screens at runtime with no compile error. Two developers changing both sides must coordinate manually.
Recommendation: Generate a typed client from FastAPI's OpenAPI (`openapi-typescript`) in CI and fail on drift.

**Severity: RECOMMENDATION — Keep the modular monolith**
The deployment shape (one API, one DB, one worker) is right for 10–15 engineers. Do not split into microservices. The one exception is the AGENTS.md requirement that clinician prediction (M18) runs as a separate service; today no such service exists (`src/modules/m18-clinician` is dead frontend scaffolding; no backend M18 service is present), so the requirement is unmet rather than violated.
