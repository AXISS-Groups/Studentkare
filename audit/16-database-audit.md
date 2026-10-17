# 16 — Database Architecture Audit

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

- 8 new Alembic revisions: remembered devices, campus departures, persisted 2FA, SOS alerts, erasure archives, lab-report review hold, student requests, consent records; 2 existing revisions edited (`7c5d1e2a4b90`, `e84d2b91c01f` — editing applied revisions is risky if any environment already ran them; verify).
- Rule L grants (TD-03): **OPEN** — none of the new revisions creates roles/grants.
- Dev `create_all` vs prod Alembic (TD-11), migrations at startup (TD-12), `NullPool` (TD-21), plaintext documents (TD-27), mixed timestamps (TD-38): **OPEN**.
- `workflow_models.py` grew to 1,063 lines.
- Erasure archive stored in the same DB under one Fernet key — see PRIV-03 in report 28.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## What exists

| Item | Evidence |
|---|---|
| Engine | PostgreSQL 16 (prod, CI, docker dev); SQLite allowed only when `APP_ENV=testing` (`services/db_sql.py:25-41`) — but `npm run dev` and the pytest suite both run in `testing` mode on SQLite |
| ORM | SQLAlchemy 2.0 declarative, typed `Mapped[...]` |
| Models | `core/workflow_models.py` (875 lines) + `core/billing_models.py`, `core/preventive_models.py`, `core/models_sql.py`: 76 `__tablename__` definitions, `care_*` prefix |
| Migrations | Alembic, 14 revisions, single linear chain; `fe83ff8b6dc6_add_active_workflow_schema.py` is a 36 KB baseline |
| Unused schema files | `backend/migrations/postgres_full_schema.sql` (38 KB), `studentkare_schema.sql` (defines roles `app_operational`, `app_identity`, `app_clinical`, `app_claims`, `agent_dept`), `cdci_medication_schema.sql` — not applied by Alembic or startup |
| Second database | MongoDB via Motor in `core/db.py` (used only by unmounted/unreachable code) |
| Pooling | `NullPool` for every Postgres URL (`db_sql.py:71`); PgBouncer container in compose/Helm; `USE_PGBOUNCER=true` rewrites host to `localhost:6432` (`db_sql.py:45-57`) |
| Sessions | `workflow_db()` yields `SessionLocal()` per request (`workflow_auth.py:33-35`), sync handlers run in FastAPI's threadpool |
| Constraints / indexes | ~125 `index=True` / `ForeignKey` / `UniqueConstraint` declarations in `workflow_models.py`; no `ondelete` rules |
| Binary data | Health documents stored as `LargeBinary` in Postgres (`workflow_models.py:84`), plaintext |

## Findings

**Severity: CRITICAL — Rule L / M18 database isolation does not exist**
Location: `backend/alembic/versions/*` (no `CREATE ROLE`/`GRANT`), `backend/migrations/studentkare_schema.sql:18-30` (roles defined, never applied), single `DATABASE_URL` in `docker-compose*.yml` and Helm `01-backend.yaml`
Problem: AGENTS.md guardrail 4 requires clinical data separation "enforced at Postgres grants and at the repository boundary — not by convention"; guardrail 5 requires M18 on its own role. The app connects with one role that owns every table (clinical records, orders, billing, marketplace catalog, analytics counters). `services/repository.py` — the only "repository boundary" module — is unreachable from `app.main`.
Impact: Any code path (marketplace, billing, analytics, an injected query) can read clinical tables. The architectural promise the company makes about its commerce firewall is unenforced.
Recommendation: In an Alembic revision, create `app_clinical` / `app_commerce` roles; grant clinical tables only to the clinical role; run commerce routers with a separate engine/connection string; add a CI test that the commerce role cannot `SELECT` from clinical tables.

**Severity: HIGH — Dev schema ≠ prod schema path**
Location: `backend/app/main.py:76-80`
Evidence: production → `run_migrations()`; everything else → `create_all_tables()` (metadata `create_all`). Tests → SQLite.
Impact: A model change without a migration works in dev and tests, then fails or silently diverges in production. The `services/migrations.py:24-36` docstring records exactly such a production boot failure (moved `alembic.ini`).
Recommendation: Use Alembic in every environment; add CI check `alembic upgrade head && alembic check` (autogenerate diff must be empty) against the CI Postgres.

**Severity: HIGH — Migrations run from every app replica at startup**
Location: `main.py:77-79`; `docker-compose.prod.yml` `replicas: 2`; Helm `replicaCount`
Impact: Concurrent `alembic upgrade` on deploy can deadlock or double-apply non-idempotent DDL.
Recommendation: Run migrations in a one-shot job (Helm pre-upgrade hook / compose `migrate` service) before rolling the app.

**Severity: HIGH — Connection management will not scale**
Location: `db_sql.py:71` `poolclass = NullPool` unconditionally for Postgres; compose backend connects **directly** to `postgres:5432`, not through PgBouncer; `USE_PGBOUNCER=true` rewrites to `localhost:6432`, which works only for the Helm sidecar layout (`deploy/helm/studentkare/templates/01-backend.yaml:55`); the compose `pgbouncer` service is unused and mis-pointed.
Impact: Every request opens and closes a TCP (and in prod, TLS) connection to Postgres. Under load this is the first bottleneck (connection setup latency, `max_connections` exhaustion).
Recommendation: Either a real SQLAlchemy `QueuePool` (size ~5–10 per worker) when connecting directly, or route through PgBouncer by service hostname (`pgbouncer:5432`) and keep `NullPool`. Make the choice explicit per environment.

**Severity: MEDIUM — Inconsistent time representation**
Evidence: most timestamps are epoch `Float` (`created_at`, `expires_at`), while `Reading.recorded_at` is an ISO `String(40)` (`workflow_models.py:72`) compared lexicographically in queries (`workflow_api.py:137`).
Impact: Timezone and ordering bugs; no DB-side date functions; float precision on epoch seconds.
Recommendation: `TIMESTAMP WITH TIME ZONE` for new columns; migrate hot tables gradually.

**Severity: MEDIUM — Clinical documents stored unencrypted in the main DB**
Location: `workflow_models.py:84`, upload handler `workflow_api.py:183-200`
Note: Upload validation is good (10 MB cap, magic-byte check, filename sanitising, virus scan hook). But `core/crypto_service.py` (AES-GCM) is unreachable, so content is plaintext `bytea`; backups and replicas contain raw health documents; DB size grows with files.
Recommendation: Object storage with server-side encryption (or app-level envelope encryption) and a DB pointer; at minimum encrypt the column.

**Severity: MEDIUM — Single 875-line model module shared by all domains**
Impact: All schema changes conflict in one file; no domain ownership of tables.
Recommendation: Split models per domain package while keeping one `Base`/metadata.

**Severity: LOW — Dead schema artefacts**
`backend/migrations/*.sql`, `core/db.py` (Mongo), `core/models.py`/`models_sql.py` overlaps. Remove or move to `docs/archive`.

## Query patterns
Handlers query inline; N+1 risk exists where lists are built in Python loops over related rows (spot-checked list builders in `workflow_api.py`); no systematic eager-loading. Not critical at current scale; revisit when splitting domains.

## Backup / recovery
`docs/runbooks/DISASTER_RECOVERY.md` describes intent; no backup job, PITR config or restore test is present in `deploy/` or Helm. **Cannot verify** managed-DB settings.
