"""The order refund endpoint validates everything and never claims money moved."""
import time

from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M


def make_paid_order(factory, account_id, total=50000, paid=True):
    with factory() as db:
        db.add(M.Order(id="o1", account_id=account_id, idempotency_key="k1", request_hash="h", total_paise=total,
                       delivery={}, payment_status="PAID" if paid else "UNPAID", created_at=time.time()))
        db.add(M.Payment(id="p1", order_id="o1", amount_paise=total, status="CAPTURED", provider="razorpay",
                         provider_ref="pay_1", idempotency_key="pk1", created_at=time.time()))
        db.commit()


def as_role(factory, account_id, role):
    with factory() as db:
        db.get(M.Account, account_id).role = role
        db.commit()


def refund(client, headers, order_id="o1", **body):
    return client.post(f"/api/v1/orders/{order_id}/refund", headers=headers,
                       json={"payment_id": "pay_1", "amount_paise": 1000, **body})


def test_only_a_super_admin_may_refund(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    make_paid_order(factory, user["id"])
    for role in ("STUDENT", "VENDOR", "CAMPUS_ADMIN", "NMC_DOCTOR"):
        as_role(factory, user["id"], role)
        assert refund(client, headers).status_code == 403, role


def test_refund_is_validated_then_reported_unavailable_without_telling_the_student(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    make_paid_order(factory, user["id"])
    as_role(factory, user["id"], "SUPER_ADMIN")

    assert refund(client, headers, order_id="nope").status_code == 404
    assert refund(client, headers, payment_id="someone-elses").status_code == 422
    assert refund(client, headers, amount_paise=999999).status_code == 422
    response = refund(client, headers)
    assert response.status_code == 503
    assert "Nothing was refunded" in response.json()["detail"]

    with factory() as db:
        assert db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "ORDER_REFUNDED")) is None


def test_an_unpaid_order_cannot_be_refunded(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    make_paid_order(factory, user["id"], paid=False)
    as_role(factory, user["id"], "SUPER_ADMIN")
    assert refund(client, headers).status_code == 409
