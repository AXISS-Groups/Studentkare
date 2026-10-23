"""Live-run audit #9: one checkout opens one payment, however many times the client asks.

The checkout and lab-booking Pay step POSTed /payment twice (React StrictMode
runs the effect twice, concurrently). Both requests carry the same
Idempotency-Key and must get the same provider order; a race on the key
resolves to the one that was saved.
"""
from unittest import mock

from sqlalchemy import select
from test_order_payments import place, seed_item
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import payments


def _intents(factory):
    with factory() as db:
        return db.scalars(select(M.PaymentIntent)).all()


def test_the_same_key_returns_the_same_payment(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "idem-1@example.test")
    seed_item(factory)
    order = place(client, headers, key="idem-order-1")
    keyed = {**headers, "Idempotency-Key": "pay-key-0001"}
    first = client.post(f"/api/orders/{order['id']}/payment", headers=keyed)
    second = client.post(f"/api/orders/{order['id']}/payment", headers=keyed)
    assert first.status_code == second.status_code == 200
    assert first.json()["intentId"] == second.json()["intentId"]
    assert len(_intents(factory)) == 1


def test_two_requests_racing_on_one_key_open_one_payment(harness):
    """Both pass the "is there an open intent?" check before either has saved: the key's unique index decides."""
    client, factory, codes = harness
    _, headers = register(client, codes, "idem-2@example.test")
    seed_item(factory)
    order = place(client, headers, key="idem-order-2")
    keyed = {**headers, "Idempotency-Key": "pay-key-0002"}
    first = client.post(f"/api/orders/{order['id']}/payment", headers=keyed)
    real_keyed = payments._keyed_intent
    calls = []

    def unseen_then_real(db, payable, key):
        # The second request's checks ran before the first had committed: they see nothing.
        calls.append(key)
        return None if len(calls) == 1 else real_keyed(db, payable, key)

    with mock.patch.object(payments, "_reusable_intent", return_value=None), \
            mock.patch.object(payments, "_keyed_intent", side_effect=unseen_then_real):
        second = client.post(f"/api/orders/{order['id']}/payment", headers=keyed)
    assert first.status_code == second.status_code == 200, second.text
    # The key's unique index refused a second intent; the request got the saved one back.
    assert len(calls) == 2
    assert first.json()["intentId"] == second.json()["intentId"]
    assert len(_intents(factory)) == 1


def test_a_lab_booking_payment_honours_the_key_too(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "idem-3@example.test")
    with factory() as db:
        db.add(M.LabOrderCharge(lab_order_id="lab-1", account_id=db.scalar(select(M.Account.id).where(
            M.Account.identifier == "idem-3@example.test")), catalog_item_id="x", lab_id="lab", amount_paise=31900,
            payment_status="UNPAID", payment_due_at=9e12, idempotency_key="book-1", created_at=1, updated_at=1))
        db.commit()
    keyed = {**headers, "Idempotency-Key": "pay-key-0003"}
    first = client.post("/api/lab-orders/lab-1/payment", headers=keyed)
    second = client.post("/api/lab-orders/lab-1/payment", headers=keyed)
    assert first.status_code == 200, first.text
    assert first.json()["intentId"] == second.json()["intentId"]
