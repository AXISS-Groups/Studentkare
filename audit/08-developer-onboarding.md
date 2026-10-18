# 08 — Developer Onboarding Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Item | Change since `ad01230` |
|---|---|
| Sign-in on Docker dev | Unchanged: still impossible without editing env (TD-41) |
| Branching instructions | **Now misleading.** CONTRIBUTING says to branch from and PR into `development`, which is 135 commits behind `main` and abandoned (TD-02) |
| Running the stack | Better documented for operators: `docs/DEPLOYMENT_GUIDE.md` explains the new `worker`. `docker compose up` now also starts a worker |
| Understanding the backend | Better: `backend/ARCHITECTURE.md` and `docs/architecture/ARCHITECTURE.md` were refreshed against the code (`ca69016`), and large dead areas were deleted |
| Two audit trees | `audit/` and `audit-solutions/` both exist; a newcomer needs to know `audit/` is the finding source (10) |

Estimate unchanged: a few hours to a running stack, but no sign-in without code reading. First correct feature PR about 2 weeks.

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

| Item | Change |
|---|---|
| 16 Submit changes / CI | still no CI on PRs into `development`; CI on `main` red at icon audit (TD-39) |
| Demo login (trap #5) | **Changed**: Docker dev now has *no* way to sign in (TD-41); only the hidden Vite auto-spawn backend enables demo mode |
| Building a screen | **Improved guidance**: `CLAUDE.md` + `design/README.md` give a concrete per-screen workflow (brief → screenshot → source → icons → check). But its "prove it" step cannot pass yet (TD-43) |
| Scaffolder | still targets `src/modules` (TD-06) |
| Mobile | `src/native/README.md` documents `EXPO_PUBLIC_API_BASE_URL`; still not linked from README |
| Tribal knowledge | partly written down now in `docs/remediation-plan-2026-10-09.md` and `docs/dead-code-2026-10-14.md` — but these are dated working notes, not onboarding docs |

Estimate unchanged: Docker 2–4 h to a running stack, **but cannot sign in without code reading**; first correct feature PR ~2 weeks.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Perspective: a competent full-stack developer, first day, no one to ask.

| # | Question | Can they find out? | Where / why not |
|---|---|---|---|
| 1 | What the product does | **Partly** | README line 1 ("student-owned health records platform for Indian campuses"); real scope only emerges from `AGENTS.md`, `docs/SCREEN_PLAN.md` and 120+ routes in `src/features/health/module.ts` |
| 2 | Repository structure | **Partly** | `docs/incident/REPO_MAP.md` exists but is filed under "incident"; nothing explains `features` vs `screens` vs `modules` |
| 3 | Technology | **Yes** | README + `AGENTS.md` stack section |
| 4 | Install dependencies | **Yes** | `npm ci`; `pip install -r backend/config/requirements-dev.txt` |
| 5 | Configure env vars | **Partly** | `.env.dev.example` contains a Postgres placeholder while docs say SQLite; 35 vars undocumented |
| 6 | Run the application | **Partly** | Docker path likely works but builds a production frontend (no HMR) and 10 containers |
| 7 | Run the backend | **No (native)** | documented command fails without `DATABASE_URL` (`main.py:30-33`) |
| 8 | Run the frontend | **Yes, with surprises** | `npm run dev` auto-spawns a SQLite "testing" backend via `vite.config.ts:8-34` |
| 9 | Run tests | **Partly** | frontend yes; backend command differs from CI (see 09 §11) |
| 10 | Build | **Yes** | `npm run build` |
| 11 | Debug | **No** | no debugger configs, no logging guide; OTP codes for non-demo accounts printed to logs when `DEV_OTP_CONSOLE` is on (default `true`, `workflow_auth.py:198`) — discoverable only by reading code |
| 12 | Understand the architecture | **Hard** | five architecture docs, three frontend patterns, docs describe intent not reality |
| 13 | Add a new feature | **No guide**; the scaffolder `scripts/gen-module.js:24` generates into `src/modules/` — the **dead** architecture |
| 14 | Add a new API | **No guide**; would add to `workflow_api.py` by imitation |
| 15 | Modify database models | **No guide**; dev uses `create_all_tables()`, prod uses Alembic; no instructions to generate a revision |
| 16 | Submit changes | **Yes** | CONTRIBUTING §7 + PR template (but CI does not run on PRs to `development`) |
| 17 | Follow conventions | **Partly** | `AGENTS.md` guardrails are clear; style rules (tokens, a11y) not enforced by tooling |

## Key onboarding traps (tribal knowledge required)

1. Which frontend folder is live (`features` + `screens`, not `modules`).
2. Which API client is live (`src/data/api.ts`, not `src/data/services/api.ts`).
3. Vendor/pharmacy screens are mock-only UI.
4. `npm run dev` silently runs a SQLite backend in `APP_ENV=testing` mode.
5. Demo OTP `123456` and that it works on *any* non-`production` deployment.
6. `features/health/module.ts` is the route table for almost everything, not just "health".
7. DPDP router exists but is not mounted.
8. Which deploy path (Compose overlay, Dokploy, Helm) is real.

## Findings

**Severity: HIGH — A new developer will build in the wrong architecture**
Location: `scripts/gen-module.js:6,24`, `src/modules/*/README.md`
Evidence: The official scaffolder (`npm run gen:module`) creates a `src/modules/<name>` slice; module READMEs instruct importing from `@/modules/...`; none of that code is reachable from `App.tsx`.
Impact: First-week work lands in dead code; reviewers may not notice because tests pass.
Recommendation: Point the scaffolder at `src/features/<name>` with the live MobX ViewModel template, or remove it until the architecture is settled.

**Severity: HIGH — Native backend setup fails as documented** (see 09 §6).

**Severity: MEDIUM — No "first feature" path**
Recommendation: A worked example PR ("add a field end-to-end") linked from README.

## Estimate
With Docker and some persistence: **half a day to a running stack**. Native path: **1–2 days** (requires discovering Postgres requirement and `DATABASE_URL`). **Productive feature work: 1–2 weeks**, mostly spent learning which code is live. Evidence: see 21 and 24.
