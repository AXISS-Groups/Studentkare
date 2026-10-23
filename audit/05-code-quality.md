# 05 — Code Quality Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Metric | `ad01230` | `d333afe` | Note |
|---|---|---|---|
| ESLint | 0 errors | **0 errors** (run locally, exit 0) | |
| `tsc --noEmit` (web) | 6 local errors (stale `node_modules`) | **0** (exit 0) | local `node_modules` now in sync |
| `tsc -p config/tsconfig.native.json` | not run | **0** (exit 0) | not in CI (TD-45) |
| Knip unused files | 166 | 165 | TD-06 |
| Raw hex in non-test TSX | 2,040 (rev-1 method) | 1,546 (this pass's regex; same regex gives 2,393 at `ad01230`) | TD-24. Legacy list 170 → 148 |
| `@ts-ignore` | 4 | 4 | |
| `any` | 127 | 91 by this pass's regex (not comparable) | TD-35 |
| Backend `except Exception` | 134 | 135 | TD-19 |
| Python files > 1,000 lines | 3 | **4** (`workflow_scheduler.py` joins) | TD-07 |
| Duplicate API client | 610 + 644 | 527 + 627 | TD-17 |

The diff deletes 87 files. The largest removals are the dead backend agents and the fake scanner and console components. That improved signal-to-noise more than the metrics above show.

---

## 2026-10-17 update — revalidation 1 (`ad01230`) — metrics recomputed (same scripts, same method)

| Metric | 2026-10-08 | 2026-10-17 | Note |
|---|---|---|---|
| ESLint | 0 errors (unused-imports only) | 0 errors; **adds** raw-hex ban + raw-`<svg>`/`lucide-react` ban as ratchets | TD-23 PARTIALLY RESOLVED |
| `tsc --noEmit` (local) | 3 errors (missing native deps locally) | 6 errors (missing `axe-core`, Storybook types locally) | local `node_modules` stale; CI result unknown because CI stops at TD-39 |
| `any` (non-test) | 160 | 127 | TD-35 |
| `@ts-ignore` | 4 | 4 | |
| Knip unused files | 175 | 166 | TD-06 |
| One-line shims | 63 | 64 | TD-17 |
| TSX > 500 lines | 39 | 35 | |
| Raw hex in TSX | 4,625 | **2,040** | TD-24 |
| Inline `style={{` | 6,115 | 5,222 | |
| `Math.random` / `setTimeout` / "simulat" (non-test src) | 39 / 131 / 86 | 29 / 86 / 53 | fewer simulations |
| Backend `except Exception` / `+pass` | 132 / 29 | 134 / 29 | TD-19 |
| Backend `print(` | 68 | 68 | |
| Duplicate API client | 670 + 658 lines | 610 + 644 lines | TD-17 still OPEN |

Trend: honest-state and token work is measurably reducing debt; structural duplication (modules, shims, two API clients) is untouched.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Method: whole-repo grep metrics (script kept outside the repo), `tsc --noEmit`, `eslint` (project config), `knip` (project config), Python import-graph walk from `app.main`, and manual reading of the largest/most central files. Style preferences are excluded unless they cause a maintainability problem.

## Metrics

| Metric | Value | Comment |
|---|---|---|
| ESLint (`npm run lint`) | 0 errors | Config only enables `unused-imports/*` (`config/eslint.config.js`). No `react-hooks`, no `@typescript-eslint/no-explicit-any`, no a11y rules. "Lint passes" carries little signal. |
| `tsc --noEmit` (local) | 3 errors | All in `src/native/hardware/{biometrics,camera}.ts`: `expo-local-authentication` / `expo-camera` not installed in the local `node_modules` (lockfile drift on this machine; CI does a fresh install). `src/features/auth/views/IdentityVerifyNativeView.tsx:12-13` pulls these native-only files into the web type-check even though `tsconfig.json` excludes `src/native/**`. |
| `any` usages (non-test) | 160 | e.g. `PaymentCheckoutModal.tsx` `catch (e: any)` |
| `@ts-ignore` | 4 real (`src/lib/analytics/posthog.ts:32`, `src/lib/platform/firebaseClient.ts:25,38,43`) | AGENTS.md guardrail 10 forbids these |
| Knip | 175 unused files, 67 unused exports, 79 unused types, 11 duplicate exports, 1 unused dep, 4 unused devDeps | Knip config treats every file in `src/screens/**` and `src/components/**` as an *entry point* (`knip.json`, `config/knip.json`), so dead screens and components are **never** reported. True dead code is larger. |
| One-line re-export shims | 63 files | e.g. `src/data/http.ts`, `src/data/store.tsx`, `src/data/AuthContext.tsx`, `src/data/mockData.ts`, `src/ai/*.ts` (14 files), `src/lib/workflowRouting.ts` |
| TSX files > 500 lines | 39 | largest: `LabQueueScreen.tsx` 1,280; `StudentDashboardScreen.tsx` 1,224; `LandingLabTestsView.tsx` 1,155; `VendorHandoverScreen.tsx` 1,097 |
| Python files > 500 lines | 8 | `workflow_api.py` 3,084; `clinical_api.py` 1,204; `workflow_models.py` 875; `core/email_quality.py` 687 (unmounted) |
| Inline `style={{` | 6,115 | |
| Raw 6-digit hex literals in TSX | 4,625 | DESIGN.md: tokens only, "never raw hex" (e.g. `App.tsx:158` `'#F6F7FC'`) |
| `console.*` (non-test) | 51 | |
| `Math.random` (non-test src) | 39 | several generate fake telemetry / IDs in UI |
| `setTimeout` (non-test src) | 131 | many simulate latency/progress in demo widgets |
| Python `except Exception` (non-test) | 132 | 29 followed directly by `pass` |
| Python `print(` (non-test) | 68 | vs 113 `logging`/`logger` calls — two logging styles |
| TODO/FIXME | 8 (src), 2 (backend) | low; debt is not tracked in code |

## Findings

**Severity: HIGH — Duplicated, drifting implementations**
Location: `src/data/api.ts` vs `src/data/services/api.ts`; `src/modules/*` vs `src/features/*`; `src/ai/<name>.ts` shims vs `src/ai/{core,agents,engines}/<name>.ts`
Evidence: `diff` of the two API files shows divergent imports and `ingestVitals` (POST `/v1/telemetry/vitals`) present only in `src/data/api.ts:649-661`.
Problem: Two sources of truth for the same API client; fixes land in one copy.
Impact: Bugs fixed in one path persist in the other; reviewers cannot tell which is live.
Recommendation: Pick the live file, delete the other, then delete the 63 shims by rewriting imports (mechanical, one PR).

**Severity: HIGH — Very large screen and router files**
Location: see table; `backend/services/workflow_api.py`
Problem: Files over ~600 lines mixing layout, state, data and styles.
Impact: Merge conflicts, slow review, low test coverage per line (view tests on 1,000-line screens are shallow).
Recommendation: Extract per-screen ViewModels and sub-components when a file is next touched; set a soft limit (warn at 400 lines) via `max-lines` ESLint rule.

**Severity: HIGH — Silent exception handling**
Location: `backend/app/main.py:83-122` (four startup `except Exception` blocks), `200-219`; 29 `except Exception: pass` in backend; frontend `catch { /* … */ }` in 16 places, e.g. `src/App.tsx:72-74`, `src/features/auth/views/GuardianConsentView.tsx:26-28` (`.catch(() => { // Fallback for simulation })` then shows "sent").
Problem: Failures become no-ops with at best a `print`.
Impact: Production faults (scheduler not running, integration config not loaded, guardian request never sent) are invisible to monitoring.
Recommendation: Replace `print` with `logger.exception`; never show success after a swallowed error; add a Ruff rule `BLE001`/`S110` (blind except / try-except-pass) as error.

**Severity: MEDIUM — Lint and dead-code tools are configured to pass, not to find problems**
Location: `config/eslint.config.js`, `knip.json`, `config/knip.json`, `.github/workflows/ci.yml:62` (`npx knip --no-exit-code`)
Problem: ESLint checks only unused imports; Knip is non-blocking and its entry globs hide dead screens/components.
Impact: Quality gates show green while dead code and `any` grow.
Recommendation: Add `@typescript-eslint/recommended-type-checked` (start with `no-explicit-any` as warn), `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`; make Knip blocking with entries limited to `main.tsx`, route `load()` targets and `src/native/index.ts`.

**Severity: MEDIUM — Design-token rule not enforced**
Location: 4,625 raw hex literals; DESIGN.md "tokens … never raw hex"
Impact: Theming (dark mode exists in `src/theme/tokens/theme.tsx`) cannot be applied consistently; visual changes require editing hundreds of files.
Recommendation: Lint rule banning hex literals in `.tsx` outside `src/theme`; migrate opportunistically.

**Severity: LOW — Two Python logging styles**
Location: 68 `print(` vs `logging` usage
Recommendation: Ruff rule `T201` (print found) as error outside `scripts/`.

## Not problems (preference only)
- Object-of-functions API clients instead of classes: fine.
- MobX instead of Redux/Zustand: fine and consistently applied in `features/`.
- Inline styles per se: a valid RN-web choice; the problem is hex literals, not inline objects.
