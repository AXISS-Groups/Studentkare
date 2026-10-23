# 22 — Technical Debt Inventory

Difficulty: S (≤1 day), M (≤1 week), L (multi-week). Priority: P0 now, P1 before team growth, P2 normal development, P3 later.

> **This file is the finding register.** `TD-xx` IDs are the stable finding IDs used across every audit report. Other reports cross-reference these IDs instead of restating findings.
>
> Last revalidated **2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Previous revalidation: `main` @ `ad01230`, earlier the same day (60 commits in between: 40 non-merge, 429 files changed excluding generated tokens). Original baseline: `development` @ `ab4ce3f`, 2026-10-08. Status vocabulary: OPEN · PARTIALLY RESOLVED · RESOLVED · REGRESSED · CHANGED · SUPERSEDED · NOT REVALIDATED · NO LONGER APPLICABLE.
>
> **How this pass checked things.** It read the code and the diff. It also ran a static import walk from `app.main` and `scripts.workflow_worker`, an AST route-auth scan, local `tsc` (web and native config), ESLint and Knip. All output went to a scratch directory outside the repo. **Not done:** no test suite was run, and `icons:audit` was not run (it writes into `design/`). GitHub Actions results could not be read: the `gh` CLI returned HTTP 401. Every statement about CI below therefore comes from `ci.yml`, not from run history.

## Current register (2026-10-17, revalidation 2 @ `d333afe`)

**Severity counts now (active findings):** CRITICAL 0 (was 2), HIGH 16, MEDIUM 21, LOW 8. Resolved: TD-04, TD-18, TD-26, TD-31. Two items moved down from CRITICAL to HIGH: TD-02 changed in nature, and TD-03 is now partly enforced.

| ID | Title | Severity | Status | Evidence at `d333afe` | Report |
|---|---|---|---|---|---|
| TD-01 | Fail-open environment gating | MEDIUM | PARTIALLY RESOLVED (unchanged) | Demo/console gating is still correct. **Residual unchanged:** `app/main.py:17` defaults `APP_ENV` to `development`, so an unset value skips migrations and the production guard (`main.py:28-38,81-95`). `workflow_auth.py:93` sets the `Secure` cookie only for exactly `production`. `otp_delivery.py:47` defaults to `development`. `core/sentry.py:24` and `core/telemetry.py:98` do the same. Tracked as ENV-01 | 17, 25 |
| TD-02 | CI does not cover the branch the docs call the integration branch | HIGH (was CRITICAL) | **CHANGED** | See detail below. `ci.yml:3-7` is still `[main, dev, "feat/*"]` / `[main, dev]`. But `origin/development` has not moved since 2026-10-08 (`ab4ce3f`; 0 ahead of `main`, 135 behind), and PRs #136, #137 and #138 all targeted `main`, which CI covers. `docs/guides/CONTRIBUTING.md:217-249` still tells contributors to branch from `development` and open PRs against it | 11, 18 |
| TD-03 | Rule L commerce firewall at the database | HIGH (was CRITICAL) | **PARTIALLY RESOLVED** | See detail below. Revision `f1a7c3e9b2d4_rule_l_grants` with `core/rule_l.py` (404 lines) creates the `sk_commerce` and `sk_clinical` roles and the grant matrix. `services/commerce_session.commerce_db` runs 42 marketplace/billing/returns endpoints under `SET LOCAL ROLE sk_commerce`. Status is computed at `GET /api/ops/rule-l`, and a CRITICAL ops alert is raised in production. **But it fails open by default** (`RULE_L_REQUIRE_GRANTS` is unset in every deploy config), and the app's login role still reaches every table | 16, 28 |
| TD-04 | 2FA state in process memory | — | RESOLVED | Unchanged. Enforcement now covers COUNSELLOR too (`workflow_auth.py:153`; `TWOFA_ENFORCED_ROLES` default `SUPER_ADMIN,COUNSELLOR`). New: a super admin can reset a lost authenticator, never their own, with an audited reason (`integrations.py:345-365`, `test_two_factor_reset.py`) | 17 |
| TD-05 | DB credential in git history | HIGH | NOT REVALIDATED | Rotation still cannot be verified from the repo | 11 |
| TD-06 | Three frontend architectures / dead `src/modules` | HIGH | OPEN | `src/modules/` unchanged (20 dirs, 222 files). `scripts/gen-module.js:24` still scaffolds there. Knip: 165 unused files. Also a second clinician tree now exists: new `src/features/clinician/**` beside legacy `src/screens/clinician/*` (`DoctorLabOrderDispatchScreen.tsx` is the mapped implementation of `ClinicianLabOrder`) | 02, 04 |
| TD-07 | Monolithic backend router/model files | HIGH | OPEN (worse) | `workflow_api.py` 3,167→**3,235**, `clinical_api.py` 1,412→**1,815**, `workflow_models.py` 1,063→1,101. New: `workflow_scheduler.py` is now **1,027** lines (scheduler, leases, outbox, reminders, quiet hours, health probes). Commits touching each since `ad01230`: 16 / 7 / 6 / 9 | 03, 07, 31 |
| TD-08 | Unreachable backend modules + their tests | MEDIUM (was HIGH) | **PARTIALLY RESOLVED** | Deleted: 20 of 26 modules in `services/agents/` (the 6 left are reachable: blood emergency, HITL approval, medical guard, adherence, phlebotomist dispatch, Rx extractor), `ai_client`, `repository`, `stores`, `claims_engine`, `pharmacy_review`, `rag_vector_store`, `universal_rag_engine`, `n8n_dispatch`, `notification_worker`, `job_runner`, `profile_service`, `seed`, and ~16 dead-module test files. Static walk from `app.main` + `scripts.workflow_worker`: **18 library modules unreachable (~3.0K LOC)** of 92 non-test files (plus 3 CLI scripts, which are entry points). They are mostly `core/career_*`, `core/skill_*`, `core/roadmap_*`, `core/roles`, `core/consent_engine`, `core/crypto_service`, `core/audit_chain`, `core/whatsapp` and `services/abdm_gateway`. Only `tests/test_data_security_pattern.py` still imports them. Method differs slightly from rev 1 (126 modules counted), so compare the direction, not the exact figure | 03, 13 |
| TD-09 | Demo-backed operational screens | MEDIUM | PARTIALLY RESOLVED (further progress) | `eb84eac` replaced sample businesses, licences, campuses and badges with the signed-in account and blank states. It also added one `VendorShell` and a server-set partner type (`a4e9c1f7b2d6_add_account_partner_kind`), and made "verify student" fail closed. Rx review now runs on durable dispenses (`fc9960d`). Not re-traced screen by screen | 04, 17 |
| TD-10 | Rate limiting keyed on proxy IP; spoofable XFF; in-memory | HIGH | OPEN | `workflow_auth.py:412,468` use `request.client.host`. `core/rate_limiter.py:113-115` uses the left-most `X-Forwarded-For`. `backend/Dockerfile` CMD still has no `--proxy-headers` | 17 |
| TD-11 | Dev/test/prod schema paths differ | MEDIUM (was HIGH) | **PARTIALLY RESOLVED** | New CI job `backend-postgres` (Postgres 15 and 16) checks the DB starts empty, runs `alembic upgrade head` and a **blocking `alembic check`**, then runs the whole suite with `REQUIRE_POSTGRES=1` (`ci.yml`, `af915fe`, `f833d9e`). Still: dev uses `create_all_tables()` (`main.py:95`), `tests/conftest.py:14` defaults to SQLite, and most tests build their own SQLite engines | 16, 13 |
| TD-12 | Migrations at startup on every replica | HIGH | OPEN | `main.py:81-84`. Every start now also re-applies the Rule L grants (`services/migrations.py:57-72`). Helm backend `replicaCount: 3` (`values/production.yaml:33`) | 16, 18 |
| TD-13 | No typed API contract | HIGH | OPEN | Hand-written `src/data/api.ts` (527 lines) and `src/data/services/api.ts` (627). No generated client | 15 |
| TD-14 | Setup docs incorrect | HIGH | OPEN (worse) | `README.md` and `docs/guides/CONTRIBUTING.md` last changed in `ea223ac` (2026-09-21). They now also describe a branch model that is no longer used (TD-02) | 09, 10 |
| TD-15 | Identifiers in logs | MEDIUM | PARTIALLY RESOLVED (unchanged) | `core/email.py:192,216,291,293,297,343,345,348` still print recipient addresses | 14 |
| TD-16 | Unsafe production compose overlay | HIGH | OPEN | Overlay unchanged apart from a correctly secured `worker` service (`${VAR:?}` secrets) | 18 |
| TD-17 | Duplicate API clients + shims | MEDIUM | OPEN | 527 + 627 lines | 05 |
| TD-18 | DPDP router unmounted | — | RESOLVED | Unchanged | 03, 28 |
| TD-19 | Silent catch / success-after-failure UI | MEDIUM | PARTIALLY RESOLVED | More honesty fixes: medication lookup (`e861bb3`), agents modal (`167768c`), job status (`abbcdde`). Still: `components/marketplace/PaymentCheckoutModal.tsx`; 135 backend `except Exception` | 14 |
| TD-20 | Live stores seeded from `mockData` | MEDIUM | PARTIALLY RESOLVED (unchanged) | `FabricStore.tsx`, `RecordsStore.tsx` | 04 |
| TD-21 | `NullPool` everywhere | MEDIUM | OPEN | `services/db_sql.py:71` | 16, 19 |
| TD-22 | No CD / image versioning / tags | MEDIUM | OPEN | 0 git tags. Helm `tag: "latest"` (`values/production.yaml:36,49,93`). The new worker reuses the backend tag | 18 |
| TD-23 | Lint config too weak; Knip non-blocking | MEDIUM | PARTIALLY RESOLVED (unchanged) | ESLint passes locally (exit 0). Knip is still `--no-exit-code` | 05 |
| TD-24 | Raw hex vs tokens | LOW | PARTIALLY RESOLVED | `config/hex-colour-legacy.json` 170→**148** files. Raw hex literals in non-test TSX by this pass's regex: 2,393 at `ad01230` → **1,546** | 05, 26 |
| TD-25 | Central routing hotspots | MEDIUM | PARTIALLY RESOLVED | The vendor route list moved out of `App.tsx` into `src/screens/vendor/vendorRoutes.ts`. But `features/health/module.ts` gained 15 `/clinician/*` routes (5 commits), and `App.tsx` adds `isClinicianConsolePath` | 07 |
| TD-26 | Self-certification docs | — | RESOLVED | Unchanged | 10 |
| TD-27 | Health documents plaintext `bytea` | MEDIUM | OPEN | `core/workflow_models.py:117,151` `LargeBinary` | 16, 28 |
| TD-28 | No HMR in Docker dev; hidden Vite backend spawn | MEDIUM | OPEN | `vite.config.ts:6-18` | 21 |
| TD-29 | Client Firebase integration | MEDIUM | OPEN | `App.tsx:18,73` | 17 |
| TD-30 | No E2E in CI | HIGH | OPEN | 11 `tests/*.smoke.mjs` still not run by any script or job | 13 |
| TD-31 | AI constitution not wired | — | **RESOLVED** (backend) | `services/llm_gateway.invoke()` is now the only model path and is reachable (`clinical_api.py:28` → `agent_ayush.generate`). It fails closed and runs the prompt guard and output sanitiser. It is opt-in via `OLLAMA_URL`. `ai_client.py` is deleted. The dead frontend `src/ai/core/client.ts` `executeAIModelCall` remains as AI-03 (LOW). New risks are in [30](30-ai-llm-integration.md) | 17, 30 |
| TD-32 | Root clutter | LOW | OPEN (worse) | `patch_*.py`, `vite.config.ts.timestamp-*.mjs`, `load_test.py`, plus the now-tracked `Audit_Plan.md` and `Intial_Audit_plan.md`, and a new top-level `audit-solutions/` | 02, 10 |
| TD-33 | Design archive in the code repo | MEDIUM | OPEN | `design/` 88 MB, 1,623 files (unchanged) | 02, 26 |
| TD-34 | Product name drift | LOW | OPEN | `package.json:2` | 01 |
| TD-35 | `any` / `@ts-ignore` | LOW | PARTIALLY RESOLVED | `@ts-ignore` 4 (`firebaseClient.ts` ×3, `posthog.ts` ×1). `any`: 91 non-test matches by this pass's regex, which is not comparable with rev 1's 127 | 05 |
| TD-36 | Stale remote branches | LOW | OPEN | 69 remote branches, including the stale `development` | 11 |
| TD-37 | Client-side "auth managers" | LOW | OPEN | `src/core/auth/{otpManager,sessionManager,stepUpAuth}.ts` | 06 |
| TD-38 | Mixed timestamp types | LOW | NOT REVALIDATED | Not re-checked this pass | 16 |
| TD-39 | CI icon audit blocks later gates | HIGH | OPEN (impact narrowed; run status NOT REVALIDATED) | Step 1.5 still runs `icons:audit` before tsc, Vitest, the build, Ruff, SQLite pytest and the startup guard in `pr-quality-gate`. Correction to rev 1: gitleaks (step 9, `if: always()`) runs even after a failure. Only 3 of 239 screens are mapped (TD-43). The new `backend-postgres` job is **separate**, so migrations and the backend suite on Postgres now run whatever happens at step 1.5. Whether `main` is green could not be checked (`gh` 401) | 18, 26 |
| TD-40 | Required secrets missing from deploy configs | HIGH | OPEN (wider) | Still in no compose file, Helm template or `.env.prod.example`. The new `worker` (compose, prod overlay, `templates/04-worker.yaml`) runs `account_erasure` without `DPDP_ARCHIVE_KEY`. COUNSELLOR is now 2FA-enforced, so counsellors join super admins at the setup gate | 25 |
| TD-41 | Docker quick start cannot sign in | HIGH | OPEN | `docker-compose.yml` and `.env.dev.example` set neither `SEED_DEMO_DATA` nor `DEV_OTP_CONSOLE` | 09, 24 |
| TD-42 | Bearer token from `localStorage` | MEDIUM | OPEN | `src/data/api.ts:347`, `src/data/services/api.ts:392` | 17 |
| TD-43 | Design "proof of done" not achievable | MEDIUM | OPEN (slight progress) | **3** of 239 screens mapped (`WebSecurity`, `WebConsultSummary`, `ClinicianLabOrder`). `icon-legacy.json` 153→149 files | 26 |
| TD-44 | Unreviewed te/hi clinical and crisis copy selectable | MEDIUM | OPEN | `REVIEW_STATUS` unchanged (`src/i18n/index.tsx:21`) | 27 |
| TD-45 | Native app not type-checked in CI | MEDIUM | OPEN | `npx tsc --noEmit -p config/tsconfig.native.json` **exits 0 locally** this pass, so adding it to CI costs nothing. It is not in `ci.yml`. Native gained a two-step sign-in (`6774d99`) | 29 |
| TD-46 | Bus factor | HIGH | OPEN (slightly better) | 31 of 40 non-merge commits since `ad01230` are by one author; 2 more are audit docs. Three other developers wrote 7 commits (clinician and partner consoles). PR #136 needed a conflict-resolution merge (`e54d899`). Still no CODEOWNERS | 07 |
| TD-47 | Campus consoles without a consent gate | HIGH | NOT REVALIDATED (partly informed) | MEO, diet, leave and isolation screens not traced. The first live campus-role clinical endpoint has arrived: the counsellor crisis queue (`clinical_api.py:131-196`). It is minimal and campus-scoped, but its lawful basis is not recorded. See PRIV-08 in 28 | 28 |
| TD-48 | **NEW** Email bounce suppression reads MongoDB and fails open | LOW | OPEN (new to the audit; code predates `ad01230`) | See below | 14, 12 |
| TD-49 | **NEW** Safety deliveries depend on one serial worker with no dead-man alert | MEDIUM | OPEN | See below | 31, 19, 28 |

### Revalidation 2 details for changed and new findings

#### Finding: TD-02 — CI does not cover the branch the docs call the integration branch
- **Severity:** High (was Critical)
- **Status:** CHANGED
- **Location:** `.github/workflows/ci.yml:3-7`; `docs/guides/CONTRIBUTING.md:217-249`; remote branch `development`
- **Evidence:**
  - The CI filters still name `dev`, not `development`.
  - `development` is stale: last commit `ab4ce3f` (2026-10-08), 135 commits behind `main`.
  - Every PR since rev 1 (#136, #137, #138) merged into `main`. CI triggers on PRs into `main`.
  - CONTRIBUTING still says "PR base is `development`, never `main`."
- **Previous assessment:** CRITICAL, "CI does not run on PRs into `development`".
- **Change since last audit:** the team's actual flow moved to `main`. The docs and CI filter did not move.
- **Problem:** The written workflow and the real one disagree. A newcomer who follows CONTRIBUTING branches from a stale branch and opens a PR that gets no CI.
- **Impact:** Less severe than before, because real work now gets CI. It is still a trap for every new contributor. Branch protection on `main` cannot be verified.
- **Recommendation:** Choose one model. Either retire `development` (delete it, update CONTRIBUTING to trunk-based on `main`, drop `dev` from `ci.yml`), or revive it and add it to both filters. Then require the CI checks on the branch PRs target.
- **Dependencies:** TD-14, TD-39
- **Related reports:** 11, 18, 24

#### Finding: TD-03 — Rule L commerce firewall at the database
- **Severity:** High (was Critical)
- **Status:** PARTIALLY RESOLVED
- **Location:** `backend/core/rule_l.py` (`TABLE_PLANES`, `GRANT_MATRIX`, `apply_grants`, `rule_l_status`); `backend/alembic/versions/f1a7c3e9b2d4_rule_l_grants.py`; `backend/services/commerce_session.py` (`commerce_db`, `rule_l_alert`); `services/migrations.py:57-72` (`reapply_rule_l_grants`); `app/main.py:85-93`; `tests/test_rule_l.py` (571 lines); `c2f8a1d6e4b7_move_catalog_images_to_commerce.py`
- **Evidence:**
  - Every table must be classified: a table missing from `TABLE_PLANES` fails `test_rule_l.py`.
  - `apply_grants` creates the NOLOGIN roles where the migrating user has CREATEROLE. It grants `sk_commerce` to the app login.
  - `commerce_db` wraps 42 endpoints (in `workflow_api.py`, `billing.py`, `student_requests.py`) in `SET LOCAL ROLE sk_commerce`. A commerce query that touches a clinical table then fails in Postgres.
  - Status is computed from `pg_roles` and `has_table_privilege`. Startup logs it, and production raises a CRITICAL ops alert when it is not enforced.
- **Previous assessment:** CRITICAL, OPEN: no roles or grants in any migration.
- **Change since last audit:** verified new code (`c7e0685`, `2ad0862`, `6314c67`).
- **Remaining gaps:**
  1. **Fail-open default.** When the role is not usable, `commerce_db` passes the ordinary full-privilege session through. Refusing requests needs `RULE_L_REQUIRE_GRANTS=1`, and no compose file, Helm value or env example sets it.
  2. **Only commerce paths are restricted.** Every other route uses `workflow_db` as the app login, which can still read every table. `sk_clinical` is created but nothing runs as it.
  3. **Unverified grants.** If the deploy user lacks CREATEROLE, the migration only logs a warning. Whether production has the grants can only be learned from `GET /api/ops/rule-l`.
  4. **Doc claim.** AGENTS.md guardrail 4 says "Enforced at Postgres grants and at the repository boundary". That is now true for commerce endpoints on a correctly provisioned database, and only there.
- **Impact:** A large step forward. On a misprovisioned database the firewall silently does nothing apart from an ops alert, and non-commerce code is not boxed in.
- **Recommendation:**
  - Set `RULE_L_REQUIRE_GRANTS=1` in the prod overlay and Helm once `/api/ops/rule-l` reports enforced.
  - Add a deploy-time check that fails the release when it is not enforced.
  - Later, run clinical routers as `sk_clinical`, so the app login no longer needs table rights.
- **Dependencies:** TD-12 (grants re-applied on every start), TD-40 (config drift)
- **Related reports:** 16, 17, 28

#### Finding: TD-11 — Dev/test/prod schema paths differ
- **Status:** PARTIALLY RESOLVED. **Severity:** Medium (was High).
- **Evidence:** CI now checks the production schema path on Postgres 15 and 16: upgrade from empty, then a blocking `alembic check`, then the full suite. Dev still uses `create_all_tables()`, and most tests still build SQLite engines (`ci.yml` comments say so).
- **Remaining:** Developers do not exercise migrations locally, and SQLite-only behaviour can still hide in the SQLite job. Recommendation: run Alembic in dev compose too.

#### Finding: TD-39 — CI icon audit blocks later gates
- **Status:** OPEN; impact narrowed; run status NOT REVALIDATED.
- **Evidence:**
  - `ci.yml` step 1.5 is unchanged and still runs before the frontend gates, Ruff and SQLite pytest.
  - **Correction to rev 1:** rev 1 said gitleaks was skipped. Step 9 has `if: always()`, which was there at `ad01230` too, so GitHub Actions runs it after an earlier failure. The rev 1 statement is withdrawn as inconsistent with the workflow file.
  - Only 3 screens are mapped, so the step passes only if all 3 pass. This pass did not run the audit, so whether they do is unknown.
  - The backend suite on Postgres now runs in an independent job.
- **Recommendation:** unchanged. Move `icons:audit` out of the blocking path, or ratchet it on mapped screens. Putting gitleaks in its own job would also make the secret scan's result easier to see.

#### Finding: TD-48 — Email bounce suppression reads MongoDB and fails open
- **Severity:** Low
- **Status:** OPEN (newly identified; the code existed at `ad01230`)
- **Location:** `backend/core/email.py:189` → `core/email_quality.allow_send` → `is_suppressed()` (`core/email_quality.py:205-211`) → `from core.db import db` (Motor/MongoDB client, `core/db.py:21`)
- **Evidence:**
  - The live email path calls `allow_send()`. That calls `is_suppressed()`, which queries a MongoDB collection `email_suppressions`.
  - Any exception returns `False` (not suppressed). `_log_event` writes to MongoDB the same way.
  - No MongoDB is provisioned in any compose file or Helm chart.
  - Earlier reports called `email_quality` "unmounted". Its router is unmounted, but its gate is on the live send path.
- **Problem:** The bounce-suppression list is never consulted. The failure is silent.
- **Impact:** Mail goes to addresses that already hard-bounced. That hurts sender reputation, which in turn affects OTP, reminder and alert email delivery. It also keeps `motor` a real runtime import, so dropping it (TD-08, report 12) needs this path changed first.
- **Recommendation:** Move suppressions to a Postgres table, or remove the lookup and say so. Then drop `motor`.
- **Related reports:** 12, 14, 31

#### Finding: TD-49 — Safety deliveries depend on one serial worker with no dead-man alert
- **Severity:** Medium
- **Status:** OPEN (new)
- **Location:** `backend/services/workflow_scheduler.py` (`run_due_jobs` loops `for key in due`, `run_job_now`, `PERIODIC_JOBS`, `_process_outbox`, `URGENT_EVENT_TYPES`); `backend/scripts/workflow_worker.py`; `docker-compose.yml` `worker`; `deploy/helm/studentkare/templates/04-worker.yaml`
- **Evidence:**
  - One worker pass runs every due job **in sequence**. `BLOOD_SOS` and the SOS acknowledgement and resolution notices are delivered by `reminder_reconcile`, which runs in the same pass as `integration_health` (HTTP probes with 6 s timeouts), `account_erasure` and the others.
  - An outbox pass handles up to 25 events, calling providers one at a time with 10–15 s timeouts.
  - Liveness is a heartbeat file checked by the container's own probe. No Prometheus metric or alert rule covers job runs or a stale `lastRunAt` (nothing in `deploy/`). Plain Docker Compose does not restart containers that are only "unhealthy".
- **Problem (architectural inference; not load-tested):** Urgent delivery latency is bounded by the slowest job ahead of it in the pass, not by the 45 s cadence. A stopped worker is visible only to someone who opens the super-admin jobs list.
- **Impact:** In a provider outage, a blood-SOS request can wait minutes. (`CRISIS_ALERT` is listed as urgent but nothing produces it; see JOB-06 in 31.) A dead worker stops every outbox message, erasure and departure without paging anyone.
- **Recommendation:**
  - Run `reminder_reconcile` in its own loop, or its own worker, ahead of other jobs.
  - Export `last_run_at` per job as a metric, with an alert when urgent delivery is more than 3 minutes stale.
  - Give compose an `autoheal` or `restart` policy that acts on health.
- **Dependencies:** SCALE-01 (personal SOS still sends inline)
- **Related reports:** 31, 19, 28

---

## Register at revalidation 1 (`ad01230`, 2026-10-17) — historical record

The table and details below were current at `ad01230`. The register above supersedes them; detail blocks for TD-39–TD-47 below remain the authoritative long form where the table above says "unchanged".

| ID | Title | Severity now | Status | Evidence at `ad01230` | Report |
|---|---|---|---|---|---|
| TD-01 | Fail-open environment gating (demo super admin + fixed OTP) | MEDIUM (was CRITICAL) | PARTIALLY RESOLVED | `services/demo_seed.py:40-54` `demo_accounts_enabled()` needs `APP_ENV∈{development,testing}` **and** `SEED_DEMO_DATA=true`; `workflow_auth.py:251-261` console codes need explicit `DEV_OTP_CONSOLE=true` (default false); `workflow_auth.py:33-35,74-77` treat unset `APP_ENV` as production (commit `d92e2ef`). **Residual:** `app/main.py:17` still defaults `APP_ENV` to `"development"`, so an unset value skips migrations (`main.py:81-88` → `create_all_tables()`) and the production secret guard; `workflow_auth.py:93` sets `Secure` cookies only for exactly `production`; `otp_delivery.py:47` offers dev channels unless exactly `production`. | 17 |
| TD-02 | CI does not gate the integration branch | CRITICAL | OPEN | `.github/workflows/ci.yml:3-7` still `[main, dev, "feat/*"]` / `[main, dev]`. PR #135 merged to `main` 2026-10-16 with CI **failing** | 11, 18 |
| TD-03 | Rule L not enforced at the database | CRITICAL | OPEN | 8 new Alembic revisions, none creates roles or grants; single `DATABASE_URL` | 16 |
| TD-04 | 2FA state in process memory | — | **RESOLVED** | `services/twofa_store.py` persisted + Fernet-sealed (rev `b4e1c9d27f30_persist_two_factor`); unreadable secret denies; SUPER_ADMIN 2FA enforced fail-closed (`workflow_auth.py:141-164`); tests `test_two_factor_persisted.py`, `test_two_factor_enforcement.py`. New operational risk split out as TD-40 | 17 |
| TD-05 | DB credential in git history | HIGH | NOT REVALIDATED | still in history (`013cd8a`); rotation cannot be verified from the repo | 11 |
| TD-06 | Three frontend architectures / dead `src/modules` | HIGH | OPEN (minor progress) | `src/modules/` still holds 19 slices (m18 deleted); Knip: 166 unused files, most under `src/modules`; `scripts/gen-module.js:24` still scaffolds into `src/modules`; team's own `docs/dead-code-2026-10-14.md` lists 330 unimported files, not yet deleted | 02, 04 |
| TD-07 | Monolithic backend router/model files | HIGH | OPEN (new code improving) | `workflow_api.py` 3,084→3,167 lines, `clinical_api.py` 1,204→1,412, `workflow_models.py` 875→1,063. New domains got their own routers (`erasure.py`, `emergency_api.py`, `student_requests.py`, `campus_departure.py`) — the right pattern | 03, 07 |
| TD-08 | Unreachable backend modules + their tests | HIGH | OPEN | 56 of 126 modules unreachable from `app.main` (~6.0K LOC; was 58/123); `clinical_assist.py` and `dpdp.py` deleted; 20 of 85 backend test files still import dead modules | 03, 13 |
| TD-09 | Demo-backed operational screens on public routes | MEDIUM (was HIGH) | PARTIALLY RESOLVED | All vendor paths now `access: hasRole('VENDOR','SUPER_ADMIN')` (`features/health/module.ts:40-73`); `/lab-queue`, `/dispensing`, `/returns` now live (`LabSampleToReportScreen`, `PharmacyDispensingScreen`, `PartnerRequestsPanel`). ~15 vendor screens still local demo state (e.g. `VendorRxReviewScreen.tsx`, `DispenseRegisterScreen.tsx`, `VendorSettlementScreen.tsx`) | 04, 17 |
| TD-10 | Rate limiting keyed on proxy IP; spoofable XFF; in-memory | HIGH | OPEN | `workflow_auth.py:387,443-445`; `core/rate_limiter.py` only added logout skip; `backend/Dockerfile` CMD unchanged (no `--proxy-headers`) | 17 |
| TD-11 | Dev/test/prod schema paths differ | HIGH | OPEN | `main.py:81-88`; `tests/conftest.py:14` SQLite default | 16, 13 |
| TD-12 | Migrations at startup on every replica | HIGH | OPEN | `main.py:81-84`; Helm `replicaCount: 3` | 16, 18 |
| TD-13 | No typed API contract | HIGH | OPEN | hand-written client `src/data/api.ts` (610 lines) | 15 |
| TD-14 | Setup docs incorrect | HIGH | OPEN (worse) | `README.md`, `docs/guides/CONTRIBUTING.md` unchanged since baseline; demo-login instructions now also wrong (see TD-41) | 09, 10 |
| TD-15 | Identifiers/OTP in logs | MEDIUM (was HIGH) | PARTIALLY RESOLVED | `workflow_auth.py:271` no longer logs identifier (commit `2e0c3c8`); console code only in explicit dev. **Still:** `core/email.py:192,216,291,293,297,343,345,348` print recipient addresses | 14 |
| TD-16 | Unsafe production compose overlay | HIGH | OPEN | `docker-compose.prod.yml` unchanged | 18 |
| TD-17 | Duplicate API clients + re-export shims | MEDIUM | OPEN | `src/data/api.ts` (610) + `src/data/services/api.ts` (644); 64 one-line shims | 05 |
| TD-18 | DPDP router unmounted; test self-mounted it | — | **SUPERSEDED → RESOLVED** | `services/dpdp.py` and `tests/test_dpdp.py` deleted; replaced by `services/erasure.py`, mounted at `main.py:260`, tested by `tests/test_erasure.py` | 03, 28 |
| TD-19 | Silent catch / success-after-failure UI | MEDIUM | PARTIALLY RESOLVED | Guardian-consent view removed; crisis-gate fail-closed message (`119853d`); insurance/consult/payment honesty fixes (`40c389b`, `d23e583`, `payment_gateway.py` rewritten). **Still:** `components/marketplace/PaymentCheckoutModal.tsx:48` fake signed webhook (unreferenced); 134 backend `except Exception`, 29 `pass` | 14 |
| TD-20 | Live stores seeded from `mockData` | MEDIUM | PARTIALLY RESOLVED | Only `features/care/store/FabricStore.tsx`, `features/health/store/RecordsStore.tsx` (and dead `Flow03LoginScreen.tsx`) still import it | 04 |
| TD-21 | `NullPool` everywhere; compose bypasses PgBouncer | MEDIUM | OPEN | `services/db_sql.py:71` | 16, 19 |
| TD-22 | No CD / image versioning / release tags | MEDIUM | OPEN | no tags; Helm `tag: latest` | 18 |
| TD-23 | Lint config too weak; Knip non-blocking | MEDIUM | PARTIALLY RESOLVED | `config/eslint.config.js` now has ratcheted raw-hex ban and raw-`<svg>`/`lucide-react` ban for screens. Still no `no-explicit-any`, hooks, a11y, `fetch`-in-view rules; Knip still `--no-exit-code` | 05 |
| TD-24 | Raw hex colours vs tokens | LOW (was MEDIUM) | PARTIALLY RESOLVED | 4,625 → 2,040 literals in TSX; legacy list `config/hex-colour-legacy.json` 170 files, may only shrink | 05, 26 |
| TD-25 | Central routing hotspots | MEDIUM | OPEN | `WorkspaceScreen.tsx` (7 commits since baseline), `App.tsx` route lists, `features/health/module.ts` | 07 |
| TD-26 | Self-certification docs | — | **RESOLVED** | `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md` marked `WITHDRAWN — NOT A RELEASE GATE` (2026-10-11) with explanation | 10 |
| TD-27 | Health documents plaintext `bytea` | MEDIUM | OPEN | `core/workflow_models.py` `Document.content` `LargeBinary`; `core/crypto_service.py` still unreachable | 16, 28 |
| TD-28 | No HMR in Docker dev; hidden Vite backend spawn | MEDIUM | OPEN | `vite.config.ts`, `docker-compose.yml` unchanged | 21 |
| TD-29 | Client Firebase Auth/Firestore integration | MEDIUM | OPEN | `App.tsx:71`, `lib/platform/firebaseClient.ts` | 17 |
| TD-30 | Orphaned smoke tests; no E2E in CI | HIGH (was MEDIUM) | OPEN | `playwright` added as devDependency; only `tests/*.smoke.mjs` use it; no npm script or CI job runs them | 13 |
| TD-31 | AI constitution not wired | MEDIUM | OPEN | `services/ai_client.py`, `services/llm_gateway.py` still unreachable; no live endpoint calls an LLM | 17 |
| TD-32 | Root clutter | LOW | OPEN | `patch_*.py`, `vite.config.ts.timestamp-*.mjs`, `load_test.py` still tracked; two untracked plan files at root | 02 |
| TD-33 | Design archive and media in the code repo | MEDIUM (was LOW) | OPEN (worse) | `design/` 44 MB → 88 MB, 1,623 tracked files | 02, 26 |
| TD-34 | Product name drift | LOW | OPEN | `package.json` name unchanged | 01 |
| TD-35 | `any` / `@ts-ignore` | LOW | PARTIALLY RESOLVED | `any` 160 → 127; `@ts-ignore` 4 | 05 |
| TD-36 | Stale remote branches | LOW | OPEN | 67 remote branches | 11 |
| TD-37 | Client-side "auth managers" using `Math.random` | LOW | OPEN | `src/core/auth/{otpManager,sessionManager,stepUpAuth}.ts` still present, still unimported (confirmed by the withdrawn certificate's own table) | 06 |
| TD-38 | Mixed timestamp types | LOW | OPEN | unchanged | 16 |
| TD-39 | **NEW** CI red on `main`: icon audit blocks every later gate | HIGH | OPEN | see below | 18, 26 |
| TD-40 | **NEW** Required secrets missing from every deploy config | HIGH | OPEN | see below | 25 |
| TD-41 | **NEW** Documented Docker quick start can no longer sign in | HIGH | OPEN | see below | 09, 24 |
| TD-42 | **NEW (formalised)** Bearer token read from `localStorage` | MEDIUM | OPEN | see below | 17 |
| TD-43 | **NEW** Design-kit "proof of done" not achievable: 1 of 239 screens mapped | MEDIUM | OPEN | see below | 26 |
| TD-44 | **NEW** Unreviewed Telugu/Hindi clinical and crisis copy is selectable by users | MEDIUM | OPEN | see below | 27 |
| TD-45 | **NEW** Native app excluded from CI type-check and tests run only under jsdom | MEDIUM | OPEN | see below | 29 |
| TD-46 | **NEW (formalised)** Bus factor: 100% of commits since baseline by one author | HIGH | OPEN | see below | 07 |
| TD-47 | **NEW (team-reported)** Campus console screens designed to show named students' clinical data without a consent gate | HIGH | NOT REVALIDATED | see below | 28 |

### Finding: TD-39 — CI red on `main`; icon audit blocks every later gate
- **Severity:** High
- **Status:** OPEN (new)
- **Location:** `.github/workflows/ci.yml` step "1.5 Design-kit icons" → `npm run icons:audit` (`scripts/icons/check-icons.mjs --all`)
- **Evidence:** GitHub Actions run for `Merge pull request #135` on `main` (2026-10-16 12:14) failed at step 1.5: `✗ WebSecurity … missing icons: bar-chart, bell, …` and `0/239 screens pass`. All later steps (tsc, Vitest, build, Ruff, pytest, gitleaks, startup guard) were skipped. The PR itself also failed CI and was merged.
- **Previous assessment:** n/a (step added after baseline)
- **Change since last audit:** verified via `gh run list` / `gh run view --log-failed`
- **Problem:** A design-coverage audit that cannot pass yet (see TD-43) runs before every correctness and security gate in one serial job.
- **Impact:** Since 2026-10-16 no commit to `main` or to `feat/*` branches has had its type-check, tests, build or secret scan executed in CI. Combined with TD-02, there is currently no working automated gate.
- **Recommendation:** Move `icons:audit` to its own non-blocking job (or limit it to screens listed in `implementation-map.json` with a ratchet), keep `icons:check` (generated-code freshness) in the main job, and require the main job to be green before merge.
- **Dependencies:** TD-02, TD-43
- **Related reports:** 18, 26, 13

### Finding: TD-40 — Required secrets missing from every deploy config
- **Severity:** High
- **Status:** OPEN (new)
- **Location:** `backend/services/check_in_pass.py:41-46` (`PASS_SIGNING_SECRET`), `services/twofa_store.py` (`TWO_FACTOR_ENCRYPTION_KEY`), `services/erasure.py:70-82` (`DPDP_ARCHIVE_KEY`, `DPDP_ARCHIVE_RETENTION_DAYS`), `services/integration_secret_vault.py:38` (`INTEGRATIONS_ENCRYPTION_KEY`); deploy files `docker-compose.prod.yml`, `deploy/helm/studentkare/**`, `.env.prod.example`
- **Evidence:** none of these names appears in any compose file, Helm template/values or `.env.prod.example`; `TWO_FACTOR_ENCRYPTION_KEY` and `PASS_SIGNING_SECRET` are documented only in `backend/config/.env.workflow.example` and review docs; `_production_startup_guard()` (`main.py:21-38`) checks only `OTP_HASH_SECRET`/`DATABASE_URL`.
- **Previous assessment:** 09 noted 35 undocumented env vars; these did not exist then.
- **Change since last audit:** new fail-closed features (verified code).
- **Problem:** The features fail closed correctly, but deployment does not supply their keys and startup does not warn.
- **Impact:** A production deploy from the repo's own configs boots "healthy" while: SUPER_ADMIN accounts (2FA enforced fail-closed) cannot set up 2FA and are held at the setup gate; check-in passes cannot be issued; DPDP erasure stays paused (a legal-timeline risk); integration secrets cannot be stored encrypted.
- **Recommendation:** Add the keys to `.env.prod.example`, Helm secrets and the prod overlay; extend the startup guard (or a readiness check) to report missing feature keys loudly; document them in one env table (report 25).
- **Dependencies:** TD-14
- **Related reports:** 25, 17, 18, 28

### Finding: TD-41 — Documented Docker quick start can no longer sign in
- **Severity:** High
- **Status:** OPEN (new; side-effect of the TD-01 fix)
- **Location:** `docker-compose.yml` (backend `environment:`), `.env.dev.example`, `docs/guides/CONTRIBUTING.md:275-279`, `README.md` quick start; `services/workflow_auth.py:262-275`, `services/demo_seed.py:40-49`
- **Evidence:** Docker dev sets `APP_ENV=development` but neither `SEED_DEMO_DATA` nor `DEV_OTP_CONSOLE`; with no SMTP/Postal/OpenWA configured, `deliver_code()` fails and, because console delivery is off by default, `/api/auth/otp/send` returns 503. No demo accounts are seeded. CONTRIBUTING still lists demo logins with OTP `123456`. Only `scripts/start-dev-backend.py` (the hidden Vite auto-spawn) sets both flags.
- **Previous assessment:** 09 §9 "Demo login — CORRECT".
- **Change since last audit:** verified code change (`d92e2ef`); docs not updated.
- **Problem:** The secure default is right; the dev environment and docs were not updated to opt in.
- **Impact:** A new developer following README cannot sign in to any authenticated screen.
- **Recommendation:** Set `SEED_DEMO_DATA=true` and `DEV_OTP_CONSOLE=true` in `.env.dev.example` (local only), and update CONTRIBUTING §9 to say so.
- **Dependencies:** TD-14
- **Related reports:** 08, 09, 24, 25

### Finding: TD-42 — Bearer token read from `localStorage`
- **Severity:** Medium
- **Status:** OPEN
- **Location:** `src/data/api.ts:347`, `src/data/services/api.ts:392` (`localStorage.getItem('sacare_token')`); writer `src/screens/auth/Flow03LoginScreen.tsx:105,132` (unreferenced)
- **Evidence:** unchanged since baseline (previously reported only in 17).
- **Impact:** Contradicts AGENTS.md guardrail 9; an XSS-planted value would be sent as a bearer token.
- **Recommendation:** Delete the localStorage path; cookies are the session mechanism.
- **Related reports:** 17

### Finding: TD-43 — Design-kit "proof of done" not achievable
- **Severity:** Medium
- **Status:** OPEN (new)
- **Location:** `design/screens/implementation-map.json`, `scripts/icons/check-icons.mjs`, `CLAUDE.md` ("Prove it before saying done")
- **Evidence:** 239 screens in the map, **1** mapped (`WebSecurity`), and that one fails (missing 17 icons + brand logo). `config/icon-legacy.json` exempts 153 files from the icon rule.
- **Impact:** The repo's own definition of done for screens cannot be met by any screen today; the check is red in CI (TD-39). Teams will learn to ignore it.
- **Recommendation:** Treat coverage as a ratchet: CI fails only for screens newly added to the map; publish coverage as a report, not a gate, until mapped screens pass.
- **Related reports:** 26

### Finding: TD-44 — Unreviewed Telugu/Hindi clinical and crisis copy is user-selectable
- **Severity:** Medium
- **Status:** OPEN (new)
- **Location:** `src/i18n/index.tsx` (`REVIEW_STATUS = { te: 'unreviewed', hi: 'unreviewed' }`), `src/i18n/LanguageSetting.tsx:16`
- **Evidence:** All three catalogues define the same 728 top-level keys (type-enforced `Catalog`). The code comment says te/hi "need a native speaker's review, and a clinician's for crisis, consent and clinical wording, before release". Users can pick them; the UI shows an info note only.
- **Impact:** Crisis-helpline and consent wording in an unreviewed translation can mislead in a safety moment; DPDP consent given in an unreviewed translation may not be informed consent.
- **Recommendation:** Gate unreviewed languages behind a build/feature flag in production, or block them for Tier 1 surfaces (crisis, consent) until reviewed.
- **Related reports:** 27, 28

### Finding: TD-45 — Native app not in CI type-check
- **Severity:** Medium
- **Status:** OPEN (new scope; previously noted only in passing)
- **Location:** `tsconfig.json` (`exclude: src/native/**`), `config/tsconfig.native.json`, `.github/workflows/ci.yml`
- **Evidence:** CI runs `npx tsc --noEmit` with the web config only; `src/native` grew (≈1.8K LOC, 12 new files) and is the shipped mobile app.
- **Impact:** Type errors in the mobile app are invisible until a device build.
- **Recommendation:** Add `npx tsc --noEmit -p config/tsconfig.native.json` to CI.
- **Related reports:** 29

### Finding: TD-46 — Bus factor
- **Severity:** High
- **Status:** OPEN (worse)
- **Evidence:** all 73 non-merge commits between `ab4ce3f` and `ad01230` are by one author (was 81% of history).
- **Impact:** see 07, 20. Every tribal-knowledge item depends on one person.
- **Recommendation:** CODEOWNERS with ≥2 owners per area; review rotation; ADRs.
- **Related reports:** 07, 20

### Finding: TD-47 — Campus console screens designed to show named students' clinical data without a consent gate
- **Severity:** High
- **Status:** NOT REVALIDATED (team-reported)
- **Location:** campus console screens (MEO, counsellor, meal/diet, medical leave, isolation) per `docs/remediation-plan-2026-10-09.md` "Still open (found 2026-10-11)"
- **Evidence:** The team's own plan states these screens "are built to show named students' clinical data to campus admins with no consent gate. Empty today; must be gated server-side before any API is wired." This audit did not trace each screen.
- **Impact:** If wired as built, campus admins would see clinical data without student consent (DPDP, AGENTS.md guardrail 4 spirit).
- **Recommendation:** Server-side consent + small-count suppression before any data endpoint for these screens.
- **Related reports:** 28

---

## Original inventory (2026-10-08, baseline `ab4ce3f`)

The detail below is kept as the historical record. Statuses above supersede it.

## Critical Debt

### TD-01 Fail-open environment gating (demo super admin + fixed OTP)
- Problem: any `APP_ENV` other than exactly `production` seeds SUPER_ADMIN demo accounts and accepts OTP `123456`.
- Location: `backend/app/main.py:17,100-112`; `backend/services/demo_seed.py:104,109`; `backend/services/workflow_auth.py:196-198,292-293,348-349`
- Why it exists: convenience for local demos; default chosen as `development`.
- Current impact: backdoor on any shared non-prod deployment.
- Future impact: grows with every preview/staging environment a larger team creates.
- Difficulty: S · Priority: P0
- Approach: explicit `DEMO_MODE` flag + allowlist of env names; unknown = production; no demo SUPER_ADMIN; `DEV_OTP_CONSOLE` default off.

### TD-02 CI not gating the integration branch
- Location: `.github/workflows/ci.yml:3-7`
- Why: branch renamed `dev` → `development` (or never matched).
- Impact: unchecked merges; failing CI merged to `main`.
- Difficulty: S · Priority: P0
- Approach: fix filters; branch protection with required checks on `main` and `development`.

### TD-03 Rule L not enforced at the database
- Location: Alembic chain (no roles/grants); `backend/migrations/studentkare_schema.sql` (unused)
- Why: designed in SQL, never migrated; app uses one role.
- Impact: commerce code can read clinical data; product promise unenforced.
- Difficulty: M · Priority: P0/P1
- Approach: Alembic revision for roles + grants; separate engine/DSN for commerce routers; CI test asserting denied SELECT.

### TD-04 2FA state in process memory
- Location: `backend/services/twofa_store.py:13-16`
- Impact: 2FA bypassed after restart / on another replica.
- Difficulty: S–M · Priority: P0
- Approach: Postgres tables; fail closed if 2FA status unknown.

### TD-05 Leaked DB credential in history
- Location: commit `013cd8a`
- Difficulty: S · Priority: P0
- Approach: rotate; record rotation.

## High Debt

### TD-06 Three frontend architectures / dead `src/modules`
- Location: `src/modules/**`, `src/features/**`, `src/screens/**`, `scripts/gen-module.js`
- Why: an MVVM "migration" built a parallel tree instead of refactoring in place.
- Impact: wrong-place work, misleading tests, onboarding cost.
- Difficulty: M · Priority: P1
- Approach: delete `src/modules`; retarget scaffolder to `src/features`; document the live pattern.

### TD-07 Monolithic backend router and model files
- Location: `backend/services/workflow_api.py` (3,084), `core/workflow_models.py` (875)
- Impact: merge conflicts, untestable business rules.
- Difficulty: L (incremental) · Priority: P1
- Approach: one domain per PR into `backend/app/<domain>/`.

### TD-08 Unreachable backend modules (58 modules, ~6.2K LOC) + their tests
- Location: see 03
- Difficulty: S–M · Priority: P1
- Approach: delete foreign-domain code; wire or delete safety-named modules; drop `motor`, `langchain-ollama`, `APScheduler`, `passlib`.

### TD-09 Demo-backed operational screens on public routes
- Location: `src/screens/vendor/*.tsx`, `src/features/health/module.ts:36-68`
- Difficulty: M (connect) / S (gate) · Priority: P1
- Approach: gate by role now; connect to existing `/api/work/*` endpoints via ViewModels.

### TD-10 Rate limiting keyed on proxy IP; spoofable XFF; in-memory
- Location: `workflow_auth.py:283`, `core/rate_limiter.py:100-117`, `backend/Dockerfile`
- Difficulty: S · Priority: P1

### TD-11 Dev/test/prod schema paths differ (create_all vs Alembic, SQLite tests)
- Location: `main.py:76-80`, `tests/conftest.py:11-13`
- Difficulty: M · Priority: P1

### TD-12 Migrations at startup on every replica
- Location: `main.py:77-79`, Helm `replicaCount: 3`
- Difficulty: S · Priority: P1

### TD-13 No typed API contract
- Location: `src/data/api.ts`, backend routes without `response_model`
- Difficulty: M · Priority: P1

### TD-14 Setup docs incorrect
- Location: `README.md:9-10,51-80`, `docs/guides/CONTRIBUTING.md:35-41,96,§5`
- Difficulty: S · Priority: P1

### TD-15 Identifiers/OTP in logs
- Location: `workflow_auth.py:207,209`, `core/email.py`
- Difficulty: S · Priority: P1

### TD-16 Unsafe production compose overlay
- Location: `docker-compose.prod.yml`
- Difficulty: S · Priority: P1 (P0 if this overlay is what production runs)

## Medium Debt

| ID | Problem | Location | Difficulty | Approach |
|---|---|---|---|---|
| TD-17 | Duplicate API client files, 63 shims | `src/data/api.ts`, `src/data/services/api.ts`, `src/ai/*.ts` | S | delete one; codemod imports |
| TD-18 | DPDP router unmounted; tests self-mount | `main.py:249-257`, `tests/test_dpdp.py:12-13` | S | mount; meta-test |
| TD-19 | Silent `except`/`catch` and success-after-failure UI | `main.py:83-122`, `GuardianConsentView.tsx`, `PaymentCheckoutModal.tsx` | M | Ruff BLE001/S110; UI rule |
| TD-20 | Live stores seeded from `mockData` | `src/features/*/store/*.tsx` | M | load via repositories; empty states |
| TD-21 | `NullPool` everywhere; compose bypasses PgBouncer | `db_sql.py:71` | S | pool per environment |
| TD-22 | No CD / image versioning / tags | `ci.yml`, Helm `tag: latest` | M | build+push by SHA |
| TD-23 | Lint config too weak; Knip non-blocking with masking entries | `config/eslint.config.js`, `knip.json` | S–M | add type-aware + hooks + a11y rules gradually |
| TD-24 | 4,625 raw hex colours vs tokens | `src/**/*.tsx` | L (incremental) | lint rule + migrate on touch |
| TD-25 | Central routing hotspots | `App.tsx:85-155`, `WorkspaceScreen.tsx`, `module.ts` | M | route metadata; per-feature registration |
| TD-26 | Self-certification docs | `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md` | S | remove; CI-generated report |
| TD-27 | Health documents plaintext `bytea` | `workflow_models.py:84` | M | object storage / encryption |
| TD-28 | Hot-reload-less Docker dev; hidden Vite backend spawn | `docker-compose.yml`, `vite.config.ts` | S | dev profile; opt-in spawn |
| TD-29 | Firebase Auth/Firestore client integration | `firebaseClient.ts` | S | remove or restrict |
| TD-30 | Orphaned smoke tests; no E2E | `tests/*.smoke.mjs` | M | wire to CI |
| TD-31 | AI constitution not wired | `ai_client.py`, `src/ai/core/client.ts` | M | single entry + enforcement test before any LLM goes live |

## Low Debt

| ID | Problem | Location |
|---|---|---|
| TD-32 | Root clutter (`patch_*.py`, Vite timestamp file, dup configs) | repo root |
| TD-33 | Business docs/spreadsheets in repo; 44 MB design archive; MP4 without LFS | `docs/`, `design/`, `public/assets` |
| TD-34 | Product name drift (`sa-care`, `sacare`, Studentkare) | `package.json`, cookies |
| TD-35 | `@ts-ignore` ×4, `any` ×160 | `posthog.ts`, `firebaseClient.ts` |
| TD-36 | Stale remote branches (67) | GitHub |
| TD-37 | Client-side auth managers using `Math.random` (unused) | `src/core/auth/*` |
| TD-38 | Mixed timestamp types (float epoch vs ISO string) | `workflow_models.py` |
