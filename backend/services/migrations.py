"""
services.migrations — Run Alembic migrations at startup.

In production, the schema must be applied via versioned migrations (never
create_all_tables, which cannot alter existing tables). This runner invokes the
Alembic upgrade to head programmatically. In development, the app may fall back
to create_all_tables() for a zero-friction local start.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]


def run_migrations() -> dict:
    """Run Alembic upgrade to head against the configured DATABASE_URL."""
    from alembic.config import Config

    from alembic import command

    ini = BACKEND_DIR / "alembic.ini"
    cfg = Config(str(ini))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", os.environ.get("DATABASE_URL", ""))
    command.upgrade(cfg, "head")
    return {"applied": True}


def is_migrations_configured() -> bool:
    return bool(os.environ.get("DATABASE_URL"))
