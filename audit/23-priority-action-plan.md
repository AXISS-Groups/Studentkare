# 23 — Priority Action Plan

**Updated 2026-10-17 (revalidation 2)** for `main` @ `d333afe`. Finding IDs and their current status are in [22](22-technical-debt.md). Complexity figures are **estimates** for one engineer who knows the code: S ≤ 1 day, M ≤ 1 week, L multi-week. They are not measurements.

## Progress since revalidation 1 (`ad01230`)

| Rev-1 item | Finding | Outcome at `d333afe` |
|---|---|---|
| #8 Rule L in Postgres | TD-03 | **Mostly done.** Roles, grants, commerce role at the repository boundary, live status and alert. Remaining work is item 4 below |
| #9 One schema path / tests on Postgres | TD-11 | **Partly done.** CI migrates from empty, runs a blocking `alembic check` and the full suite on Postgres 15 and 16. Remaining: dev compose still uses `create_all`; the migration job (TD-12) |
| #6 Execute the dead-code list | TD-08 | **Backend largely done** (20 agents, RAG engines, repository and stores deleted; 18 unreachable modules left). Frontend `src/modules` untouched |
| #24 Single AI entry point before any LLM | TD-31 | **Done.** `llm_gateway.invoke()` is the only model path. New follow-up AI-01 (item 9) |
| #21 Move SOS sends to the outbox/worker | SCALE-01 | **Partly.** The worker and outbox now exist; personal SOS still sends inline (item 10) |
| #1 Make CI a gate | TD-02, TD-39 | **Changed.** Work now flows to `main`, which CI covers, and the backend Postgres job is independent of the icon step. Icon step and docs still open (item 1) |

## 🔴 Fix immediately (this week)

### 1. Make the written workflow match the real one, and make CI unskippable
- **Finding IDs:** TD-02, TD-39, TD-14 (branching section)
- **Location:** `.github/workflows/ci.yml:3-7` and step 1.5; `docs/guides/CONTRIBUTING.md:217-249`; remote branch `development`; GitHub branch protection
- **Rationale:** `development` was abandoned on 2026-10-08, but CONTRIBUTING sends newcomers there, and CI has never covered it. On `main`, a design-coverage step can still skip tsc, tests and the build.
- **Solution:**
  - Retire `development`, or revive it; do not keep both stories.
  - Rewrite the CONTRIBUTING branching section.
  - Replace `dev` in the filters.
  - Move `icons:audit` to a non-blocking job.
  - Require `pr-quality-gate` and `backend-postgres` on `main`.
- **Complexity:** S
- **Dependencies:** admin access for branch protection
- **Benefit:** every contributor gets the same, real gate.

### 2. Supply the feature keys, for the backend *and* the worker
- **Finding IDs:** TD-40, ENV-06, JOB-04
- **Location:** `.env.prod.example`, `docker-compose.prod.yml` (backend and worker), `deploy/helm/studentkare/templates/01-backend.yaml` and `04-worker.yaml`, `backend/app/main.py:21-38`
- **Rationale:** In production as configured: super admins **and counsellors** cannot finish enforced 2FA, passes cannot be issued, and the worker's erasure job is blocked silently.
- **Solution:**
  - Add `TWO_FACTOR_ENCRYPTION_KEY`, `PASS_SIGNING_SECRET`, `DPDP_ARCHIVE_KEY`, `DPDP_ARCHIVE_RETENTION_DAYS` and `INTEGRATIONS_ENCRYPTION_KEY` once, through a shared env block (compose anchor or Helm helper).
  - Log "feature X disabled: missing KEY" at startup.
  - Publish a CRITICAL ops event when an erasure is due but blocked.
- **Complexity:** S
- **Benefit:** the safety and legal features actually run.

### 3. Fix local sign-in and setup docs
- **Finding IDs:** TD-41, TD-14
- **Solution:** unchanged from rev 1 item 3. Also mention the new `worker` in README and CONTRIBUTING.
- **Complexity:** S

### 4. Turn Rule L from "alerted" into "enforced" in production
- **Finding ID:** TD-03 (residual)
- **Location:** `services/commerce_session.py` (`grants_required`), deploy configs, `docs/DEPLOYMENT_GUIDE.md`
- **Solution:**
  - Document the DB-role prerequisite: CREATEROLE, or DBA-created `sk_commerce`/`sk_clinical` with membership granted.
  - Check `GET /api/ops/rule-l` on each environment.
  - Then set `RULE_L_REQUIRE_GRANTS=1` in the prod overlay and Helm, and add a post-deploy check that fails the release when it is not enforced.
- **Complexity:** S (config) + DBA coordination
- **Benefit:** AGENTS.md guardrail 4 becomes true for commerce paths in production, not just possible.

### 5. Rate-limit identity, credential rotation, prod overlay
- **Finding IDs:** TD-10, TD-05, TD-16
- **Solution:** unchanged from rev 1 items 4–5.
- **Complexity:** S each

## 🟠 Fix before team growth (next 4–6 weeks)

### 6. Worker reliability for safety deliveries
- **Finding IDs:** TD-49, JOB-05
- **Location:** `services/workflow_scheduler.py` (`run_due_jobs`), `scripts/workflow_worker.py`, `deploy/` Prometheus and Alertmanager config
- **Solution:**
  - Give `reminder_reconcile` its own loop or worker so it never waits behind probes or erasure.
  - Export per-job `last_run_at` and an outbox-oldest-pending gauge, and alert when urgent delivery is more than 3 minutes stale.
  - Make a hung loop exit so compose restarts it.
- **Complexity:** M
- **Benefit:** blood-SOS and SOS-status messages have a bounded latency, and a dead worker pages someone.

### 7. Frontend dead-code pass and one clinician tree
- **Finding IDs:** TD-06, TD-17, TD-37, AI-03, and the clinician duplication noted in 04
- **Solution:**
  - Delete `src/modules`, retarget `scripts/gen-module.js`, and delete one API client and the shims.
  - Choose `src/features/clinician` as the only clinician home and move `DoctorLabOrderDispatchScreen` into it.
  - Rename the deterministic `src/ai` safety code to a plainly named folder.
- **Complexity:** M
- **Dependencies:** item 1

### 8. Split the backend hotspots
- **Finding IDs:** TD-07, JOB-03
- **Solution:**
  - Continue per-domain routers.
  - First split `workflow_scheduler.py` into `scheduler/` and `outbox/`, the newest and fastest-growing hotspot.
  - Then move lab orders out of `clinical_api.py` (1,815 lines).
- **Complexity:** L (incremental)

### 9. Close the AI grounding gap before generation is enabled anywhere
- **Finding IDs:** AI-01, AI-02
- **Solution:**
  - Add a negation-parity check in both directions, plus a dropped-negation test.
  - Keep a small evaluation set that is run whenever the prompt or model changes.
  - Treat setting `OLLAMA_URL` in any environment as a Tier 1 change.
- **Complexity:** S–M
- **Benefit:** the one model path cannot turn "do not" into "do".

### 10. SOS fan-out through the outbox
- **Finding IDs:** SCALE-01 / JOB-02
- **Solution:** Enqueue campus-security and emergency-contact sends as urgent outbox events, and return straight away.
- **Complexity:** S–M
- **Dependencies:** item 6

### 11. Lawful basis and notice for the counsellor crisis queue; consent gate for other campus consoles
- **Finding IDs:** PRIV-08, TD-47
- **Solution:**
  - Write a decision record and get clinical-lead sign-off.
  - Add a privacy-notice line saying crisis signals reach the campus counsellor.
  - Apply server-side consent before any further campus clinical endpoint.
- **Complexity:** S (docs) / M (gates)

### 12. Ownership, ADRs, releases
- **Finding IDs:** TD-46, TD-22, TD-36
- **Solution:** unchanged from rev 1 item 12. Also: CODEOWNERS should name the three new console contributors for `src/features/clinician` and `src/screens/vendor`, and big integration PRs (like #137, 31 commits) should be split.
- **Complexity:** S–M

### 13. Typed API contract; E2E and native in CI
- **Finding IDs:** TD-13, TD-30, TD-45, A11Y-01
- **Solution:**
  - Rev 1 items 11 and 13.
  - Native `tsc` already passes locally, so adding it to CI is a single line.
- **Complexity:** M (contract), S (native tsc)

## 🟡 Fix during normal development

| # | Finding | Action |
|---|---|---|
| 14 | DS-06 | Replace `SkIcon` glyphs with manifest icons; block new imports of it |
| 15 | TD-48 | Move email suppression to Postgres or remove it; then drop `motor`. Also drop `langchain-ollama` and `passlib` if confirmed unused |
| 16 | JOB-06 | Implement or remove `CRISIS_ALERT`; correct the deployment guide |
| 17 | ENV-01 | One `app_env()` helper (rev 1 item 7) |
| 18 | TD-15, TD-42, TD-19, TD-20, TD-09 | As rev 1 items 14, 15, 18, 19 |
| 19 | TD-44, TD-43 | As rev 1 items 16, 17 (3 of 239 screens mapped now) |
| 20 | TD-21, TD-23, TD-35, TD-28, TD-29, TD-27 | As rev 1 items 20, 22, 23, 24, 25 |
| 21 | MOB-02, MOB-03, DS-05, ENV-05 | As rev 1 items 26, 27 |
| 22 | Docs | Rebase `audit-solutions/` on this register, or mark the findings it proposes for that are now closed (10) |

## 🟢 Longer-term
- Run clinical routers as `sk_clinical`, so the app login needs no table rights (TD-03 phase 2).
- Design archive to LFS (DS-03 / TD-33); hex-token migration (TD-24); `timestamptz` (TD-38); product name (TD-34).
- A campus join in `_crisis_accounts_in_scope` as data grows (19).
- Localised server errors via codes (I18N-02).

## Sequencing (estimate)

```text
Week 1:   1 2 3 4 5           (real gate, keys, dev login, Rule L enforced, exposure)
Week 2-3: 6 9 10 11 12        (worker reliability, AI guard, SOS outbox, privacy basis, ownership)
Week 3-6: 7 8 13              (frontend truth pass, backend split, contract + E2E)
Ongoing:  🟡 items as areas are touched
```

---

## Plan at revalidation 1 (`ad01230`) — historical record

The plan below was current at `ad01230`. The plan above supersedes it; item numbers referenced above ("rev 1 item N") point here.

## Completed since 2026-10-08 (kept for history)

| Previous item | Finding | Outcome |
|---|---|---|
| #1 Close the non-production backdoor | TD-01 | Done by default (`d92e2ef`). A residual default inconsistency is tracked as ENV-01 (item 7 below) |
| #3 Persist 2FA and fail closed | TD-04 | Done (`74e64df`, rev `b4e1c9d27f30`) |
| #6 Lock down operational routes | TD-09 | Routes role-gated; three consoles live. Remaining demo screens are item 15 |
| Mount DPDP router | TD-18 | Superseded by `services/erasure.py`, mounted and tested |
| Retract self-certification | TD-26 | Withdrawn 2026-10-11 |
| Remove guardian/minor UI | 17 | Removed |
| Remove identifiers/OTP from auth logs | TD-15 | Auth path done; `core/email.py` remains (item 14) |

## 🔴 Fix immediately (this week)

### 1. Make CI a gate again
- **Finding IDs:** TD-39, TD-02
- **Location:** `.github/workflows/ci.yml:3-7` and step 1.5; GitHub branch protection
- **Rationale:** CI is red on `main` and skips tsc, tests, build and gitleaks. It never runs on `development`. Red PRs are being merged.
- **Solution:**
  - Triggers: `[main, development]`.
  - Move `icons:audit` into a separate non-blocking job, or limit it to mapped screens with a ratchet. Keep `icons:check` blocking.
  - Required status checks plus one review on `main` and `development`.
- **Complexity:** S (≈1 h plus admin access)
- **Dependencies:** none
- **Benefit:** every later item becomes verifiable.

### 2. Supply the feature keys in deploy configs
- **Finding IDs:** TD-40 (ENV-02)
- **Location:** `.env.prod.example`, `docker-compose.prod.yml`, `deploy/helm/studentkare/**`, `backend/app/main.py:21-38`
- **Rationale:** In production, super admins cannot complete enforced 2FA, passes cannot be issued, and DPDP erasure is paused.
- **Solution:** Add `TWO_FACTOR_ENCRYPTION_KEY`, `PASS_SIGNING_SECRET`, `DPDP_ARCHIVE_KEY`, `DPDP_ARCHIVE_RETENTION_DAYS` and `INTEGRATIONS_ENCRYPTION_KEY` to all three deploy configs. Have startup log a clear "feature X disabled: missing KEY" (or a readiness flag) for each.
- **Complexity:** S
- **Dependencies:** none
- **Benefit:** safety features actually run in production.

### 3. Fix local sign-in and the setup docs
- **Finding IDs:** TD-41, TD-14
- **Location:** `.env.dev.example`, `README.md`, `docs/guides/CONTRIBUTING.md` (§2–§5, §9)
- **Solution:**
  - Set `SEED_DEMO_DATA=true` and `DEV_OTP_CONSOLE=true` in `.env.dev.example`, marked local-only.
  - Correct the description of the database (Postgres, not SQLite), the volume name, the clone URL and the native `DATABASE_URL`.
  - Remove the pasted Java checklist section from README.
- **Complexity:** S
- **Benefit:** a new developer can sign in on day 1.

### 4. Rate-limit identity behind the proxy
- **Finding ID:** TD-10
- **Location:** `services/workflow_auth.py:387,443-445`, `core/rate_limiter.py`, `backend/Dockerfile`
- **Solution:** Run uvicorn with `--proxy-headers --forwarded-allow-ips=<proxy CIDR>`, use the right-most trusted hop, and back both limiters with one shared store.
- **Complexity:** S
- **Benefit:** prevents a platform-wide login lockout and closes the XFF bypass.

### 5. Credential rotation and the prod overlay
- **Finding IDs:** TD-05, TD-16
- **Solution:**
  - Confirm in writing that the `013cd8a` credential has been rotated.
  - Either remove the dev `postgres`/`pgbouncer` and published monitoring ports from the prod overlay, or delete the overlay if Helm is the real deployment target.
- **Complexity:** S

## 🟠 Fix before team growth (next 4–6 weeks)

### 6. Execute the dead-code list
- **Finding IDs:** TD-06, TD-08, TD-17, TD-32, TD-37
- **Location:** `docs/dead-code-2026-10-14.md` (the team's own list: 330 unimported files and 135 test-only files); `src/modules/`; `scripts/gen-module.js:24`; the 56 unreachable backend modules
- **Solution:**
  - Delete in reviewable PRs; retarget the scaffolder to `src/features`; drop `motor`, `langchain-ollama`, `APScheduler` and `passlib`.
  - Delete one of the two API clients and the 64 shims.
  - Delete `src/core/auth/{otpManager,sessionManager,stepUpAuth}.ts` and the root `patch_*.py` files.
- **Complexity:** M
- **Dependencies:** item 1 (CI must verify the deletions)
- **Benefit:** "exists" means "runs"; honest test counts; faster onboarding.

### 7. One `APP_ENV` definition
- **Finding ID:** ENV-01 (residual of TD-01)
- **Location:** `app/main.py:17`, `workflow_auth.py:93`, `otp_delivery.py:47`
- **Solution:** A single `app_env()` helper that treats unset or unknown values as production; use it for migrations, cookie `Secure` and channel offering.
- **Complexity:** S

### 8. Rule L in Postgres and a consent gate for campus consoles
- **Finding IDs:** TD-03, TD-47
- **Solution:**
  - Alembic revision creating clinical and commerce roles with grants; a separate DSN for commerce routers; a CI test that asserts the denial.
  - Server-side consent and small-count suppression before wiring any campus clinical endpoint.
- **Complexity:** M
- **Dependencies:** items 1 and 9

### 9. One schema path; tests on Postgres; migration job
- **Finding IDs:** TD-11, TD-12
- **Solution:**
  - Run Alembic in every environment and add `alembic check` in CI.
  - Run pytest against the CI Postgres.
  - Use a one-shot migrate job or Helm hook instead of migrating at app startup.
  - Stop editing revisions that have already been applied (16).
- **Complexity:** M

### 10. Split the backend by domain
- **Finding ID:** TD-07
- **Solution:** Continue the pattern the new routers already follow. Move `workflow_api.py` domains (orders and payments, appointments, records, auth) into per-domain packages, one per PR.
- **Complexity:** L (incremental)
- **Dependencies:** item 9

### 11. Typed API contract
- **Finding ID:** TD-13
- **Solution:** Add `response_model` to routes, generate a TS client from OpenAPI in CI, and add machine-readable error `code`s. That also unblocks localised server errors (I18N-02).
- **Complexity:** M

### 12. Ownership and process
- **Finding IDs:** TD-46, TD-22, TD-36
- **Solution:**
  - CODEOWNERS with two or more owners per area.
  - ADRs extracted from the "Decisions needed from a human" sections of the plan files.
  - Release tags and images tagged by commit SHA.
  - Prune stale branches.
- **Complexity:** S–M

### 13. E2E and native checks in CI
- **Finding IDs:** TD-30, TD-45, A11Y-01
- **Solution:**
  - Wire `tests/*.smoke.mjs` (Playwright is already installed) to a CI job against compose.
  - Add `tsc -p config/tsconfig.native.json`.
  - Run axe through Playwright on a few routes.
- **Complexity:** M
- **Dependencies:** item 1

## 🟡 Fix during normal development

| # | Finding | Action |
|---|---|---|
| 14 | TD-15 | Mask recipients in `core/email.py` prints; switch to `logger` |
| 15 | TD-09, TD-20 | Connect or remove the remaining ~15 demo vendor screens; drop `mockData` from `FabricStore` and `RecordsStore`; remove the `addPoints` side effect (04) |
| 16 | TD-44 | Gate unreviewed te/hi in production, or block them on crisis and consent surfaces until reviewed |
| 17 | TD-43 | Make design coverage a ratchet on mapped screens; fill `implementation-map.json` as screens are touched |
| 18 | TD-42 | Remove the `localStorage` bearer-token path |
| 19 | TD-19 | Remove `PaymentCheckoutModal.tsx`; Ruff `BLE001`/`S110` |
| 20 | TD-21 | Choose a connection-pool strategy per environment |
| 21 | SCALE-01 | Move SOS WhatsApp sends to the outbox/worker |
| 22 | TD-23, TD-35 | Add `no-explicit-any`, react-hooks and jsx-a11y as warning ratchets; make Knip blocking after item 6 |
| 23 | TD-27, PRIV-02, PRIV-03 | Encrypt document content and document backup retention; write the erasure-archive key custody runbook |
| 24 | TD-29, TD-31 | Remove or restrict the Firebase client; add a single AI entry point before any LLM endpoint goes live |
| 25 | TD-28 | Dev compose profile with HMR; make the Vite backend auto-spawn opt-in |
| 26 | MOB-02, MOB-03 | Decide on the microphone permission before app-store submission; add a per-release device checklist |
| 27 | DS-05, ENV-05 | Storybook build in CI; reject unsigned alert webhooks outside dev |

## 🟢 Longer-term

- Move the design archive (88 MB) to LFS or an artifact store (DS-03 / TD-33); check icon-bundle size (DS-04).
- Finish migrating hex values to tokens (TD-24); `timestamptz` (TD-38); product name (TD-34).
- Build M18 as a separate service only when clinician prediction is actually built.
- Localise server messages via error codes (I18N-02).

## Sequencing

```text
Week 1:   1 2 3 4 5           (gate, config, dev login, rate limit, exposure)
Week 2-3: 6 7 9 12            (truth pass, env, schema path, ownership)
Week 3-6: 8 10 11 13          (Rule L + consent, domain split, contract, E2E)
Ongoing:  🟡 items as areas are touched
```
