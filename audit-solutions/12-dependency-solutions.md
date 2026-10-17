# 12 — Dependencies: Solutions

Answers [audit/12-dependency-audit.md](../audit/12-dependency-audit.md). Owns reproducible installs, dead dependencies, vulnerability scanning and update cadence.

---

## Reproducible installs
| Where | Today | Change |
|---|---|---|
| CI | `npm ci --legacy-peer-deps \|\| npm install` | `npm ci` only. If the peer-dependency conflict is real, add `.npmrc` with `legacy-peer-deps=true` so local, CI and Docker all behave the same |
| `deploy/Dockerfile` | `npm install --legacy-peer-deps` | `npm ci` (with the same `.npmrc`) and a BuildKit cache mount: `RUN --mount=type=cache,target=/root/.npm npm ci` |
| Node version | `.nvmrc` = 20, not enforced | `.npmrc` `engine-strict=true` |
| Backend | `pip install ruff pytest` unpinned in CI | install only from `backend/config/requirements-dev.txt`; pin `ruff` there |
| Backend lock | `requirements.txt` mixes `==` and ranges (`SQLAlchemy>=2.0.30,<2.1`, `alembic>=1.13.0`) | generate a full lock with `pip-tools` (`pip-compile requirements.in → requirements.txt` with hashes) and use `pip install --require-hashes` in Docker |

**Verify:** two clean builds a day apart produce identical `npm ls --all` / `pip freeze` output. **Effort:** S.

## Remove dead dependencies
- **Backend.** Removing these deletes the code that uses them ([03](03-architecture-solutions.md) TD-08):
  - `motor` (`core/db.py`)
  - `langchain-ollama` (`services/agents/routing_agent.py`)
  - `APScheduler` (`services/job_runner.py`)
  - `passlib[bcrypt]` (no importers)
- **Frontend:**
  - Knip-reported unused: `expo-constants`, `@testing-library/user-event`. Verify the Babel and Expo plugins first: `babel-preset-expo` and `babel-plugin-module-resolver` are used by `config/babel.config.cjs`, so add them to Knip `ignoreDependencies` rather than removing them.
  - Unlisted: add `expo-updates` and `expo-system-ui` to `package.json` if `app.json` keeps them, otherwise remove them from `app.json` ([29](29-mobile-offline-solutions.md)).
  - Unlisted binary: identify it from Knip output and add the package that provides it.
  - `firebase`: remove with TD-29 ([17](17-security-solutions.md)).
  - `playwright`: keep once E2E is wired ([13](13-testing-solutions.md)), otherwise remove.
- `babel-plugin-react-compiler` is pinned to a 2025 **beta**. Either upgrade to a stable release or remove it if the compiler isn't enabled.

**Effort:** S.

## Vulnerability scanning
- Add Dependabot or Renovate:
  - grouped weekly PRs for minor and patch updates;
  - security updates immediately;
  - separate groups for `expo*`/`react-native*`, which must move together with the Expo SDK.
- CI (`security` job, [18](18-cicd-deployment-solutions.md)):
  - `npm audit --omit=dev --audit-level=high`, blocking for production dependencies;
  - `pip-audit -r backend/config/requirements.txt`, blocking for high severity;
  - upload both reports.
- Keep upgrades deliberate. Don't bump React to 19 or Expo past 52 without a ticket; Expo SDK upgrades are a planned task.

**Effort:** S.

## Policy (add to CONTRIBUTING)
- Every new dependency PR states why, its size, and the alternatives considered. CODEOWNERS for `package.json` and `requirements*.txt` must approve.
- No dependency only "for future use". If nothing imports it, Knip fails CI.
