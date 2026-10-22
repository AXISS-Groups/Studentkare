"""Live-run audit #1: a partner must not accept, pack or dispatch an order that still waits for payment.

An order "requires payment" when online payment was on offer when it was placed
(payment_due_at > 0). Until the server has the money, its lines are kept out of
the partner's "waiting for you" queue and every move but a decline is refused.
An order placed while payments were off (payment_due_at == 0) is a plain request
and stays actionable, as before.
"""
from test_order_payments import mock_pay, place, seed_item, start, verify
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M


def _vendor_login(client, codes, factory):
    with factory() as db:
        account = db.get(M.Account, "prov")
        account.identifier = "prov@example.test"
        db.commit()
    return login(client, codes, "prov@example.test")


def test_an_unpaid_order_cannot_be_accepted_and_waits_apart_in_the_queue(harness):
    client, factory, codes = harness
    _, student = register(client, codes, "gate-unpaid@example.test")
    seed_item(factory)
    order = place(client, student, key="gate-order-unpaid")
    assert order["paymentStatus"] == "UNPAID" and order["paymentDueAt"]
    line_id = order["lines"][0]["id"]
    client.post("/api/auth/logout", headers=student)

    vendor = _vendor_login(client, codes, factory)
    # Not in "waiting for you"; listed apart as awaiting payment.
    waiting = client.get("/api/work/requests?status=REQUESTED", headers=vendor).json()
    assert waiting["total"] == 0 and waiting["items"] == []
    awaiting = client.get("/api/work/requests?status=AWAITING_PAYMENT", headers=vendor).json()
    assert awaiting["total"] == 1 and awaiting["items"][0]["id"] == line_id
    everything = client.get("/api/work/requests", headers=vendor).json()["items"]
    assert everything[0]["awaitingPayment"] is True and everything[0]["paymentStatus"] == "UNPAID"

    refused = client.patch(f"/api/work/requests/{line_id}", headers=vendor, json={"status": "ACCEPTED"})
    assert refused.status_code == 409, refused.text
    assert "paid" in refused.json()["detail"].lower()
    with factory() as db:
        assert db.get(M.OrderLine, line_id).status == "REQUESTED"


def test_a_paid_order_is_waiting_for_the_partner_and_can_be_accepted_and_dispatched(harness):
    client, factory, codes = harness
    _, student = register(client, codes, "gate-paid@example.test")
    seed_item(factory)
    order = place(client, student, key="gate-order-paid")
    intent = start(client, student, order["id"])
    assert verify(client, student, order["id"], mock_pay(client, student, order["id"], intent)).json()["paymentStatus"] == "PAID"
    line_id = order["lines"][0]["id"]
    client.post("/api/auth/logout", headers=student)

    vendor = _vendor_login(client, codes, factory)
    waiting = client.get("/api/work/requests?status=REQUESTED", headers=vendor).json()
    assert waiting["total"] == 1 and waiting["items"][0]["awaitingPayment"] is False
    assert client.get("/api/work/requests?status=AWAITING_PAYMENT", headers=vendor).json()["total"] == 0
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor, json={"status": "ACCEPTED"}).status_code == 200
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor, json={"status": "DISPATCHED"}).status_code == 200


def test_dispatch_is_refused_if_the_order_is_not_paid_even_after_an_accept(harness):
    """A line accepted before this gate existed (or by a race) still can't leave the shop unpaid."""
    client, factory, codes = harness
    _, student = register(client, codes, "gate-legacy@example.test")
    seed_item(factory)
    order = place(client, student, key="gate-order-legacy")
    line_id = order["lines"][0]["id"]
    with factory() as db:
        db.get(M.OrderLine, line_id).status = "ACCEPTED"
        db.commit()
    client.post("/api/auth/logout", headers=student)
    vendor = _vendor_login(client, codes, factory)
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor, json={"status": "DISPATCHED"}).status_code == 409


def test_a_partner_may_still_decline_an_unpaid_order(harness):
    client, factory, codes = harness
    _, student = register(client, codes, "gate-decline@example.test")
    seed_item(factory)
    order = place(client, student, key="gate-order-decline")
    client.post("/api/auth/logout", headers=student)
    vendor = _vendor_login(client, codes, factory)
    res = client.patch(f"/api/work/requests/{order['lines'][0]['id']}", headers=vendor, json={"status": "DECLINED"})
    assert res.status_code == 200, res.text


def test_an_order_placed_while_payments_were_off_stays_a_plain_request(harness):
    client, factory, codes = harness
    _, student = register(client, codes, "gate-off@example.test")
    seed_item(factory)
    order = place(client, student, key="gate-order-off")
    line_id = order["lines"][0]["id"]
    with factory() as db:
        db.get(M.Order, order["id"]).payment_due_at = 0.0   # no provider was connected when it was placed
        db.commit()
    client.post("/api/auth/logout", headers=student)
    vendor = _vendor_login(client, codes, factory)
    assert client.get("/api/work/requests?status=REQUESTED", headers=vendor).json()["total"] == 1
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor, json={"status": "ACCEPTED"}).status_code == 200
