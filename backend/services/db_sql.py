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

from sqlalchemy import create_engine, pool
from sqlalchemy.orm import Session, declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Set it to a Postgres URL, e.g. "
        "postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>?sslmode=require"
    )
if not DATABASE_URL.startswith(("postgresql://", "postgresql+psycopg://", "postgresql+psycopg2://")):
    raise RuntimeError(
        "Postgres-only: DATABASE_URL must start with postgresql:// "
        "(SQLite and other schemes are no longer supported)."
    )

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

_connect_args = {}
_engine_kwargs = {
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
else:
    # PostgreSQL / Production Hardening
    # When using an external connection pooler like PgBouncer (transaction mode),
    # we MUST disable SQLAlchemy's internal pool to prevent double-pooling and starvation.
    _engine_kwargs["poolclass"] = pool.NullPool

    # Enforce SSL/TLS if not specified, except for internal dokploy-postgres which doesn't use SSL
    if "sslmode" not in DATABASE_URL.lower():
        if "dokploy-postgres" in DATABASE_URL:
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
                conn.commit()
    except Exception as exc:
        logger.warning(f"Schema migration check skipped/failed: {exc}")

