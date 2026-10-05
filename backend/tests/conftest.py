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

import pytest  # noqa: E402

from core.rate_limiter import global_api_limiter  # noqa: E402


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
