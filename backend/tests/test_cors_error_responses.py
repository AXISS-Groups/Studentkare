"""CORS wraps every other middleware, so early error responses stay readable.

The browser hides any cross-origin response that lacks Access-Control-Allow-Origin,
so a 429 or 413 produced before CORS ran used to surface in the app as an opaque
network error. CORS is now the outermost middleware; the allow-list is unchanged.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from core.rate_limiter import global_api_limiter

ALLOWED = "http://localhost:3000"
DISALLOWED = "https://evil.example"
OVER_LIMIT_BODY = b"x" * (12 * 1024 * 1024 + 1)


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def _exhaust_budget(client, monkeypatch, origin):
    monkeypatch.setattr(global_api_limiter, "max_requests", 1)
    client.get("/api/auth/options", headers={"Origin": origin})
    return client.get("/api/auth/options", headers={"Origin": origin})


def test_429_from_allowed_origin_carries_allow_origin(client, monkeypatch):
    blocked = _exhaust_budget(client, monkeypatch, ALLOWED)
    assert blocked.status_code == 429
    assert blocked.headers.get("access-control-allow-origin") == ALLOWED
    assert blocked.headers.get("access-control-allow-credentials") == "true"
    assert blocked.headers.get("retry-after") == str(global_api_limiter.window_seconds)


def test_429_from_disallowed_origin_has_no_allow_origin(client, monkeypatch):
    blocked = _exhaust_budget(client, monkeypatch, DISALLOWED)
    assert blocked.status_code == 429
    assert "access-control-allow-origin" not in blocked.headers


def test_413_from_allowed_origin_carries_allow_origin(client):
    response = client.post("/api/auth/otp/send", content=OVER_LIMIT_BODY,
                           headers={"Origin": ALLOWED, "Content-Type": "application/json"})
    assert response.status_code == 413
    assert response.headers.get("access-control-allow-origin") == ALLOWED


def test_413_from_disallowed_origin_has_no_allow_origin(client):
    response = client.post("/api/auth/otp/send", content=OVER_LIMIT_BODY,
                           headers={"Origin": DISALLOWED, "Content-Type": "application/json"})
    assert response.status_code == 413
    assert "access-control-allow-origin" not in response.headers


def test_preflight_is_answered_even_when_budget_is_spent(client, monkeypatch):
    blocked = _exhaust_budget(client, monkeypatch, ALLOWED)
    assert blocked.status_code == 429
    preflight = client.options("/api/auth/otp/send", headers={
        "Origin": ALLOWED,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
    })
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == ALLOWED


def test_preflight_does_not_spend_rate_limit_budget(client, monkeypatch):
    monkeypatch.setattr(global_api_limiter, "max_requests", 2)
    for _ in range(5):
        preflight = client.options("/api/auth/options", headers={
            "Origin": ALLOWED, "Access-Control-Request-Method": "GET",
        })
        assert preflight.status_code == 200
    assert client.get("/api/auth/options", headers={"Origin": ALLOWED}).status_code == 200


def test_preflight_from_disallowed_origin_is_rejected(client):
    preflight = client.options("/api/auth/otp/send", headers={
        "Origin": DISALLOWED, "Access-Control-Request-Method": "POST",
    })
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers
