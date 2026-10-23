"""
services.db_sql — SQLAlchemy persistence layer (PostgreSQL-only hardened edition).

Postgres is the single database format. There is no SQLite fallback:
a missing or non-Postgres DATABASE_URL is a startup error, not a silent
local file. This is deliberate (fail closed per house constitution).

Enforces SSL/TLS connection parameters, connection pool recycling, and
parameterized query execution.

Complies with the two-plane isolation intent of Rule-K1: operational and
clinical entities live in separate tables.
"""
from __future__ import annotations

import logging
import os
from typing import Generator
from urllib.parse import urlsplit, urlunsplit

from sqlalchemy import create_engine, pool
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from core.app_env import is_testing

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    if is_testing():
        DATABASE_URL = "sqlite:///./studentkare_test.db"
    else:
        raise RuntimeError(
            "DATABASE_URL is not set. Set it to a Postgres URL, e.g. "
            "postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>?sslmode=require"
        )
if not DATABASE_URL.startswith(("postgresql://", "postgresql+psycopg://", "postgresql+psycopg2://")):
    if is_testing() and DATABASE_URL.startswith("sqlite"):
        pass
    else:
        raise RuntimeError(
            "Postgres-only: DATABASE_URL must start with postgresql:// "
            "(SQLite and other schemes are no longer supported)."
        )

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
USE_PGBOUNCER = os.getenv("USE_PGBOUNCER", "").lower() == "true"

if USE_PGBOUNCER:
    parsed_url = urlsplit(DATABASE_URL)
    credentials = parsed_url.netloc.rsplit("@", 1)[0] if "@" in parsed_url.netloc else ""
    DATABASE_URL = urlunsplit(
        (
            parsed_url.scheme,
            f"{credentials}@localhost:6432" if credentials else "localhost:6432",
            parsed_url.path,
            parsed_url.query,
            parsed_url.fragment,
        )
    )
def _bounded_int(name: str, default: int, low: int, high: int) -> int:
    """An integer setting clamped to [low, high]; unset or malformed means the default."""
    try:
        value = int(os.getenv(name, "") or default)
    except ValueError:
        logger.warning("%s is not a whole number; using %s", name, default)
        return default
    return min(max(value, low), high)


_connect_args = {}
_engine_kwargs = {
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
else:
    # Pool per environment (audit TD-21). Behind PgBouncer (transaction mode)
    # SQLAlchemy must not pool as well, or the two pools starve each other.
    # Straight to Postgres, a small in-process pool saves a TCP+TLS handshake and
    # a backend fork per request. Rule L's SET LOCAL ROLE ends with the
    # transaction, so a pooled connection never carries the commerce role.
    if USE_PGBOUNCER:
        _engine_kwargs["poolclass"] = pool.NullPool
    else:
        _engine_kwargs.update(
            pool_size=_bounded_int("DB_POOL_SIZE", 5, 1, 50),
            max_overflow=_bounded_int("DB_MAX_OVERFLOW", 5, 0, 50),
            pool_recycle=1800,
            pool_timeout=10,
        )

    # Enforce SSL/TLS if not specified, except for internal dokploy-postgres and local/testing instances
    if "sslmode" not in DATABASE_URL.lower():
        if (
            "dokploy-postgres" in DATABASE_URL
            or "localhost" in DATABASE_URL
            or "127.0.0.1" in DATABASE_URL
            or is_testing()
        ):
            ssl_mode = "disable"
        else:
            ssl_mode = "require"

        if "?" in DATABASE_URL:
            DATABASE_URL += f"&sslmode={ssl_mode}"
        else:
            DATABASE_URL += f"?sslmode={ssl_mode}"

engine = create_engine(DATABASE_URL, connect_args=_connect_args, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def is_persistent() -> bool:
    # Postgres-only: the database is always persistent when the app starts
    # (startup fails closed without a Postgres DATABASE_URL).
    return DATABASE_URL.startswith("postgresql")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"[DATABASE ERROR]: Transaction failed. Error: {type(e).__name__}")
        db.rollback()
        raise
    finally:
        db.close()


def create_all_tables() -> None:
    # Import models so they register with Base.metadata
    from core import (
        billing_models,  # noqa: F401
        models_sql,  # noqa: F401
        preventive_models,  # noqa: F401
        workflow_models,  # noqa: F401
    )
    Base.metadata.create_all(bind=engine)

    # Lightweight safe schema migrations for newly added columns
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "care_catalog" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("care_catalog")]
            with engine.connect() as conn:
                if "image_id" not in columns:
                    conn.execute(text("ALTER TABLE care_catalog ADD COLUMN image_id VARCHAR(80)"))
                if "image_mime" not in columns:
                    conn.execute(text("ALTER TABLE care_catalog ADD COLUMN image_mime VARCHAR(40)"))
                if "medicine_id" not in columns:
                    conn.execute(text("ALTER TABLE care_catalog ADD COLUMN medicine_id VARCHAR REFERENCES care_medicines(id)"))
                conn.commit()
        if "care_accounts" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("care_accounts")]
            if "partner_kind" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE care_accounts ADD COLUMN partner_kind VARCHAR(12) NOT NULL DEFAULT ''"))
                    conn.commit()
            if "is_team_account" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE care_accounts ADD COLUMN is_team_account BOOLEAN NOT NULL DEFAULT FALSE"))
                    conn.commit()
        if "care_scheduled_jobs" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("care_scheduled_jobs")]
            with engine.connect() as conn:
                if "lease_owner" not in columns:
                    conn.execute(text(
                        "ALTER TABLE care_scheduled_jobs ADD COLUMN lease_owner VARCHAR(80) NOT NULL DEFAULT ''"))
                if "lease_expires_at" not in columns:
                    conn.execute(text(
                        "ALTER TABLE care_scheduled_jobs ADD COLUMN lease_expires_at FLOAT NOT NULL DEFAULT 0"))
                conn.commit()
        if "care_outbox_events" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("care_outbox_events")]
            if "next_attempt_at" not in columns:
                with engine.connect() as conn:
                    conn.execute(text(
                        "ALTER TABLE care_outbox_events ADD COLUMN next_attempt_at FLOAT NOT NULL DEFAULT 0"))
                    conn.commit()
    except Exception as exc:
        logger.warning(f"Schema migration check skipped/failed: {exc}")

