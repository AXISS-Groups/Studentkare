"""Payment contract tests: the labelled mock, honest unconfigured state, signed webhook verification.

The full order-payment paths (verify, decline, replay, expiry, Razorpay, refunds,
production refusing the mock) are in test_order_payments.py.
"""
import hashlib
import hmac
import os
import time

from sqlalchemy import select
from test_workflow_api import harness, register

from core import workflow_models as M


def _order(factory, uid, client, headers, key):
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Provider", role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id="item", provider_id="prov", kind="product", name="Item", brand="B", category="devices", description="d", pack="1", price_paise=45000, mrp_paise=50000, stock=5, active=True, requires_prescription=False, preparation=""))
        db.commit()
    return client.post("/api/orders", headers={**headers, "Idempotency-Key": key},
                       json={"items": [{"id": "item", "quantity": 1}], "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"}}).json()["id"]


def test_the_default_provider_in_testing_is_the_labelled_mock(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer@example.test")
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    order_id = _order(factory, user["id"], client, headers, "pay-order-1")
    res = client.post(f"/api/orders/{order_id}/payment", headers=headers).json()
    assert res["configured"] is True and res["provider"] == "mock"
    assert res["testMode"] is True   # the UI labels it a test payment
    assert res["amountPaise"] == 45000
    assert client.get(f"/api/orders/{order_id}/payment", headers=headers).json()["paymentStatus"] == "UNPAID"


def test_payment_never_claims_a_session_just_because_a_provider_is_named(harness, monkeypatch):
    # Naming a provider without its keys calls no provider, so nothing was created.
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer-env@example.test")
    monkeypatch.setenv("PAYMENT_PROVIDER", "razorpay")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)
    order_id = _order(factory, user["id"], client, headers, "pay-order-env")
    res = client.post(f"/api/orders/{order_id}/payment", headers=headers).json()
    assert res["configured"] is False and res["status"] == "UNAVAILABLE"
    assert "created" not in res["message"].lower()


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


def _signed(client, payload):
    import json as _json
    body = _json.dumps(payload).encode()
    sig = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    return client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": sig})


def test_webhook_refuses_an_amount_that_is_not_the_order_total(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer4@example.test")
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")
    order_id = _order(factory, user["id"], client, headers, "pay-order-4")
    for amount in (100, 45000.0, "45000", None):
        res = _signed(client, {"event": "payment.settled", "orderId": order_id, "providerRef": f"ref-{amount}", "amountPaise": amount})
        assert res.status_code == 409, amount
    assert _signed(client, {"event": "payment.settled", "orderId": order_id, "amountPaise": 45000}).status_code == 422
    assert client.get(f"/api/orders/{order_id}/payment", headers=headers).json()["paymentStatus"] == "UNPAID"
    with factory() as db:
        assert db.scalars(select(M.Payment)).all() == []


def test_a_replayed_settlement_records_one_payment(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer5@example.test")
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")
    order_id = _order(factory, user["id"], client, headers, "pay-order-5")
    payload = {"event": "payment.captured", "orderId": order_id, "providerRef": "ref-5", "amountPaise": 45000}
    assert _signed(client, payload).status_code == 200
    assert _signed(client, payload).status_code == 200
    with factory() as db:
        assert len(db.scalars(select(M.Payment)).all()) == 1
