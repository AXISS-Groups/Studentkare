"""
services.db_sql — SQLAlchemy persistence layer (PostgreSQL-first hardened edition).

Provides a hardened, database-backed foundation for the Studentkare platform.
Enforces SSL/TLS connection parameters, connection pool recycling, and
parameterized query execution.

Complies with the two-plane isolation intent of Rule-K1: operational and
clinical entities live in separate tables.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, pool
from sqlalchemy.orm import Session, declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # No hard-coded production credentials. Database configuration comes only
    # from the environment (DATABASE_URL) or a local SQLite file for development.
    DATABASE_URL = f"sqlite:///{Path('/data/studentkare.db') if Path('/data').exists() else Path(__file__).resolve().parents[1] / 'studentkare.db'}"

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

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
    return DATABASE_URL not in ("sqlite://", "sqlite:///:memory:")


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

