# 24 — New Developer Simulation

**Updated 2026-10-17** for `main` @ `ad01230`.

The persona is a competent full-stack developer joining today on a Linux laptop with Docker installed and no one to ask. Each step is simulated from repository evidence; **no command was executed**. GitHub results come from read-only `gh` queries.

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
