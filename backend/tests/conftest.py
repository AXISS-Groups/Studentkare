"""Shared test fixtures for the backend suite."""
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
