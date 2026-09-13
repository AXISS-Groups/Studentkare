"""Payment contract tests: honest unconfigured state + signed webhook verification."""
import hashlib
import hmac
import os
import time

from sqlalchemy import select

from core import workflow_models as M
from test_workflow_api import harness, register


def _order(factory, uid, client, headers, key):
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Provider", role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id="item", provider_id="prov", kind="product", name="Item", brand="B", category="devices", description="d", pack="1", price_paise=45000, mrp_paise=50000, stock=5, active=True, requires_prescription=False, preparation=""))
        db.commit()
    return client.post("/api/orders", headers={**headers, "Idempotency-Key": key},
                       json={"items": [{"id": "item", "quantity": 1}], "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"}}).json()["id"]


def test_payment_is_honest_unconfigured(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer@example.test")
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    order_id = _order(factory, user["id"], client, headers, "pay-order-1")
    res = client.post(f"/api/orders/{order_id}/payment", headers=headers).json()
    assert res["configured"] is False
    assert res["status"] == "UNAVAILABLE"
    assert client.get(f"/api/orders/{order_id}/payment", headers=headers).json()["paymentStatus"] == "UNPAID"


def test_webhook_rejects_unsigned(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer2@example.test")
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")
    order_id = _order(factory, user["id"], client, headers, "pay-order-2")
    payload = {"event": "payment.settled", "orderId": order_id, "providerRef": "ref-1", "amountPaise": 45000}
    import json as _json
    body = _json.dumps(payload).encode()
    bad = client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": "deadbeef"})
    assert bad.status_code == 401


def test_webhook_settles_with_valid_signature(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer3@example.test")
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")
    order_id = _order(factory, user["id"], client, headers, "pay-order-3")
    payload = {"event": "payment.settled", "orderId": order_id, "providerRef": "ref-3", "amountPaise": 45000}
    import json as _json
    body = _json.dumps(payload).encode()
    sig = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    ok = client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": sig})
    assert ok.status_code == 200
    assert client.get(f"/api/orders/{order_id}/payment", headers=headers).json()["paymentStatus"] == "PAID"
