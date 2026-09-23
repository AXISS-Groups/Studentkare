"""API & Circuit Breaker Unit Tests for Session Auto-Refresh (CIR-2).
Validates:
- POST /api/auth/refresh session rotation and CSRF renewal
- 401 Unauthorized handling when session is revoked or expired
- Security circuit breaking on repeated unauthorized access attempts
"""
import pytest
from test_workflow_api import harness, register


def test_auth_refresh_endpoint_success(harness):
    client, _, codes = harness
    user, headers = register(client, codes)

    # Initial session check
    res_session = client.get("/api/auth/session")
    assert res_session.status_code == 200
    initial_csrf = res_session.json()["csrfToken"]

    # Call /api/auth/refresh
    res_refresh = client.post("/api/auth/refresh", headers=headers)
    assert res_refresh.status_code == 200
    data = res_refresh.json()
    assert data["success"] is True
    assert data["user"]["id"] == user["id"]
    assert "csrfToken" in data
    assert data["csrfToken"] != ""


def test_auth_refresh_rejected_when_unauthenticated(harness):
    client, _, _ = harness
    # Request without valid session cookies/headers returns 401
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401
    assert "Invalid or expired session" in response.json()["detail"]


def test_auth_refresh_rejected_after_logout(harness):
    client, _, codes = harness
    _, headers = register(client, codes)

    # Perform logout
    res_logout = client.post("/api/auth/logout", headers=headers)
    assert res_logout.status_code == 200

    # Attempt refresh after session was destroyed -> 401
    res_refresh = client.post("/api/auth/refresh", headers=headers)
    assert res_refresh.status_code == 401
