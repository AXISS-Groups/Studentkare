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


def run_migrations() -> dict:
    """Run Alembic upgrade to head against the configured Postgres DATABASE_URL."""
    from alembic.config import Config

    from alembic import command

    ini = BACKEND_DIR / "alembic.ini"
    cfg = Config(str(ini))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", _postgres_url())
    command.upgrade(cfg, "head")
    return {"applied": True}


def is_migrations_configured() -> bool:
    url = os.environ.get("DATABASE_URL", "")
    return url.startswith(("postgresql://", "postgresql+psycopg://"))
