# 18 — CI/CD & Deployment: Solutions

Answers [audit/18-cicd-deployment.md](../audit/18-cicd-deployment.md). Owns **TD-02, TD-39, TD-22, TD-45** and image hardening. TD-12 (migration job) is owned by [16](16-database-solutions.md) and TD-16 (prod overlay) by [17](17-security-solutions.md).

---

## TD-39 + TD-02 — Make CI a real gate (do first)

**Goal:** Every PR into `main` or `development` runs type-check, tests, build and the secret scan, and cannot merge while they are red. The design-coverage audit reports progress without blocking correctness checks.

**Approach:** Split the single serial job into parallel jobs, fix the branch filters, and move `icons:audit` into its own non-blocking job.

**Steps**
1. Change the triggers to `main` and `development`.
2. Split the job into `frontend`, `backend`, `security` and `design-coverage`.
3. Keep `icons:check` (checks the generated icon code is fresh) in `frontend`; that part passes today.
4. Make `design-coverage` run `icons:audit` with `continue-on-error: true` and upload the report as an artifact. Make it blocking only once the ratchet in [26](26-design-system-solutions.md) (TD-43) exists.
5. Add a `concurrency` group so pushes cancel stale runs.
6. In GitHub settings, make `frontend`, `backend` and `security` required checks on `main` and `development` (see [11](11-git-workflow-solutions.md)).

**Proposed change (sketch of `.github/workflows/ci.yml`)**
```yaml
name: Studentkare CI

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main, development]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: npm }
      - run: npm ci            # no "|| npm install" fallback (see 12)
      - run: npm run tokens:check
      - run: npm run icons:check
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npx tsc --noEmit -p config/tsconfig.native.json   # TD-45
      - run: npx vitest run
      - run: npm run build

  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: ci, POSTGRES_PASSWORD: ci, POSTGRES_DB: ci }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U ci -d ci" --health-interval 10s
          --health-timeout 5s --health-retries 5
    defaults: { run: { working-directory: ./backend } }
    env:
      PYTHONPATH: .:app:..
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci?sslmode=disable
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11', cache: pip }
      - run: pip install -r config/requirements-dev.txt ruff==<pinned>
      - run: ruff check .
      - run: pytest tests/ -q
      - name: Production startup guard
        run: APP_ENV=production OTP_HASH_SECRET='' python -c "from app.main import app" && exit 1 || echo PASS

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2   # pinned, replaces curl | tar
        env: { GITLEAKS_CONFIG: config/gitleaks.toml }
      - run: npm audit --audit-level=high || true   # report only; see 12

  design-coverage:
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: npm }
      - run: npm ci
      - run: npm run icons:audit
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: icon-coverage, path: design/screens/icon-coverage.md }
```
Keep the existing `docker compose config` validation as a step in `security` or as its own small job.

**Verify**
- A PR into `development` triggers the workflow.
- On current `main`, `frontend`, `backend` and `security` run to completion. The first green run is the real baseline; fix anything red that the old step-1.5 failure was hiding.
- A PR with a deliberate type error cannot be merged.

**Effort:** S (workflow) + unknown (failures the blocked run was hiding).
**Risk / rollback:** Real failures may surface on the first run because tests have not executed since 2026-10-16. Plan a day to fix them. To roll back, revert the workflow file.
**Depends on:** none. Branch protection is in [11](11-git-workflow-solutions.md).

---

## TD-45 — Type-check the native app in CI
Included above as `npx tsc --noEmit -p config/tsconfig.native.json`. Run it locally first. If it reports many errors, add it as a separate non-blocking job and ratchet the count down.
**Verify:** CI fails when a type error is introduced in `src/native/*.tsx`. **Effort:** S, plus fixing existing errors (unknown count).

---

## TD-22 — Continuous delivery, versioned images, rollback

**Goal:** Every deploy is an immutable, traceable image, and rollback means redeploying the previous tag.

**Steps**
1. Add a `release` workflow on push to `main` that:
   - builds `backend/Dockerfile` and `deploy/Dockerfile`;
   - tags each image `sha-<short>`, plus `vX.Y.Z` when the push is a git tag;
   - pushes to the registry, passing `--build-arg APP_VERSION=… GIT_COMMIT=…`. `/api/info` already reports `APP_VERSION` and `GIT_COMMIT`.
2. Helm: replace `tag: "latest"` / `pullPolicy: Always` with `tag: {{ required }}` passed at deploy (`--set backend.image.tag=sha-abc123`), and set `pullPolicy: IfNotPresent`.
3. Release process: tag `main` with semver; generate a changelog from conventional commits (`git-cliff` or `release-please`).
4. Rollback runbook: `helm rollback studentkare <rev>`, or redeploy the previous `sha-` tag. Migrations must be backward compatible for one release (expand → migrate → contract), so rolling back the app never needs an Alembic downgrade.

**Proposed change (sketch)**
```yaml
# .github/workflows/release.yml
on:
  push:
    branches: [main]
    tags: ['v*']
jobs:
  images:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          context: backend
          push: true
          tags: ghcr.io/axiss-groups/studentkare-backend:sha-${{ github.sha }}
          build-args: |
            APP_VERSION=${{ github.ref_name }}
            GIT_COMMIT=${{ github.sha }}
```
**Verify:** `/api/info` on any environment shows a commit that exists in git, and a rollback drill succeeds once.
**Effort:** M. **Depends on:** TD-39 green; TD-12 migration job ([16](16-database-solutions.md)).

---

## Image hardening (audit 18, MEDIUM)

**Backend `Dockerfile`, multi-stage and non-root (sketch)**
```dockerfile
FROM python:3.11-slim AS build
WORKDIR /w
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY config/requirements.txt .
RUN pip wheel --no-cache-dir -r requirements.txt -w /wheels

FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels
COPY --chown=app:app . /app
USER app
ENV PYTHONPATH=/app PORT=8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips", "${FORWARDED_ALLOW_IPS}"]
```
The `CMD` line overlaps TD-10. See [17](17-security-solutions.md) for how to pass the trusted proxy range. Exec form does not expand env vars, so use a small entrypoint script or the shell form.

Add `backend/.dockerignore` at the **build-context root** (the existing `backend/deploy/.dockerignore` is not read):
```
tests/
**/__pycache__
*.db
.venv/
```
Frontend `deploy/Dockerfile`: use `npm ci` instead of `npm install --legacy-peer-deps`, pin `nginx:1.27-alpine`, and consider `nginxinc/nginx-unprivileged`.

**Verify:** `docker run --rm <img> id -u` prints `10001`; the image contains no `tests/` directory.
**Effort:** S.

---

## Pipeline hygiene
- Pin and checksum tools: use `gitleaks/gitleaks-action`, and pin `ruff` to the version in `requirements-dev.txt`.
- Remove the duplicate step 4.5. `ciGuardrails.test.ts` already runs inside `vitest run`.
- Make Knip blocking after the dead-code deletion ([02](02-repository-structure-solutions.md)).
- Add a nightly scheduled run of the full suite, including smoke and E2E ([13](13-testing-solutions.md)).
