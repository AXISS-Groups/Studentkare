# 01 — Technology Stack Discovery

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

| Change | Evidence |
|---|---|
| Storybook 10 added | `@storybook/react-vite`, `storybook` devDeps; `.storybook/`; `npm run storybook` |
| Playwright added (devDep) | `package.json` `playwright 1.61.1`; used only by `tests/*.smoke.mjs` (not run by CI — TD-30) |
| axe-core added | `src/test/axe.ts`, used in 4 Vitest files (report 27) |
| `react-native-svg` added; `expo-local-authentication` removed | `package.json` diff; biometrics dropped (report 29) |
| i18n: en / te / hi typed catalogues | `src/i18n/` (report 27) |
| Design kit + generated icon module | `design/` 88 MB; `src/design-system/icons/generated/skIconData.ts` (report 26) |
| Service worker | `public/sw.js` (report 29) |
| Payments | `services/payment_gateway.py` rewritten: reports UNAVAILABLE instead of fake Razorpay/Stripe ids; `rzp_test_demo12345` default **removed** |
| Size | TS/TSX files 1,128 → 1,188 (≈126K LOC non-test); Python 213 → 236 files (≈27.6K LOC non-test) |

Unchanged: `motor`, `langchain-ollama`, `APScheduler`, `passlib` still pinned for unreachable code (TD-08); product name drift (TD-34).

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Audit date: 2026-10-08 · Branch: `development` @ `ab4ce3f` · Method: manifests, lockfiles, configs, import scans. Nothing installed or modified.

## Summary

| Layer | Technology (evidence) | Notes |
|---|---|---|
| Web frontend | React 18.3.1, TypeScript 5.9 (strict), Vite 7.3, `react-native-web` 0.19 (`package.json`, `package-lock.json`) | `tsconfig.json` `strict: true`, but `noUnusedLocals: false` |
| Mobile | Expo ~52, React Native 0.76.9, `@react-navigation/native` 7 (`package.json`, `app.json`, `config/metro.config.cjs`, `config/babel.config.cjs`) | `src/native/**` excluded from `tsconfig.json` |
| Routing | `react-router-dom` 7 (web) behind facade `src/core/navigation`; React Navigation (native) | Two routers by design |
| State | MobX 7 + `mobx-react-lite` (`src/core/store/ViewModel.ts`, `src/features/*/store/*.tsx`), React Context (`src/data/contexts/*`), a custom `useSyncExternalStore` store (`src/modules/*/state`) | Three state approaches (see 04) |
| Styling | Inline style objects (6,115 `style={{` occurrences), 93 plain CSS files under `src/theme`, design tokens `design/tokens/studentkare.tokens.json` built by `scripts/tokens/build-tokens.mjs` | 4,625 raw hex literals in `.tsx` despite DESIGN.md "never raw hex" |
| Backend | Python 3.11 (`.python-version`), FastAPI 0.141.1, Uvicorn 0.52, Pydantic 2.13, SQLAlchemy 2.0, psycopg 3 (`backend/config/requirements.txt`) | |
| Database | PostgreSQL 16 (compose, CI service); SQLite used in `APP_ENV=testing` and by `scripts/start-dev-backend.py` | MongoDB driver `motor==3.7.1` also pinned; `backend/core/db.py` is a Motor client (legacy, see 16) |
| Migrations | Alembic, 14 revisions (`backend/alembic/versions`), `config/alembic.ini`; plus 3 raw SQL dumps in `backend/migrations/*.sql` (not applied by anything) | Dev uses `create_all_tables()`; prod runs Alembic at app start |
| Connection pooling | PgBouncer (`edoburu/pgbouncer:latest`) in compose/helm; SQLAlchemy `NullPool` | See 16/19 |
| Auth | Custom OTP (email / WhatsApp) + HttpOnly session cookie + CSRF token (`backend/services/workflow_auth.py`); TOTP 2FA (`services/twofa_store.py`); PyJWT pinned; a second, Mongo-backed `core/deps.get_current_user` exists in legacy code | No external IdP. ABDM/ABHA is a stub (`services/abdm_gateway.py`, unreachable) |
| Payments | Razorpay (`services/payment_gateway.py`, `services/billing.py`) | Default key `rzp_test_demo12345` in code |
| Messaging | SMTP / Postal (email), OpenWA (WhatsApp), Slack webhook (`services/slack_notifier.py`), n8n dispatch | |
| AI / ML | Ollama via `httpx` (`services/llm_gateway.py`), `langchain-ollama` (`services/agents/routing_agent.py`), local RAG/vector store (`services/vector_store.py`, `rag_vector_store.py`); frontend "AI" in `src/ai/**` is deterministic TypeScript rule code | No hosted LLM provider wired; admin UI mentions OpenAI/Gemini |
| Analytics | PostHog (`posthog-js`), Firebase (`firebase` 12) — both initialised from server-provided public config in `src/App.tsx:63-75` | |
| Error tracking | Sentry (`@sentry/react`, `@sentry/browser`; backend `core/sentry.py`) | |
| Observability | OpenTelemetry SDK, Prometheus client, Grafana, Loki, Promtail, Tempo (prod), Alertmanager, Blackbox exporter (`deploy/*`) | Full stack runs in *dev* compose too |
| Infra | Docker (`backend/Dockerfile`, `deploy/Dockerfile` → nginx), Docker Compose dev + prod overlay, Helm chart (`deploy/helm/studentkare`), Dokploy referenced in env comments | |
| CI | GitHub Actions, single workflow `.github/workflows/ci.yml` | See 18 |
| Testing | Vitest 4 + jsdom + Testing Library (187 test files in `src`); pytest 9 + pytest-asyncio (73 test files in `backend/tests`); 11 Node smoke scripts in `tests/*.smoke.mjs` (not wired to any script or CI) | |
| Static analysis | ESLint 10 (unused-imports rules only), `tsc --noEmit`, Knip, Ruff (`backend/ruff.toml`), gitleaks (two configs), Semgrep config (`config/semgrep.yml`, not run in CI) | |
| Tooling | Node engine `20.x` (`.nvmrc`), npm (lockfile v3), `scripts/gen-module.js` scaffolder | |

## Size

| Measure | Value |
|---|---|
| Tracked files | 2,274 |
| Frontend TS/TSX files | 1,128 (≈114.9K LOC excluding tests) |
| Backend Python files | 213 (≈25.3K LOC excluding tests) |
| `design/screens` (HTML/asset mockups) | 514 files, 44 MB |
| `.git` pack | 47 MB |

## Findings

**Severity: MEDIUM — Stack sprawl relative to team size**
Location: `package.json`, `backend/config/requirements.txt`, `docker-compose.yml`
Evidence: Postgres + Motor/MongoDB driver; PostHog + Firebase + Sentry; Ollama via both raw `httpx` and `langchain-ollama`; 9 monitoring containers in the *development* compose file.
Problem: Each integration adds config, failure modes, and onboarding cost. Several are dormant (Mongo code unreachable from `app.main`; LangChain only used by an unreachable agent).
Impact: New developers must understand and run far more than the product uses. `docker compose up` starts 10 containers.
Recommendation: Remove `motor` and `langchain-ollama` once the dead modules that need them are deleted (see 06). Move the monitoring stack to an optional compose profile.

**Severity: LOW — Product name drift**
Location: `package.json:2` (`"name": "sa-care-student-health-platform"`), cookies `sacare_session` (`workflow_auth.py:24`), localStorage key `sa_care_theme`.
Problem: Three names (SA Care, Sacare, Studentkare) for one product. Cosmetic, but confuses grep-based navigation.
Recommendation: Leave runtime keys (cookie rename would log users out); rename the package and document the legacy prefix.

**Severity: LOW — Local runtime differs from declared engine**
Evidence: `.nvmrc` = `20`; the auditor's environment ran Node v22.22.2 without a warning. `engines` is not enforced (`engine-strict` not set).
Recommendation: Add `.npmrc` with `engine-strict=true` or document `nvm use`.

## Could not determine
- Hosting provider for production (Dokploy is implied by `dokploy-postgres` defaults in `docker-compose.yml` and `services/db_sql.py`; the Helm chart implies Kubernetes). Which one is live cannot be verified from the repository.
