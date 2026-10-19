"""Alertmanager webhook: authenticated, and closed when unconfigured outside dev (audit ENV-05)."""
import base64
import hashlib
import hmac
import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services import alerts

SECRET = "webhook-secret-for-tests"
PAYLOAD = {"alerts": [{"labels": {"alertname": "HighErrorRate", "severity": "critical"},
                       "annotations": {"summary": "5xx above 2%"}, "status": "firing"}]}


@pytest.fixture
def client(monkeypatch):
    sent = []
    monkeypatch.setattr(alerts, "post_ops_alert", lambda text, **kw: sent.append(text) or {"sent": True})
    app = FastAPI()
    app.include_router(alerts.router)
    test_client = TestClient(app)
    test_client.sent = sent
    return test_client


def _basic(password, user="alertmanager"):
    return "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()


def _post(client, headers=None, body=None):
    raw = json.dumps(body or PAYLOAD).encode()
    return client.post("/api/alerts/webhook", content=raw,
                       headers={"Content-Type": "application/json", **(headers or {})})


@pytest.mark.parametrize("app_env", [None, "", "production", "staging", "Dev"])
def test_no_secret_outside_dev_and_test_refuses(client, monkeypatch, app_env):
    monkeypatch.delenv("ALERTMANAGER_WEBHOOK_SECRET", raising=False)
    if app_env is None:
        monkeypatch.delenv("APP_ENV", raising=False)
    else:
        monkeypatch.setenv("APP_ENV", app_env)
    response = _post(client)
    assert response.status_code == 503
    assert client.sent == []


@pytest.mark.parametrize("app_env", ["development", "testing"])
def test_no_secret_in_dev_and_test_is_accepted(client, monkeypatch, app_env):
    monkeypatch.delenv("ALERTMANAGER_WEBHOOK_SECRET", raising=False)
    monkeypatch.setenv("APP_ENV", app_env)
    assert _post(client).status_code == 200
    assert len(client.sent) == 1


def test_basic_auth_with_the_secret_is_accepted(client, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALERTMANAGER_WEBHOOK_SECRET", SECRET)
    assert _post(client, {"Authorization": _basic(SECRET)}).status_code == 200
    assert len(client.sent) == 1


def test_hmac_signature_is_still_accepted(client, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALERTMANAGER_WEBHOOK_SECRET", SECRET)
    raw = json.dumps(PAYLOAD).encode()
    signature = "sha256=" + hmac.new(SECRET.encode(), raw, hashlib.sha256).hexdigest()
    assert _post(client, {"X-Alertmanager-Signature": signature}).status_code == 200


@pytest.mark.parametrize("headers", [
    {},
    {"Authorization": _basic("wrong")},
    {"Authorization": "Bearer " + SECRET},
    {"Authorization": "Basic not-base64!!"},
    {"X-Alertmanager-Signature": "sha256=deadbeef"},
], ids=["none", "wrong-password", "bearer", "malformed", "bad-signature"])
def test_bad_credentials_are_refused(client, monkeypatch, headers):
    # Even in development, a configured secret is enforced.
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ALERTMANAGER_WEBHOOK_SECRET", SECRET)
    assert _post(client, headers).status_code == 401
    assert client.sent == []
