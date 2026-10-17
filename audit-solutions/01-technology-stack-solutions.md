# 01 — Technology Stack: Solutions

Answers [audit/01-technology-stack.md](../audit/01-technology-stack.md). Owns **TD-34** (product name drift) and **stack sprawl**. Individual dependency removals are in [12](12-dependency-solutions.md).

---

## Stack sprawl: keep, remove or decide

| Technology | Decision | Why / action |
|---|---|---|
| React 18 + Vite + RN-web + Expo, MobX, FastAPI, SQLAlchemy/Alembic, Postgres | **Keep** | sound and current; no rewrite |
| MongoDB (`motor`, `core/db.py`) | **Remove** | only unreachable code uses it ([03](03-architecture-solutions.md)) |
| LangChain (`langchain-ollama`) | **Remove** | only an unreachable agent uses it; raw `httpx` in `ai_client` is enough ([17](17-security-solutions.md) TD-31) |
| APScheduler | **Remove** | unreachable `job_runner`; the DB-backed `workflow_scheduler` is the live one |
| Firebase (client) | **Remove** unless an ADR justifies it | [17](17-security-solutions.md) TD-29 |
| PostHog + Sentry | **Keep** both (product analytics vs errors), but enforce no-PHI rules | check that the PostHog capture config has autocapture of inputs off and masks text; document it |
| Full Grafana/Loki/Tempo/Prometheus stack | **Keep for prod**, **optional for dev** | compose profile `observability` ([21](21-developer-experience-solutions.md)) |
| Storybook, Playwright, axe-core | **Keep** and wire into CI | [26](26-design-system-solutions.md), [13](13-testing-solutions.md), [27](27-i18n-accessibility-solutions.md) |
| `pydantic-settings` (new) | **Add** | typed configuration ([25](25-environment-configuration-solutions.md)) |
| `openapi-typescript` (new, dev) | **Add** | typed contract ([15](15-api-solutions.md)) |

Write ADR-0003 ([10](10-documentation-solutions.md)) listing the approved stack. Any new runtime technology needs an ADR.

## TD-34 — Product name drift
- `package.json` `name`: `sa-care-student-health-platform` → `studentkare`. Safe: the package is `private`.
- **Do not rename** runtime keys without migration logic:
  - cookies `sacare_session` / `sacare_challenge` / `sacare_signup`: renaming logs every user out;
  - localStorage `sa_care_theme`.
  Document the legacy prefix in `docs/README.md`. If it is ever renamed, read both names for one release.
- Native app display name and bundle IDs: check `app.json` / `config/mobile/app.json` for consistency before the store submission ([29](29-mobile-offline-solutions.md)).

**Effort:** S.

## Engine enforcement
`.npmrc`: `engine-strict=true` ([12](12-dependency-solutions.md)). Document `nvm use` in CONTRIBUTING.
