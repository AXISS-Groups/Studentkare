# 21 — Developer Experience: Solutions

Answers [audit/21-developer-experience.md](../audit/21-developer-experience.md). Owns **TD-28**: no hot reload in Docker dev, and the hidden Vite backend auto-spawn. Dev sign-in (TD-41) is owned by [09](09-installation-solutions.md).

---

## TD-28a — A dev compose profile with hot reload

**Goal:** `docker compose up` gives a fast loop: Vite HMR, uvicorn `--reload`, Postgres, and nothing else.

**Proposed change (sketch of `docker-compose.yml`)**
```yaml
services:
  postgres: { ... unchanged ... }

  migrate: { ... see 16 TD-12 ... }

  backend:
    build: { context: backend }
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    volumes: ["./backend:/app"]                 # live code
    env_file: [{ path: .env, required: false }]
    environment:
      DATABASE_URL: postgresql://studentkare:studentkare@postgres:5432/studentkare?sslmode=disable
      APP_ENV: ${APP_ENV:-development}
    depends_on: { migrate: { condition: service_completed_successfully } }
    ports: ["8000:8000"]

  web:                                           # dev frontend (HMR)
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npm ci && npx vite --host 0.0.0.0 --port 3000"
    environment: { CARE_API_TARGET: http://backend:8000, CARE_AUTO_BACKEND: "0" }
    volumes: [".:/app", "web-node-modules:/app/node_modules"]
    ports: ["3000:3000"]
    depends_on: [backend]

  frontend:                                      # production-like nginx build
    profiles: ["prodlike"]
    build: { context: ., dockerfile: deploy/Dockerfile }
    ports: ["3000:80"]

  # monitoring: opt in with --profile observability
  otel-collector: { profiles: ["observability"], ... }
  prometheus:     { profiles: ["observability"], ... }
  loki:           { profiles: ["observability"], ... }
  promtail:       { profiles: ["observability"], ... }   # host /var/log mount is Linux-only; document it
  grafana:        { profiles: ["observability"], ... }
  alertmanager:   { profiles: ["observability"], ... }
  pgbouncer:      { profiles: ["pooling"], ... }         # or delete; see 16 TD-21
volumes: { web-node-modules: {} , ... }
```
Commands for the docs ([09](09-installation-solutions.md)):
| Goal | Command |
|---|---|
| Daily development | `docker compose up` |
| Production-like UI | `docker compose --profile prodlike up frontend` |
| With monitoring | `docker compose --profile observability up` |

**Verify:**
- Editing a `.tsx` file updates the browser in under 2 s.
- Editing a router file reloads uvicorn.
- `docker compose up` starts 4 services: postgres, migrate, backend, web.

**Effort:** S. **Risk:** File-watching on bind mounts is slow on Docker Desktop for Windows. Document `CHOKIDAR_USEPOLLING=true` for that case.

---

## TD-28b — Make the Vite backend auto-spawn opt-in

`vite.config.ts` `autoBackendPlugin` silently starts a SQLite `testing` backend.

```ts
function autoBackendPlugin(): Plugin {
  return {
    name: 'auto-backend',
    apply: 'serve',
    configureServer() {
      if (process.env.VITEST || process.env.CARE_AUTO_BACKEND !== '1') return;   // opt-in
      console.warn('\x1b[33m[backend]\x1b[0m Auto-starting a LOCAL SQLite backend (APP_ENV=testing). ' +
                   'Not Postgres; behaviour differs from Docker. Unset CARE_AUTO_BACKEND to disable.');
      // ...existing spawn...
    },
  };
}
```
Also make `scripts/start-dev-backend.py` use `sys.executable` and print which database URL it is using.
Without the opt-in, add a clear Vite proxy error message: "No backend on :8000. Run `docker compose up backend` or set CARE_AUTO_BACKEND=1."

**Verify:** `npm run dev` with no backend running shows the hint instead of silently spawning one. **Effort:** S.

---

## Debugging
- Commit a shared `.vscode/launch.json`, and un-ignore it in `.gitignore` with `!.vscode/launch.json`:
  - "Backend (uvicorn, debugpy)", attaching to `backend:5678` when started with `python -m debugpy --listen 0.0.0.0:5678 -m uvicorn …`;
  - "Vitest current file";
  - "Chrome against localhost:3000".
- Add a "Debugging" section in CONTRIBUTING covering where the logs are (`docker compose logs -f backend`), how to read a request ID ([14](14-error-handling-logging-solutions.md)), and how to read the dev OTP from logs.

## Faster feedback
- `npm run check:quick` = `lint` + `tsc --noEmit` + `vitest related --run` (changed files only).
- A pre-commit hook (`lefthook`) running `lint-staged` (ESLint and Ruff on staged files) plus `gitleaks protect --staged`. Keep it fast, under 10 s.
- CI job split and cancellation of stale runs ([18](18-cicd-deployment-solutions.md)).
