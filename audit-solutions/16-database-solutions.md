# 16 — Database: Solutions

Answers [audit/16-database-audit.md](../audit/16-database-audit.md). Owns **TD-03, TD-11, TD-12, TD-21, TD-38**, plus the "edited applied revisions" finding and the model-module split. TD-27 (encrypting documents) is owned by [28](28-privacy-solutions.md).

---

## TD-11 — One schema path: Alembic everywhere, tests on Postgres

**Goal:** Dev, CI and production build the schema the same way, so a model change without a migration fails in CI, not in production.

**Steps**
1. **Dev:** replace `create_all_tables()` in `backend/app/main.py` lifespan with a check that the database is at Alembic head. Run migrations through the migrate service (TD-12), not from the app.
   ```python
   # main.py lifespan
   from services.migrations import assert_at_head
   assert_at_head()   # raises with "run: docker compose run --rm migrate" if behind
   ```
   ```python
   # services/migrations.py
   from alembic.runtime.migration import MigrationContext
   from alembic.script import ScriptDirectory
   from sqlalchemy import create_engine
   def assert_at_head() -> None:
       cfg = _config()   # existing alembic.ini lookup
       head = ScriptDirectory.from_config(cfg).get_current_head()
       with create_engine(_postgres_url()).connect() as conn:
           current = MigrationContext.configure(conn).get_current_revision()
       if current != head:
           raise RuntimeError(f"Database at {current}, code expects {head}. Run migrations first.")
   ```
2. **CI drift check** (backend job, after tests):
   ```bash
   alembic -c config/alembic.ini upgrade head
   alembic -c config/alembic.ini check      # fails if models ≠ migrations (Alembic ≥1.9)
   alembic -c config/alembic.ini downgrade -1 && alembic -c config/alembic.ini upgrade head   # reversible last step
   ```
3. **Tests on Postgres:** change `backend/tests/conftest.py` so the default `DATABASE_URL` comes from the environment, and so each test runs in a transaction that is rolled back.
   ```python
   @pytest.fixture
   def db(engine):
       conn = engine.connect(); trans = conn.begin()
       session = Session(bind=conn, join_transaction_mode="create_savepoint")
       yield session
       session.close(); trans.rollback(); conn.close()
   ```
   Keep SQLite only for tests marked `@pytest.mark.unit` that never touch Postgres-specific behaviour. Locally, `docker compose up postgres` provides the database.
4. **Stop editing applied revisions.** `7c5d1e2a4b90` and `e84d2b91c01f` were modified after the baseline.
   - Check whether any environment ran the old version: compare `alembic_version` against the code, and diff the schema.
   - If one did, write a corrective forward migration.
   - Add a CI check: files under `alembic/versions/` that already exist on `main` may not be modified (`git diff --name-status origin/main... -- backend/alembic/versions | grep '^M'` → fail).

**Verify:**
- A PR that adds a model column without a migration fails `alembic check`.
- The pytest suite runs green against Postgres.

**Effort:** M. **Depends on:** CI fixed ([18](18-cicd-deployment-solutions.md)).

---

## TD-12 — Migrations as a one-shot job, not at app start

**Goal:** Exactly one process applies migrations per deploy, before the new app version starts.

**Compose**
```yaml
services:
  migrate:
    build: { context: backend }
    command: ["alembic", "-c", "config/alembic.ini", "upgrade", "head"]
    env_file: [{ path: .env, required: false }]
    environment: { DATABASE_URL: ${DATABASE_URL:-postgresql://studentkare:studentkare@postgres:5432/studentkare?sslmode=disable} }
    depends_on: { postgres: { condition: service_healthy } }
    restart: "no"
  backend:
    depends_on:
      migrate: { condition: service_completed_successfully }
```
**Helm:** a `Job` annotated `helm.sh/hook: pre-install,pre-upgrade`, `helm.sh/hook-weight: "-5"`, `helm.sh/hook-delete-policy: before-hook-creation`, using the backend image with the same `secretKeyRef` env.
**App:** remove `run_migrations()` from `lifespan`; call `assert_at_head()` (TD-11) instead.
**Rule for migrations:** use expand/contract. A release only adds nullable columns or tables; removal happens one release later. This keeps rollback safe ([18](18-cicd-deployment-solutions.md) TD-22).

**Verify:** deploy with 3 replicas; the logs show one `alembic upgrade`; apps start only afterwards. **Effort:** S–M.

---

## TD-03 — Enforce Rule L with Postgres roles and grants

**Goal:** Commerce code physically cannot read clinical tables. Enforcement lives in the database and at the repository boundary (AGENTS.md guardrail 4).

**Design**
| Role | Can access | Used by |
|---|---|---|
| `sk_migrator` | owner of all tables | migrate job only |
| `sk_clinical` | clinical + identity + consent + audit tables | clinical/records/auth routers |
| `sk_commerce` | catalog, cart, orders, billing, payments, inquiries; **no** clinical tables | marketplace/billing/payment routers |
| `sk_readonly_ops` | aggregate views only (small-count suppressed) | campus/admin dashboards |

**Steps**
1. **Classify every table.** Create `backend/core/data_classes.py` mapping `__tablename__` to `clinical`, `identity`, `commerce`, `ops` or `shared`, and add a test that fails when a model is not classified. That makes the boundary reviewable.
2. **Alembic revision `xxxx_rule_l_roles`:**
   ```python
   def upgrade():
       op.execute("DO $$ BEGIN CREATE ROLE sk_clinical NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
       op.execute("DO $$ BEGIN CREATE ROLE sk_commerce NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
       for t in COMMERCE_TABLES:
           op.execute(f'GRANT SELECT, INSERT, UPDATE, DELETE ON "{t}" TO sk_commerce')
       for t in CLINICAL_TABLES + IDENTITY_TABLES + COMMERCE_TABLES:
           op.execute(f'GRANT SELECT, INSERT, UPDATE, DELETE ON "{t}" TO sk_clinical')
       op.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC")
   ```
   Then create login users `sk_app_clinical` and `sk_app_commerce` as members of those roles. Passwords come from the vault, not from the migration.
3. **Two engines.** In `services/db_sql.py`, add `CommerceSessionLocal` bound to `DATABASE_URL_COMMERCE`. Commerce routers (`billing.py`, the catalog/cart/orders/payments parts of `workflow_api.py`) depend on `commerce_db()` instead of `workflow_db()`.
4. **Anything commerce needs from clinical goes through explicit views** containing no clinical columns. For example, "does this order need a prescription" becomes a boolean view.
5. **CI test:**
   ```python
   def test_commerce_role_cannot_read_clinical(commerce_engine):
       with pytest.raises(ProgrammingError, match="permission denied"):
           commerce_engine.connect().execute(text("SELECT 1 FROM care_documents LIMIT 1"))
   ```
6. Update `AGENTS.md` Rule L text to name the roles; drop the claim once it is true.

**Effort:** M–L. Most of the work is splitting routers ([03](03-architecture-solutions.md) TD-07). Start with billing, which is already its own router.
**Risk:** Missed grants cause 500s. Mitigate by running the full suite under the two roles in CI, and by rolling out with a feature flag that keeps the single DSN for one release.
**Depends on:** TD-11 (Postgres tests), TD-12 (migrator role), TD-07 (router split).

---

## TD-21 — Connection pooling per environment
`services/db_sql.py:71` always uses `NullPool`. Make it explicit:
```python
if USE_PGBOUNCER:          # Helm sidecar: PgBouncer pools, so the app must not
    _engine_kwargs["poolclass"] = pool.NullPool
else:                      # direct to Postgres: pool in-process
    _engine_kwargs.update(pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
                          max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
                          pool_recycle=1800)
```
In compose, either remove the unused `pgbouncer` service (see [17](17-security-solutions.md) TD-16) or point the backend at `pgbouncer:5432` by service name, never `localhost:6432`.
**Verify:** under a 50 RPS load test (`load_test.py`, moved to `scripts/`), the Postgres connection count stays flat. **Effort:** S.

---

## TD-38 — Timestamps
New columns use `DateTime(timezone=True)`. Migrate the hot ones (`care_readings.recorded_at`, which today is an ISO string compared lexicographically) with expand/contract: add `recorded_at_ts`, backfill, switch reads, then drop the old column. **Effort:** M per table; do it opportunistically.

## Model module split (MEDIUM)
Split `core/workflow_models.py` (1,063 lines) into `core/models/<domain>.py`, re-exported from `core/workflow_models.py` for one release so `M.X` imports keep working. Pure move; there is no schema change, so `alembic check` must show no diff. **Effort:** S–M.

## Backups and recovery
Document the managed-DB backup and PITR settings in `docs/runbooks/DISASTER_RECOVERY.md`, run a quarterly restore drill, and record the backup retention used by the erasure promise ([28](28-privacy-solutions.md)).
