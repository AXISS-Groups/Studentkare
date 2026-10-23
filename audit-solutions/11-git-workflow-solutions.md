# 11 — Git & Team Workflow: Solutions

Answers [audit/11-git-workflow.md](../audit/11-git-workflow.md). Owns **TD-05** (credential in history), **TD-36** (stale branches), branch protection, CODEOWNERS and the merge flow. CI trigger and job changes (TD-02, TD-39) live in [18](18-cicd-deployment-solutions.md); releases and tags (TD-22) are also in [18](18-cicd-deployment-solutions.md).

---

## TD-05 — Credential in history (commit `013cd8a`)

**Goal:** The leaked password no longer grants access, and this is recorded.

**Steps**
1. **Rotate** the password of the database user from that commit on the database it pointed to. Update the vault, Helm secrets and any Dokploy environment.
2. Check the DB logs for connections from unexpected sources since 2026-09-12, where available.
3. **Record** the rotation (date and who did it) in `docs/security/VULNERABILITY_MANAGEMENT.md`, or as a closed security issue.
4. Optional: rewrite history with `git filter-repo --replace-text`. Only do this if the team accepts force-pushing every branch. It is not needed once the password is rotated.
5. **Prevent** recurrence:
   - enable GitHub secret scanning with push protection (repo settings);
   - re-enable gitleaks `generic-api-key` / `generic-secret` ([17](17-security-solutions.md));
   - add a pre-commit hook: `gitleaks protect --staged`.

**Verify:** the old credential fails to authenticate, and the record exists. **Effort:** S.

---

## Branch protection (cannot be set from the repo; requires a repo admin)

| Branch | Settings |
|---|---|
| `main` | require PR; required checks `frontend`, `backend`, `security` ([18](18-cicd-deployment-solutions.md)); 1 approving review; CODEOWNERS review; dismiss stale approvals; restrict who can push; allow merges only from `development` and `release/*` and `hotfix/*` (use a ruleset or a small CI check on `github.head_ref`) |
| `development` | require PR; the same required checks; 1 review; linear history optional |

A CI check that enforces the source branch for `main`:
```yaml
  base-guard:
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    runs-on: ubuntu-latest
    steps:
      - run: |
          case "${{ github.head_ref }}" in development|release/*|hotfix/*) exit 0;; esac
          echo "PRs into main must come from development, release/* or hotfix/*"; exit 1
```
**Verify:** a test PR from `feat/x` into `main` is blocked; a red PR cannot merge. **Effort:** S.

---

## CODEOWNERS
Create `.github/CODEOWNERS` with real GitHub handles (placeholders shown):
```text
*                               @primary-author @second-reviewer
/backend/services/workflow_auth.py  @auth-owner-1 @auth-owner-2
/backend/alembic/               @db-owner-1 @db-owner-2
/backend/app/                   @backend-owner-1 @backend-owner-2
/src/core/                      @frontend-owner-1 @frontend-owner-2
/src/design-system/ /design/    @design-system-owner-1 @design-system-owner-2
/src/i18n/                      @i18n-owner
/deploy/ /docker-compose*.yml /.github/  @platform-owner-1 @platform-owner-2
/AGENTS.md /CLAUDE.md /audit/   @primary-author @second-reviewer
```
Every area needs at least two people (TD-46, [07](07-collaboration-solutions.md)). **Effort:** S.

---

## Merge flow (as documented, now enforced)
```text
feat/*, fix/*, docs/*, chore/*  ──PR──▶ development ──release PR──▶ main ──tag vX.Y.Z──▶ deploy
hotfix/*  ──PR──▶ main, then merged back into development
```
- **Squash merge** feature PRs, so the conventional-commit title becomes the commit. That keeps the changelog clean.
- **Merge commit** for release PRs from `development` into `main`.
- Update `CONTRIBUTING.md` §7 to add `hotfix/*` and the tag step.

## TD-36 — Stale branches (67 remote)
- Enable "Automatically delete head branches" in repo settings.
- One-off cleanup: list branches already merged into `main` or `development`, and branches with no commits in 30 days. Owners confirm, then delete:
  `git branch -r --merged origin/development | grep -vE 'main|development'`

**Effort:** S.

## Commit and PR hygiene
- Keep Conventional Commits (97% adherence). Add `commitlint` in CI on the PR title, since squash merge uses it.
- PR template: add "Linked finding ID (TD-xx) if this fixes an audit item".
