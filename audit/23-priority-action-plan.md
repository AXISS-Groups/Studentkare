# 23 — Priority Action Plan

**Updated 2026-10-17** for `main` @ `ad01230`. Finding IDs and their current status are in [22](22-technical-debt.md). Complexity figures are **estimates** for one engineer who knows the code: S ≤ 1 day, M ≤ 1 week, L multi-week.

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
