"""
services.migrations — Run Alembic migrations at startup (Postgres-only).

The schema is applied via versioned migrations (never bare create_all on an
existing schema). A missing or non-Postgres DATABASE_URL fails closed.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _postgres_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url or not url.startswith(("postgresql://", "postgresql+psycopg://")):
        raise RuntimeError("Postgres-only: set DATABASE_URL to a postgresql:// URL.")
    return url


def _alembic_ini() -> Path:
    """Locate alembic.ini.

    It lived at backend/alembic.ini until db854c0 moved it under config/ as part
    of a general config consolidation; this module was not updated, so
    Config(BACKEND_DIR / "alembic.ini") raised FileNotFoundError. That call sits
    in the production startup path — app/main.py runs migrations when
    APP_ENV == "production" — so the app did not merely skip migrations, it
    failed to boot.

    Both locations are checked so this keeps working whichever side of that
    refactor a deployment is on, and it fails with the paths it tried rather
    than with a bare missing-file error.
    """
    candidates = [BACKEND_DIR / "config" / "alembic.ini", BACKEND_DIR / "alembic.ini"]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise RuntimeError(
        "alembic.ini not found. Looked in: " + ", ".join(str(c) for c in candidates)
    )


# Session-level advisory lock key held while migrating ("STKM"). Every backend
# replica migrates at startup; without the lock two or three of them ran
# `alembic upgrade` at once on a deploy (audit TD-12). With it, one migrates and
# the others wait, then find the database already at head and do nothing.
MIGRATION_LOCK_KEY = 0x53544B4D


def _engine(url: str):
    from sqlalchemy import create_engine, pool
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return create_engine(url, poolclass=pool.NullPool)


def run_migrations() -> dict:
    """Run Alembic upgrade to head against Postgres, one process at a time."""
    url = _postgres_url()
    try:
        from alembic.config import Config

        from alembic import command
    except ImportError:
        raise RuntimeError("Alembic is required to run migrations.")

    cfg = Config(str(_alembic_ini()))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    engine = _engine(url)
    try:
        with engine.connect() as lock:
            lock.exec_driver_sql(f"SELECT pg_advisory_lock({MIGRATION_LOCK_KEY})")
            try:
                command.upgrade(cfg, "head")
                rule_l = reapply_rule_l_grants(url)
            finally:
                lock.exec_driver_sql(f"SELECT pg_advisory_unlock({MIGRATION_LOCK_KEY})")
    finally:
        engine.dispose()
    return {"applied": True, "ruleL": rule_l}


def schema_state(url: str) -> str:
    """'empty', 'alembic' (has alembic_version) or 'unversioned' (tables, no history)."""
    from sqlalchemy import inspect
    engine = _engine(url)
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    if not tables:
        return "empty"
    return "alembic" if "alembic_version" in tables else "unversioned"


def prepare_development_schema() -> str:
    """Build a development database the way production does, where that is safe.

    An empty database, or one Alembic already tracks, gets real migrations, so
    developers exercise the same schema path as production (audit TD-11). A local
    database that create_all built earlier has no migration history; upgrading it
    would try to recreate existing tables, so it keeps create_all and says how to
    switch. Returns the path taken.
    """
    import logging

    from services.db_sql import create_all_tables

    url = _postgres_url()
    state = schema_state(url)
    if state in ("empty", "alembic"):
        run_migrations()
        return "migrations"
    logging.getLogger(__name__).warning(
        "[DB] This development database was built without Alembic, so it keeps using create_all. "
        "To use migrations like production, reset it (docker compose down -v deletes local data) "
        "or, if its schema matches the models, run: alembic -c config/alembic.ini stamp head")
    create_all_tables()
    return "create_all"


def reapply_rule_l_grants(url: str) -> dict:
    """Converge the Rule L grant matrix after every upgrade (idempotent, non-fatal).

    Picks up roles a DBA created after the f1a7c3e9b2d4 migration ran, and any
    classified table a later migration added. A failure to grant is logged and
    reported by GET /api/ops/rule-l; it never stops the app from booting.
    """
    import logging

    from sqlalchemy import create_engine, pool

    from core.rule_l import apply_grants

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, poolclass=pool.NullPool)
    try:
        with engine.begin() as conn:
            return apply_grants(conn).as_dict()
    except Exception as exc:  # noqa: BLE001 — reported; the status endpoint shows grants as not in force
        logging.getLogger(__name__).warning("[RULE L] re-applying grants failed: %s", type(exc).__name__)
        return {"applied": False, "warnings": [f"re-applying grants failed: {type(exc).__name__}"]}
    finally:
        engine.dispose()


def is_migrations_configured() -> bool:
    url = os.environ.get("DATABASE_URL", "")
    return url.startswith(("postgresql://", "postgresql+psycopg://"))
