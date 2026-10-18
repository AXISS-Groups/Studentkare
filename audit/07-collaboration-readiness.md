# 07 — Collaboration Readiness (10–15 developers)

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

- **Bus factor slightly better, still HIGH (TD-46).** Since `ad01230`, 31 of 40 non-merge commits are by one author. Three other developers landed the clinician and partner consoles (7 commits). All history: 365 of 441 non-merge commits by that author.
- **Merge friction is visible.** PR #136 (consoles, authored 2026-09-30) needed a "resolve PR #136 conflicts" merge (`e54d899`) against `main`.
- **Hotspots since `ad01230`** (non-merge commits): `workflow_api.py` 16, `workflow_scheduler.py` 9, `clinical_api.py` 7, `workflow_models.py` 6, `features/health/module.ts` 5. The backend hotspot is now one file the whole team must touch for almost any feature.
- **i18n areas grew** (`src/i18n/areas/partner.ts` +276, `campus.ts` +177, `care.ts` new). Per-area files are working as intended: no conflicts on the central catalogue.
- **Process:** PRs now target `main`, which CI covers. CONTRIBUTING still describes a `development` flow (TD-02). No CODEOWNERS. Branch protection cannot be verified.

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

- **Bus factor worsened** (TD-46, HIGH): all 73 non-merge commits since baseline are by one author.
- **Hotspots** (non-merge commits since baseline, excluding design/docs/i18n): `workflow_api.py` 9, `src/native/App.tsx` 8, `workflow_auth.py` 8, `WorkspaceScreen.tsx` 7, `AuthenticatedFlowScreen.tsx` 7, `config/hex-colour-legacy.json` 7. Same central files as before plus two new ratchet lists that every migration PR edits (low conflict risk: one line per file).
- **i18n catalogues** (`src/i18n/{en,te,hi}.ts`, 728 keys each) are a new shared hotspot: every UI PR adds keys to three large files. Per-area catalogues (`src/i18n/areas/`) mitigate this; prefer them for new keys.
- **Process still not enforced**: PR #135 (feature → `main`) merged with CI failing; CI still ignores `development` (TD-02); no CODEOWNERS.
- **Positive**: new backend domains in separate router files; ratchet lists let many people migrate files independently.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## Evidence: how the team works today

- 495 commits on `development`; **402 (81%) by one author** ("krishna chintakayala"). Since 2026-09-01: 259 of ~316 non-merge commits by the same person. The codebase has been effectively a one-developer system with occasional contributors.
- 162 merge commits; 34 since September are "Merge origin/development into …" / "resolve conflicts" merges.
- Feature PRs are merged directly to `main` (e.g. `#129`, `#130` from `feat/native-permissions-and-clinical-health-calculators`), contradicting `docs/guides/CONTRIBUTING.md` §7 ("PR base is `development`, never `main`").
- `gh run list` shows recent `main` pushes with **failed** CI (`Merge pull request #130`, `#129`, `#123` all `failure`) — failing builds were merged.

## Churn hotspots (non-merge commits since 2026-09-01)

| File | Commits | Why it is a hotspot |
|---|---|---|
| `backend/services/workflow_api.py` | 39 | every backend feature lives here |
| `src/screens/workspace/WorkspaceScreen.tsx` | 27 | central dispatcher: ~56 string comparisons mapping paths to screens |
| `package.json` / `package-lock.json` | 26 / 19 | |
| `backend/services/workflow_auth.py` | 22 | auth + session + rate limiting in one file |
| `src/lib/utils/workflowRouting.ts` | 21 | global route/role mapping |
| `backend/services/db_sql.py` | 18 | DB engine config churn |
| `src/App.tsx` | 17 | hardcoded route lists (`App.tsx:85-155`) |
| `src/features/health/module.ts` | 15 | one route table for ~120 workspace paths across student, clinician, vendor, admin |
| `config/gitleaks.toml`, `.github/workflows/ci.yml` | 15 / 14 | CI tuned reactively |

Adding any new workspace screen requires editing `features/health/module.ts`, `WorkspaceScreen.tsx`, `workflowRouting.ts`, and often `App.tsx`. Adding any backend endpoint means editing `workflow_api.py`. With 10+ developers these five files become a serialisation point.

## Answers

**Can multiple developers work on different features simultaneously?**
Frontend: partly. Feature folders under `src/features/*` are independent, but routing/registration is centralised in four files. Backend: no — nearly all work converges on `workflow_api.py` and `core/workflow_models.py`.

**Can two developers modify different parts without frequent conflicts?**
Not in routing or backend endpoints. Conflicts on `workflow_api.py`, `module.ts`, `WorkspaceScreen.tsx` and `package-lock.json` are near-certain each week at 10 developers. The 34 conflict-resolution merges in five weeks with ~3 active contributors already show the trend.

**Are responsibilities clearly divided?**
No. No `CODEOWNERS`. Domain boundaries are folder names, not enforced modules. The same domain exists in three places in the frontend.

**Could the team support multiple feature teams?**
Not without the restructuring in 23 (backend split by domain, per-feature route registration, one frontend architecture, CODEOWNERS).

## Findings

**Severity: HIGH — Central files every feature must touch**
Location: `backend/services/workflow_api.py`, `src/features/health/module.ts`, `src/screens/workspace/WorkspaceScreen.tsx`, `src/lib/utils/workflowRouting.ts`, `src/App.tsx`
Problem: Registration and dispatch are centralised instead of owned by each feature.
Impact: Merge conflicts, accidental route/permission regressions (commits `22bf1ee`, `60cae0a` "restore missing super admin routes" / "add missing super admin route paths" are exactly this failure).
Recommendation: Each feature exports its own route list (the `registerModule` mechanism already exists in `src/core/routing/registry.ts`); `WorkspaceScreen` resolves via the registry instead of a switch; backend routers per domain.

**Severity: HIGH — Bus factor of one**
Location: git history
Evidence: 81% of commits by one person; most docs and conventions were written by the same person.
Impact: Tribal knowledge (which architecture is live, which env vars matter, what is simulated) is concentrated. See 20.
Recommendation: Pair-review rotation; architecture decision records (ADRs) for the decisions in 23; CODEOWNERS with at least two owners per area.

**Severity: HIGH — Process documented but not enforced**
Location: `docs/guides/CONTRIBUTING.md` §7 vs `.github/workflows/ci.yml:3-7` vs merge history
Evidence: CI triggers on PRs to `main` and `dev` only; the integration branch is `development`, so **PRs into `development` get no CI run**. Feature PRs go straight to `main`. Failing CI on `main` merges.
Impact: The documented "CI must be green plus one approval" gate does not exist in practice.
Recommendation: Fix the branch filter (see 11/18), enable branch protection with required checks on `main` and `development` (cannot be verified from the repo — see 11).

**Severity: MEDIUM — No ownership metadata**
Location: no `CODEOWNERS` in `.github/` or root
Recommendation: Add `.github/CODEOWNERS` mapping `backend/services/workflow_auth.py`, `backend/alembic/`, `src/core/`, `deploy/` and `.github/` to named reviewers.

**Severity: MEDIUM — Single sequential CI job**
Location: `.github/workflows/ci.yml` (one job, 12 steps: lint → tsc → knip → vitest → build → backend lint → pytest → gitleaks → …)
Impact: Every PR waits for frontend and backend; one flaky step blocks all teams.
Recommendation: Split into `frontend`, `backend`, `security` jobs with path filters.

## What helps collaboration already
- Feature-module route registration (`registerModule`) exists — it just is not used per feature yet.
- PR template with a guardrail checklist (`.github/PULL_REQUEST_TEMPLATE.md`).
- Conventional-commit style is mostly followed (`feat(...)`, `fix(...)`).
