# 06 — AI / Vibe-Coded Technical Debt Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Pattern | Status | Evidence |
|---|---|---|
| 1. Parallel re-implementations | OPEN | `src/modules`, two API clients. Also a second clinician tree (04) |
| 2. Foreign-domain code | PARTIALLY RESOLVED | All career, hackathon, talent, newsletter and code-health agents deleted (`ea6bc1f`, `6e9ff13`). Remaining foreign code: `core/career_*`, `core/skill_*`, `core/roadmap_*`, `core/resume_parser` (unreachable, TD-08) |
| 3. Simulation shipped as product | PARTIALLY RESOLVED, more progress | Deleted `AICameraHealthScanner`, `ARCReasoningSuite`, `RPPGVitalsCameraScanner`, `SmartMedicalHardwareScanner`, `UnifiedDeviceTelemetryConsole`, `TriageCouncilModal`, `SOAPNotesGeneratorModal`, `AIVoicePrescriptionModal` and similar. "Honest medication lookup" (`e861bb3`) and "honest agents modal" (`167768c`) |
| 4. Client-side security controls | OPEN (TD-37) | |
| 6. Tests shaped to pass | PARTIALLY RESOLVED | Tests of dead modules: 20 files → 1 (`test_data_security_pattern.py`). `patch_*.py` still at root |
| 7. Hardcoded fallbacks | PARTIALLY RESOLVED | unchanged |

Process signal: the team ran an internal audit sync (`ca69016`) and added `audit-solutions/`. The risk noted in rev 1, that plan files grow into a parallel tracker, now includes a parallel solutions tree (see 10). The AI *feature* is now covered separately in [30](30-ai-llm-integration.md).

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

| Pattern | Status | Evidence |
|---|---|---|
| 1. Parallel re-implementations | OPEN | two API clients, `src/modules`, 64 shims remain |
| 2. Foreign-domain code | OPEN | career/hackathon/talent agents still present and unreachable (TD-08) |
| 3. Simulation shipped as product | PARTIALLY RESOLVED | removed: guardian consent view, fake payment gateway ids/refunds (`payment_gateway.py` docstring), invented SOS ambulance/ETA, invented HITL actions (`f09d2b0`), camera-scan records (`5958982`), insurer "sent" (`40c389b`), `liveMedia` (`d23e583`). Remaining: ~15 demo vendor screens, `PaymentCheckoutModal.tsx` |
| 4. Client-side security controls | OPEN (TD-37) | `src/core/auth/{otpManager,sessionManager,stepUpAuth}.ts` still present, unimported |
| 5. Self-certification | **RESOLVED** (TD-26) | certificate withdrawn 2026-10-11 with a table of what was not true |
| 6. Tests shaped to pass | PARTIALLY RESOLVED | `test_dpdp.py` self-mount removed; `patch_*.py` still at root; 20/85 backend test files still target dead modules |
| 7. Hardcoded fallbacks | PARTIALLY RESOLVED | demo OTP/super admin now opt-in (TD-01); Razorpay demo key removed; pgbouncer/Grafana defaults in compose unchanged |

Notable shift: commit messages and docstrings now explicitly record "honesty" fixes and fail-closed reasoning, and the team maintains its own audit/remediation docs (`docs/remediation-plan-2026-10-09.md`, `docs/backlog-audit-2026-10-16.md`, `docs/dead-code-2026-10-14.md`). Risk: these plan files are themselves growing into a parallel tracking system — see 10.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

The question is not "was this AI-generated" but "does the code show the failure patterns of fast iterative prompting". It does, strongly. Each item below is evidence-based.

## Pattern 1 — Parallel re-implementations instead of edits

| Thing | Copies | Evidence |
|---|---|---|
| Frontend architecture | 3 | `src/features`, `src/screens`, `src/modules` (see 02, 04) |
| API client | 2 | `src/data/api.ts`, `src/data/services/api.ts` (drifted) |
| Auth store / repository inside one module | 2 each | `src/modules/m01-auth/state/{AuthStore.ts,auth.store.ts}`, `data/{AuthRepository.ts,auth.repository.ts}` |
| AI constitution | 3 | `src/ai/core/constitution.ts` + `src/ai/core/client.ts`, `backend/services/ai_client.py` (`CONSTITUTION_RULES`), `docs/PROMPT_LIBRARY.md` |
| Rate limiting | 3 | `core/rate_limiter.py` (in-memory, global), `workflow_auth.limit()` (DB `RateBucket`), `ai_rate_limiter` |
| Auth dependency | 2 | `services/workflow_auth` (live, Postgres) vs `core/deps.get_current_user` (Mongo, used by unmounted `core/email_quality.py`) |
| gitleaks / knip config | 2 each | root vs `config/` |

Fresh files were generated next to old ones rather than editing the old ones; 63 one-line `export * from` shims are what remains of "move" operations.

## Pattern 2 — Foreign code imported from another product

`backend/core/career_intelligence.py`, `career_prediction.py`, `skill_categorization.py`, `skill_score_engine.py`, `skill_analytics.py`, `skill_recommendations.py`, `resume_parser.py`, `roadmap_engine.py`, `roadmap_evaluator.py`; `backend/services/agents/{hackathon_grader_agent,talent_scraper_ai_agent,career_copilot_agent,ambassador_kit_agent,newsletter_ai_agent,matchmaker_agent,voice_coach_agent,certificate_ai_agent,echo_profile_loop_agent}.py`; `backend/core/db.py` docstring: "Imported by server.py and all routers/* modules" — neither `server.py` nor `routers/` exists in this repo. All unreachable from `app.main`; several have tests (`backend/tests/test_talent_scraper_ai_agent_unit.py`, `test_newsletter_ai_agent_unit.py`, `test_certificate_ai_agents_unit.py`). The README's second half (`README.md:51-80`) is a pasted "Code review checklist bundle" describing `pom.xml`, Checkstyle and SpotBugs for a Java project.

## Pattern 3 — Simulation shipped as product

| Location | What it does |
|---|---|
| `src/screens/vendor/*.tsx` (12 screens) | Pharmacy Rx review, dispense register, lab queue, settlements, staff roles over hardcoded `DEMO_*`/`INITIAL_*` arrays; IDs from `Math.random()` (e.g. `DispenseRegisterScreen.tsx:283`, `VendorRxReviewScreen.tsx:201`). Routed and `public: true` (`src/features/health/module.ts:36-68`). |
| `src/features/auth/views/GuardianConsentView.tsx:18-31` | POSTs to `/auth/guardian/request` (no such backend route), swallows the error ("Fallback for simulation"), shows "sent". Routed at `/guardian-consent`. |
| `src/components/marketplace/PaymentCheckoutModal.tsx:48-60` | "Simulate successful payment checkout settlement": client posts a fake-signed webhook, then shows a receipt regardless of outcome. |
| `src/ai/core/client.ts:35-51` | `executeAIModelCall` returns `"[Guarded by …]: " + prompt` as `status: 'success'`. No model is called. |
| `backend/services/ai_client.py:127-134` | When Ollama fails, returns the *sanitized user prompt* as `output` with `status: "success"`. |
| `src/features/*/store/*.tsx` | Live MobX stores seeded from `mockData` (see 04). |
| ~86 "simulat*" occurrences, 131 `setTimeout` in non-test `src` | fake latency / progress |

## Pattern 4 — Security controls implemented in the browser

`src/core/auth/otpManager.ts:100` (OTP via `Math.random`), `src/core/auth/sessionManager.ts:68-69` (client-minted session IDs), `src/core/auth/stepUpAuth.ts:44`, `src/core/auth/rbac.ts:76-100` (break-glass sessions stored in a client `Map`). `otpManager`, `sessionManager`, `stepUpAuth` have no importers; `rbac.ts` is imported by `src/features/admin/model/accessRules.ts`. Client-side checks are fine for UX, but these files are written as if they were the enforcement point, which misleads reviewers.

## Pattern 5 — Self-certifying documentation and comments

- `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md:6`: `Status: VERIFIED & CERTIFIED — GO FOR RELEASE`, claiming every guardrail is met. Counter-evidence in this audit: constitution module unreachable (guardrail 3), no Postgres role grants for Rule L in any applied migration (guardrail 4), bearer token read from `localStorage` (`src/data/api.ts:394`, guardrail 9), 160 `any` and 4 `@ts-ignore` (guardrail 10). AGENTS.md guardrail 6 forbids exactly this kind of asserted compliance state.
- `docs/PR_BODY.md:8` "certifying 100% adherence".
- Code comments describe intent the code does not have: `workflow_auth.py:193` docstring says "codes print to logs regardless of APP_ENV" while the function returns `False` in production (comment wrong in the safe direction); `main.py:113` "fail-closed: never breaks startup" (that is fail-open by definition).

## Pattern 6 — Tests shaped to pass

- `patch_last_13.py`, `patch_last_8.py`, `patch_tests.py` at repo root rewrite test files with string replacement (e.g. `patch_last_13.py:4-8` changes the OTP used by `register()` in `test_workflow_api.py`).
- `backend/tests/test_dpdp.py:12-13` mounts the DPDP router onto the app inside the test, hiding that `main.py` never mounts it.
- Many `*_unit.py` tests exercise unreachable modules (see 13).
- `backend/config/requirements-dev.txt` and `backend/ruff.toml` comments record that CI previously never reached the test step ("CI runs `ruff check .` … failed with 1672 findings before step 8 ever ran the tests"). Those were fixed, which is good, but it shows tests were accepted as "passing" without being executed.

## Pattern 7 — Hardcoded fallbacks that become production behaviour

- `backend/services/workflow_auth.py:292-293,348-349`: fixed OTP `123456` for demo identifiers whenever `APP_ENV != "production"` — with `APP_ENV` defaulting to `"development"` (`main.py:17`). See 17 (CRITICAL).
- `backend/services/payment_gateway.py:25`: `RAZORPAY_KEY_ID` default `"rzp_test_demo12345"`.
- `docker-compose.yml` pgbouncer upstream default `postgresql://postgres:postgres@dokploy-postgres:5432/postgres`; Grafana admin default `admin`.

## What is *not* a vibe-code problem

- The P0 guardrails in `AGENTS.md` are good engineering policy; the gap is enforcement, not intent.
- Recent commits show real hardening (fail-closed production startup guard `main.py:21-38`, OTP challenge consumption with row-count checks `workflow_auth.py:341-353`, signed payment webhooks `workflow_api.py:888-894`). Keep these.

## Recommendation

Run one "truth pass" sprint before adding features:
1. Delete unreachable backend modules and their tests; delete `src/modules`; delete shims.
2. For every routed screen backed by demo data, either connect it to the existing backend endpoint or remove the route / gate it behind a `demo` build flag that production builds strip.
3. Retract `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md`; replace with a CI-generated report (guardrail 6: computed from evidence).
4. Delete root `patch_*.py`; forbid test files from mounting routers (assert against `app.main.app` only).
