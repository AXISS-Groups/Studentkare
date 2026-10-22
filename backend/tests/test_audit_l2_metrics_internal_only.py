"""Audit L2: /metrics is served to the internal network only."""
import asyncio

from core.telemetry import internal_only, metrics_client_allowed


def call(app, host):
    sent = []

    async def receive():
        return {"type": "http.request", "body": b""}

    async def send(message):
        sent.append(message)

    asyncio.run(app({"type": "http", "client": (host, 1234) if host else None, "path": "/"}, receive, send))
    return next(m["status"] for m in sent if m["type"] == "http.response.start")


async def metrics(scope, receive, send):
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"up 1"})


def test_public_addresses_get_not_found():
    guarded = internal_only(metrics)
    assert call(guarded, "203.0.113.9") == 404
    assert call(guarded, "2001:db8::1") == 404
    assert call(guarded, None) == 404            # unknown peer: refused
    assert call(guarded, "testclient") == 404    # unparsable: refused


def test_internal_addresses_are_served():
    guarded = internal_only(metrics)
    for host in ("127.0.0.1", "10.1.2.3", "172.20.0.5", "192.168.1.10", "::1"):
        assert call(guarded, host) == 200, host


def test_the_networks_are_configurable(monkeypatch):
    monkeypatch.setenv("METRICS_ALLOWED_NETWORKS", "10.9.0.0/16")
    assert metrics_client_allowed("10.9.1.1") and not metrics_client_allowed("127.0.0.1")
