"""A student books a lab test from the shop: slot held, collection address, paid like an order.

Asserts the rules, not the happy path alone: student accounts only; a slot that
is full, taken, past or not this test's is refused; the address must fit the
collection mode; someone else's booking is out of reach; an unpaid booking is
never in the lab's queue and gives its slot back when its order expires or is
cancelled; the collection address reaches only the patient and that lab; and no
clinical payload ever carries a price.
"""
import hashlib
import hmac
import json
import time

import pytest
from test_clinical_fulfilment import (
    SUCCESS_CARD,
    book_lab_test,
    lab_booking_body,
    make_provider,
    make_staff,
    pay_for_booking,
    put_in_care,
    seed_lab_test,
)
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import workflow_scheduler as scheduler

DECLINED = "4000 0000 0000 0002"
HOSTEL = {"hostelBlock": "Block B", "hostelRoom": "214"}
HOME = {"addressLine1": "12 Lake View Road", "addressLine2": "Near the clock tower", "pincode": "500081"}
PRICE_WORDS = ("price", "paise", "amount", "mrp")


@pytest.fixture(autouse=True)
def _mock_provider(monkeypatch):
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")


def setup_lab(factory, home=True, capacity=5):
    make_staff(factory, "labco", "VENDOR", "labco@example.test", "Vijaya Diagnostics")
    make_provider(factory, "lab-1", "labco", "LAB", legal_name="Vijaya Diagnostics", home_collection=home)
    seed_lab_test(factory, name="Vitamin D + B12", price=64900, capacity=capacity)


def student(harness, identifier="stu@example.test"):
    client, _factory, codes = harness
    return register(client, codes, identifier)


def keys_in(value, path=""):
    """Every key anywhere in a JSON value."""
    if isinstance(value, dict):
        for key, inner in value.items():
            yield key
            yield from keys_in(inner)
    elif isinstance(value, list):
        for inner in value:
            yield from keys_in(inner)


def assert_no_price(payload):
    leaked = [k for k in keys_in(payload) if any(word in k.lower() for word in PRICE_WORDS)]
    assert not leaked, leaked


def signed_webhook(client, payload):
    body = json.dumps(payload).encode()
    signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    return client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": signature})


def lab_queue(client, codes, identifier="labco@example.test"):
    headers = login(client, codes, identifier)
    return client.get("/api/work/lab-orders", headers=headers).json(), headers


# ── Happy path ────────────────────────────────────────────────────────────────

def test_a_student_books_pays_and_only_then_the_lab_sees_it_with_the_hostel_room(harness):
    client, factory, codes = harness
    setup_lab(factory)
    patient, headers = student(harness)

    options = client.get("/api/lab-tests/cbc-test/booking-options", headers=headers)
    assert options.status_code == 200, options.text
    assert options.json()["homeCollection"] is True and [s["id"] for s in options.json()["slots"]] == ["lab-slot-1"]
    assert_no_price(options.json())

    booked = book_lab_test(client, headers, lab_booking_body(mode="HOSTEL", **HOSTEL))
    assert booked.status_code == 201, booked.text
    booking = booked.json()
    assert booking["status"] == "PENDING_PAYMENT" and booking["labName"] == "Vijaya Diagnostics"
    assert booking["collectionMode"] == "HOSTEL" and booking["collectionAddress"] == {"hostelBlock": "Block B", "room": "214"}
    assert booking["testPanel"] == ["Vitamin D + B12"] and booking["paymentOrderId"]
    assert_no_price(booking)
    with factory() as db:
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 1   # held before any money moves
        order = db.get(M.Order, booking["paymentOrderId"])
        assert order.purpose == "lab_booking" and order.total_paise == 64900 and order.payment_status == "UNPAID"
        # The commerce order carries nothing clinical: no slot, no address, no indication.
        assert order.delivery == {"mode": "lab_collection"} and order.requested_slot == ""

    queue, _lab = lab_queue(client, codes)
    assert queue["total"] == 0, "an unpaid booking must never reach the lab"
    student_headers = login(client, codes, "stu@example.test")

    intent = client.post(f"/api/orders/{booking['paymentOrderId']}/payment", headers=student_headers).json()
    assert intent["amountPaise"] == 64900 and intent["testMode"] is True   # the payer sees the price on the commerce side
    verified = pay_for_booking(client, student_headers, booking["paymentOrderId"])
    assert verified.status_code == 200 and verified.json()["outcome"] == "PAID", verified.text

    mine = client.get("/api/lab-orders", headers=student_headers).json()["items"]
    assert mine[0]["status"] == "BOOKED" and mine[0]["slotStart"].startswith("2099-01-05")

    queue, lab = lab_queue(client, codes)
    assert queue["total"] == 1
    item = queue["items"][0]
    assert item["id"] == booking["id"] and item["collectionAddress"] == {"hostelBlock": "Block B", "room": "214"}
    assert_no_price(queue)
    with factory() as db:
        events = db.query(M.OpsEvent).filter(M.OpsEvent.resource_id == booking["id"],
                                             M.OpsEvent.kind == "LAB_ORDER_BOOKED").all()
        assert [e.provider_id for e in events] == ["lab-1"]
        assert "Vitamin" not in events[0].summary   # counts and states only
        assert db.query(M.OutboxEvent).filter(M.OutboxEvent.account_id == patient["id"],
                                              M.OutboxEvent.event_type == "LAB_BOOKING_CONFIRMED").count() == 1

    # The lab works it as any other lab order.
    step = client.patch(f"/api/lab-orders/{booking['id']}", json={"status": "ASSIGNED", "collectorName": "P. Rao"},
                        headers=lab)
    assert step.status_code == 200 and step.json()["collectionAddress"]["room"] == "214"
    assert_no_price(step.json())


def test_home_collection_keeps_the_address_and_a_walk_in_has_none(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    home = book_lab_test(client, headers, lab_booking_body(mode="HOME", **HOME))
    assert home.status_code == 201, home.text
    assert home.json()["collectionAddress"] == {"line1": "12 Lake View Road", "line2": "Near the clock tower",
                                                "pincode": "500081"}
    walk_in = book_lab_test(client, headers, lab_booking_body(), key="lab-booking-key-2")
    assert walk_in.status_code == 201 and walk_in.json()["collectionAddress"] is None
    with factory() as db:
        row = db.get(M.LabOrder, home.json()["id"])
        assert (row.collection_address_line1, row.collection_pincode) == ("12 Lake View Road", "500081")


def test_a_webhook_settlement_also_releases_the_booking(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body()).json()
    payload = {"event": "payment.settled", "orderId": booking["paymentOrderId"], "providerRef": "ref-lab-1",
               "amountPaise": 64900}
    assert signed_webhook(client, payload).status_code == 200
    with factory() as db:
        assert db.get(M.LabOrder, booking["id"]).status == "BOOKED"


def test_a_replayed_request_returns_the_same_booking_and_holds_one_place(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    first = book_lab_test(client, headers, lab_booking_body())
    again = book_lab_test(client, headers, lab_booking_body())
    assert first.status_code == 201 and again.status_code in (200, 201)
    assert again.json()["id"] == first.json()["id"]
    other = book_lab_test(client, headers, lab_booking_body(mode="HOSTEL", **HOSTEL))
    assert other.status_code == 409   # same key, different booking
    with factory() as db:
        assert db.query(M.LabOrder).count() == 1 and db.query(M.Order).count() == 1
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 1


# ── Who may book ──────────────────────────────────────────────────────────────

@pytest.mark.parametrize("role", ["VENDOR", "NMC_DOCTOR", "SUPER_ADMIN", "CAMPUS_ADMIN", "COUNSELLOR"])
def test_only_a_student_account_can_book(harness, role):
    client, factory, codes = harness
    setup_lab(factory)
    make_staff(factory, "someone", role, "someone@example.test")
    headers = login(client, codes, "someone@example.test")
    assert book_lab_test(client, headers, lab_booking_body()).status_code == 403
    assert client.get("/api/lab-tests/cbc-test/booking-options", headers=headers).status_code == 403
    with factory() as db:
        assert db.query(M.LabOrder).count() == 0 and db.query(M.Order).count() == 0
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 0


def test_signed_out_cannot_book(harness):
    client, factory, _codes = harness
    setup_lab(factory)
    assert client.post("/api/lab-orders", json=lab_booking_body(), headers={"Idempotency-Key": "anon-key-1"}).status_code in (401, 403)


def test_without_a_payment_provider_nothing_is_booked_or_held(harness, monkeypatch):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    monkeypatch.setenv("PAYMENT_PROVIDER", "razorpay")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)
    res = book_lab_test(client, headers, lab_booking_body())
    assert res.status_code == 503 and "nothing was booked" in res.json()["detail"].lower()
    with factory() as db:
        assert db.query(M.LabOrder).count() == 0 and db.query(M.Order).count() == 0
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 0


# ── Slots ─────────────────────────────────────────────────────────────────────

def test_a_full_past_or_foreign_slot_is_refused(harness):
    client, factory, codes = harness
    setup_lab(factory)
    seed_lab_test(factory, item_id="other-test", name="Lipid profile", slot_id="other-slot")
    with factory() as db:
        db.add(M.AvailabilitySlot(id="full", provider_id="labco", catalog_item_id="cbc-test",
                                  slot_start="2099-01-06T08:00:00+05:30", slot_end="2099-01-06T08:30:00+05:30",
                                  capacity=1, booked=1, active=True))
        db.add(M.AvailabilitySlot(id="past", provider_id="labco", catalog_item_id="cbc-test",
                                  slot_start="2020-01-06T08:00:00+05:30", slot_end="2020-01-06T08:30:00+05:30",
                                  capacity=3, booked=0, active=True))
        db.add(M.AvailabilitySlot(id="off", provider_id="labco", catalog_item_id="cbc-test",
                                  slot_start="2099-01-07T08:00:00+05:30", slot_end="2099-01-07T08:30:00+05:30",
                                  capacity=3, booked=0, active=False))
        db.commit()
    _patient, headers = student(harness)
    for index, (slot, expected) in enumerate([("full", 409), ("past", 409), ("off", 404), ("other-slot", 404),
                                              ("missing", 404)]):
        res = book_lab_test(client, headers, lab_booking_body(slot_id=slot), key=f"slot-key-{index}")
        assert res.status_code == expected, (slot, res.text)
    assert book_lab_test(client, headers, lab_booking_body(item_id="no-such-test"), key="slot-key-x").status_code == 404
    with factory() as db:
        assert db.query(M.LabOrder).count() == 0 and db.query(M.Order).count() == 0
        assert db.get(M.AvailabilitySlot, "full").booked == 1


def test_the_last_place_goes_to_one_student_only(harness):
    client, factory, codes = harness
    setup_lab(factory, capacity=1)
    _first, first = student(harness, "first@example.test")
    assert book_lab_test(client, first, lab_booking_body()).status_code == 201
    client.post("/api/auth/logout", headers=first)
    _second, second = student(harness, "second@example.test")
    taken = book_lab_test(client, second, lab_booking_body(), key="lab-booking-key-9")
    assert taken.status_code == 409
    options = client.get("/api/lab-tests/cbc-test/booking-options", headers=second).json()
    assert options["slots"] == []
    with factory() as db:
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 1 and db.query(M.LabOrder).count() == 1


# ── Address validation ────────────────────────────────────────────────────────

@pytest.mark.parametrize("mode,address", [
    ("HOME", {}),
    ("HOME", {"addressLine1": "12 Lake View Road"}),
    ("HOME", {"addressLine1": "12 Lake View Road", "pincode": "012345"}),
    ("HOME", {"addressLine1": "12 Lake View Road", "pincode": "50008"}),
    ("HOME", {"addressLine1": "12 Lake View Road", "pincode": "5000811"}),
    ("HOME", {"addressLine1": "12 Lake View Road", "pincode": "50008a"}),
    ("HOME", {"addressLine1": "  ab ", "pincode": "500081"}),
    ("HOME", {**HOME, "hostelRoom": "214"}),
    ("HOSTEL", {}),
    ("HOSTEL", {"hostelBlock": "Block B"}),
    ("HOSTEL", {"hostelBlock": "  ", "hostelRoom": "214"}),
    ("HOSTEL", {**HOSTEL, "pincode": "500081"}),
    ("WALK_IN", {"addressLine1": "12 Lake View Road"}),
    ("WALK_IN", {"hostelRoom": "214"}),
    ("DRONE", {}),
])
def test_the_address_must_fit_the_collection_mode(harness, mode, address):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    res = book_lab_test(client, headers, lab_booking_body(mode=mode, **address))
    assert res.status_code == 422, res.text
    with factory() as db:
        assert db.query(M.LabOrder).count() == 0 and db.get(M.AvailabilitySlot, "lab-slot-1").booked == 0


# ── Someone else's booking ────────────────────────────────────────────────────

def test_someone_elses_booking_is_out_of_reach(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _owner, owner = student(harness, "owner@example.test")
    booking = book_lab_test(client, owner, lab_booking_body(mode="HOSTEL", **HOSTEL)).json()
    client.post("/api/auth/logout", headers=owner)

    _other, other = student(harness, "other@example.test")
    order_id = booking["paymentOrderId"]
    assert client.post(f"/api/orders/{order_id}/payment", headers=other).status_code == 404
    assert client.get(f"/api/orders/{order_id}/payment", headers=other).status_code == 404
    assert client.post(f"/api/orders/{order_id}/cancel", headers=other).status_code == 404
    assert client.get("/api/lab-orders", headers=other).json()["total"] == 0
    assert client.patch(f"/api/lab-orders/{booking['id']}", json={"status": "CANCELLED"}, headers=other).status_code == 403
    assert client.get(f"/api/lab-orders/{booking['id']}/slots", headers=other).status_code == 404
    # Replaying the owner's key from another account is a new request, not the owner's booking.
    replay = book_lab_test(client, other, lab_booking_body(mode="HOSTEL", **HOSTEL))
    assert replay.status_code == 201 and replay.json()["id"] != booking["id"]
    with factory() as db:
        assert db.get(M.LabOrder, booking["id"]).status == "PENDING_PAYMENT"


def test_another_lab_never_sees_the_booking_or_its_address(harness):
    client, factory, codes = harness
    setup_lab(factory)
    make_staff(factory, "otherlab", "VENDOR", "otherlab@example.test")
    make_provider(factory, "lab-2", "otherlab", "LAB", home_collection=True)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body(mode="HOME", **HOME)).json()
    pay_for_booking(client, headers, booking["paymentOrderId"])
    queue, other_lab = lab_queue(client, codes, "otherlab@example.test")
    assert queue["total"] == 0
    assert client.patch(f"/api/lab-orders/{booking['id']}", json={"status": "ASSIGNED", "collectorName": "X"},
                        headers=other_lab).status_code == 403


def test_a_doctor_and_the_platform_admin_are_not_sent_the_collection_address(harness):
    client, factory, codes = harness
    setup_lab(factory)
    patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body(mode="HOME", **HOME)).json()
    pay_for_booking(client, headers, booking["paymentOrderId"])
    with factory() as db:
        row = db.get(M.LabOrder, booking["id"])
        row.slot_start = "2020-01-05T08:00:00+05:30"   # overdue, so it is listed for chasing
        row.ordered_by = "doc"                          # as if a doctor were chasing it
        db.commit()
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    put_in_care(factory, "doc", patient["id"])
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    for identifier in ("doc@example.test", "root@example.test"):
        viewer = login(client, codes, identifier)
        chasing = client.get("/api/work/lab-orders/awaiting-collection", headers=viewer).json()["items"]
        assert chasing and all("collectionAddress" not in item for item in chasing), identifier
        assert "Lake View" not in json.dumps(chasing)
    lab = login(client, codes, "labco@example.test")
    chasing = client.get("/api/work/lab-orders/awaiting-collection", headers=lab).json()["items"]
    assert chasing[0]["collectionAddress"]["line1"] == "12 Lake View Road"


# ── An unpaid booking ─────────────────────────────────────────────────────────

def test_an_unpaid_or_declined_booking_never_reaches_the_lab(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body(mode="HOME", **HOME)).json()
    declined = pay_for_booking(client, headers, booking["paymentOrderId"], card=DECLINED)
    assert declined.status_code == 200 and declined.json()["outcome"] == "FAILED"

    queue, lab = lab_queue(client, codes)
    assert queue["total"] == 0
    assert client.get("/api/work/lab-orders?status=PENDING_PAYMENT", headers=lab).json()["total"] == 0
    assert client.get("/api/work/lab-orders/awaiting-collection", headers=lab).json()["total"] == 0
    assert client.patch(f"/api/lab-orders/{booking['id']}", json={"status": "ASSIGNED", "collectorName": "X"},
                        headers=lab).status_code == 404
    assert client.post(f"/api/work/lab-orders/{booking['id']}/report",
                       files={"file": ("r.pdf", b"%PDF-1.4 x", "application/pdf")}, headers=lab).status_code == 404
    # Nor does its line show on the vendor request queue: the lab queue is where it is worked.
    assert client.get("/api/work/requests", headers=lab).json()["total"] == 0
    with factory() as db:
        line = db.query(M.OrderLine).one()
        assert db.get(M.LabOrder, booking["id"]).status == "PENDING_PAYMENT"
    assert client.patch(f"/api/work/requests/{line.id}", json={"status": "ACCEPTED"}, headers=lab).status_code == 404

    student_headers = login(client, codes, "stu@example.test")
    # The student cannot side-step payment by moving the lab order themselves.
    res = client.patch(f"/api/lab-orders/{booking['id']}", json={"status": "CANCELLED"}, headers=student_headers)
    assert res.status_code == 409


def test_an_expired_booking_gives_its_slot_back_and_a_late_capture_does_not_revive_it(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body()).json()
    intent = client.post(f"/api/orders/{booking['paymentOrderId']}/payment", headers=headers).json()
    with factory() as db:
        assert db.get(M.Order, booking["paymentOrderId"]).payment_due_at <= time.time() + 31 * 60
        db.get(M.Order, booking["paymentOrderId"]).payment_due_at = time.time() - 1
        db.commit()
        scheduler.ensure_scheduled_jobs(db)
        outcome = scheduler.workflow_scheduler.run_job_now(db, "payment_expiry")
    assert outcome["status"] == "SUCCESS", outcome
    assert outcome["summary"]["expired"] == 1 and outcome["summary"]["lab_bookings_released"] == 1
    with factory() as db:
        assert db.get(M.LabOrder, booking["id"]).status == "UNPAID_CANCELLED"
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 0

    # The money arrives after the place was given back: recorded for a refund, never booked.
    late = signed_webhook(client, {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
                                   "providerRef": "mock_pay_late_lab", "amountPaise": 64900})
    assert late.status_code == 200 and late.json()["outcome"] == "LATE", late.text
    with factory() as db:
        assert db.get(M.LabOrder, booking["id"]).status == "UNPAID_CANCELLED"
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 0
    queue, _lab = lab_queue(client, codes)
    assert queue["total"] == 0


def test_cancelling_the_unpaid_order_releases_the_slot(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body()).json()
    assert client.post(f"/api/orders/{booking['paymentOrderId']}/cancel", headers=headers).status_code == 200
    with factory() as db:
        assert db.get(M.LabOrder, booking["id"]).status == "UNPAID_CANCELLED"
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 0
    assert client.post(f"/api/orders/{booking['paymentOrderId']}/payment", headers=headers).status_code == 409


def test_a_paid_booking_is_refunded_by_support_not_cancelled_by_the_student(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body()).json()
    pay_for_booking(client, headers, booking["paymentOrderId"])
    assert client.patch(f"/api/lab-orders/{booking['id']}", json={"status": "CANCELLED"}, headers=headers).status_code == 409
    assert client.post(f"/api/orders/{booking['paymentOrderId']}/cancel", headers=headers).status_code == 409

    lab = login(client, codes, "labco@example.test")
    assert client.patch(f"/api/lab-orders/{booking['id']}", json={"status": "CANCELLED"}, headers=lab).status_code == 200
    with factory() as db:
        assert db.get(M.AvailabilitySlot, "lab-slot-1").booked == 0
        flagged = db.query(M.OpsEvent).filter(M.OpsEvent.kind == "PAYMENT_NEEDS_REFUND").one()
        assert flagged.resource_id == booking["paymentOrderId"] and "Vitamin" not in flagged.summary


# ── Rule L ────────────────────────────────────────────────────────────────────

def test_no_clinical_payload_carries_a_price(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body(mode="HOME", **HOME))
    assert_no_price(booking.json())
    pay_for_booking(client, headers, booking.json()["paymentOrderId"])
    assert_no_price(client.get("/api/lab-orders", headers=headers).json())
    assert_no_price(client.get(f"/api/lab-orders/{booking.json()['id']}/slots", headers=headers).json())
    assert_no_price(client.get("/api/lab-tests/cbc-test/booking-options", headers=headers).json())
    queue, lab = lab_queue(client, codes)
    assert_no_price(queue)
    assert_no_price(client.get("/api/work/lab-orders/awaiting-collection", headers=lab).json())


def test_the_commerce_order_holds_no_clinical_detail(harness):
    client, factory, codes = harness
    setup_lab(factory)
    _patient, headers = student(harness)
    booking = book_lab_test(client, headers, lab_booking_body(mode="HOME", **HOME)).json()
    orders = client.get("/api/orders", headers=headers).json()["items"]
    assert len(orders) == 1 and orders[0]["purpose"] == "lab_booking"
    text = json.dumps(orders)
    for clinical in ("Lake View", "500081", "2099-01-05", "PENDING_PAYMENT", booking["id"]):
        assert clinical not in text, clinical
    with factory() as db:
        intent_text = json.dumps([[i.payable_kind, i.payable_id] for i in db.query(M.PaymentIntent).all()])
        assert "Vitamin" not in intent_text
