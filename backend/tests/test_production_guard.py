"""Production startup guard tests — fail closed on missing secrets (Postgres-only)."""
import subprocess
import sys
from pathlib import Path

BACKEND = str(Path(__file__).resolve().parents[1])


def _run_import(env_extra):
    env = {"PYTHONPATH": BACKEND}
    env.update(env_extra)
    return subprocess.run([sys.executable, "-c", "import sys; sys.path.insert(0, '/app'); from app import main"], cwd=BACKEND, env=env, capture_output=True, text=True)


def test_production_refuses_to_start_without_otp_secret():
    result = _run_import({"APP_ENV": "production", "OTP_HASH_SECRET": "", "DATABASE_URL": "postgresql://u:p@h/db"})
    assert result.returncode != 0
    assert "OTP_HASH_SECRET" in result.stderr


def test_production_refuses_sqlite_database():
    result = _run_import({"APP_ENV": "production", "OTP_HASH_SECRET": "x", "DATABASE_URL": "sqlite:///tmp/x.db"})
    assert result.returncode != 0
    assert "DATABASE_URL" in result.stderr


def test_development_refuses_sqlite_database():
    # Postgres-only: even development fails closed on a non-Postgres URL.
    result = _run_import({"APP_ENV": "development", "DATABASE_URL": "sqlite:///:memory:", "OTP_HASH_SECRET": ""})
    assert result.returncode != 0
    assert "DATABASE_URL" in result.stderr


def test_development_accepts_postgres_database():
    result = _run_import({"APP_ENV": "development", "DATABASE_URL": "postgresql://u:p@h/db", "OTP_HASH_SECRET": ""})
    assert result.returncode == 0, result.stderr
