"""Billing journeys use isolated SQL and a fake provider boundary, never real charges."""
import hashlib
import hmac
import json
import time

import pytest
from sqlalchemy import select

from core import workflow_models as W
from core import billing_models as B
from services import billing
from test_workflow_api import harness, register, login


@pytest.fixture
def provider(monkeypatch):
    for key, value in {
        "RAZORPAY_KEY_ID": "rzp_test_billing", "RAZORPAY_KEY_SECRET": "test-key-secret",
        "RAZORPAY_WEBHOOK_SECRET": "test-webhook-secret", "RAZORPAY_PLUS_PLAN_ID": "plan_plus",
    }.items():
        monkeypatch.setenv(key, value)
    state = {"calls": [], "subscription": None, "invoices": [], "refunded": 0}

    def request(method, path, body=None, params=None):
        state["calls"].append((method, path, body))
        if path == "/plans/plan_plus":
            return {"id": "plan_plus", "period": "monthly", "interval": 1,
                    "item": {"amount": 9900, "currency": "INR"}}
        if method == "POST" and path == "/subscriptions":
            state["subscription"] = {"id": "sub_test", "plan_id": "plan_plus", "status": "created",
                                     "quantity": 1, "notes": body["notes"], "current_start": None,
                                     "current_end": None, "paid_count": 0}
            return state["subscription"]
        if path == "/subscriptions/sub_test/cancel":
            state["cancel"] = body
            return {**state["subscription"], "status": "cancelled"}
        if path == "/subscriptions/sub_test":
            return state["subscription"]
        if path == "/invoices":
            assert params["subscription_id"] == "sub_test"
            return {"items": state["invoices"]}
        if path.startswith("/payments/pay_"):
            payment_id = path.rsplit("/", 1)[-1]
            invoice = next(row for row in state["invoices"] if row["payment_id"] == payment_id)
            return {"id": payment_id, "invoice_id": invoice["id"], "amount": 9900,
                    "currency": "INR", "status": "captured", "amount_refunded": state["refunded"]}
        raise AssertionError((method, path))

    monkeypatch.setattr(billing, "gateway_request", request)
    return state


def start(client, headers):
    response = client.post("/api/billing/subscription/checkout", headers=headers, json={"planId": "STUDENT_PLUS"})
    assert response.status_code == 200, response.text
    return response.json()


def paid(provider, *, start_at=None, end_at=None, invoice_id="inv_test", payment_id="pay_test"):
    now = int(time.time())
    first, last = start_at or now - 10, end_at or now + 86400 * 30
    provider["subscription"].update(status="active", current_start=first, current_end=last, paid_count=1)
    provider["invoices"].append({"id": invoice_id, "subscription_id": "sub_test", "payment_id": payment_id,
                                  "status": "paid", "currency": "INR", "amount": 9900,
                                  "amount_paid": 9900, "amount_due": 0, "billing_start": first,
                                  "billing_end": last, "paid_at": now})


def webhook(client, event="subscription.charged", event_id="evt_one", signature=True):
    raw = json.dumps({"event": event, "payload": {"subscription": {"entity": {"id": "sub_test"}}}}).encode()
    sig = hmac.new(b"test-webhook-secret", raw, hashlib.sha256).hexdigest() if signature else "bad"
    return client.post("/api/billing/razorpay/webhook", content=raw,
                       headers={"X-Razorpay-Signature": sig, "X-Razorpay-Event-Id": event_id})


def test_public_plans_and_free_default_without_provider(harness, monkeypatch):
    client, _, codes = harness
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)
    plans = client.get("/api/billing/plans").json()
    assert [p["id"] for p in plans["plans"]] == ["FREE", "STUDENT_PLUS", "CAMPUS", "ENTERPRISE"]
    assert plans["checkoutAvailable"] is False
    assert "secret" not in json.dumps(plans).lower()
    _, headers = register(client, codes)
    assert client.get("/api/billing/me").json()["effectivePlanId"] == "FREE"
    response = client.post("/api/billing/subscription/checkout", headers=headers, json={"planId": "STUDENT_PLUS"})
    assert response.status_code == 503


def test_checkout_is_owned_idempotent_and_does_not_grant_access(harness, provider):
    client, _, codes = harness
    _, headers = register(client, codes)
    first, second = start(client, headers), start(client, headers)
    assert first["subscriptionId"] == second["subscriptionId"] == "sub_test"
    assert len([c for c in provider["calls"] if c[:2] == ("POST", "/subscriptions")]) == 1
    assert client.get("/api/billing/me").json()["effectivePlanId"] == "FREE"
    assert client.post("/api/billing/subscription/checkout", json={"planId": "STUDENT_PLUS"}).status_code == 403
    assert client.post("/api/billing/subscription/checkout", headers=headers,
                       json={"planId": "STUDENT_PLUS", "amountPaise": 1}).status_code == 422
    assert client.post("/api/billing/subscription/checkout", headers=headers,
                       json={"planId": "ENTERPRISE"}).status_code == 422


def test_authorization_payment_and_forged_callback_never_activate(harness, provider):
    client, _, codes = harness
    _, headers = register(client, codes)
    start(client, headers)
    body = {"razorpay_subscription_id": "sub_test", "razorpay_payment_id": "pay_auth", "razorpay_signature": "bad"}
    assert client.post("/api/billing/subscription/verify", headers=headers, json=body).status_code == 400
    body["razorpay_signature"] = hmac.new(b"test-key-secret", b"pay_auth|sub_test", hashlib.sha256).hexdigest()
    response = client.post("/api/billing/subscription/verify", headers=headers, json=body)
    assert response.status_code == 200
    assert response.json()["effectivePlanId"] == "FREE"


def test_paid_invoice_activates_once_and_out_of_order_events_reconcile(harness, provider):
    client, factory, codes = harness
    _, headers = register(client, codes)
    start(client, headers)
    paid(provider)
    assert webhook(client, signature=False).status_code == 401
    assert webhook(client).status_code == 200
    assert webhook(client).json()["duplicate"] is True
    assert webhook(client, event="subscription.authenticated", event_id="evt_old").status_code == 200
    account = client.get("/api/billing/me").json()
    assert account["effectivePlanId"] == "STUDENT_PLUS"
    assert account["benefits"]["limit"] == 2
    assert len(account["receipts"]) == 1
    with factory() as db:
        assert len(db.scalars(select(B.BillingReceipt)).all()) == 1


@pytest.mark.parametrize("field,value", [("amount_paid", 1), ("currency", "USD"), ("subscription_id", "sub_other")])
def test_wrong_invoice_cannot_grant_membership(harness, provider, field, value):
    client, _, codes = harness
    _, headers = register(client, codes)
    start(client, headers)
    paid(provider)
    provider["invoices"][0][field] = value
    response = client.post("/api/billing/subscription/sync", headers=headers)
    assert response.status_code in {200, 502}
    assert client.get("/api/billing/me").json()["effectivePlanId"] == "FREE"


def test_account_cannot_claim_another_subscription(harness, provider):
    client, _, codes = harness
    _, headers = register(client, codes)
    start(client, headers)
    client.post("/api/auth/logout", headers=headers)
    _, other = register(client, codes, "other@example.test")
    signature = hmac.new(b"test-key-secret", b"pay_test|sub_test", hashlib.sha256).hexdigest()
    response = client.post("/api/billing/subscription/verify", headers=other, json={
        "razorpay_subscription_id": "sub_test", "razorpay_payment_id": "pay_test", "razorpay_signature": signature})
    assert response.status_code == 404
    assert client.get("/api/billing/me").json()["receipts"] == []


def test_cancellation_retains_paid_access_until_expiry(harness, provider, monkeypatch):
    client, _, codes = harness
    _, headers = register(client, codes)
    start(client, headers)
    paid(provider)
    webhook(client)
    result = client.post("/api/billing/subscription/cancel", headers=headers)
    assert result.status_code == 200, result.text
    assert provider["cancel"] == {"cancel_at_cycle_end": True}
    assert result.json()["effectivePlanId"] == "STUDENT_PLUS"
    assert result.json()["cancelAtPeriodEnd"] is True
    monkeypatch.setattr(billing, "now", lambda: provider["invoices"][0]["billing_end"] + 1)
    assert client.get("/api/billing/me").json()["effectivePlanId"] == "FREE"


def test_refunded_payment_revokes_current_benefits(harness, provider):
    client, _, codes = harness
    _, headers = register(client, codes)
    start(client, headers)
    paid(provider)
    webhook(client)
    provider["refunded"] = 9900
    assert client.post("/api/billing/subscription/sync", headers=headers).status_code == 200
    assert client.get("/api/billing/me").json()["effectivePlanId"] == "FREE"


def test_paid_benefit_quota_is_persisted_and_cannot_be_bypassed(harness, provider):
    client, _, codes = harness
    _, headers = register(client, codes)
    body = {"message": "Please help coordinate a local appointment.", "requestKey": "benefit-one"}
    assert client.post("/api/billing/benefit-requests", headers=headers, json=body).status_code == 403
    start(client, headers)
    paid(provider)
    webhook(client)
    first = client.post("/api/billing/benefit-requests", headers=headers, json=body)
    assert first.status_code == 201
    assert client.post("/api/billing/benefit-requests", headers=headers, json=body).json()["id"] == first.json()["id"]
    assert client.post("/api/billing/benefit-requests", headers=headers, json={**body, "requestKey": "benefit-two"}).status_code == 201
    assert client.post("/api/billing/benefit-requests", headers=headers, json={**body, "requestKey": "benefit-three"}).status_code == 409
    assert client.get("/api/billing/me").json()["benefits"]["used"] == 2


def staff(harness):
    client, factory, codes = harness
    with factory() as db:
        for uid, role in [("billing-admin", "SUPER_ADMIN"), ("manager", "CAMPUS_ADMIN"), ("outsider", "CAMPUS_ADMIN")]:
            db.add(W.Account(id=uid, identifier=f"{uid}@example.test", channel="EMAIL", full_name=uid,
                             role=role, active=True, profile={}, created_at=time.time()))
        db.commit()
    return login(client, codes, "billing-admin@example.test")


def contract_body():
    return {"organization": "Test Campus", "planId": "CAMPUS", "managerEmail": "manager@example.test",
            "seats": 2, "annualAmountPaise": 48000, "signedReference": "signed-contract-001"}


def test_enterprise_inquiry_is_real_persisted_and_admin_only(harness):
    client, factory, _ = harness
    inquiry = {"organization": "Test University", "contactName": "Campus Buyer", "email": "buyer@example.test",
               "seats": 2000, "planId": "ENTERPRISE", "message": "We need a multi-campus quote.", "consent": True}
    response = client.post("/api/billing/inquiries", json=inquiry)
    assert response.status_code == 201, response.text
    assert client.get("/api/billing/admin/inquiries").status_code == 401
    headers = staff(harness)
    items = client.get("/api/billing/admin/inquiries").json()["items"]
    assert items[0]["organization"] == "Test University"
    assert client.patch(f"/api/billing/admin/inquiries/{items[0]['id']}", headers=headers,
                        json={"status": "CONTACTED"}).status_code == 200
    with factory() as db:
        assert db.get(B.EnterpriseInquiry, response.json()["id"]).status == "CONTACTED"


def test_campus_requires_recorded_payment_and_seats_enforced(harness):
    client, factory, codes = harness
    member, member_headers = register(client, codes)
    for address in ["second-seat@example.test", "third-seat@example.test"]:
        with factory() as db:
            db.add(W.Account(id=f"seat-{address.split('@')[0]}", identifier=address, channel="EMAIL",
                             full_name="Seat Holder", role="STUDENT", active=True, profile={}, created_at=time.time()))
            db.commit()
    assert client.post("/api/billing/admin/contracts", headers=member_headers, json=contract_body()).status_code == 403
    headers = staff(harness)
    response = client.post("/api/billing/admin/contracts", headers=headers, json=contract_body())
    assert response.status_code == 201, response.text
    cid = response.json()["id"]
    body = {"paymentReference": "bank-001", "amountPaise": 56640,
            "periodStart": int(time.time()) - 5, "periodEnd": int(time.time()) + 86400 * 365}
    assert client.post(f"/api/billing/admin/contracts/{cid}/activate", headers=headers,
                       json={**body, "amountPaise": 1}).status_code == 422
    assert client.post(f"/api/billing/admin/contracts/{cid}/activate", headers=headers, json=body).status_code == 200
    manager_headers = login(client, codes, "manager@example.test")
    assert client.get("/api/billing/contracts").json()["items"][0]["id"] == cid
    assert client.post(f"/api/billing/contracts/{cid}/members", headers=manager_headers,
                       json={"email": member["email"]}).status_code == 201
    assert client.post(f"/api/billing/contracts/{cid}/members", headers=manager_headers,
                       json={"email": "second-seat@example.test"}).status_code == 201
    assert client.post(f"/api/billing/contracts/{cid}/members", headers=manager_headers,
                       json={"email": "third-seat@example.test"}).status_code == 409
    login(client, codes, member["email"])
    assert client.get("/api/billing/me").json()["organizationPlan"]["planId"] == "CAMPUS"
    outsider_headers = login(client, codes, "outsider@example.test")
    assert client.get("/api/billing/contracts").json()["items"] == []
    assert client.get(f"/api/billing/contracts/{cid}/members").status_code == 404
    assert client.post(f"/api/billing/contracts/{cid}/members", headers=outsider_headers,
                       json={"email": "third-seat@example.test"}).status_code == 404
