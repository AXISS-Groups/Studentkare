"""Order payments end to end: mock and Razorpay providers, verify, webhook, replay, expiry, refunds.

Every path that could mark an order paid is checked to refuse a bad signature,
a wrong amount and a replay; production must refuse to start on the mock.
"""
import hashlib
import hmac
import json
import subprocess
import sys
import time
from pathlib import Path

import pytest
from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import payment_gateway, payments, razorpay_client

BACKEND = str(Path(__file__).resolve().parents[1])
SUCCESS_CARD = "4111 1111 1111 1111"
DECLINED_CARD = "4000 0000 0000 0002"


@pytest.fixture(autouse=True)
def _mock_by_default(monkeypatch):
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")


def seed_item(factory, stock=5, price=45000):
    with factory() as db:
        if db.get(M.Account, "prov") is None:
            db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Provider",
                             role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id="item", provider_id="prov", kind="product", name="Sunscreen SPF 50", brand="B",
                              category="devices", description="d", pack="1", price_paise=price, mrp_paise=price,
                              stock=stock, active=True, requires_prescription=False, preparation=""))
        db.commit()


def place(client, headers, key="order-key-1", quantity=1):
    res = client.post("/api/orders", headers={**headers, "Idempotency-Key": key},
                      json={"items": [{"id": "item", "quantity": quantity}],
                            "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"}})
    assert res.status_code == 201, res.text
    return res.json()


def stock(factory):
    with factory() as db:
        return db.get(M.CatalogEntry, "item").stock


def start(client, headers, order_id):
    res = client.post(f"/api/orders/{order_id}/payment", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def mock_pay(client, headers, order_id, intent, card=SUCCESS_CARD):
    res = client.post(f"/api/orders/{order_id}/payment/mock-checkout", headers=headers,
                      json={"providerOrderId": intent["providerOrderId"], "cardNumber": card})
    assert res.status_code == 200, res.text
    return res.json()


def verify(client, headers, order_id, paid):
    return client.post(f"/api/orders/{order_id}/payment/verify", headers=headers, json={
        "providerOrderId": paid["providerOrderId"], "providerPaymentId": paid["providerPaymentId"],
        "signature": paid["signature"]})


def status(client, headers, order_id):
    return client.get(f"/api/orders/{order_id}/payment", headers=headers).json()


def signed_webhook(client, payload):
    body = json.dumps(payload).encode()
    sig = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    return client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": sig})


def payments_rows(factory):
    with factory() as db:
        return db.scalars(select(M.Payment)).all()


# --- the mock: success, failure, signature, amount, replay -------------------

def test_mock_success_marks_the_order_paid_and_keeps_the_reservation(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-ok@example.test")
    seed_item(factory)
    order = place(client, headers)
    assert order["paymentStatus"] == "UNPAID" and order["paymentDueAt"] > time.time()
    assert stock(factory) == 4
    intent = start(client, headers, order["id"])
    assert intent["testMode"] is True and intent["checkout"]["testCards"]
    paid = mock_pay(client, headers, order["id"], intent)
    assert paid["outcome"] == "captured" and paid["testMode"] is True
    # The mock's payment page marks nothing paid; only the verify does.
    assert status(client, headers, order["id"])["paymentStatus"] == "UNPAID"
    res = verify(client, headers, order["id"], paid)
    assert res.status_code == 200, res.text
    assert res.json()["outcome"] == "PAID" and res.json()["paymentStatus"] == "PAID"
    assert stock(factory) == 4   # reservation confirmed, not released
    with factory() as db:
        row = db.scalar(select(M.Payment))
        assert (row.status, row.amount_paise, row.provider) == ("CAPTURED", 45000, "mock")
        assert db.scalar(select(M.PaymentIntent)).status == "PAID"
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "ORDER_PAID")) is not None
    assert status(client, headers, order["id"])["testMode"] is True
    # A paid order cannot be paid again, nor cancelled by the student.
    assert client.post(f"/api/orders/{order['id']}/payment", headers=headers).status_code == 409
    assert client.post(f"/api/orders/{order['id']}/cancel", headers=headers).status_code == 409


def test_a_declined_test_card_records_a_failure_and_the_student_can_retry(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-fail@example.test")
    seed_item(factory)
    order = place(client, headers)
    intent = start(client, headers, order["id"])
    declined = mock_pay(client, headers, order["id"], intent, DECLINED_CARD)
    assert declined["outcome"] == "failed" and declined["errorCode"] == "card_declined"
    res = verify(client, headers, order["id"], declined).json()
    assert res["outcome"] == "FAILED" and res["paymentStatus"] == "UNPAID"
    assert [p["status"] for p in res["payments"]] == ["FAILED"]
    # Same open intent; a good card now succeeds.
    again = start(client, headers, order["id"])
    assert again["providerOrderId"] == intent["providerOrderId"]
    ok = verify(client, headers, order["id"], mock_pay(client, headers, order["id"], again)).json()
    assert ok["paymentStatus"] == "PAID"


def test_an_unknown_card_is_refused_by_the_mock(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-card@example.test")
    seed_item(factory)
    order = place(client, headers)
    intent = start(client, headers, order["id"])
    res = client.post(f"/api/orders/{order['id']}/payment/mock-checkout", headers=headers,
                      json={"providerOrderId": intent["providerOrderId"], "cardNumber": "5555 5555 5555 4444"})
    assert res.status_code == 422


def test_a_bad_signature_marks_nothing_paid(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-sig@example.test")
    seed_item(factory)
    order = place(client, headers)
    paid = mock_pay(client, headers, order["id"], start(client, headers, order["id"]))
    for forged in ("0" * 64, paid["signature"][::-1]):
        res = verify(client, headers, order["id"], {**paid, "signature": forged})
        assert res.status_code == 400
    assert status(client, headers, order["id"])["paymentStatus"] == "UNPAID"
    assert payments_rows(factory) == []


def test_a_captured_amount_that_is_not_the_order_total_is_refused(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-amount@example.test")
    seed_item(factory)
    order = place(client, headers)
    paid = mock_pay(client, headers, order["id"], start(client, headers, order["id"]))
    with factory() as db:   # the gateway reports a different amount than it was asked for
        db.get(M.MockGatewayPayment, paid["providerPaymentId"]).amount_paise = 100
        db.commit()
    res = verify(client, headers, order["id"], paid)
    assert res.status_code == 409
    assert status(client, headers, order["id"])["paymentStatus"] == "UNPAID"
    assert payments_rows(factory) == []
    with factory() as db:
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "PAYMENT_AMOUNT_MISMATCH")) is not None


def test_replays_of_verify_and_webhook_record_one_payment(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-replay@example.test")
    seed_item(factory)
    order = place(client, headers)
    intent = start(client, headers, order["id"])
    paid = mock_pay(client, headers, order["id"], intent)
    assert verify(client, headers, order["id"], paid).json()["outcome"] == "PAID"
    assert verify(client, headers, order["id"], paid).json()["outcome"] == "DUPLICATE"
    hook = {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
            "providerRef": paid["providerPaymentId"], "amountPaise": 45000}
    assert signed_webhook(client, hook).json()["outcome"] == "DUPLICATE"
    assert signed_webhook(client, hook).status_code == 200
    assert len(payments_rows(factory)) == 1


def test_the_webhook_alone_settles_an_order(harness):
    # The client may close the tab after paying: the webhook is the source of truth.
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-hook@example.test")
    seed_item(factory)
    order = place(client, headers)
    intent = start(client, headers, order["id"])
    paid = mock_pay(client, headers, order["id"], intent)
    res = signed_webhook(client, {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
                                  "providerRef": paid["providerPaymentId"], "amountPaise": 45000})
    assert res.status_code == 200 and res.json()["outcome"] == "PAID"
    assert status(client, headers, order["id"])["paymentStatus"] == "PAID"


def test_someone_elses_order_cannot_be_started_or_verified(harness):
    client, factory, codes = harness
    _, owner = register(client, codes, "pay-owner@example.test")
    seed_item(factory)
    order = place(client, owner)
    intent = start(client, owner, order["id"])
    paid = mock_pay(client, owner, order["id"], intent)
    client.cookies.clear()
    _, other = register(client, codes, "pay-other@example.test")
    assert client.post(f"/api/orders/{order['id']}/payment", headers=other).status_code == 404
    assert verify(client, other, order["id"], paid).status_code == 404
    assert client.get(f"/api/orders/{order['id']}/payment", headers=other).status_code == 404


def test_starting_twice_reuses_one_provider_order(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-twice@example.test")
    seed_item(factory)
    order = place(client, headers)
    assert start(client, headers, order["id"])["providerOrderId"] == start(client, headers, order["id"])["providerOrderId"]
    with factory() as db:
        assert len(db.scalars(select(M.PaymentIntent)).all()) == 1


# --- expiry, cancellation and late captures -------------------------------------

def test_an_unpaid_order_releases_its_stock_after_the_deadline(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-expire@example.test")
    seed_item(factory)
    order = place(client, headers, quantity=2)
    intent = start(client, headers, order["id"])
    assert stock(factory) == 3
    with factory() as db:
        assert payments.expire_unpaid_orders(db)["summary"]["expired"] == 0   # not due yet
        result = payments.expire_unpaid_orders(db, at=time.time() + payments.hold_seconds() + 1)
        db.commit()
    assert result["summary"]["expired"] == 1
    assert stock(factory) == 5
    with factory() as db:
        assert db.get(M.Order, order["id"]).payment_status == "EXPIRED"
        assert {line.status for line in db.scalars(select(M.OrderLine)).all()} == {"CANCELLED"}
        assert db.scalar(select(M.PaymentIntent)).status == "EXPIRED"
    assert client.post(f"/api/orders/{order['id']}/payment", headers=headers).status_code == 409
    # A capture that lands afterwards is recorded and raised for a refund; the order stays expired.
    res = signed_webhook(client, {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
                                  "providerRef": "mock_pay_late", "amountPaise": 90000})
    assert res.json()["outcome"] == "LATE"
    with factory() as db:
        assert db.get(M.Order, order["id"]).payment_status == "EXPIRED"
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "PAYMENT_NEEDS_REFUND")) is not None
    assert stock(factory) == 5


def test_the_scheduled_job_runs_the_expiry(harness):
    from services import workflow_scheduler as scheduler
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-job@example.test")
    seed_item(factory)
    order = place(client, headers)
    with factory() as db:
        db.get(M.Order, order["id"]).payment_due_at = time.time() - 1
        db.commit()
        scheduler.ensure_scheduled_jobs(db)
        outcome = scheduler.workflow_scheduler.run_job_now(db, "payment_expiry")
    assert outcome["status"] == "SUCCESS" and outcome["summary"]["expired"] == 1
    assert stock(factory) == 5


def test_orders_placed_without_a_provider_never_expire(harness, monkeypatch):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-noprov@example.test")
    monkeypatch.setenv("PAYMENT_PROVIDER", "razorpay")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    seed_item(factory)
    order = place(client, headers)
    assert order["paymentDueAt"] is None
    with factory() as db:
        assert payments.expire_unpaid_orders(db, at=time.time() + 10 ** 7)["summary"]["due"] == 0


def test_a_cancelled_order_cannot_be_paid_and_a_late_capture_is_flagged(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "pay-cancel@example.test")
    seed_item(factory)
    order = place(client, headers)
    intent = start(client, headers, order["id"])
    assert client.post(f"/api/orders/{order['id']}/cancel", headers=headers).status_code == 200
    with factory() as db:
        assert db.get(M.Order, order["id"]).payment_status == "CANCELLED"
        assert db.scalar(select(M.PaymentIntent)).status == "CANCELLED"
    assert client.post(f"/api/orders/{order['id']}/payment", headers=headers).status_code == 409
    res = signed_webhook(client, {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
                                  "providerRef": "mock_pay_after_cancel", "amountPaise": 45000})
    assert res.json()["outcome"] == "LATE"


# --- Razorpay -------------------------------------------------------------------

class FakeRazorpay:
    """Stands in for api.razorpay.com: records every request body."""

    def __init__(self, amount=45000):
        self.calls = []
        self.amount = amount
        self.payment_status = "captured"
        self.fail_refunds = False

    def __call__(self, method, path, body=None, params=None):
        self.calls.append((method, path, body))
        if path == "/orders":
            return {"id": "order_RZP1", "amount": body["amount"], "currency": body["currency"], "status": "created"}
        if path.startswith("/payments/") and path.endswith("/refund"):
            if self.fail_refunds:
                from fastapi import HTTPException
                raise HTTPException(502, "x")
            return {"id": "rfnd_RZP1", "amount": body["amount"], "status": "processed"}
        if path.startswith("/payments/"):
            return {"id": path.split("/")[2], "order_id": "order_RZP1", "amount": self.amount,
                    "currency": "INR", "status": self.payment_status}
        raise AssertionError(path)


@pytest.fixture
def razorpay(monkeypatch):
    monkeypatch.setenv("PAYMENT_PROVIDER", "razorpay")
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp-secret")
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "rzp-webhook-secret")
    fake = FakeRazorpay()
    monkeypatch.setattr(razorpay_client, "request", fake)
    return fake


def rzp_signature(order_id, payment_id, secret=b"rzp-secret"):
    return hmac.new(secret, f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


def test_razorpay_order_is_for_the_server_total_and_carries_no_item_names(harness, razorpay):
    client, factory, codes = harness
    _, headers = register(client, codes, "rzp-start@example.test")
    seed_item(factory)
    order = place(client, headers)
    intent = start(client, headers, order["id"])
    assert intent["provider"] == "razorpay" and intent["testMode"] is False
    assert intent["checkout"] == {"keyId": "rzp_test_key"}   # the public key only, never the secret
    method, path, body = razorpay.calls[0]
    assert (method, path, body["amount"], body["currency"]) == ("POST", "/orders", 45000, "INR")
    assert "Sunscreen" not in json.dumps(body)   # Rule L: what was bought is not the gateway's business
    assert body["notes"] == {"payable": f"shop_order:{order['id']}"}


def test_razorpay_verify_checks_signature_then_the_provider(harness, razorpay):
    client, factory, codes = harness
    _, headers = register(client, codes, "rzp-verify@example.test")
    seed_item(factory)
    order = place(client, headers)
    start(client, headers, order["id"])
    bad = verify(client, headers, order["id"], {"providerOrderId": "order_RZP1", "providerPaymentId": "pay_RZP1",
                                                "signature": rzp_signature("order_RZP1", "pay_RZP1", b"wrong")})
    assert bad.status_code == 400
    razorpay.amount = 100   # the provider says a different amount was paid
    good = {"providerOrderId": "order_RZP1", "providerPaymentId": "pay_RZP1",
            "signature": rzp_signature("order_RZP1", "pay_RZP1")}
    assert verify(client, headers, order["id"], good).status_code == 409
    razorpay.amount = 45000
    res = verify(client, headers, order["id"], good)
    assert res.status_code == 200 and res.json()["paymentStatus"] == "PAID"


def test_razorpay_authorized_but_not_captured_stays_pending(harness, razorpay):
    client, factory, codes = harness
    _, headers = register(client, codes, "rzp-pending@example.test")
    seed_item(factory)
    order = place(client, headers)
    start(client, headers, order["id"])
    razorpay.payment_status = "authorized"
    res = verify(client, headers, order["id"], {"providerOrderId": "order_RZP1", "providerPaymentId": "pay_RZP2",
                                                "signature": rzp_signature("order_RZP1", "pay_RZP2")})
    assert res.json()["outcome"] == "PENDING" and res.json()["paymentStatus"] == "UNPAID"


def rzp_webhook(client, event, payment, secret=b"rzp-webhook-secret"):
    body = json.dumps({"event": event, "payload": {"payment": {"entity": payment}}}).encode()
    sig = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return client.post("/api/payments/webhook", content=body, headers={"x-razorpay-signature": sig})


def test_razorpay_webhook_settles_refuses_bad_signatures_and_replays(harness, razorpay):
    client, factory, codes = harness
    _, headers = register(client, codes, "rzp-hook@example.test")
    seed_item(factory)
    order = place(client, headers)
    start(client, headers, order["id"])
    payment = {"id": "pay_RZP9", "order_id": "order_RZP1", "amount": 45000, "currency": "INR"}
    assert rzp_webhook(client, "payment.captured", payment, b"forged").status_code == 401
    # The generic header is not accepted for Razorpay.
    body = json.dumps({"event": "payment.captured", "orderId": order["id"], "providerRef": "x", "amountPaise": 45000}).encode()
    generic = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    assert client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": generic}).status_code == 401
    assert rzp_webhook(client, "payment.captured", {**payment, "amount": 44999}).status_code == 409
    assert rzp_webhook(client, "payment.captured", payment).json()["outcome"] == "PAID"
    assert rzp_webhook(client, "payment.captured", payment).json()["outcome"] == "DUPLICATE"
    assert rzp_webhook(client, "order.paid", payment).json()["outcome"] == "DUPLICATE"
    assert len(payments_rows(factory)) == 1
    assert rzp_webhook(client, "payment.failed", {"id": "pay_RZP8", "order_id": "order_RZP1",
                                                  "amount": 45000, "error_code": "BAD_REQUEST_ERROR"}).status_code == 200
    assert status(client, headers, order["id"])["paymentStatus"] == "PAID"


def test_razorpay_down_is_a_502_and_nothing_is_recorded(harness, razorpay, monkeypatch):
    client, factory, codes = harness
    _, headers = register(client, codes, "rzp-down@example.test")
    seed_item(factory)
    order = place(client, headers)

    def down(*args, **kwargs):
        raise ConnectionError("no route")
    monkeypatch.setattr(razorpay_client, "request", down)
    assert client.post(f"/api/orders/{order['id']}/payment", headers=headers).status_code == 502
    with factory() as db:
        assert db.scalars(select(M.PaymentIntent)).all() == []


# --- refunds --------------------------------------------------------------------

def make_admin(factory, email):
    with factory() as db:
        db.scalar(select(M.Account).where(M.Account.identifier == email)).role = "SUPER_ADMIN"
        db.commit()


def refund(client, headers, order_id, payment_id, amount, key):
    return client.post(f"/api/v1/orders/{order_id}/refund", headers={**headers, "Idempotency-Key": key},
                       json={"payment_id": payment_id, "amount_paise": amount, "reason": "Damaged"})


def paid_order(client, factory, headers):
    seed_item(factory)
    order = place(client, headers)
    paid = mock_pay(client, headers, order["id"], start(client, headers, order["id"]))
    assert verify(client, headers, order["id"], paid).json()["paymentStatus"] == "PAID"
    return order["id"], paid["providerPaymentId"]


def test_partial_then_full_refund_through_the_mock_is_idempotent(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "refund-admin@example.test")
    order_id, payment_id = paid_order(client, factory, headers)
    make_admin(factory, "refund-admin@example.test")

    first = refund(client, headers, order_id, payment_id, 10000, "refund-one")
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "PROCESSED" and first.json()["duplicate"] is False
    replay = refund(client, headers, order_id, payment_id, 10000, "refund-one")
    assert replay.status_code == 200 and replay.json()["duplicate"] is True
    assert refund(client, headers, order_id, payment_id, 20000, "refund-one").status_code == 409
    with factory() as db:
        assert db.get(M.Order, order_id).payment_status == "PARTIALLY_REFUNDED"
        assert db.get(M.MockGatewayPayment, payment_id).refunded_paise == 10000   # the gateway moved it once
        assert len(db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "ORDER_REFUNDED")).all()) == 1

    assert refund(client, headers, order_id, payment_id, 35001, "refund-two").status_code == 422
    assert refund(client, headers, order_id, payment_id, 35000, "refund-two").status_code == 200
    with factory() as db:
        assert db.get(M.Order, order_id).payment_status == "REFUNDED"
        assert db.scalar(select(M.Payment)).refunded_paise == 45000
        assert len(db.scalars(select(M.Refund)).all()) == 2


def test_a_refund_needs_an_idempotency_key(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "refund-key@example.test")
    order_id, payment_id = paid_order(client, factory, headers)
    make_admin(factory, "refund-key@example.test")
    res = client.post(f"/api/v1/orders/{order_id}/refund", headers=headers,
                      json={"payment_id": payment_id, "amount_paise": 100})
    assert res.status_code == 422


def test_a_provider_refusing_a_refund_moves_nothing(harness, razorpay):
    client, factory, codes = harness
    _, headers = register(client, codes, "refund-rzp@example.test")
    seed_item(factory)
    order = place(client, headers)
    start(client, headers, order["id"])
    assert verify(client, headers, order["id"], {"providerOrderId": "order_RZP1", "providerPaymentId": "pay_RZP1",
                                                 "signature": rzp_signature("order_RZP1", "pay_RZP1")}).status_code == 200
    make_admin(factory, "refund-rzp@example.test")
    razorpay.fail_refunds = True
    assert refund(client, headers, order["id"], "pay_RZP1", 45000, "refund-fail").status_code == 502
    with factory() as db:
        assert db.scalar(select(M.Payment)).refunded_paise == 0
        assert db.scalar(select(M.Refund)).status == "FAILED"
        assert db.get(M.Order, order["id"]).payment_status == "PAID"
    razorpay.fail_refunds = False
    ok = refund(client, headers, order["id"], "pay_RZP1", 45000, "refund-retry")
    assert ok.status_code == 200 and ok.json()["providerRefundId"] == "rfnd_RZP1"
    method, path, body = razorpay.calls[-1]
    assert (path, body["amount"]) == ("/payments/pay_RZP1/refund", 45000)


# --- production never runs the mock ---------------------------------------------

def _boot(env_extra):
    env = {"PYTHONPATH": BACKEND, "OTP_HASH_SECRET": "x" * 40, "DATABASE_URL": "postgresql://u:p@h/db"}
    env.update(env_extra)
    return subprocess.run([sys.executable, "-c", "from app import main"], cwd=BACKEND, env=env,  # noqa: S603
                          capture_output=True, text=True)


def test_production_refuses_to_start_with_the_mock():
    result = _boot({"APP_ENV": "production", "PAYMENT_PROVIDER": "mock"})
    assert result.returncode != 0
    assert "PAYMENT_PROVIDER=mock" in result.stderr


def test_production_starts_with_the_mock_only_after_an_explicit_opt_in():
    result = _boot({"APP_ENV": "production", "PAYMENT_PROVIDER": "mock", "PAYMENT_ALLOW_MOCK_IN_PRODUCTION": "true"})
    assert result.returncode == 0, result.stderr


def test_production_defaults_to_razorpay_and_an_unknown_provider_refuses_to_start():
    assert _boot({"APP_ENV": "production"}).returncode == 0
    result = _boot({"APP_ENV": "development", "PAYMENT_PROVIDER": "paypal"})
    assert result.returncode != 0 and "PAYMENT_PROVIDER" in result.stderr


def test_the_mock_is_refused_at_request_time_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("PAYMENT_PROVIDER", "mock")
    monkeypatch.delenv("PAYMENT_ALLOW_MOCK_IN_PRODUCTION", raising=False)
    with pytest.raises(payment_gateway.ProviderUnavailable):
        payment_gateway.get_provider(None)
    monkeypatch.delenv("PAYMENT_PROVIDER")
    assert payment_gateway.provider_name() == "razorpay"
