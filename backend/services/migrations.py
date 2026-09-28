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


def run_migrations() -> dict:
    """Run Alembic upgrade to head against the configured Postgres DATABASE_URL."""
    from alembic.config import Config

    from alembic import command

    cfg = Config(str(_alembic_ini()))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", _postgres_url())
    command.upgrade(cfg, "head")
    return {"applied": True}


def is_migrations_configured() -> bool:
    url = os.environ.get("DATABASE_URL", "")
    return url.startswith(("postgresql://", "postgresql+psycopg://"))
