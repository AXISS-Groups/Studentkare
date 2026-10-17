# 22 — Technical Debt Inventory

Difficulty: S (≤1 day), M (≤1 week), L (multi-week). Priority: P0 now, P1 before team growth, P2 normal development, P3 later.

> **This file is the finding register.** `TD-xx` IDs are the stable finding IDs used across every audit report. Other reports cross-reference these IDs instead of restating findings.
>
> Last revalidated **2026-10-17** against `main` @ `ad01230` (baseline: `development` @ `ab4ce3f`, 2026-10-08; 84 commits in between). Status vocabulary: OPEN · PARTIALLY RESOLVED · RESOLVED · REGRESSED · CHANGED · SUPERSEDED · NOT REVALIDATED · NO LONGER APPLICABLE.

## Current register (2026-10-17)

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
