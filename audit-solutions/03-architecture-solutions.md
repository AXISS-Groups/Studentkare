# 03 — Architecture: Solutions

Answers [audit/03-architecture-audit.md](../audit/03-architecture-audit.md). Owns **TD-07** (monolithic backend files), **TD-08** (unreachable backend modules), and startup side effects. TD-13 (API contract) is owned by [15](15-api-solutions.md); TD-11 and TD-12 by [16](16-database-solutions.md).

---

## TD-08 — Delete unreachable backend code (first, because it shrinks everything else)

**Goal:** Every Python module under `backend/` (outside `scripts/` and `tests/`) is reachable from `app.main`, or is an entry point that is documented as one.

**Steps**
1. Regenerate the unreachable list. The audit's walk from `app.main` found 56 of 126 modules. Group them:
   - **Foreign domain, delete:** `core/career_*`, `core/skill_*`, `core/resume_parser.py`, `core/roadmap_*`, `services/agents/{hackathon_grader,talent_scraper_ai,career_copilot,ambassador_kit,newsletter_ai,matchmaker,voice_coach,certificate_ai,echo_profile_loop,cicd_pr_evaluator,code_health*,daily_audit,qa,accreditation}_agent.py`, `core/whatsapp.py` (if superseded by `otp_delivery`), the `core/db.py` Mongo client, and `core/email_quality.py` with its unmounted router.
   - **Safety-named, decide wire or delete** (record the decision in an ADR):
     - `services/ai_client.py` + `llm_gateway.py`: keep and fix per [17](17-security-solutions.md) TD-31.
     - `core/crypto_service.py`: wire for document encryption ([28](28-privacy-solutions.md)) or delete.
     - `core/consent_engine.py`: delete. Live consent is `ConsentRecord` in `workflow_auth`.
     - `core/audit_chain.py`: wire for tamper-evident audit, or delete.
     - `core/roles.py`, `core/middleware.py`, `services/repository.py`, `services/stores.py`, `services/abdm_gateway.py`, `services/claims_engine.py`, `services/job_runner.py`, `services/n8n_dispatch.py`: delete unless a ticket exists to wire them.
   - **Entry points, keep and document:** `backend/scripts/*.py` (worker, seeds, provisioning).
2. Delete each module together with its tests. The audit counts 20 test files that import dead modules.
3. Remove the dependencies left without users: `motor`, `langchain-ollama`, `APScheduler`, `passlib` ([12](12-dependency-solutions.md)).
4. Add a guard test so the problem cannot come back:
   ```python
   # backend/tests/test_reachability.py
   ALLOWED_UNREACHABLE = {"scripts", "scripts.provision_account", "scripts.seed_catalog",
                          "scripts.seed_demo", "scripts.workflow_worker"}
   def test_every_module_is_reachable_from_app_main():
       unreachable = compute_unreachable("app.main")   # same AST walk the audit used
       assert set(unreachable) <= ALLOWED_UNREACHABLE
   ```
   Also add "every `APIRouter` defined under `services/` is mounted in `app.main.app`".

**Verify:** the guard tests pass; the backend LOC drop is roughly 6K. **Effort:** S–M.

---

## TD-07 — Split the backend by domain, inside the same service

**Goal:** Each domain owns its router, its service logic, its schemas and, later, its models, so several developers can work on the backend without colliding in one 3,167-line file.

**Pattern** (already used by the new `erasure.py`, `emergency_api.py`, `student_requests.py` and `campus_departure.py`; formalise it):
```text
backend/app/<domain>/
  __init__.py
  router.py    # FastAPI routes: parse input, call service, shape response (response_model)
  service.py   # business rules; takes a Session and plain args; no Request/Response
  schemas.py   # Pydantic in/out models
  models.py    # (later) SQLAlchemy models moved from core/workflow_models.py
```
**Order** (highest churn and risk first; one domain per PR):
1. orders, cart, payments (needed for Rule L, [16](16-database-solutions.md))
2. appointments and consultation
3. records, documents and shares
4. medications
5. camps
6. notifications
7. knowledge and ops
8. auth, kept last; `workflow_auth.py` is already separate

**Mechanics per PR**
- Move routes verbatim and keep the paths identical, so this is not an API change. Add `include_router` in `main.py`.
- Extract service functions only where tests already cover them. No behaviour change in the move PR.
- Tests: no test changes should be needed. If one breaks, the move changed behaviour.
- `services/workflow_api.py` shrinks with each PR. Delete it when empty.

**Verify:** the route table (`app.routes`) is identical before and after each PR. Add a snapshot test of `sorted((r.path, sorted(r.methods)) for r in app.routes)`.
**Effort:** L (incremental, about 1–2 domains a week). **Depends on:** CI gate; tests on Postgres ([16](16-database-solutions.md)) make moves safer.

---

## Startup side effects (MEDIUM)

**Goal:** Startup is predictable and observable, and failures are visible.

| Today (`main.py` lifespan) | Change |
|---|---|
| migrations / `create_all_tables()` | `assert_at_head()` only; migrations run as a job ([16](16-database-solutions.md) TD-11/12) |
| integration config load in `try/except: print` | `logger.exception`; mark the `integrations` readiness flag false |
| scheduler run in `try/except: print` | `logger.exception`; readiness flag `scheduler=false`; alert |
| demo seeding | keep (already opt-in), move to `logger.info` |
| pool-metrics loop `except Exception: pass` | `logger.debug` with rate limiting |

Add `GET /api/ready` (separate from `/api/health` liveness), returning `{db, migrationsAtHead, scheduler, integrations, disabledFeatures}` (the last from [25](25-environment-configuration-solutions.md) TD-40). Point the Kubernetes `readinessProbe` at `/api/ready` and keep `livenessProbe` on `/api/health`.

**Effort:** S.

---

## M18 (guardrail 5)
No action until clinician prediction is a funded feature. When it is: a separate deployable (its own repo or `services/m18/` with its own Dockerfile), its own Postgres role with read-only views, and communication over HTTP with service auth. Record this as an ADR now so nobody builds it inside the monolith.
