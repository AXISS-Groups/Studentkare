"""
services.db_sql — SQLAlchemy persistence layer (PostgreSQL-first).

Provides a real, database-backed foundation for the Studentkare platform.
When `DATABASE_URL` is set (PostgreSQL recommended), tables are created and the
in-memory demo stores can be backed by the database.  When unset, it gracefully
falls back to an in-memory SQLite so the demo still runs.

Complies with the two-plane isolation intent of Rule-K1: operational and
clinical entities live in separate tables.
"""
from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./studentkare.db")

_connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def is_persistent() -> bool:
    return not DATABASE_URL.startswith("sqlite")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables() -> None:
    # Import models so they register with Base.metadata
    from core import models_sql  # noqa: F401
    Base.metadata.create_all(bind=engine)
