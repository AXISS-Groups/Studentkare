# 13 — Testing Audit

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

| Item | 2026-10-08 | 2026-10-17 |
|---|---|---|
| Frontend test files | 187 | 237 (28 under dead `src/modules`) |
| Backend test files | 73 | 85 (20 import unreachable modules) |
| New backend coverage | — | `test_two_factor_persisted`, `test_two_factor_enforcement`, `test_erasure`, `test_signup_consent`, `test_sos`, `test_student_requests`, `test_campus_departure`, `test_campus_admin_scope`, `test_remembered_device`, `test_revoke_other_sessions`, `test_order_refund`, `test_integration_secrets`, `test_audit_guardrails_2026_10_16` |
| a11y tests | none | axe in 4 Vitest files (report 27) |
| Test self-mounting unmounted routers | `test_dpdp.py` | **RESOLVED** (file deleted; erasure router mounted) |
| SQLite vs Postgres | SQLite default | unchanged (TD-11) |
| E2E | none | Playwright installed; smoke scripts still orphaned (TD-30) |
| **CI execution** | ran on `feat/*`/`main`, not `development` | **Since 2026-10-16 CI stops at the icon audit before running any test** (TD-39). Tests exist; their passing on current `main` is **not verified** by CI or by this audit |

New functionality is generally accompanied by tests — a real improvement. The gap has moved from "tests missing" to "tests not executed".

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Tests were **not executed** in this audit (read-only; running would write caches and a SQLite file). Pass/fail status is taken from GitHub Actions history where available.

## Inventory

| Suite | Framework | Files | Runs in CI? |
|---|---|---|---|
| Frontend unit/component | Vitest 4 + jsdom + Testing Library (`vite.config.ts` `test:`; `src/test/setup.ts`) | 187 `*.test.ts(x)` | Yes (`npx vitest run`) — plus a second run of one file (`ciGuardrails.test.ts`, step 4.5) |
| Backend unit/API | pytest 9 + FastAPI `TestClient`; `backend/tests/conftest.py` | 73 `test_*.py` | Yes, against Postgres service for the migration test; others default to SQLite (`conftest.py:11-13`) |
| Node smoke scripts | plain `node:assert` | 11 `tests/*.smoke.mjs` | **No** — not referenced by `package.json` or CI |
| E2E (browser) | none | 0 | — |
| Load | `load_test.py` (aiohttp script at root) | 1 | No |
| Mobile | none | 0 | — |

## What is covered (by file name and spot reads)

Backend has meaningful tests for safety-critical paths: `test_otp_security.py`, `test_otp_email_validation.py`, `test_age_gate.py`, `test_crisis_gate.py`, `test_records_privacy.py`, `test_payments.py`, `test_billing.py`, `test_consent_defaults.py`, `test_global_rate_limit.py`, `test_production_guard.py`, `test_migration_integrity.py`, `test_workflow_api.py`, `test_appointments.py`, `test_document_intake.py`. This is a good base.

Frontend has ViewModel and view tests under `src/features/*/views/__tests__`, routing tests (`src/core/routing/__tests__`), security-pattern tests (`src/core/security/__tests__`).

## What is not covered or is covered misleadingly

**Severity: HIGH — ~29% of backend test files and ~16% of frontend test files exercise dead code**
Evidence: 21 of 73 backend test files import modules unreachable from `app.main` (e.g. `test_talent_scraper_ai_agent_unit.py`, `test_newsletter_ai_agent_unit.py`, `test_ai_constitution.py`, `test_routing_agent.py`, `test_graph_rag_unit.py`, `test_dpdp.py`); 30 of 187 frontend test files are under the unused `src/modules/`.
Impact: Test counts overstate protection (`docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md:75` cites "149 Files, 1,123 Tests" as release evidence). `test_ai_constitution.py` passing says nothing about production AI calls because the constitution client is never called.
Recommendation: Delete tests with their dead modules; add a meta-test that each backend router module is mounted in `app.main.app` and that no test calls `app.include_router`.

**Severity: HIGH — Tests can make unmounted features look shipped**
Location: `backend/tests/test_dpdp.py:12-13`
Evidence: `if not any(... r.prefix == "/api/v1/dpdp" ...): app.include_router(dpdp_router)`.
Recommendation: Mount in `main.py`; remove test-side mounting.

**Severity: HIGH — Dialect gap: tests on SQLite, production Postgres-only**
Location: `backend/tests/conftest.py:13` default `sqlite:///./studentkare_test.db`; `main.py`/`db_sql.py` refuse SQLite outside `testing`.
Impact: Postgres-specific behaviour (JSONB, locking, `rowcount` semantics used by OTP consumption and rate buckets in `workflow_auth.py:94-104,341-353`, constraint names) is untested except in the migration test. CI already provides a Postgres service; it is used by one test.
Recommendation: Run the whole backend suite against the CI Postgres (transaction-per-test fixture); keep SQLite only for pure unit tests if at all.

**Severity: HIGH — No end-to-end coverage of the primary journeys**
Missing: sign-up → OTP → session → add record → share/revoke; order → payment webhook → fulfilment; clinician sign-off. The 11 smoke scripts appear to target some of these but are orphaned.
Recommendation: Wire `tests/*.smoke.mjs` into an npm script and CI job against `docker compose` (or replace with 3–5 Playwright flows). Do not aim for broad E2E; cover the money and safety paths.

**Severity: MEDIUM — Operational screens have no real behaviour to test**
Vendor/pharmacy screens are local demo state (see 04); their tests (if any) assert UI over fixtures, not workflows.

**Severity: MEDIUM — CI gaps**
- CI does not run on PRs to `development` (see 11).
- Coverage is not measured or reported (no `--coverage` in Vitest or `pytest-cov`).
- Alembic `downgrade` is never exercised.
- Native (Expo) code is excluded from `tsc` and untested.

**Severity: LOW — `patch_tests.py` / `patch_last_*.py`**
Scripts that rewrite tests in bulk should not live in the repo; they make test history hard to trust.

## Is the strategy sufficient for a growing startup?
Not yet. The **unit** layer for auth/safety on the backend is above average for a startup. The gaps are: tests aimed at dead code, a SQLite/Postgres split, no E2E for revenue and safety flows, and CI not gating the integration branch. Fixing CI triggers and moving the suite to Postgres are both less than a day of work and give most of the value.
