# 21 — Developer Experience Audit

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

- Docker dev: still no HMR (TD-28) and now **no sign-in** without editing env (TD-41).
- Hidden Vite auto-spawn now also enables demo mode (`scripts/start-dev-backend.py` sets `SEED_DEMO_DATA`/`DEV_OTP_CONSOLE`), so the undocumented path is the only one that works out of the box — the opposite of what docs say.
- New tooling: Storybook (`npm run storybook`), icon build/check scripts, dev-only icon gallery at `/dev/icons`, ratchet lint lists — good for UI work.
- `npm run audit:all` now includes `icons:check`; `icons:audit` (CI) writes a report file into `design/`.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

| Area | Observation | Evidence |
|---|---|---|
| Setup time | Docker: ~30–60 min including image builds for 10 containers. Native: blocked until the developer discovers Postgres is required | 09 |
| Build time | Not measured (no execution). `npm run build` = full `tsc` + Vite + prerender script; Docker frontend build runs `npm install` from scratch each time without BuildKit cache mounts | `package.json`, `deploy/Dockerfile` |
| Test time | Not measured. 187 Vitest files under jsdom; 73 pytest files; CI runs them serially in one job | `ci.yml` |
| Hot reload | Vite HMR in native mode; **none** in the documented Docker mode (frontend is an nginx production build). Backend `--reload` only in native instructions; Docker backend has no reload or bind mount | `docker-compose.yml`, `deploy/Dockerfile` |
| Local backend | Three different ways, three behaviours: Docker (Postgres, `development`), native docs (Postgres required, undocumented), `npm run dev` auto-spawn (SQLite, `testing`, global `python`) | `vite.config.ts:8-34`, `scripts/start-dev-backend.py` |
| Debugging | No VS Code launch configs (`.vscode/` is gitignored), no debug docs; `print` and `logging` mixed | `.gitignore`, 14 |
| Error messages | Backend startup errors are clear ("Postgres-only: set DATABASE_URL…"); frontend API errors collapse to `null`/generic | 14 |
| Tooling | ESLint (minimal), Knip (non-blocking), Ruff, `audit:all` script bundles checks — good idea | `package.json` `audit:all` |
| Scripts | `gen:module` scaffolds into dead `src/modules`; ticket/PDF/Excel generators in `scripts/` mixed with build scripts | `scripts/` |
| Mobile | `start:native*` scripts exist; no docs; native type-check not in CI | `package.json`, `config/tsconfig.native.json` |
| Environment management | 106 backend env vars, 35 undocumented; dev example contains placeholders that look like they must be filled but are overridden by compose | 09 |
| Monitoring locally | Full Grafana/Loki/Prometheus stack starts by default — heavy for laptops | `docker-compose.yml` |

## Findings

**Severity: HIGH — No hot reload in the default (Docker) path**
Impact: Every UI change needs `docker compose up --build frontend`; developers will drift to native mode, which is the undocumented, broken path.
Recommendation: Add a `frontend-dev` compose service (`node:20`, `npm run dev`, bind-mount `src/`) and a backend bind mount with `uvicorn --reload`; keep the nginx build for a `prod-like` profile.

**Severity: HIGH — Hidden auto-spawned backend**
Location: `vite.config.ts:8-34`
Impact: A developer who forgot to start the real backend silently gets a SQLite `testing` backend with different auth behaviour (OTP IP limits skipped when `APP_ENV=testing`, `workflow_auth.py:338`); bugs "reproduce" or "disappear" depending on which backend is running.
Recommendation: Remove the plugin or make it opt-in (`CARE_AUTO_BACKEND=1`) and log loudly which backend/DB is in use.

**Severity: MEDIUM — Heavy default stack**
Recommendation: Compose profiles: default = postgres + backend + frontend-dev; `--profile observability` for the Grafana stack.

**Severity: MEDIUM — Scaffolder targets dead architecture** (see 08).

## Time to first running environment (estimate, evidence-based)

| Path | Competent developer, no help |
|---|---|
| Docker (as documented) | **2–4 hours** (image builds, pgbouncer restart noise, figuring out demo login from CONTRIBUTING §9) |
| Native (as documented) | **0.5–1.5 days** (fails on `DATABASE_URL`; must install/run Postgres, discover `PYTHONPATH`/pytest differences, or stumble on the Vite auto-spawn) |
| First meaningful feature PR | **1–2 weeks**, dominated by learning which code is live (see 20) |
