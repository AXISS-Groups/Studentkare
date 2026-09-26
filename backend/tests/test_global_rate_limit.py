"""Global IP rate-limit middleware: flood → 429, health never 429, buckets isolated."""
import pytest
from core import rate_limiter
from core.rate_limiter import (
    GlobalRateLimitMiddleware,
    client_ip_from_scope,
    global_api_limiter,
    should_skip_rate_limit,
)
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(autouse=True)
def _reset_global_limiter():
    """Local safety net; suite-wide reset lives in tests/conftest.py."""
    global_api_limiter.reset()
    yield
    global_api_limiter.reset()


def test_flood_returns_429_with_retry_after():
    limit = global_api_limiter.max_requests
    with TestClient(app, raise_server_exceptions=False) as client:
        statuses = []
        for _ in range(limit + 1):
            statuses.append(client.get("/api/auth/options").status_code)
        assert statuses[0] == 200
        assert statuses[-1] == 429
        blocked = client.get("/api/auth/options")
        assert blocked.status_code == 429
        assert blocked.headers.get("retry-after") == str(global_api_limiter.window_seconds)
        assert "Too many requests" in blocked.json()["detail"]


def test_health_and_info_never_rate_limited():
    limit = global_api_limiter.max_requests
    with TestClient(app, raise_server_exceptions=False) as client:
        for _ in range(limit + 5):
            assert client.get("/api/health").status_code != 429
        for _ in range(3):
            assert client.get("/api/info").status_code != 429
        # Non-skipped path is still limited in the same window
        for _ in range(limit):
            client.get("/api/auth/options")
        assert client.get("/api/auth/options").status_code == 429


def test_docs_paths_skipped():
    assert should_skip_rate_limit("/docs")
    assert should_skip_rate_limit("/openapi.json")
    assert should_skip_rate_limit("/redoc")
    assert should_skip_rate_limit("/api/health")
    assert not should_skip_rate_limit("/api/auth/options")
    assert not should_skip_rate_limit("/api/blood/sos-request")


def test_different_ips_have_isolated_budgets():
    limit = global_api_limiter.max_requests
    assert global_api_limiter.is_rate_limited("10.0.0.1")[0] is False
    for _ in range(limit - 1):
        global_api_limiter.is_rate_limited("10.0.0.1")
    assert global_api_limiter.is_rate_limited("10.0.0.1")[0] is True
    # Different IP still has full budget
    assert global_api_limiter.is_rate_limited("10.0.0.2")[0] is False


def test_window_expires_old_timestamps():
    limiter = rate_limiter.SlidingWindowRateLimiter(max_requests=2, window_seconds=60)
    assert limiter.is_rate_limited("ip-a") == (False, 1)
    assert limiter.is_rate_limited("ip-a") == (False, 2)
    assert limiter.is_rate_limited("ip-a")[0] is True
    # Age all timestamps outside the window → budget resets
    limiter.request_history["ip-a"] = [t - 120 for t in limiter.request_history["ip-a"]]
    assert limiter.is_rate_limited("ip-a")[0] is False


def test_prune_drops_fully_expired_keys():
    import time as _time

    limiter = rate_limiter.SlidingWindowRateLimiter(max_requests=30, window_seconds=60)
    now = _time.time()
    for i in range(5):
        limiter.request_history[f"old-{i}"] = [now - 120]
    limiter.request_history["fresh"] = [now - 10]
    assert len(limiter.request_history) == 6
    limiter._prune_expired(cutoff=now - 60)
    assert "old-0" not in limiter.request_history
    assert "fresh" in limiter.request_history


def test_client_ip_priority_headers_then_peer():
    scope = {
        "headers": [
            (b"x-forwarded-for", b"1.2.3.4, 10.0.0.1"),
            (b"cf-connecting-ip", b"9.9.9.9"),
        ],
        "client": ("127.0.0.1", 1234),
    }
    assert client_ip_from_scope(scope) == "9.9.9.9"

    scope = {
        "headers": [(b"x-forwarded-for", b"1.2.3.4, 10.0.0.1")],
        "client": ("127.0.0.1", 1234),
    }
    assert client_ip_from_scope(scope) == "1.2.3.4"

    scope = {"headers": [], "client": ("127.0.0.1", 1234)}
    assert client_ip_from_scope(scope) == "127.0.0.1"


def test_middleware_passthrough_under_limit(monkeypatch):
    called = {"n": 0}

    async def inner_app(scope, receive, send):
        called["n"] += 1

    mw = GlobalRateLimitMiddleware(inner_app)
    scope = {"type": "http", "path": "/api/whatever", "headers": [], "client": ("1.1.1.1", 1)}

    async def run():
        await mw(scope, None, None)

    import asyncio
    asyncio.run(run())
    assert called["n"] == 1


def test_middleware_blocks_over_limit(monkeypatch):
    monkeypatch.setattr(global_api_limiter, "max_requests", 1)
    called = {"n": 0}

    async def inner_app(scope, receive, send):
        called["n"] += 1

    mw = GlobalRateLimitMiddleware(inner_app)
    scope = {"type": "http", "path": "/api/whatever", "headers": [], "client": ("2.2.2.2", 1)}
    sent = {}

    async def send(message):
        sent.update(message)

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    import asyncio

    async def run():
        await mw(scope, receive, send)
        await mw(scope, receive, send)

    asyncio.run(run())
    # First call reaches inner app; second is short-circuited with 429
    assert called["n"] == 1
    assert sent["status"] == 429
