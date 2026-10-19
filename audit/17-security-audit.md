# 17 — Security Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Finding | Severity | Status | Change since `ad01230` |
|---|---|---|---|
| Rule L in DB (TD-03) | HIGH (was CRITICAL) | **PARTIALLY RESOLVED** | roles, grants, commerce role at the repository boundary, live status and alert. Fail-open default |
| CI gate (TD-02 / TD-39) | HIGH | CHANGED / OPEN | the real flow is `main`, which CI covers; the icon step still comes before the frontend gates |
| AI constitution (TD-31) | — | **RESOLVED** | single fail-closed gateway (30). New AI-01 (MEDIUM): dropped-negation gap |
| 2FA | — | RESOLVED + extended | COUNSELLOR enforced; audited super-admin reset, never self |
| Crisis data exposure | improved | — | crisis events kept out of the general ops feed (`53a4e43`); counsellor queue returns name, contact, kind and time only, never what the student wrote |
| Dependency advisories | improved | — | PyJWT 2.15.1 (14 advisories closed, `1cc4e54`) |
| CORS on 429/413 | fixed | — | `4daba6b` |
| Rate limiting (TD-10) | HIGH | OPEN | unchanged |
| Prod overlay (TD-16) | HIGH | OPEN | unchanged (worker added securely) |
| Feature keys (TD-40) | HIGH | OPEN, wider | worker lacks `DPDP_ARCHIVE_KEY`; counsellors now also blocked at 2FA setup in prod |
| Credential in history (TD-05) | HIGH | NOT REVALIDATED | |
| localStorage token (TD-42), Firebase (TD-29), logs (TD-15) | MEDIUM | OPEN | unchanged |
| Email suppression fails open (TD-48) | LOW | OPEN (new) | |

Guardrail scorecard changes: **4 Rule L**: partially met (commerce paths on a provisioned DB). **3 AI constitution**: met for the backend. **1 Fail closed**: Rule L enforcement is the notable fail-*open* default (deliberate, alerted, configurable).

---

## 2026-10-17 update — revalidation 1 (`ad01230`) — status of every finding below

| Original finding | Severity now | Status | Evidence |
|---|---|---|---|
| Non-production super-admin backdoor | MEDIUM (residual) | PARTIALLY RESOLVED (TD-01) | opt-in `SEED_DEMO_DATA` + explicit dev/test env; `DEV_OTP_CONSOLE` default false; unset `APP_ENV` = production in auth. Residual: `main.py` default and cookie `Secure` flag (ENV-01) |
| Rule L not enforced in DB | CRITICAL | OPEN (TD-03) | |
| CI not on `development` | CRITICAL | OPEN (TD-02) + CI red (TD-39) | |
| 2FA in memory | — | **RESOLVED** (TD-04) | persisted, sealed, fail-closed; SUPER_ADMIN enforced |
| Rate limiting on proxy IP | HIGH | OPEN (TD-10) | |
| Public staff consoles with fake data | MEDIUM | PARTIALLY RESOLVED (TD-09) | all role-gated; 3 consoles live |
| Credential in history | HIGH | NOT REVALIDATED (TD-05) | |
| Prod compose exposes services | HIGH | OPEN (TD-16) | |
| Identifiers/OTP in logs | MEDIUM | PARTIALLY RESOLVED (TD-15) | |
| AI constitution not executable | MEDIUM | OPEN (TD-31) | client decision support deleted |
| Bearer token from localStorage | MEDIUM | OPEN (TD-42) | |
| Firebase client integration | MEDIUM | OPEN (TD-29) | |
| Origin substring match (dev only) | LOW (was MEDIUM) | OPEN | now only in explicit dev/test (`workflow_auth.py:74-77`) |
| Minor-consent UI vs 18+ | — | **RESOLVED** | guardian views and routes removed |
| Razorpay default key | — | **RESOLVED** | `payment_gateway.py` rewritten; no default key |
| Alertmanager webhook fails open | LOW | OPEN (ENV-05) | |
| Admin integrations returned plaintext secrets (found by team) | — | RESOLVED (`77979cc`, `test_integration_secrets.py`) | not in original audit |
| **New:** feature keys absent from deploy config | HIGH | OPEN (TD-40) | 2FA setup for SUPER_ADMIN impossible in prod without `TWO_FACTOR_ENCRYPTION_KEY` |
| **New:** campus consoles without consent gate | HIGH | NOT REVALIDATED (TD-47) | team-reported |

Guardrail scorecard changes: 1 Fail closed — improved (2FA, demo gating, passes, erasure all fail closed), residual ENV-01; 2 No auth fallback — **met** for documented paths (remembered device still requires a code); 6 No hardcoded compliance claims — **met** (certificate withdrawn); 8 18+ only — **met** (guardian UI removed); 3, 4, 5 — still not met; 9 — partially (email logs, localStorage token); 10 — partially (`any` 127).

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Practical source review; nothing was exploited or executed against a running system. Secret values found in history are **not** reproduced. AGENTS.md P0 guardrails are used as additional acceptance criteria because the repository declares them non-negotiable.

## Strengths (keep these)

- Session cookies `HttpOnly`, `SameSite=Lax`, `Secure` in production, path `/api` (`workflow_auth.py:84-86`); session tokens stored hashed (`digest(raw)`, line 185).
- CSRF token required on every non-GET authenticated request, constant-time compared (`workflow_auth.py:138-142`).
- OTP: HMAC-bound to a challenge cookie, 5-minute expiry, max 5 attempts, single-use enforced by conditional `UPDATE … rowcount` (`workflow_auth.py:341-353`); per-identifier send/verify limits stored in Postgres.
- Payment webhooks HMAC-verified and **reject when the secret is unset** (`workflow_api.py:888-894`; `billing.py:70-75,386`).
- Upload handling: size cap, magic-byte MIME check, filename sanitising, virus-scan hook (`workflow_api.py:189-196`).
- Production startup guard refuses to boot without secrets/Postgres (`main.py:21-38`), with a CI check (step 10).
- 18+ enforced server-side at signup (`workflow_auth.py:229-260`).
- Global 5xx handler never leaks internals (`main.py:208-220`); Sentry `sendDefaultPii: false`.
- gitleaks in CI.

## Findings

### 🔴 CRITICAL — Any non-`production` deployment has a super-admin backdoor
Severity: CRITICAL
Location: `backend/app/main.py:17,100-112`; `backend/services/demo_seed.py:104,109`; `backend/services/workflow_auth.py:196-198,292-293,348-349`
Evidence:
- `APP_ENV = os.getenv("APP_ENV", "development")` — unset means development.
- Lifespan seeds demo accounts whenever `app_env != "production"`, including `demo.admin@studentkare.test` and phone `9876543211` with role **`SUPER_ADMIN`** (`demo_seed.py:104,109`). The comment above says "only when explicitly enabled", the code does not check any flag.
- For those identifiers, `/api/auth/otp/send` issues the fixed code `123456` without delivery, and `/api/auth/otp/verify` accepts `123456` whenever `APP_ENV != "production"` and `DEV_OTP_CONSOLE` is unset or `true` (default `"true"`, line 198).
- The non-production startup guard only requires a Postgres URL, so a staging/preview/Dokploy environment with `APP_ENV` unset, `staging`, `prod` or `Production` boots normally. `.env.dev.example` explicitly suggests pointing `APP_ENV=development` at a "Dokploy internal host".
Problem: Security depends on one exact string. Every other value fails open (AGENTS.md guardrails 1 and 2).
Impact: Anyone who reads `CONTRIBUTING.md` §9 or `.cursorrules` can sign in as Super Admin on any internet-reachable non-production instance — which then exposes admin APIs (accounts, integrations including stored provider secrets, audit, erasure, kill switch). If such an instance holds real or realistic user data, this is a data breach path.
Recommendation (fail closed): (1) Seed and accept demo OTP only when an explicit `DEMO_MODE=true` **and** `APP_ENV in {"development","testing"}`; (2) never seed `SUPER_ADMIN` demo accounts; (3) treat unknown `APP_ENV` values as production; (4) default `DEV_OTP_CONSOLE` to `false`. Verify no shared environment currently runs with `APP_ENV != production`.

### 🔴 CRITICAL — Commerce firewall (Rule L) not enforced in the database
See 16. One DB role for everything; role definitions exist only in an unapplied SQL file; the repository-boundary module is unreachable. Guardrail 4 explicitly requires grants, not convention.

### 🔴 CRITICAL — CI does not run on PRs into `development`
See 11. Security tests (OTP, age gate, crisis gate, records privacy, gitleaks) do not gate the integration branch, and failing CI has been merged to `main`.

### 🟠 HIGH — 2FA state is in process memory; 2FA silently disappears
Location: `backend/services/twofa_store.py:13-16` (`TWO_FA_STORE: dict = {}`, `TWO_FA_PENDING: dict = {}`); used in `workflow_auth.py:362-364` (`if is_enabled(account.id)` → else issue session)
Problem: After any restart, deploy, or on a different replica (`replicas: 2` in prod compose), `is_enabled` returns `False` and login proceeds **without** the second factor. The module docstring acknowledges "swap to a table for multi-instance prod".
Impact: Admin accounts that enabled 2FA are not protected by it most of the time. Fails open (guardrail 1).
Recommendation: Persist TOTP secrets (encrypted) and pending challenges in Postgres; if the 2FA store is unavailable, deny login for accounts flagged 2FA-enabled.

### 🟠 HIGH — Rate limiting keyed on the wrong client address
Location: `backend/services/workflow_auth.py:283` (`limit(db, f"ip:{request.client.host}", 30, 900)`); `backend/core/rate_limiter.py:100-117`; `backend/Dockerfile` CMD (no `--proxy-headers --forwarded-allow-ips`); `deploy/nginx.conf`
Problem: Behind nginx, `request.client.host` is the nginx container IP for **every** user, so the per-IP OTP bucket is effectively global: 30 OTP sends per 15 minutes for the whole platform. Meanwhile the global middleware trusts the left-most `X-Forwarded-For` value, which any client can set, so it can be bypassed. It is also in-memory per process.
Impact: Easy denial of login for all users at modest traffic (or by one attacker); global limiter evadable.
Recommendation: Run Uvicorn with `--proxy-headers --forwarded-allow-ips=<nginx/ingress CIDR>`, derive client IP from the right-most trusted hop, and use one shared store (Postgres buckets already exist; or Redis) for both limiters.

### 🟠 HIGH — Staff/pharmacy workflow screens are public routes backed by fabricated data
Location: `src/features/health/module.ts:36-68` (`/rx-review`, `/dispense-register`, `/lab-queue`, `/settlement`, `/staff-roles`, … all `public: true`); `src/screens/vendor/VendorRxReviewScreen.tsx:65` (`INITIAL_PRESCRIPTIONS` with doctor names, clinic, registration numbers, drug regimens)
Problem: Unauthenticated users can open operational consoles that look real. They contain realistic clinical-looking content and "sign-off" actions that persist nothing.
Impact: Reputational/regulatory risk (appears to expose prescriptions); staff may believe actions were recorded. Not a data leak today because data is fake.
Recommendation: Require `VENDOR`/`SUPER_ADMIN` on all vendor routes; remove demo arrays from production builds (or gate behind `demoDataEnabled()`, which already exists in `src/core/env.ts:23`).

### 🟠 HIGH — Database credential in git history
Location: commit `013cd8a` (2026-09-12)
Recommendation: Rotate; confirm rotation in writing. (Also reported in 11.)

### 🟠 HIGH — Production compose overlay leaves dev services exposed
Location: `docker-compose.yml` + `docker-compose.prod.yml`
Evidence: The overlay does not disable `postgres` (published `5432:5432`, user/password `studentkare`/`studentkare`) or `pgbouncer` (`edoburu/pgbouncer:latest`, published `6432`, default upstream `postgres:postgres@dokploy-postgres`). Prometheus runs with `--web.enable-admin-api` and publishes `9090`; Loki `3100`, Alertmanager `9093`, OTel `4317/4318/8888`, Blackbox `9115`, Grafana `3001` are all published on the host.
Impact: If this overlay is used on an internet-facing host without a firewall, the database and monitoring admin APIs are reachable. (Helm path differs — cannot verify which is live.)
Recommendation: In prod overlay set `postgres`/`pgbouncer` to `profiles: [dev]` or `deploy.replicas: 0`; bind monitoring ports to `127.0.0.1` or remove `ports:`; drop `--web.enable-admin-api`; pin images.

### 🟠 HIGH — Personal identifiers and OTP codes in logs
See 14 (`workflow_auth.py:207,209`, `core/email.py:192,216,291`). Guardrail 9.

### 🟡 MEDIUM — AI constitution is not executable
Location: `backend/services/ai_client.py` (unreachable), `src/ai/core/client.ts` (`executeAIModelCall` has no callers), `backend/services/agents/routing_agent.py:3-6` (direct `ChatOllama`, no constitution)
Today no live endpoint calls an LLM (the AYUSH agent is extractive), so nothing is *currently* bypassing it — but guardrail 3 ("every model call routes through the constitution module… a file that nothing imports is a bug") is unmet, and the existing LLM helpers would bypass it if wired. The fallback returns `status: "success"` with the user's own prompt as output.
Recommendation: One backend `invoke_ai_model` used by every model call, enforced by a test that greps for `httpx`/`ChatOllama` calls to model endpoints outside it.

### 🟡 MEDIUM — Bearer token read from `localStorage`
Location: `src/data/api.ts:394`, `src/data/services/api.ts:393` (`localStorage.getItem('sacare_token')`); `src/screens/auth/Flow03LoginScreen.tsx:105,132` writes `sk_token` (screen unreferenced)
Problem: Guardrail 9 forbids tokens in client-side storage. Sessions are cookie-based, so this path appears vestigial, but it means any XSS-planted value would be sent as a bearer token by `aiApi`.
Recommendation: Remove the localStorage token path entirely.

### 🟡 MEDIUM — Client-side Firebase Auth/Firestore can be switched on by admin config
Location: `src/App.tsx:63-75`, `src/lib/platform/firebaseClient.ts:26-44`
Problem: A super admin can enable a second auth provider and a third-party document store in the browser. Nothing restricts what is written to Firestore.
Impact: Risk of health data leaving the clinical store (guardrail 4/9; DPDP cross-border considerations).
Recommendation: Remove unless there is a reviewed use case; if kept, limit to push notifications with no PHI.

### 🟡 MEDIUM — Non-production origin check uses substring match
Location: `workflow_auth.py:69-71` (`"localhost" in origin`)
Problem: `https://localhost.attacker.example` passes in non-production. CSRF token still protects state changes, so impact is limited.
Recommendation: Parse the origin and compare hostnames exactly.

### 🟡 MEDIUM — Minor-consent flow conflicts with the 18+ rule
Location: `src/features/auth/views/GuardianConsentView.tsx` routed at `/guardian-consent`, labelled "RULE 8 · UNDER 18 CONSENT GATE"; POSTs to a non-existent `/auth/guardian/request` and shows success.
Backend correctly rejects under-18 signups (`workflow_auth.py:229-244`). The UI implies minors can be admitted with guardian consent, contrary to guardrail 8.
Recommendation: Remove the route or replace with a clear "18+ only" message.

### 🟢 LOW
- Razorpay key default `rzp_test_demo12345` (`services/payment_gateway.py:25`) — fail closed instead.
- `/docs` and `/openapi.json` public in production (`main.py:140`).
- Alertmanager webhook verification skipped when secret unset (`alerts.py:79`).
- `config/gitleaks.toml` disables `generic-api-key` and `generic-secret` rules, reducing detection.
- Client-side "security" managers (`src/core/auth/{otpManager,sessionManager,stepUpAuth}.ts`) using `Math.random` — unused; delete so no one wires them.

## Dependency vulnerabilities
Not scanned in this audit (no network install). CI runs `npm audit` non-blocking; no `pip-audit`. `requirements.txt` comments show past CVE-driven upgrades.

## Guardrail scorecard (evidence-based)

| P0 guardrail | Status |
|---|---|
| 1 Fail closed | **Violated** (APP_ENV default, 2FA store, swallowed errors) |
| 2 No auth fallback | **Violated** outside `production` (fixed OTP); offline auth correctly dev-only (`src/core/env.ts:20`) |
| 3 Executable AI constitution | **Not met** (unimported) |
| 4 Rule L at Postgres grants | **Not met** |
| 5 M18 separate service | **Not met** (no service exists) |
| 6 No hardcoded compliance claims | **Violated** (`docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md`) |
| 7 Accessibility | Partial (764 a11y label props; many large screens unaudited) |
| 8 18+ only | Backend met; UI contradicts |
| 9 No identifiers/tokens in logs or client storage | **Violated** (logs; localStorage token read) |
| 10 Strict TS, no escape hatches | **Violated** (160 `any`, 4 `@ts-ignore`) |
