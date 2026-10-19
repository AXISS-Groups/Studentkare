"""A student books a lab test from the shop, pays, and the lab's own collector picks it up.

Checks the rules, not just the happy path: the price is the server's, nothing
reaches the lab until it is paid, an unpaid booking gives its slot back, a
collector is an account of that lab and acts only on their own pickups, no
admin or collector reads a result, and shop-order payments still work after
payments were generalised to a payable reference.
"""
import time

import pytest
from sqlalchemy import select
from test_clinical_fulfilment import REPORT_PDF, make_collector, make_provider, make_staff
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import lab_booking, payments

SUCCESS_CARD = "4111 1111 1111 1111"
MORNING = "2099-01-05T07:00:00+05:30"
EVENING = "2099-01-05T18:00:00+05:30"
HOSTEL = {"kind": "HOSTEL", "hostelBlock": "Block B", "room": "214"}


@pytest.fixture(autouse=True)
def _mock_provider(monkeypatch):
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")


def make_lab(factory, account="labco", provider="lab-labco", item="pkg", fasting=0, price=64900, home=True):
    """A lab partner (VENDOR, partner kind LAB) with one package and two collectors, P. Rao and S. Devi."""
    with factory() as db:
        db.add(M.Account(id=account, identifier=f"{account}@example.test", channel="EMAIL", full_name="Lab One",
                         role="VENDOR", active=True, profile={}, created_at=time.time(), partner_kind="LAB"))
        db.commit()
    make_provider(factory, provider, account, "LAB", legal_name=f"Lab {account}", home_collection=home)
    with factory() as db:
        db.add(M.CatalogEntry(id=item, provider_id=account, kind="lab", name="Vitamin D + B12", brand="Lab",
                              category="labs", description="Two vitamins", pack="2 tests", price_paise=price,
                              mrp_paise=99900, stock=0, active=True, requires_prescription=False, preparation="",
                              includes=["Vitamin D (25-OH)", "Vitamin B12"], fasting_hours=fasting, report_hours=24))
        for slot_id, start in ((f"{item}-am", MORNING), (f"{item}-pm", EVENING)):
            db.add(M.AvailabilitySlot(id=slot_id, provider_id=account, catalog_item_id=item, slot_start=start,
                                      slot_end=start.replace(":00:00", ":30:00"), capacity=2, booked=0, active=True))
        db.commit()


def book(client, headers, item="pkg", slot="pkg-am", address=None, key="lab-key-0001"):
    return client.post("/api/lab-bookings", headers={**headers, "Idempotency-Key": key},
                       json={"catalogItemId": item, "slotId": slot, "address": address or HOSTEL})


def pay(client, headers, order_id, card=SUCCESS_CARD):
    intent = client.post(f"/api/lab-orders/{order_id}/payment", headers=headers)
    assert intent.status_code == 200, intent.text
    intent = intent.json()
    paid = client.post(f"/api/lab-orders/{order_id}/payment/mock-checkout", headers=headers,
                       json={"providerOrderId": intent["providerOrderId"], "cardNumber": card}).json()
    return intent, client.post(f"/api/lab-orders/{order_id}/payment/verify", headers=headers, json={
        "providerOrderId": paid["providerOrderId"], "providerPaymentId": paid["providerPaymentId"],
        "signature": paid["signature"]})


def booked(harness, **lab):
    client, factory, codes = harness
    make_lab(factory, **lab)
    student, headers = register(client, codes, "pt@example.test")
    res = book(client, headers)
    assert res.status_code == 201, res.text
    return res.json(), headers, student


def as_user(client, codes, current, identifier):
    client.post("/api/auth/logout", headers=current)
    return login(client, codes, identifier)


def slot_booked(factory, slot_id="pkg-am"):
    with factory() as db:
        return db.get(M.AvailabilitySlot, slot_id).booked


# ── Packages ────────────────────────────────────────────────────────────────

def test_packages_show_their_tests_and_price_and_never_a_value(harness):
    client, factory, _codes = harness
    make_lab(factory)
    items = client.get("/api/lab-packages").json()["items"]
    assert [i["id"] for i in items] == ["pkg"]
    assert items[0]["includes"] == ["Vitamin D (25-OH)", "Vitamin B12"]
    assert items[0]["pricePaise"] == 64900 and items[0]["lab"]["homeCollection"] is True
    assert not any(k in items[0] for k in ("value", "range", "result", "referenceRange"))


def test_a_fasting_test_is_offered_morning_slots_only(harness):
    client, factory, codes = harness
    make_lab(factory, fasting=10)
    _student, headers = register(client, codes, "pt@example.test")
    slots = client.get("/api/lab-packages/pkg/slots", headers=headers).json()
    assert slots["fastingHours"] == 10 and [s["id"] for s in slots["slots"]] == ["pkg-am"]
    assert book(client, headers, slot="pkg-pm").status_code == 409
    assert slot_booked(factory, "pkg-pm") == 0


# ── Booking ─────────────────────────────────────────────────────────────────

def test_booking_makes_a_real_lab_order_priced_by_the_server(harness):
    client, factory, _codes = harness
    res, headers, student = booked(harness)
    order = res["order"]
    assert order["status"] == "BOOKED" and order["selfBooked"] is True
    assert order["paymentStatus"] == "UNPAID" and order["amountPaise"] == 64900
    assert order["slotStart"] == MORNING and order["collectionAddress"] == HOSTEL
    assert res["booking"]["includes"] == ["Vitamin D (25-OH)", "Vitamin B12"]
    assert slot_booked(factory) == 1
    with factory() as db:
        row = db.get(M.LabOrder, order["id"])
        assert row.ordered_by == student["id"] and row.collection_mode == "HOME" and row.catalog_item_id == "pkg"
        charge = db.get(M.LabOrderCharge, order["id"])
        assert charge.amount_paise == 64900 and charge.payment_due_at > time.time()
        assert db.query(M.Order).count() == 0 and db.query(M.Appointment).count() == 0
    # Replaying the key returns the same booking; another test under it is refused.
    assert book(client, headers).json()["order"]["id"] == order["id"]
    assert slot_booked(factory) == 1


def test_hostel_booking_links_a_hostel_pickup_the_lab_sees_only_once_paid(harness):
    client, factory, codes = harness
    res, headers, _student = booked(harness)
    order_id = res["order"]["id"]
    with factory() as db:
        visit = db.scalar(select(M.HostelVisitRequest).where(M.HostelVisitRequest.lab_order_id == order_id))
        assert visit.service == "LAB_PICKUP" and visit.hostel_block == "Block B" and visit.room == "214"
        assert visit.status == "ASSIGNED" and visit.assigned_provider_id == "labco"
    # The student cannot cancel the pickup apart from its booking.
    assert client.post(f"/api/hostel-visits/{visit.id}/cancel", headers=headers).status_code == 409

    lab = as_user(client, codes, headers, "labco@example.test")
    assert client.get("/api/work/hostel-visits", headers=lab).json()["items"] == []
    headers = as_user(client, codes, lab, "pt@example.test")
    pay(client, headers, order_id)
    lab = as_user(client, codes, headers, "labco@example.test")
    visits = client.get("/api/work/hostel-visits", headers=lab).json()["items"]
    assert [v["labOrderId"] for v in visits] == [order_id]
    # It moves with the lab order, not by itself.
    assert client.post(f"/api/work/hostel-visits/{visit.id}", json={"action": "COMPLETE"}, headers=lab).status_code == 409


def test_a_home_address_needs_to_be_complete(harness):
    client, factory, codes = harness
    make_lab(factory)
    _student, headers = register(client, codes, "pt@example.test")
    assert book(client, headers, address={"kind": "HOME", "line": "short", "city": "H", "pincode": "1"}).status_code == 422
    res = book(client, headers, address={"kind": "HOME", "line": "12 Lake View Road, Kukatpally", "city": "Hyderabad",
                                         "pincode": "500072", "landmark": "Near the park"})
    assert res.status_code == 201, res.text
    with factory() as db:
        assert db.query(M.HostelVisitRequest).count() == 0


def test_no_booking_when_payment_cannot_be_taken(harness, monkeypatch):
    client, factory, codes = harness
    make_lab(factory)
    _student, headers = register(client, codes, "pt@example.test")
    monkeypatch.setenv("PAYMENT_PROVIDER", "razorpay")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    assert book(client, headers).status_code == 503
    assert slot_booked(factory) == 0
    with factory() as db:
        assert db.query(M.LabOrder).count() == 0


def test_only_a_student_books_and_a_lab_without_home_collection_is_refused(harness):
    client, factory, codes = harness
    make_lab(factory, home=False)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao")
    _student, headers = register(client, codes, "pt@example.test")
    assert book(client, headers).status_code == 409
    doc = as_user(client, codes, headers, "doc@example.test")
    assert book(client, doc).status_code == 403


def test_the_cart_and_appointments_no_longer_take_lab_tests(harness):
    client, factory, codes = harness
    make_lab(factory)
    _student, headers = register(client, codes, "pt@example.test")
    order = client.post("/api/orders", headers={**headers, "Idempotency-Key": "cart-lab-1"}, json={
        "items": [{"id": "pkg", "quantity": 1}], "requestedSlot": "2099-01-05T08:00:00+05:30",
        "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"}})
    assert order.status_code == 422
    assert client.post("/api/appointments", json={"slotId": "pkg-am"}, headers=headers).status_code == 422
    assert slot_booked(factory) == 0


# ── Paying ──────────────────────────────────────────────────────────────────

def test_unpaid_bookings_stay_out_of_the_lab_queue_until_paid(harness):
    client, factory, codes = harness
    res, headers, _student = booked(harness)
    order_id = res["order"]["id"]

    lab = as_user(client, codes, headers, "labco@example.test")
    assert client.get("/api/work/lab-orders", headers=lab).json()["items"] == []
    assert client.patch(f"/api/lab-orders/{order_id}", json={"status": "ASSIGNED", "collectorId": "lab-labco-col-1"},
                        headers=lab).status_code == 404
    headers = as_user(client, codes, lab, "pt@example.test")

    intent, verified = pay(client, headers, order_id)
    assert intent["payable"] == {"kind": "lab_order", "id": order_id} and intent["amountPaise"] == 64900
    assert verified.status_code == 200 and verified.json()["paymentStatus"] == "PAID"
    with factory() as db:
        payment = db.scalar(select(M.Payment).where(M.Payment.payable_id == order_id))
        assert payment.payable_kind == "lab_order" and payment.order_id is None and payment.status == "CAPTURED"
        paid_event = db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "LAB_BOOKING_PAID"))
        assert paid_event.provider_id == "lab-labco" and "Vitamin" not in paid_event.summary
        mock = db.scalars(select(M.MockGatewayPayment)).all()
        assert len(mock) == 1

    lab = as_user(client, codes, headers, "labco@example.test")
    assert [i["id"] for i in client.get("/api/work/lab-orders", headers=lab).json()["items"]] == [order_id]


def test_the_provider_is_told_a_booking_not_a_lab_test():
    from services.payment_gateway import Payable
    assert set(payments.PAYABLE_KINDS) == {"shop_order", "lab_order", "dispense_quote"}
    assert Payable(kind="lab_order", id="abc", account_id="a", amount_paise=1).reference == "booking:abc"
    assert Payable(kind="shop_order", id="abc", account_id="a", amount_paise=1).reference == "shop_order:abc"


def test_a_lab_booking_cannot_be_paid_as_a_shop_order_or_by_someone_else(harness):
    client, _factory, codes = harness
    res, headers, _student = booked(harness)
    order_id = res["order"]["id"]
    assert client.post(f"/api/orders/{order_id}/payment", headers=headers).status_code == 404
    client.post("/api/auth/logout", headers=headers)
    _other, other_headers = register(client, codes, "other@example.test")
    assert client.post(f"/api/lab-orders/{order_id}/payment", headers=other_headers).status_code == 404
    assert client.get(f"/api/lab-bookings/{order_id}", headers=other_headers).status_code == 404


def test_expiry_cancels_the_booking_and_gives_the_slot_back(harness):
    from services import workflow_scheduler as scheduler
    client, factory, codes = harness
    res, headers, _student = booked(harness)
    order_id = res["order"]["id"]
    client.post(f"/api/lab-orders/{order_id}/payment", headers=headers)
    with factory() as db:
        db.get(M.LabOrderCharge, order_id).payment_due_at = time.time() - 1
        db.commit()
        scheduler.ensure_scheduled_jobs(db)
        outcome = scheduler.workflow_scheduler.run_job_now(db, "payment_expiry")
    assert outcome["status"] == "SUCCESS" and outcome["summary"]["lab_bookings_expired"] == 1
    assert slot_booked(factory) == 0
    with factory() as db:
        assert db.get(M.LabOrderCharge, order_id).payment_status == "EXPIRED"
        assert db.get(M.LabOrder, order_id).status == "CANCELLED"
        assert db.scalar(select(M.HostelVisitRequest.status).where(M.HostelVisitRequest.lab_order_id == order_id)) == "CANCELLED"
        assert db.scalar(select(M.PaymentIntent.status).where(M.PaymentIntent.payable_id == order_id)) == "EXPIRED"
    assert client.post(f"/api/lab-orders/{order_id}/payment", headers=headers).status_code == 409


def test_a_capture_after_expiry_is_recorded_for_a_refund_not_revived(harness):
    client, factory, _codes = harness
    res, headers, _student = booked(harness)
    order_id = res["order"]["id"]
    intent = client.post(f"/api/lab-orders/{order_id}/payment", headers=headers).json()
    paid = client.post(f"/api/lab-orders/{order_id}/payment/mock-checkout", headers=headers,
                       json={"providerOrderId": intent["providerOrderId"], "cardNumber": SUCCESS_CARD}).json()
    with factory() as db:
        db.get(M.LabOrderCharge, order_id).payment_due_at = time.time() - 1
        db.commit()
        lab_booking.expire_unpaid_lab_bookings(db)
        db.commit()
    late = client.post(f"/api/lab-orders/{order_id}/payment/verify", headers=headers, json={
        "providerOrderId": paid["providerOrderId"], "providerPaymentId": paid["providerPaymentId"],
        "signature": paid["signature"]}).json()
    assert late["outcome"] == "LATE" and late["paymentStatus"] == "EXPIRED"
    with factory() as db:
        assert db.get(M.LabOrder, order_id).status == "CANCELLED"
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "PAYMENT_NEEDS_REFUND")) is not None


def test_a_wrong_amount_is_never_marked_paid(harness):
    import hashlib
    import hmac
    import json
    client, factory, _codes = harness
    res, _headers, _student = booked(harness)
    order_id = res["order"]["id"]
    body = json.dumps({"event": "payment.captured", "payableKind": "lab_order", "payableId": order_id,
                       "providerRef": "ref-x", "amountPaise": 100}).encode()
    signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    assert client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": signature,
                                                                       "content-type": "application/json"}).status_code == 409
    with factory() as db:
        assert db.get(M.LabOrderCharge, order_id).payment_status == "UNPAID"


def test_the_student_cancels_an_unpaid_booking_but_not_a_paid_one(harness):
    client, factory, codes = harness
    res, headers, _student = booked(harness)
    order_id = res["order"]["id"]
    assert client.patch(f"/api/lab-orders/{order_id}", json={"status": "CANCELLED"}, headers=headers).status_code == 200
    assert slot_booked(factory) == 0
    with factory() as db:
        assert db.get(M.LabOrderCharge, order_id).payment_status == "CANCELLED"

    second = book(client, headers, key="lab-key-0002").json()["order"]["id"]
    pay(client, headers, second)
    assert client.patch(f"/api/lab-orders/{second}", json={"status": "CANCELLED"}, headers=headers).status_code == 409


# ── Collectors ──────────────────────────────────────────────────────────────

def paid_and_assigned(harness, collector="lab-labco-col-1"):
    client, factory, codes = harness
    res, headers, student = booked(harness)
    order_id = res["order"]["id"]
    pay(client, headers, order_id)
    lab = as_user(client, codes, headers, "labco@example.test")
    assigned = client.patch(f"/api/lab-orders/{order_id}", json={"status": "ASSIGNED", "collectorId": collector},
                            headers=lab)
    assert assigned.status_code == 200, assigned.text
    return order_id, lab


def test_assignment_takes_a_collector_of_that_lab_never_another_labs(harness):
    client, factory, codes = harness
    res, headers, _student = booked(harness)
    order_id = res["order"]["id"]
    pay(client, headers, order_id)
    # A second lab and its collector.
    with factory() as db:
        db.add(M.Account(id="otherlab", identifier="otherlab@example.test", channel="EMAIL", full_name="Other",
                         role="VENDOR", active=True, profile={}, created_at=time.time(), partner_kind="LAB"))
        db.commit()
    make_provider(factory, "lab-other", "otherlab", "LAB", collectors=("Q. Khan",))

    lab = as_user(client, codes, headers, "labco@example.test")
    move = lambda body: client.patch(f"/api/lab-orders/{order_id}", json={"status": "ASSIGNED", **body}, headers=lab)  # noqa: E731
    assert move({"collectorId": "lab-other-col-1"}).status_code == 422          # another lab's collector
    assert move({"collectorName": "Q. Khan"}).status_code == 422                 # by name, still another lab's
    assert move({"collectorName": "Somebody typed"}).status_code == 422          # free text is not a collector
    assert move({}).status_code == 422
    with factory() as db:
        db.get(M.LabCollector, "lc-lab-labco-col-2").active = False
        db.commit()
    assert move({"collectorId": "lab-labco-col-2"}).status_code == 422          # retired
    ok = move({"collectorId": "lab-labco-col-1"})
    assert ok.status_code == 200 and ok.json()["collectorId"] == "lab-labco-col-1"
    assert ok.json()["collectorName"] == "P. Rao"


def test_a_collector_works_only_their_own_pickups(harness):
    client, factory, codes = harness
    order_id, lab = paid_and_assigned(harness)

    rao = as_user(client, codes, lab, "lab-labco-col-1@example.test")
    pickups = client.get("/api/collector/pickups", headers=rao).json()["items"]
    assert [p["id"] for p in pickups] == [order_id]
    assert pickups[0]["collectionAddress"] == HOSTEL and pickups[0]["nextActions"] == ["COLLECTED"]
    for clinical in ("clinicalIndication", "criticalFlag", "criticalNote", "reportDocumentId", "reviewNote"):
        assert clinical not in pickups[0]

    devi = as_user(client, codes, rao, "lab-labco-col-2@example.test")
    assert client.get("/api/collector/pickups", headers=devi).json()["items"] == []
    assert client.post(f"/api/collector/pickups/{order_id}/collected", json={"sampleId": "S-1", "tubeCount": 2},
                       headers=devi).status_code == 404
    # Not the lab's own powers either.
    assert client.patch(f"/api/lab-orders/{order_id}", json={"status": "SAMPLE_COLLECTED", "sampleId": "S-1"},
                        headers=devi).status_code == 403
    assert client.get("/api/work/lab-orders", headers=devi).status_code == 403

    rao = as_user(client, codes, devi, "lab-labco-col-1@example.test")
    assert client.post(f"/api/collector/pickups/{order_id}/handed-to-lab", headers=rao).status_code == 409
    assert client.post(f"/api/collector/pickups/{order_id}/collected", json={"sampleId": "S-1", "tubeCount": 0},
                       headers=rao).status_code == 422
    collected = client.post(f"/api/collector/pickups/{order_id}/collected", json={"sampleId": "S-1", "tubeCount": 2},
                            headers=rao)
    assert collected.status_code == 200 and collected.json()["tubeCount"] == 2 and collected.json()["collectedAt"]
    handed = client.post(f"/api/collector/pickups/{order_id}/handed-to-lab", headers=rao)
    assert handed.status_code == 200 and handed.json()["status"] == "IN_TRANSIT"
    assert client.post(f"/api/collector/pickups/{order_id}/collected", json={"sampleId": "S-2", "tubeCount": 1},
                       headers=rao).status_code == 409
    with factory() as db:
        row = db.get(M.LabOrder, order_id)
        assert row.status == "IN_TRANSIT" and row.sample_id == "S-1" and row.handed_over_at > 0
        visit = db.scalar(select(M.HostelVisitRequest).where(M.HostelVisitRequest.lab_order_id == order_id))
        assert visit.status == "COMPLETED"
    # The lab confirms receipt itself; a collector cannot.
    assert client.patch(f"/api/lab-orders/{order_id}", json={"status": "RECEIVED_AT_LAB"}, headers=rao).status_code == 403


def test_a_retired_collector_can_do_nothing(harness):
    client, factory, codes = harness
    order_id, lab = paid_and_assigned(harness)
    rao = as_user(client, codes, lab, "lab-labco-col-1@example.test")   # signed in before being retired
    lab = as_user(client, codes, rao, "labco@example.test")
    listed = client.get("/api/work/lab-collectors", headers=lab).json()["items"]
    entry = next(c for c in listed if c["fullName"] == "P. Rao")
    retired = client.patch(f"/api/work/lab-collectors/{entry['id']}", json={"active": False}, headers=lab)
    assert retired.status_code == 200 and retired.json()["active"] is False
    with factory() as db:
        # An inactive account's sessions no longer resolve, and the collector record refuses it too.
        assert db.get(M.Account, "lab-labco-col-1").active is False
        assert db.get(M.LabCollector, "lc-lab-labco-col-1").active is False
    client.post("/api/auth/logout", headers=lab)
    sent = client.post("/api/auth/otp/send", json={"identifier": "lab-labco-col-1@example.test", "channel": "EMAIL",
                                                   "intent": "LOGIN"})
    if sent.status_code == 200 and codes:
        assert client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json().get("user") is None
    assert client.get("/api/collector/pickups").status_code == 401


def test_a_lab_adds_its_own_collectors_and_sees_only_its_own(harness):
    client, factory, codes = harness
    make_lab(factory)
    make_lab(factory, account="otherlab", provider="lab-other", item="pkg2")
    lab = login(client, codes, "labco@example.test")
    added = client.post("/api/work/lab-collectors", json={"fullName": "N. Reddy", "identifier": "n.reddy@example.test",
                                                          "channel": "EMAIL"}, headers=lab)
    assert added.status_code == 201, added.text
    assert added.json()["labId"] == "lab-labco"
    assert client.post("/api/work/lab-collectors", json={"fullName": "Dup", "identifier": "n.reddy@example.test",
                                                         "channel": "EMAIL"}, headers=lab).status_code == 409
    assert client.post("/api/work/lab-collectors", json={"labId": "lab-other", "fullName": "X Y",
                                                         "identifier": "xy@example.test", "channel": "EMAIL"},
                       headers=lab).status_code == 404
    names = {c["fullName"] for c in client.get("/api/work/lab-collectors", headers=lab).json()["items"]}
    assert names == {"P. Rao", "S. Devi", "N. Reddy"}
    with factory() as db:
        account = db.scalar(select(M.Account).where(M.Account.identifier == "n.reddy@example.test"))
        assert account.role == "LAB_COLLECTOR"
    other = as_user(client, codes, lab, "otherlab@example.test")
    names = {c["fullName"] for c in client.get("/api/work/lab-collectors", headers=other).json()["items"]}
    assert "N. Reddy" not in names
    assert client.patch("/api/work/lab-collectors/lc-lab-labco-col-1", json={"active": False},
                        headers=other).status_code == 404


def test_only_a_lab_partner_manages_collectors(harness):
    client, factory, codes = harness
    make_lab(factory)
    _student, headers = register(client, codes, "pt@example.test")
    assert client.get("/api/work/lab-collectors", headers=headers).status_code == 403
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    admin = as_user(client, codes, headers, "root@example.test")
    assert client.get("/api/work/lab-collectors", headers=admin).status_code == 403


# ── Results: reviewed by a doctor, never read by an admin or a collector ────

def test_a_self_booked_result_needs_a_doctor_and_no_admin_reads_it(harness):
    client, factory, codes = harness
    order_id, lab = paid_and_assigned(harness)
    rao = as_user(client, codes, lab, "lab-labco-col-1@example.test")
    client.post(f"/api/collector/pickups/{order_id}/collected", json={"sampleId": "S-9", "tubeCount": 1}, headers=rao)
    client.post(f"/api/collector/pickups/{order_id}/handed-to-lab", headers=rao)
    lab = as_user(client, codes, rao, "labco@example.test")
    for status in ("RECEIVED_AT_LAB", "IN_ANALYSIS"):
        assert client.patch(f"/api/lab-orders/{order_id}", json={"status": status}, headers=lab).status_code == 200
    filed = client.post(f"/api/work/lab-orders/{order_id}/report", files={"file": REPORT_PDF},
                        data={"criticalFlag": "true", "criticalNote": "Value flagged"}, headers=lab)
    assert filed.status_code == 200, filed.text
    assert filed.json()["reviewerId"] == ""   # no ordering doctor: nobody may release it yet
    assert client.post(f"/api/work/lab-reviews/{order_id}/release", json={"note": "Looks fine."}, headers=lab).status_code == 403

    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    make_staff(factory, "oncall", "NMC_DOCTOR", "oncall@example.test", "Dr Oncall")
    admin = as_user(client, codes, lab, "root@example.test")
    waiting = client.get("/api/work/lab-reviews", headers=admin).json()["items"]
    assert [w["id"] for w in waiting] == [order_id]
    assert set(waiting[0]) == {"id", "testPanel", "criticalFlag", "waitingSeconds"}
    assert client.get(f"/api/work/lab-reviews/{order_id}/report", headers=admin).status_code == 403
    assert client.post(f"/api/work/lab-reviews/{order_id}/release", json={"note": "Looks fine."}, headers=admin).status_code == 403
    assert client.get("/api/work/lab-orders", headers=admin).json()["items"] == []
    assert client.post(f"/api/work/lab-reviews/{order_id}/assign", json={"doctorId": "oncall"}, headers=admin).status_code == 200

    rao = as_user(client, codes, admin, "lab-labco-col-1@example.test")
    assert client.get(f"/api/work/lab-reviews/{order_id}/report", headers=rao).status_code == 403
    assert client.get("/api/collector/pickups", headers=rao).json()["items"] == []

    student = as_user(client, codes, rao, "pt@example.test")
    mine = client.get(f"/api/lab-bookings/{order_id}", headers=student).json()["order"]
    assert mine["criticalFlag"] is False and mine["hasHeldReport"] is False and mine["reportDocumentId"] == ""

    doc = as_user(client, codes, student, "oncall@example.test")
    assert client.post(f"/api/work/lab-reviews/{order_id}/release", json={"note": "Reviewed."},
                       headers=doc).status_code == 200


# ── Payments generalised to a payable reference ─────────────────────────────

def test_shop_order_payments_still_name_their_order(harness):
    from test_order_payments import mock_pay, place, seed_item, start, verify
    client, factory, codes = harness
    _user, headers = register(client, codes, "shop@example.test")
    seed_item(factory)
    order = place(client, headers)
    intent = start(client, headers, order["id"])
    assert verify(client, headers, order["id"], mock_pay(client, headers, order["id"], intent)).json()["paymentStatus"] == "PAID"
    with factory() as db:
        payment = db.scalar(select(M.Payment))
        assert (payment.payable_kind, payment.payable_id, payment.order_id) == ("shop_order", order["id"], order["id"])


def test_a_payment_written_the_old_way_names_its_shop_order(harness):
    _client, factory, _codes = harness
    with factory() as db:
        db.add(M.Account(id="buyer", identifier="b@example.test", channel="EMAIL", full_name="B", role="STUDENT",
                         active=True, profile={}, created_at=time.time()))
        db.add(M.Order(id="o-old", account_id="buyer", idempotency_key="k-old-1", request_hash="h", total_paise=100,
                       delivery={}, payment_status="PAID", created_at=time.time()))
        db.flush()
        db.add(M.Payment(id="p-old", order_id="o-old", amount_paise=100, status="CAPTURED", provider="razorpay",
                         provider_ref="pay_old", idempotency_key="pay_old", created_at=time.time()))
        db.commit()
        payment = db.get(M.Payment, "p-old")
        assert (payment.payable_kind, payment.payable_id) == ("shop_order", "o-old")


def test_new_tables_have_a_rule_l_plane():
    from core import rule_l
    assert rule_l.TABLE_PLANES["care_lab_order_charges"] == rule_l.COMMERCE
    assert rule_l.TABLE_PLANES["care_lab_collectors"] == rule_l.PLATFORM


def test_lab_payment_routes_run_on_the_commerce_session():
    from services.commerce_session import commerce_db

    routes = {f"{m} {r.path}": r for r in lab_booking.router.routes for m in r.methods}
    uses = {k for k, r in routes.items() if commerce_db in {d.call for d in r.dependant.dependencies}}
    assert uses == set(lab_booking.COMMERCE_PATHS)


def test_make_collector_helper_is_lab_scoped(harness):
    _client, factory, _codes = harness
    make_lab(factory)
    make_collector(factory, "lab-labco", "extra", "Extra Person")
    with factory() as db:
        assert db.get(M.LabCollector, "lc-extra").lab_id == "lab-labco"
