"""
services.db_sql — SQLAlchemy persistence layer (PostgreSQL-first hardened edition).

Provides a hardened, database-backed foundation for the Studentkare platform.
Enforces SSL/TLS connection parameters, connection pool recycling, and
parameterized query execution.

Complies with the two-plane isolation intent of Rule-K1: operational and
clinical entities live in separate tables.
"""
from __future__ import annotations

import os
import logging
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./studentkare.db")

_connect_args = {}
_engine_kwargs = {
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
else:
    # PostgreSQL / Production Hardening
    _engine_kwargs["pool_size"] = 15
    _engine_kwargs["max_overflow"] = 25
    _engine_kwargs["pool_timeout"] = 30
    _engine_kwargs["pool_recycle"] = 1800  # Recycle connections after 30 mins

    # Enforce SSL/TLS if not specified
    if "sslmode" not in DATABASE_URL.lower():
        if "?" in DATABASE_URL:
            DATABASE_URL += "&sslmode=require"
        else:
            DATABASE_URL += "?sslmode=require"

engine = create_engine(DATABASE_URL, connect_args=_connect_args, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def is_persistent() -> bool:
    return not DATABASE_URL.startswith("sqlite")


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
    from core import models_sql  # noqa: F401
    Base.metadata.create_all(bind=engine)
