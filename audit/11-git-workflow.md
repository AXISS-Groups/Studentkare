# 11 — Git & Team Workflow Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Item | Status | Evidence |
|---|---|---|
| CI branch filter vs `development` | **CHANGED** (TD-02, HIGH) | `development` has not moved since 2026-10-08 and is 135 commits behind `main`. PRs #136–#138 all merged into `main`. The filter still says `dev`. CONTRIBUTING still prescribes `development` |
| Failing CI merged | NOT REVALIDATED | `gh` returned HTTP 401, so run history could not be read |
| PR flow | Feature → `main` by PR (#136 partner/clinician consoles, #137 round-2 fixes, #138 audit docs) | Consistent trunk-style flow in practice |
| Merge strategy | Merge commits; one integration branch (`feat/round2-fixes`) merged 10+ feature branches before its PR | PR #137 carried 31 non-merge commits and 12 merges, which is hard to review |
| Migration chain hygiene | Improved | `29b3978` and `6314c67` re-chained and de-duplicated revisions **before** merge. No revision present at `ad01230` was edited (net diff on `alembic/versions` is additions only). Single head: `a4e9c1f7b2d6` |
| CODEOWNERS, tags | still none | |
| Credential in history | NOT REVALIDATED (TD-05) | |
| Remote branches | 69 (TD-36) | |
| Working tree at audit time | `main` @ `d333afe`, clean | |

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

| Item | Status | Evidence |
|---|---|---|
| CI branch filter (`dev` vs `development`) | OPEN (TD-02) | `ci.yml:3-7` unchanged |
| Failing CI merged to `main` | **Recurred** | PR #135 merged 2026-10-16 12:14 with PR and push runs failing (TD-39) |
| Feature → `main` directly | Recurred | #133, #135 from `feat/honest-safety-native-nav-requests` → `main`; #134 merged `main` → `development` |
| CODEOWNERS | still absent | |
| Tags / changelog | still none | |
| Credential in history | NOT REVALIDATED (TD-05) | rotation not verifiable |
| Remote branches | 67 (unchanged) | TD-36 |
| Working tree at audit time | `main`, clean except untracked `Audit_Plan.md`, `Intial_Audit_plan.md`, `audit/` | |

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## Verified from repository

| Item | Finding | Evidence |
|---|---|---|
| Documented strategy | GitFlow-lite: `feat/*` → `development` → release PR → `main` | `docs/guides/CONTRIBUTING.md` §7 |
| Integration branch name | `development` | local/remote branches |
| CI trigger branches | `push: [main, dev, "feat/*"]`, `pull_request: [main, dev]` | `.github/workflows/ci.yml:3-7` |
| Commit convention | Conventional Commits; 291 of last 300 non-merge commits comply (97%) | `git log` |
| PR template | Present, with P0 guardrail checklist | `.github/PULL_REQUEST_TEMPLATE.md` |
| CODEOWNERS | **Absent** | no `.github/CODEOWNERS`, `CODEOWNERS`, `docs/CODEOWNERS` |
| Tags / releases | **None** (`git tag` empty); `package.json` version `0.5.0` never tagged | |
| Changelog | **Absent** | |
| Remote branches | 67 (many stale: `dev-adi`, `dev-cir69`, `copilot/fix-github-actions-failure`, multiple `feat/sa*`) | `git branch -r` |
| Large binaries | Largest blob 4.5 MB MP4; total pack 47 MB; no Git LFS | `git rev-list --objects --all` |
| Generated / temp files tracked | `vite.config.ts.timestamp-1790693803629-39e99b366f48b.mjs`; `dist/` correctly ignored | `git ls-files` |
| `.gitignore` | Reasonable: `.env*` (with `!.env.*.example`), `*.db`, `node_modules`, `dist`, `.venv`, `.claude/` | `.gitignore` |
| Secret in history | A literal Postgres URL with password for host `dokploy…` was committed on 2026-09-12 (commit `013cd8a`) in backend source and later removed. Still present in history. (Value not reproduced here.) The 2026-09-13 internal audit (`docs/application-audit-2026-09-13.md` F02) flagged the same. | `git log -p -G` |
| Secret scanning | gitleaks in CI with `config/gitleaks.toml`; a second root `.gitleaks.toml` with a different allowlist; the CI config **disables** `generic-api-key` and `generic-secret` default rules | `config/gitleaks.toml` |
| Line endings | `.gitattributes` enforces LF for `.sh`, `.env*`, `.yml` | good |

## Verified from GitHub (read-only `gh` calls)

| Item | Finding |
|---|---|
| CI on `main` | Recent pushes to `main` from merged PRs `#123`, `#129`, `#130` concluded **failure** (`gh run list`, 2026-10-07) |
| PR flow | Feature branches merged directly into `main` (`#129`, `#130` from `feat/native-permissions-and-clinical-health-calculators`), and `main` merged back into `development` (`fd26533`) |
| Branch protection on `development` | API returned 404. This means either "not protected" or "token lacks admin scope". **Cannot verify** which; merged failing builds suggest required checks are not enforced on `main`. |

## Cannot verify without remote repository settings
- Required reviewers / required status checks / linear history settings.
- Whether secret scanning push protection is on.
- Whether the leaked database password was rotated.

## Findings

**Severity: CRITICAL — CI does not run on PRs to the integration branch**
Location: `.github/workflows/ci.yml:3-7`
Evidence: filters name `dev`; the branch is `development`. `feat/*` pushes run CI, but `fix/*`, `docs/*`, `chore/*`, `feature/*` (used: `feature/CIR-659-…`, `feature/updated-newui-patnersatff`) and PRs into `development` do not.
Impact: The team's main review gate has no automated checks. Combined with failing-CI merges to `main`, regressions reach production branches unchecked. This is the cheapest high-value fix in the repo.
Recommendation: `pull_request: branches: [main, development]`, `push: branches: [main, development]`; make the checks required in branch protection for both.

**Severity: HIGH — Credential in git history**
Location: commit `013cd8a` (2026-09-12), backend DB config
Impact: Anyone with clone access has had the database password since 2026-09-12. Removing it from HEAD does not revoke it.
Recommendation: Rotate the credential (if not already done) and record the rotation. History rewrite is optional once rotated.

**Severity: HIGH — Documented flow not followed**
Evidence: direct feature→`main` merges; failing CI merged.
Recommendation: Protect `main` (only `development` or `release/*` may merge, required checks, 1 reviewer); protect `development` (required checks, 1 reviewer).

**Severity: MEDIUM — No release/versioning practice**
Impact: No way to tell what is deployed or to roll back to a known version; `APP_VERSION` defaults to `dev` (`main.py:18`).
Recommendation: Tag releases on `main` (`vX.Y.Z`), inject `GIT_COMMIT`/`APP_VERSION` at build (already read by `/api/info`), generate a changelog from conventional commits.

**Severity: MEDIUM — No CODEOWNERS** (see 07).

**Severity: LOW — Stale branches**
Recommendation: Enable auto-delete of merged branches; prune the 67 remote branches.

## Readiness for 10–15 simultaneous contributors
Not ready. Conventions are good on paper (conventional commits, PR template, documented flow), but **nothing is enforced**: no CI on the integration branch, no protection evidence, no owners, no releases.
