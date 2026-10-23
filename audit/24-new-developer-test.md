# 24 — New Developer Simulation

**Updated 2026-10-17 (revalidation 2)** for `main` @ `d333afe`.

The persona is a competent full-stack developer joining today on a Linux laptop with Docker installed and no one to ask. Each step is simulated from repository evidence. **No setup, app or test command was executed.** The only commands run were read-only checks: `tsc` (web and native), ESLint and Knip, all of which passed on the audit machine. GitHub history could not be queried (`gh` returned HTTP 401).

## Revalidation 2 (`d333afe`)

| # | Step | Rev 1 | Rev 2 | Evidence now |
|---|---|---|---|---|
| 1 | Find repository | PARTIAL | **PARTIAL** | `CONTRIBUTING.md:41` still points to `kktejas07/Studentkare`; the origin is `AXISS-Groups/Studentkare` |
| 2 | Read README | PARTIAL | **PARTIAL** | Unchanged since 2026-09-21 (says SQLite, includes the Java checklist) |
| 3 | Understand project | PARTIAL | **PARTIAL** | Better: `backend/ARCHITECTURE.md` and `docs/architecture/ARCHITECTURE.md` refreshed against the code, and the dead backend agents are gone. New confusion: `audit/` and `audit-solutions/` sit side by side |
| 4 | Install prerequisites | PASS | **PASS** | unchanged |
| 5 | Configure environment | PARTIAL | **PARTIAL** | `.env.dev.example` still lacks the demo flags (TD-41) |
| 6 | Install dependencies | PASS / PARTIAL | **PARTIAL** | Unchanged. With a fresh `npm ci`, `tsc` is clean (verified locally) |
| 7 | Start application | PARTIAL / FAIL | **PARTIAL / FAIL** | Docker now also builds and starts a `worker`, which the docs never mention. The native backend command still fails without `DATABASE_URL` |
| 7b | Sign in | FAIL / PARTIAL | **FAIL / PARTIAL** | Unchanged (TD-41) |
| 8 | Run tests | PARTIAL | **PARTIAL** | Frontend commands are correct. CONTRIBUTING says `PYTHONPATH=backend backend/.venv/bin/pytest` (`:179`). CI uses `PYTHONPATH=.:app:..` from `backend/`, and its comment says plain `PYTHONPATH=.` failed collection. Whether the documented form works was not run. A Postgres-backed run needs `DATABASE_URL`, `TEST_DATABASE_URL` and `REQUIRE_POSTGRES=1`, documented only in `ci.yml` |
| 9 | Understand architecture | FAIL | **PARTIAL** | Backend: much clearer (18 unreachable modules, down from 56; refreshed docs). Frontend: still three trees, plus two clinician implementations, and the scaffolder still targets `src/modules` |
| 10 | Find feature (pharmacy dispensing) | PASS | **PASS** | unchanged |
| 11 | Modify feature | PARTIAL | **PARTIAL** | The clinician console shows a clean MVVM template (View / ViewModel / Model / Source with tests). Central routes still need edits (`features/health/module.ts`). The screen "proof" passes for at most 3 screens (TD-43) |
| 12 | Run tests | PARTIAL | **PARTIAL** | as step 8 |
| 13 | Create commit | PASS | **PASS** | conventional commits |
| 13a | **Choose base branch** (new) | — | **FAIL** | CONTRIBUTING says branch from `development` and PR into it. That branch is 135 commits behind `main`, abandoned since 2026-10-08, and gets no CI (TD-02) |
| 14 | Create PR | FAIL | **PARTIAL** (PR to `main`) / **FAIL** (as documented) | A PR into `main` runs `pr-quality-gate` and the independent `backend-postgres` job. The icon step can still skip the frontend gates (TD-39). Results not verified. No CODEOWNERS |

**Score: 3 PASS, 10 PARTIAL, 3 FAIL** (16 steps; 7 counted as FAIL for the native path, 14 counted as PARTIAL for the real path). Rev 1: 3 PASS, 8 PARTIAL, 4 FAIL (15 steps).

### Could a competent developer join on Monday and be productive by Tuesday without extensive hand-holding?

**Still no.** Day 1 is blocked in the same place (no sign-in on Docker). There is a new trap: the docs send them to a dead branch. Past those two, the codebase is noticeably easier than at rev 1. The backend is much smaller and better documented, the new console code is a good template, and a PR to `main` gets a real backend-on-Postgres check.

**What would change the answer to "yes"** (estimate: 1–2 days, see [23](23-priority-action-plan.md) items 1 and 3):
- Rewrite the branching section of CONTRIBUTING and retire `development`.
- Turn on the demo flags in `.env.dev.example` and fix README and CONTRIBUTING, including the worker and the backend test command.
- Move the icon audit out of the blocking path.

---

## Revalidation 1 (`ad01230`) — historical record

| # | Step | 2026-10-08 | 2026-10-17 | Evidence now |
|---|---|---|---|---|
| 1 | Find repository | PARTIAL | **PARTIAL** | `CONTRIBUTING.md:41` still points to `kktejas07/Studentkare`; the real origin is `AXISS-Groups/Studentkare` |
| 2 | Read README | PARTIAL | **PARTIAL** | Unchanged: still says the dev DB is SQLite, and still contains the unrelated Java checklist section |
| 3 | Understand project | PARTIAL | **PARTIAL** | Better: the certificate is withdrawn, and `CLAUDE.md` and `design/README.md` explain how screens are built. Worse: several dated plan and audit files in `docs/` with no index of which is current |
| 4 | Install prerequisites | PASS | **PASS** | `.nvmrc`, `.python-version` unchanged |
| 5 | Configure environment | PARTIAL | **PARTIAL** | `cp .env.dev.example .env` still works for Docker, but the file sets neither `SEED_DEMO_DATA` nor `DEV_OTP_CONSOLE` (TD-41) |
| 6 | Install dependencies | PASS / PARTIAL | **PASS / PARTIAL** | Unchanged. New devDeps: Storybook, Playwright, axe-core |
| 7 | Start application | PARTIAL / FAIL | **PARTIAL / FAIL** | Docker stack starts as before (no HMR). The native backend command still fails without `DATABASE_URL` |
| 7b | **Sign in** (new step) | (implicitly PASS via demo OTP) | **FAIL** (Docker) / **PARTIAL** (`npm run dev`) | Docker: no demo accounts, no console code, no mail provider, so `/api/auth/otp/send` returns 503 (`workflow_auth.py:262-275`). `npm run dev` auto-spawns a SQLite backend that *does* enable demo mode (`scripts/start-dev-backend.py`), but this is undocumented |
| 8 | Run tests | PARTIAL | **PARTIAL** | Frontend commands still correct. The backend command still differs from CI. Locally, `tsc` fails until `npm ci` refreshes `node_modules` (axe-core, Storybook types) |
| 9 | Understand architecture | FAIL | **FAIL** | `src/modules` still present and still the scaffolder target. Which code is live is written down only in `docs/dead-code-2026-10-14.md` |
| 10 | Find feature (e.g. pharmacy dispensing) | PARTIAL | **PASS** | `/dispensing` → `PharmacyDispensingScreen` → `FulfilmentQueuePanel` → live `/work/dispenses`; the comment in `WorkspaceScreen.tsx` explains it. (Many other vendor screens are still demo state.) |
| 11 | Modify feature | PARTIAL | **PARTIAL** | Better: new features have clear viewmodel/views folders, ratchet lint guides styling and icons, and `CLAUDE.md` defines the screen workflow. Still: routes need edits in several central files; the screen "proof" check cannot pass (TD-43) |
| 12 | Run tests | PARTIAL | **PARTIAL** | As step 8 |
| 13 | Create commit | PASS | **PASS** | Conventional commits followed |
| 14 | Create PR | PARTIAL | **FAIL** | A PR into `development` gets no CI. A PR into `main` gets CI that is red at the icon audit regardless of the change, so CI gives no signal either way (TD-02, TD-39). No CODEOWNERS |

**Score: 3 PASS, 8 PARTIAL, 4 FAIL** (counting the Docker path for 7/7b and the native path's FAIL in 7). At baseline it was 2 PASS, 10 PARTIAL and 2 FAIL.

## Could a competent developer join on Monday and be productive by Tuesday without extensive hand-holding?

**No. This has not improved, and the first hour is now worse.** On Monday they will have the Docker stack running but will not be able to sign in unless they read `workflow_auth.py` and `demo_seed.py`, or stumble on the Vite auto-spawn. Their first PR will get no useful CI signal.

Once past setup, the codebase is easier to work in than it was on 2026-10-08. New features are cleaner, the screen-building rules are explicit, and the honesty fixes mean fewer screens that look real but aren't.

**What would change the answer to "yes"** (estimate: 2–3 days of work, see [23](23-priority-action-plan.md) items 1, 3 and 6): turn on the demo flags in `.env.dev.example` and fix the docs, make CI a gate, delete `src/modules`, and retarget the scaffolder.
