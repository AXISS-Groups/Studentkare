"""Global rate-limit middleware: per-session budget, per-IP ceiling, health never 429."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from core import rate_limiter
from core.rate_limiter import (
    GlobalRateLimitMiddleware,
    account_api_limiter,
    client_ip_from_scope,
    global_api_limiter,
    session_key_from_scope,
    should_skip_rate_limit,
)


@pytest.fixture(autouse=True)
def _reset_global_limiter():
    """Local safety net; suite-wide reset lives in tests/conftest.py."""
    global_api_limiter.reset()
    account_api_limiter.reset()
    yield
    global_api_limiter.reset()
    account_api_limiter.reset()


@pytest.fixture
def small_ceiling(monkeypatch):
    """A per-IP ceiling small enough to reach in a test."""
    monkeypatch.setattr(global_api_limiter, "max_requests", 20)
    return 20


def test_flood_returns_429_with_retry_after(small_ceiling):
    limit = small_ceiling
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


def test_health_and_info_never_rate_limited(small_ceiling):
    limit = small_ceiling
    with TestClient(app, raise_server_exceptions=False) as client:
        for _ in range(limit + 5):
            assert client.get("/api/health").status_code != 429
        for _ in range(3):
            assert client.get("/api/info").status_code != 429
        # Non-skipped path is still limited in the same window
        for _ in range(limit):
            client.get("/api/auth/options")
        assert client.get("/api/auth/options").status_code == 429


def test_logout_is_never_rate_limited():
    assert should_skip_rate_limit("/api/auth/logout")
    assert not should_skip_rate_limit("/api/auth/logout-all")


def test_docs_paths_skipped():
    assert should_skip_rate_limit("/docs")
    assert should_skip_rate_limit("/openapi.json")
    assert should_skip_rate_limit("/redoc")
    assert should_skip_rate_limit("/api/health")
    assert not should_skip_rate_limit("/api/auth/options")
    assert not should_skip_rate_limit("/api/blood/sos-request")


def test_different_ips_have_isolated_budgets(small_ceiling):
    limit = small_ceiling
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


def test_client_set_headers_never_choose_the_bucket():
    # CF-Connecting-IP, X-Real-IP and X-Forwarded-For are client-writable. Only
    # the address the server resolved (uvicorn --proxy-headers) counts (TD-10).
    scope = {
        "headers": [
            (b"x-forwarded-for", b"1.2.3.4, 10.0.0.1"),
            (b"cf-connecting-ip", b"9.9.9.9"),
            (b"x-real-ip", b"8.8.8.8"),
        ],
        "client": ("203.0.113.7", 1234),
    }
    assert client_ip_from_scope(scope) == "203.0.113.7"
    assert client_ip_from_scope({"headers": [], "client": None}) == "unknown"


def _through_proxy_headers(trusted, peer, xff):
    """Run uvicorn's own ProxyHeadersMiddleware (what --proxy-headers installs) in
    front of the limiter, and return the address the limiter keyed on."""
    import asyncio

    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    seen = {}

    async def inner_app(scope, receive, send):
        seen["ip"] = client_ip_from_scope(scope)

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            seen["status"] = message["status"]

    app = ProxyHeadersMiddleware(GlobalRateLimitMiddleware(inner_app), trusted_hosts=trusted)
    headers = [(b"x-forwarded-for", xff.encode())] if xff else []
    scope = {"type": "http", "path": "/api/whatever", "headers": headers, "client": (peer, 1)}
    asyncio.run(app(scope, receive, send))
    return seen.get("ip", f"limited:{seen.get('status')}")


def test_behind_a_trusted_proxy_the_real_client_is_used():
    # nginx at 172.18.0.5 appends the client it saw to whatever the client sent.
    assert _through_proxy_headers("172.16.0.0/12", "172.18.0.5", "198.51.100.20") == "198.51.100.20"


def test_a_forged_hop_before_the_real_client_is_ignored():
    # The client sent "X-Forwarded-For: 1.1.1.1"; nginx appended the real address.
    # The right-most untrusted hop wins, so the forged value cannot pick a bucket.
    assert _through_proxy_headers("172.16.0.0/12", "172.18.0.5", "1.1.1.1, 198.51.100.20") == "198.51.100.20"


def test_headers_from_an_untrusted_peer_are_ignored():
    # A client talking to the backend directly cannot claim another address.
    assert _through_proxy_headers("172.16.0.0/12", "203.0.113.9", "1.1.1.1") == "203.0.113.9"


def test_spoofed_addresses_from_one_client_share_one_budget(monkeypatch):
    monkeypatch.setattr(global_api_limiter, "max_requests", 2)
    results = [_through_proxy_headers("172.16.0.0/12", "172.18.0.5", f"{forged}, 198.51.100.30")
               for forged in ("1.1.1.1", "2.2.2.2", "3.3.3.3")]
    assert results == ["198.51.100.30", "198.51.100.30", "limited:429"]
    assert set(global_api_limiter.request_history) == {"198.51.100.30"}


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


# --- per-account budgets (founder decision 2026-10-22) ------------------------

def _scope(ip, session=None, path="/api/whatever"):
    headers = [(b"cookie", f"theme=dark; sacare_session={session}".encode())] if session else []
    return {"type": "http", "path": path, "headers": headers, "client": (ip, 1)}


def _statuses(scopes):
    """Run each scope through the middleware; 200 when it reached the app."""
    import asyncio

    results = []

    async def inner_app(scope, receive, send):
        results.append(200)

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            results.append(message["status"])

    mw = GlobalRateLimitMiddleware(inner_app)

    async def run():
        for scope in scopes:
            await mw(scope, receive, send)

    asyncio.run(run())
    return results


def test_defaults_come_from_the_settings_registry(monkeypatch):
    from core.settings_registry import get_declaration

    monkeypatch.delenv("RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE", raising=False)
    monkeypatch.delenv("RATE_LIMIT_API_PER_IP_PER_MINUTE", raising=False)
    assert get_declaration("platform.api_rate_per_account_per_minute").default == 300
    assert get_declaration("platform.api_rate_per_ip_per_minute").default == 3000
    assert account_api_limiter.limit() == 300
    assert global_api_limiter.limit() == 3000


def test_env_pins_a_limit_and_a_bad_value_is_ignored(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE", "42")
    assert account_api_limiter.limit() == 42
    monkeypatch.setenv("RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE", "-5")
    assert account_api_limiter.limit() == 300
    monkeypatch.setenv("RATE_LIMIT_API_PER_IP_PER_MINUTE", "lots")
    assert global_api_limiter.limit() == 3000


def test_many_accounts_behind_one_campus_ip_are_not_blocked(monkeypatch):
    # 40 students on one NAT address, each loading a 15-call page twice: 1200
    # requests from one IP, far past the old 100/min per-IP limit.
    monkeypatch.setattr(account_api_limiter, "max_requests", 300)
    monkeypatch.setattr(global_api_limiter, "max_requests", 3000)
    scopes = [_scope("203.0.113.50", f"student-{n}") for n in range(40) for _ in range(30)]
    assert set(_statuses(scopes)) == {200}


def test_one_account_flooding_is_blocked_and_others_are_not(monkeypatch):
    monkeypatch.setattr(account_api_limiter, "max_requests", 5)
    statuses = _statuses([_scope("203.0.113.51", "flooder") for _ in range(7)])
    assert statuses == [200] * 5 + [429, 429]
    # A classmate on the same address is unaffected.
    assert _statuses([_scope("203.0.113.51", "classmate")]) == [200]


def test_the_ip_ceiling_still_holds_across_accounts(monkeypatch):
    monkeypatch.setattr(global_api_limiter, "max_requests", 3)
    scopes = [_scope("203.0.113.52", f"forged-{n}") for n in range(5)]
    assert _statuses(scopes) == [200, 200, 200, 429, 429]


def test_signed_out_requests_count_against_the_ip_ceiling_only(monkeypatch):
    monkeypatch.setattr(global_api_limiter, "max_requests", 2)
    assert _statuses([_scope("203.0.113.53") for _ in range(3)]) == [200, 200, 429]
    assert account_api_limiter.request_history == {}


def test_account_429_carries_retry_after():
    with TestClient(app, raise_server_exceptions=False) as client:
        account_api_limiter.max_requests = 1
        client.cookies.set("sacare_session", "a-session-token", path="/api")
        assert client.get("/api/auth/options").status_code == 200
        blocked = client.get("/api/auth/options")
        assert blocked.status_code == 429
        assert blocked.headers.get("retry-after") == str(account_api_limiter.window_seconds)
        assert "Too many requests" in blocked.json()["detail"]


def test_session_key_is_a_hash_of_the_session_cookie_only():
    import hashlib

    key = session_key_from_scope(_scope("1.1.1.1", "tok"))
    assert key == hashlib.sha256(b"tok").hexdigest()
    assert session_key_from_scope(_scope("1.1.1.1")) is None
    other = {"headers": [(b"cookie", b"sacare_session_old=x; sacare_challenge=y")]}
    assert session_key_from_scope(other) is None


def test_the_cookie_name_matches_the_auth_service():
    from core.rate_limiter import SESSION_COOKIE_NAME
    from services.workflow_auth import SESSION_COOKIE

    assert SESSION_COOKIE_NAME == SESSION_COOKIE.encode()


def test_a_super_admin_override_reaches_the_limiter_without_a_query(monkeypatch):
    from core import settings_registry

    monkeypatch.delenv("RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE", raising=False)
    settings_registry.reset_cache()
    assert account_api_limiter.limit() == 300
    # What a request handler's setting() call leaves in the cache after an override.
    monkeypatch.setitem(settings_registry._cache, "values", {"platform.api_rate_per_account_per_minute": 600})
    assert account_api_limiter.limit() == 600
    settings_registry.reset_cache()
