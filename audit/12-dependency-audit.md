# 12 — Dependency Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

- **Backend:** `APScheduler` removed. `PyJWT` bumped to 2.15.1. `motor` is **not** dead: `core/email.py → core/email_quality.is_suppressed()` imports the Motor client on the live send path, and fails open (TD-48). It must be replaced before `motor` can go. `langchain-ollama`: no live importer found (the gateway uses `httpx`). `passlib`: no live importer found by grep. Both are still candidates for removal.
- **Frontend:** no `package.json` dependency changes since `ad01230`. Knip still runs non-blocking (165 unused files).
- **Reproducibility:** `npm ci --legacy-peer-deps || npm install` fallback in CI is unchanged. The new `backend-postgres` job installs `config/requirements-dev.txt` directly (no fallback). Good.

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

- **Added**: `react-native-svg 15.8.0` (dep); `@storybook/react-vite ^10.6.1`, `storybook ^10.6.1`, `axe-core ^4.14.0`, `playwright 1.61.1` (devDeps). **Removed**: `expo-local-authentication`.
- `playwright` is installed but only used by `tests/*.smoke.mjs`, which no script/CI runs (TD-30) — either wire it or drop it.
- Knip (config/knip.json): 1 unused dependency, 1 unused devDependency, 1 unlisted dependency, **1 unlisted binary** (new — likely `storybook`/`expo` CLI; not traced).
- Backend dead-code dependencies (`motor`, `langchain-ollama`, `APScheduler`, `passlib`) — OPEN (TD-08). `cryptography` now carries more weight (Fernet for 2FA, erasure archive, integration vault).
- Install reproducibility (`npm ci … || npm install`, Docker `npm install`) — OPEN.
- Local `node_modules` on the audit machine is stale relative to the lockfile (missing `axe-core`, Storybook types) — a reminder that `npm ci` after pull is required; not a repo defect.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Manifests: `package.json` + `package-lock.json` (lockfile v3, 1,358 packages); `backend/config/requirements.txt` + `requirements-dev.txt`. `npm audit` / `pip-audit` were **not** run (would need network and, for pip, an install); CI runs `npm audit --audit-level=high` as non-blocking (`ci.yml` step 11).

## Frontend

| Observation | Evidence | Assessment |
|---|---|---|
| Core libs single-version | react/react-dom 18.3.1, mobx 7.0.6, react-native 0.76.9, typescript 5.9.3 | Good |
| 95 packages resolved at multiple versions | lockfile | Normal for Expo/RN; not a concern |
| Caret ranges on most deps | `"vite": "^7.3.6"`, `"firebase": "^12.19.0"` | Fine *with* `npm ci`; but see build reproducibility |
| `npm ci --legacy-peer-deps \|\| npm install` in CI | `ci.yml:53` | Fallback to `npm install` silently rewrites the lock resolution when `npm ci` fails — CI may test a different tree than the lockfile |
| `npm install --legacy-peer-deps` in Docker | `deploy/Dockerfile:9` | Production image not built from lockfile exactly |
| Knip: unused dependency | `expo-constants` | Low |
| Knip: unused devDependencies | `@testing-library/user-event`, `babel-plugin-module-resolver`, `babel-plugin-react-compiler` (a **beta** pin `19.0.0-beta-ebf51a3-20250411`), `babel-preset-expo` | Some are used by Expo's Babel config Knip cannot see — verify before removing |
| Knip: unlisted | `expo-updates`, `expo-system-ui` referenced in `app.json` but not in `package.json` | Medium for mobile builds |
| Dynamic-import-with-catch SDKs | `posthog-js` (`src/lib/analytics/posthog.ts:33`), `firebase/app`, `firebase/auth`, `firebase/firestore` (`src/lib/platform/firebaseClient.ts:26-44`), all typed `any` with `@ts-ignore` | `firebase` (large) ships for an optional, admin-toggled integration; Firestore/Auth on a health app is a second data/auth plane (see 17) |
| Sentry | `@sentry/react` + `@sentry/browser` (`src/lib/sentry.ts:7-8`) | Fine |
| Node engine | `20.x`, not enforced | Low |
| `@types/node` `^26.5.0` vs Node 20 runtime | `package.json` | Type defs newer than runtime; may allow APIs Node 20 lacks. Low |

## Backend

| Package | Used by live code? | Note |
|---|---|---|
| fastapi 0.141.1, uvicorn, pydantic, SQLAlchemy, psycopg, alembic | yes | Exact pins (alembic, SQLAlchemy, psycopg use ranges) |
| PyJWT | yes (3 files) | |
| cryptography | yes | |
| httpx | yes | |
| python-multipart | implicitly (FastAPI form/upload) | keep |
| qrcode, dnspython | yes | |
| prometheus_client, opentelemetry-* | yes | |
| `motor` 3.7.1 (MongoDB) | **only** `core/db.py`, used by unmounted `core/email_quality.py` / unreachable modules | remove with dead code |
| `langchain-ollama` 1.1.0 | **only** `services/agents/routing_agent.py` (unreachable) | remove; pulls in LangChain core |
| `APScheduler` 3.10.4 | **only** `services/job_runner.py` (unreachable) | remove or wire |
| `passlib[bcrypt]` | no importers found | remove |
| `python-dotenv` | 1 file | fine |
| Dev: ruff, pytest, pytest-asyncio, anyio | `ruff` installed unpinned in CI (`pip install ruff pytest`, `ci.yml` step 6) | Unpinned ruff → new rules can fail CI unexpectedly; pin it |

`backend/config/requirements.txt` comments show the team already learned about pin drift (FastAPI pinned at 0.111 while dev ran 0.141; `python-jose` removed for an unfixable `ecdsa` CVE). That is good practice; continue it.

## Findings

**Severity: MEDIUM — Non-reproducible installs in CI and Docker**
Location: `.github/workflows/ci.yml:53`, `deploy/Dockerfile:9`
Recommendation: `npm ci` only (fail if lock is out of sync); fix the peer-dep conflict that motivated `--legacy-peer-deps` or record it in `.npmrc` (`legacy-peer-deps=true`) so local, CI and Docker match.

**Severity: MEDIUM — Dependencies carried only for dead code**
Location: `motor`, `langchain-ollama`, `APScheduler`, `passlib`
Impact: Larger image, more CVE surface, misleading signals about architecture (a reader assumes Mongo is in use).
Recommendation: Remove together with the dead modules (see 06).

**Severity: LOW — Unpinned tools in CI** (`ruff`, `pytest` on step 6 before requirements-dev reinstalls pytest).

**Severity: RECOMMENDATION — Make `npm audit` and `pip-audit` meaningful**
Keep them non-blocking but upload the report as an artifact and review weekly; add `pip-audit -r backend/config/requirements.txt`.

Not recommended: blanket upgrades. The stack is recent (React 18.3, Vite 7, FastAPI 0.141, SQLAlchemy 2.0). Upgrading React to 19 or Expo beyond 52 is not urgent.
