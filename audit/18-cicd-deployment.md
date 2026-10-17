# 18 — CI/CD & Deployment Audit

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

- **CI red on `main` since 2026-10-16** (TD-39): new step 1.5 `icons:audit` fails (`0/239 screens pass`), so tsc, Vitest, build, Ruff, pytest, gitleaks, startup-guard and compose checks are skipped on every run. PR #135 merged regardless.
- CI branch filter (TD-02), single serial job, non-blocking Knip/audit, no CD/tags (TD-22), migrations at startup (TD-12), prod overlay (TD-16), images as root: **OPEN**, files unchanged.
- **New**: deploy configs lack six feature keys (TD-40).
- Native type-check not in CI (TD-45); Storybook not in CI (DS-05).
- Note: `icons:audit` (`check-icons.mjs --all`) writes `design/screens/icon-coverage.md`, so the CI step mutates the checkout; harmless in CI, but it means the command is not read-only locally (this audit did not run it).

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## CI (`.github/workflows/ci.yml`)

One job, `ubuntu-latest`, Postgres 16 service. Steps: `npm ci --legacy-peer-deps || npm install` → ESLint → `tsc --noEmit` → Knip (`--no-exit-code`, non-blocking) → Vitest → one guardrail test file again → `npm run build` → pip install ruff/pytest + requirements-dev → Ruff → pytest (Postgres URL) → gitleaks (downloaded via curl, `if: always()`) → production startup guard check → `npm audit` (non-blocking) → `docker compose config` validation.

| Question | Answer | Evidence |
|---|---|---|
| Can builds be reproduced? | Partly | lockfile exists, but CI falls back to `npm install` and Docker uses `npm install` (`deploy/Dockerfile:9`); Helm images tagged `latest` with `pullPolicy: Always` (`values/production.yaml:34-37`) |
| Tests run automatically? | Only on pushes to `main`, `dev`, `feat/*` and PRs to `main`, `dev` | `ci.yml:3-7`; integration branch is `development` → **no CI** on PRs into it |
| Failures caught before deploy? | No evidence | No CD workflow; failing CI merged to `main` (`gh run list`) |
| Environments separated? | On paper | dev compose, prod overlay, Helm production values; no staging definition; `APP_ENV` default `development` (see 17) |
| Deployments documented? | Yes, for Helm | `docs/DEPLOYMENT_GUIDE.md` (kubectl/helm/kubeseal); prod compose overlay and Dokploy also referenced elsewhere — the live target is not stated |
| Rollback possible? | Weak | No image tags/versions, no release tags, migrations run at app start with no tested downgrade |
| Secrets handled safely? | Mixed | Helm secrets via SealedSecrets/Vault (good); compose overlay requires vault-injected vars (good); dev defaults and a historical leaked DB credential (see 11) |

## Container images

- `backend/Dockerfile`: `python:3.11-slim`, installs `build-essential` into the runtime image (not multi-stage), runs as **root** (no `USER`), copies whole `backend/` (tests and dead modules included; `backend/deploy/.dockerignore` exists but the build context is `backend/` and the ignore file is not at its root).
- `deploy/Dockerfile`: Node 20 build stage → `nginx:alpine` (unpinned), runs as root (nginx default).
- Uvicorn single process, no `--workers`, no `--proxy-headers` (see 17 rate limiting).

## Findings

**Severity: CRITICAL — CI branch filter misses the integration branch** (see 11). Fix: `[main, development]`.

**Severity: HIGH — No continuous delivery, no artifact versioning**
Evidence: no workflow builds/pushes images; Helm values use `tag: "latest"`; `APP_VERSION` defaults to `dev`; no git tags.
Impact: What is in production cannot be identified; rollback = guess. With 10+ developers merging daily, this becomes the main source of incident confusion.
Recommendation: CI job on `main` that builds both images tagged with the commit SHA (and semver on tags), pushes to a registry, and updates Helm values (or Dokploy) with that tag. Pass `GIT_COMMIT`/`APP_VERSION` as build args (`/api/info` already reports them).

**Severity: HIGH — Migrations coupled to app start with multiple replicas** (see 16). Helm `replicaCount: 3`.

**Severity: HIGH — Production compose overlay unsafe as written** (see 17): dev Postgres/pgbouncer still defined and published; monitoring admin ports published; `tempo` and `otel-collector` both bind host `4317/4318` (conflict); `frontend` `replicas: 2` with fixed host port `3000:80` cannot start a second replica outside Swarm.

**Severity: MEDIUM — Non-blocking or duplicated gates**
- Knip `--no-exit-code` and `npm audit … || echo` never fail.
- Step 4.5 re-runs one Vitest file already run in step 4.
- gitleaks downloaded with `curl | tar` without checksum verification.
- Ruff installed unpinned before requirements-dev.
Recommendation: Make Knip blocking once dead code is removed; pin and checksum tools (or use the official actions).

**Severity: MEDIUM — Single serial job**
Impact: Slow feedback (frontend + backend + build every PR) and one failure blocks unrelated teams.
Recommendation: Separate `frontend`, `backend`, `security`, `compose` jobs with `paths` filters; add `concurrency` cancel-in-progress.

**Severity: MEDIUM — Images run as root, include build toolchain and tests**
Recommendation: Multi-stage backend build, non-root `USER`, a `.dockerignore` at the build-context root excluding `tests/`, `__pycache__`, local DB files.

**Severity: LOW — Deployment guide command errors**
`docs/DEPLOYMENT_GUIDE.md:93` `helm repo add studentkare ./deploy/helm/studentkare` — `helm repo add` expects a chart repository URL; a local chart is installed directly with `helm install … ./deploy/helm/studentkare` (which line 97 already does).

## What is good
- CI validates Postgres migrations against a real Postgres service.
- Production startup guard check in CI.
- `docker compose config` validation for both dev and prod overlay.
- Helm chart with resource limits, health checks, sealed secrets, separate monitoring template.
