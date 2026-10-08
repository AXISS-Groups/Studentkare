"""Shared test fixtures for the backend suite."""
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("OTP_HASH_SECRET", "test-secret-at-least-32-chars-long-for-tests")
os.environ.setdefault("DATABASE_URL", "sqlite:///./studentkare_test.db")

import pytest

from core.rate_limiter import global_api_limiter


@pytest.fixture(autouse=True)
def _reset_global_rate_limiter():
    """Every test gets a fresh IP budget.

    TestClient reuses peer IP ``testclient`` for the whole process; without a
    reset, earlier tests exhaust RATE_LIMIT_API_PER_MINUTE and later tests see 429.
    Also restores max_requests in case a unit test mutated the shared instance.
    """
    original_max = global_api_limiter.max_requests
    global_api_limiter.reset()
    yield
    global_api_limiter.reset()
    global_api_limiter.max_requests = original_max


@pytest.fixture
def super_admin_client(monkeypatch):
    """A TestClient holding a real SUPER_ADMIN session on isolated SQLite storage.

    The account is seeded directly (signup cannot mint SUPER_ADMIN) and then logs
    in through the real OTP flow, so every role gate on the route still runs.
    Yields ``(client, headers)`` where headers carry the session CSRF token.
    """
    import time

    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from app.main import app
    from core import workflow_models as M
    from services import workflow_auth
    from services.db_sql import Base
    from services.workflow_auth import workflow_db

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def database():
        with factory() as session:
            yield session

    codes = []
    monkeypatch.setattr(workflow_auth, "deliver_code", lambda identifier, code, channel: codes.append(code) or True)
    app.dependency_overrides[workflow_db] = database
    with factory() as db:
        db.add(M.Account(
            id="admin", identifier="admin@example.test", channel="EMAIL", full_name="Test Admin",
            role="SUPER_ADMIN", active=True, profile={}, created_at=time.time(),
        ))
        db.commit()
    client = TestClient(app)
    sent = client.post("/api/auth/otp/send", json={"identifier": "admin@example.test", "channel": "EMAIL", "intent": "LOGIN"})
    assert sent.status_code == 200, sent.text
    verified = client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    assert verified.status_code == 200, verified.text
    headers = {"X-CSRF-Token": verified.json()["csrfToken"]}
    try:
        yield client, headers
    finally:
        app.dependency_overrides.clear()
        client.close()
        engine.dispose()
