"""Health camps: hosting, campus scope, eligibility, booking, waitlist, cancel, change, reminders, check-in."""
import time
from datetime import date, timedelta
from types import SimpleNamespace

from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixture

from core import workflow_models as M
from services import health_camps

STUDENT_CAMPUS = "Test University"   # what register() signs students up with


def _future(days=10):
    return (date.today() + timedelta(days=days)).isoformat()


def _camp(factory, *, with_slot=False, capacity=1, campus="", eligibility="OPEN", price=0, status="PUBLISHED",
          camp_id="camp1", day=None):
    with factory() as db:
        db.add(M.HealthCamp(id=camp_id, name="Annual Camp", date=day or _future(), location="Main Hall",
                            what_to_bring="Bring your student ID and any current medical records.", active=True,
                            campus=campus, services=["GENERAL_SCREENING"], eligibility=eligibility, price_paise=price,
                            status=status, created_at=time.time()))
        for i, name in enumerate(["Registration", "Vitals", "Consultation", "Exit"]):
            db.add(M.HealthCampStation(id=f"{camp_id}-st{i}", camp_id=camp_id, name=name, sort=i))
        if with_slot:
            db.add(M.HealthCampSlot(id=f"{camp_id}-slot1", camp_id=camp_id, slot_start="10:00 AM", slot_end="10:30 AM",
                                    capacity=capacity, booked=0, active=True))
            db.add(M.HealthCampSlot(id=f"{camp_id}-slot2", camp_id=camp_id, slot_start="11:00 AM", slot_end="11:30 AM",
                                    capacity=capacity, booked=0, active=True))
        db.commit()


def _staff(client, codes, factory, identifier, role, *, campus="", kind=""):
    user, headers = register(client, codes, identifier)
    with factory() as db:
        account = db.get(M.Account, user["id"])
        account.role = role
        account.staff_campus = campus
        account.partner_kind = kind
        db.commit()
    client.post("/api/auth/logout", headers=headers)
    return user, login(client, codes, identifier)


def _verify(factory, account_id, university=STUDENT_CAMPUS):
    with factory() as db:
        row = db.get(M.CampusVerification, account_id)
        if row is None:
            db.add(M.CampusVerification(account_id=account_id, university=university, roll_number="R1", status="VERIFIED"))
        else:
            row.university, row.status = university, "VERIFIED"
        db.commit()


def _slot(factory, slot_id):
    with factory() as db:
        return db.get(M.HealthCampSlot, slot_id)


def _row(factory, account_id, camp_id="camp1"):
    with factory() as db:
        return db.scalar(select(M.CampAttendance).where(M.CampAttendance.camp_id == camp_id,
                                                        M.CampAttendance.account_id == account_id))


# --- the flows that were here before (registration, self check-in, stations) ---

def test_camp_register_checkin_and_station_flow(harness):
    client, factory, codes = harness
    register(client, codes, "camper@example.test")
    _, headers = (None, login(client, codes, "camper@example.test"))
    _camp(factory)

    assert len(client.get("/api/camps", headers=headers).json()["items"]) == 1
    assert client.post("/api/camps/camp1/register", headers=headers).json()["alreadyRegistered"] is False
    assert client.post("/api/camps/camp1/register", headers=headers).json()["alreadyRegistered"] is True
    client.post("/api/camps/camp1/check-in", headers=headers)
    status = client.get("/api/camps/camp1/me", headers=headers).json()
    assert status["registered"] is True and status["checkedIn"] is True
    complete = client.post("/api/camps/camp1/stations/camp1-st1", headers=headers).json()
    assert "camp1-st1" in complete["completedStations"]
    again = client.post("/api/camps/camp1/stations/camp1-st1", headers=headers).json()
    assert again["completedStations"].count("camp1-st1") == 1


def test_cannot_complete_station_without_registration(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "camper2@example.test")
    _camp(factory)
    assert client.post("/api/camps/camp1/stations/camp1-st1", headers=headers).status_code == 404


def test_camp_slot_booking_and_confirmation(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "camp-booker@example.test")
    _camp(factory, with_slot=True)

    slot = client.get("/api/camps/camp1/slots", headers=headers).json()["items"][0]
    assert slot["id"] == "camp1-slot1" and slot["remaining"] == 1 and slot["available"] is True

    response = client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"})
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["camp"]["name"] == "Annual Camp"
    assert payload["slot"] == {"id": "camp1-slot1", "slotStart": "10:00 AM", "slotEnd": "10:30 AM"}
    assert len(payload["bookingCode"]) == health_camps.CODE_LENGTH and payload["status"] == "BOOKED"

    status = client.get("/api/camps/camp1/me", headers=headers).json()
    assert status["registered"] is True and status["slotId"] == "camp1-slot1"
    assert _slot(factory, "camp1-slot1").booked == 1
    assert _row(factory, user["id"]).slot_id == "camp1-slot1"


def test_camp_slot_full_and_duplicate_booking_rejected(harness):
    client, factory, codes = harness
    _, first = register(client, codes, "camp-first@example.test")
    _camp(factory, with_slot=True)
    assert client.post("/api/camps/camp1/book", headers=first, json={"slotId": "camp1-slot1"}).status_code == 201
    assert client.post("/api/camps/camp1/book", headers=first, json={"slotId": "camp1-slot1"}).status_code == 409
    client.post("/api/auth/logout", headers=first)
    _, second = register(client, codes, "camp-second@example.test")
    full = client.post("/api/camps/camp1/book", headers=second, json={"slotId": "camp1-slot1"})
    assert full.status_code == 409 and full.json()["detail"]["code"] == "SLOT_FULL"


# --- campus scope and eligibility ---

def test_students_see_only_their_campus_and_every_campus_camps(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "s@x.test")
    _camp(factory, camp_id="mine", campus="  test   university ", eligibility="CAMPUS_ANY")
    _camp(factory, camp_id="theirs", campus="BITS Pilani", eligibility="CAMPUS_ANY")
    _camp(factory, camp_id="everyone")
    _camp(factory, camp_id="past", day=(date.today() - timedelta(days=1)).isoformat())
    _camp(factory, camp_id="pending", campus=STUDENT_CAMPUS, status="PENDING_APPROVAL")
    ids = {item["id"] for item in client.get("/api/camps", headers=headers).json()["items"]}
    assert ids == {"mine", "everyone"}
    assert client.get("/api/camps/theirs/slots", headers=headers).status_code == 404
    assert client.post("/api/camps/theirs/book", headers=headers, json={"slotId": "x"}).status_code == 404


def test_verified_only_camps_need_a_verified_campus(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "s@x.test")
    _camp(factory, with_slot=True, campus=STUDENT_CAMPUS, eligibility="CAMPUS_VERIFIED")
    listed = client.get("/api/camps", headers=headers).json()["items"][0]
    assert listed["ineligibleReason"] == "NOT_VERIFIED"
    refused = client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"})
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "NOT_VERIFIED"
    _verify(factory, user["id"])
    assert client.get("/api/camps", headers=headers).json()["items"][0]["ineligibleReason"] is None
    assert client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"}).status_code == 201


def test_a_paid_camp_is_never_booked_without_a_payment_flow(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "s@x.test")
    _camp(factory, with_slot=True, price=19900)
    refused = client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"})
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "PAYMENT_NOT_AVAILABLE"
    assert _slot(factory, "camp1-slot1").booked == 0


# --- waitlist, cancel, change ---

def test_waitlist_is_booked_in_order_when_a_place_opens(harness):
    client, factory, codes = harness
    _camp(factory, with_slot=True)
    first, h1 = register(client, codes, "one@x.test")
    assert client.post("/api/camps/camp1/book", headers=h1, json={"slotId": "camp1-slot1"}).status_code == 201
    client.post("/api/auth/logout", headers=h1)
    second, h2 = register(client, codes, "two@x.test")
    assert client.post("/api/camps/camp1/waitlist", headers=h2, json={"slotId": "camp1-slot2"}).json()["detail"]["code"] == "SLOT_OPEN"
    joined = client.post("/api/camps/camp1/waitlist", headers=h2, json={"slotId": "camp1-slot1"})
    assert joined.status_code == 201 and joined.json()["status"] == "WAITLISTED" and joined.json()["waitlistPosition"] == 1
    slots = client.get("/api/camps/camp1/slots", headers=h2).json()["items"]
    assert slots[0]["waitlisted"] == 1 and slots[0]["waitlistOpen"] is True
    client.post("/api/auth/logout", headers=h2)

    h1 = login(client, codes, "one@x.test")
    cancelled = client.post("/api/camps/camp1/cancel", headers=h1)
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "CANCELLED"
    promoted = _row(factory, second["id"])
    assert promoted.status == "BOOKED" and promoted.slot_id == "camp1-slot1"
    assert _slot(factory, "camp1-slot1").booked == 1
    with factory() as db:
        kinds = {e.event_type for e in db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.account_id == second["id"])).all()}
    assert {"CAMP_WAITLIST_BOOKED", "camp_reminder"} <= kinds
    # The first student can book again: a new booking with a new reference.
    rebooked = client.post("/api/camps/camp1/book", headers=h1, json={"slotId": "camp1-slot2"})
    assert rebooked.status_code == 201 and rebooked.json()["bookingCode"] != _row(factory, second["id"]).booking_code


def test_waitlist_respects_its_cap(harness, monkeypatch):
    client, factory, codes = harness
    _camp(factory, with_slot=True, capacity=1)
    _, h1 = register(client, codes, "one@x.test")
    client.post("/api/camps/camp1/book", headers=h1, json={"slotId": "camp1-slot1"})
    client.post("/api/auth/logout", headers=h1)
    _, h2 = register(client, codes, "two@x.test")
    real = health_camps.setting
    monkeypatch.setattr(health_camps, "setting", lambda key, db=None: 0 if key == "camps.waitlist_max_per_slot" else real(key, db))
    full = client.post("/api/camps/camp1/waitlist", headers=h2, json={"slotId": "camp1-slot1"})
    assert full.status_code == 409 and full.json()["detail"]["code"] == "WAITLIST_FULL"


def test_change_slot_moves_the_booking_and_counts(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "s@x.test")
    _camp(factory, with_slot=True, capacity=2)
    first = client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"}).json()
    assert client.post("/api/camps/camp1/reschedule", headers=headers, json={"slotId": "camp1-slot1"}).json()["detail"]["code"] == "SAME_SLOT"
    moved = client.post("/api/camps/camp1/reschedule", headers=headers, json={"slotId": "camp1-slot2"})
    assert moved.status_code == 200 and moved.json()["slot"]["id"] == "camp1-slot2"
    assert moved.json()["bookingCode"] != first["bookingCode"]
    assert _slot(factory, "camp1-slot1").booked == 0 and _slot(factory, "camp1-slot2").booked == 1
    mine = client.get("/api/camps/bookings/me", headers=headers).json()["items"]
    assert [(b["status"], b["slot"]["id"], b["canChange"]) for b in mine] == [("BOOKED", "camp1-slot2", True)]


def test_no_cancel_or_change_inside_the_cutoff_or_after_check_in(harness, monkeypatch):
    client, factory, codes = harness
    _, headers = register(client, codes, "s@x.test")
    _camp(factory, with_slot=True, capacity=2)
    client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"})
    monkeypatch.setattr(health_camps, "_can_change", lambda db, camp, slot: False)
    late = client.post("/api/camps/camp1/cancel", headers=headers)
    assert late.status_code == 409 and late.json()["detail"]["code"] == "TOO_LATE"
    assert client.post("/api/camps/camp1/reschedule", headers=headers, json={"slotId": "camp1-slot2"}).json()["detail"]["code"] == "TOO_LATE"
    monkeypatch.undo()
    client.post("/api/camps/camp1/check-in", headers=headers)
    assert client.post("/api/camps/camp1/cancel", headers=headers).json()["detail"]["code"] == "CHECKED_IN"


def test_a_cancelled_booking_cannot_check_in(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "s@x.test")
    _camp(factory, with_slot=True)
    client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"})
    client.post("/api/camps/camp1/cancel", headers=headers)
    assert client.post("/api/camps/camp1/check-in", headers=headers).status_code == 404
    assert client.get("/api/camps/camp1/me", headers=headers).json()["registered"] is False


def test_the_change_window_follows_the_setting():
    db = None
    camp = SimpleNamespace(date="2030-01-10")
    slot = SimpleNamespace(slot_start="10:00 AM")
    start = health_camps.slot_start_epoch(db, camp.date, slot.slot_start)
    until = health_camps._changeable_until(db, camp, slot)
    assert start - until == health_camps.setting("camps.change_cutoff_hours") * health_camps.SECONDS_PER_HOUR


def test_slot_times_parse_both_ways():
    assert health_camps.parse_slot_time("9:05 PM") == (21, 5)
    assert health_camps.parse_slot_time("12:00 AM") == (0, 0)
    assert health_camps.parse_slot_time("09:30") == (9, 30)
    assert health_camps.parse_slot_time("25:00") is None
    assert health_camps.parse_slot_time("13:00 PM") is None
    assert health_camps.display_time(14, 0) == "2:00 PM"


# --- reminders ---

def test_reminder_waits_then_sends_and_stops_after_cancel(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "s@x.test")
    _camp(factory, with_slot=True)
    client.post("/api/camps/camp1/book", headers=headers, json={"slotId": "camp1-slot1"})
    with factory() as db:
        event = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "camp_reminder"))
        camp = db.get(M.HealthCamp, "camp1")
        start = health_camps.slot_start_epoch(db, camp.date, "10:00 AM")
        hours = health_camps.setting("camps.reminder_hours_before", db)
        assert health_camps.camp_reminder_timing(db, event, start - hours * 3600 - 60)[0] == "defer"
        assert health_camps.camp_reminder_timing(db, event, start - hours * 3600 + 60)[0] == "send"
        assert health_camps.camp_reminder_timing(db, event, start + 1)[0] == "suppress"
        assert "health camp" not in __import__("services.workflow_scheduler", fromlist=["x"]).reminder_message("camp_reminder").lower()
    client.post("/api/camps/camp1/cancel", headers=headers)
    with factory() as db:
        event = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "camp_reminder"))
        assert health_camps.camp_reminder_timing(db, event, time.time()) == ("suppress", "camp_booking_changed", None)


# --- hosts ---

def _body(**extra):
    return {"name": "Eye check camp", "date": _future(), "location": "Block A", "services": ["EYE_CHECK"],
            "slots": [{"start": "09:00", "end": "10:00", "capacity": 30}], **extra}


def test_a_campus_admin_creates_for_their_own_campus_and_sees_counts_not_names(harness):
    client, factory, codes = harness
    _, headers = _staff(client, codes, factory, "ca@x.test", "CAMPUS_ADMIN", campus=STUDENT_CAMPUS)
    created = client.post("/api/ops/camps", headers=headers, json=_body(campus="Somewhere Else"))
    assert created.status_code == 201 and created.json()["status"] == "PUBLISHED"
    camp_id = created.json()["id"]
    listed = client.get("/api/ops/camps", headers=headers).json()["items"]
    assert [c["campus"] for c in listed] == [STUDENT_CAMPUS]
    assert listed[0]["slots"][0]["slotStart"] == "9:00 AM"
    client.post("/api/auth/logout", headers=headers)

    _, sh = register(client, codes, "s@x.test")
    assert client.post(f"/api/camps/{camp_id}/book", headers=sh, json={"slotId": f"{camp_id}-slot1"}).status_code == 403  # not verified
    client.post("/api/auth/logout", headers=sh)
    headers = login(client, codes, "ca@x.test")
    slot = client.get("/api/ops/camps", headers=headers).json()["items"][0]["slots"][0]
    assert set(slot) == {"id", "slotStart", "slotEnd", "capacity", "booked", "waitlisted", "checkedIn", "cancelled"}


def test_create_refuses_held_services_paid_camps_and_bad_slots(harness):
    client, factory, codes = harness
    _, headers = _staff(client, codes, factory, "ca@x.test", "CAMPUS_ADMIN", campus=STUDENT_CAMPUS)
    held = client.post("/api/ops/camps", headers=headers, json=_body(services=["VACCINATION"]))
    assert held.status_code == 422 and held.json()["detail"]["code"] == "SERVICE_HELD"
    paid = client.post("/api/ops/camps", headers=headers, json=_body(pricePaise=9900))
    assert paid.status_code == 422 and paid.json()["detail"]["code"] == "PAID_CAMPS_OFF"
    backwards = _body(slots=[{"start": "10:00", "end": "09:00", "capacity": 5}])
    assert client.post("/api/ops/camps", headers=headers, json=backwards).status_code == 422
    past = _body(date=(date.today() - timedelta(days=1)).isoformat())
    assert client.post("/api/ops/camps", headers=headers, json=past).status_code == 422
    too_big = _body(slots=[{"start": "09:00", "end": "10:00", "capacity": 10 ** 6}])
    assert client.post("/api/ops/camps", headers=headers, json=too_big).status_code == 422
    options = client.get("/api/ops/camps/options", headers=headers).json()
    assert options["campusFixed"] is True and {"code": "VACCINATION", "held": True} in options["services"]


def test_students_and_other_staff_cannot_host(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "s@x.test")
    assert client.post("/api/ops/camps", headers=headers, json=_body()).status_code == 403
    assert client.get("/api/ops/camps", headers=headers).status_code == 403
    client.post("/api/auth/logout", headers=headers)
    _, pharmacy = _staff(client, codes, factory, "ph@x.test", "VENDOR", kind="PHARMACY")
    assert client.get("/api/ops/camps", headers=pharmacy).status_code == 403


def test_a_partner_proposes_and_the_campus_approves(harness):
    client, factory, codes = harness
    _, ca = _staff(client, codes, factory, "ca@x.test", "CAMPUS_ADMIN", campus=STUDENT_CAMPUS)
    client.post("/api/auth/logout", headers=ca)
    _, clinic = _staff(client, codes, factory, "clinic@x.test", "VENDOR", kind="CLINIC")
    assert client.get("/api/ops/camps/options", headers=clinic).json()["campuses"] == [STUDENT_CAMPUS]
    assert client.post("/api/ops/camps", headers=clinic, json=_body(campus="Nowhere")).status_code == 422
    proposed = client.post("/api/ops/camps", headers=clinic, json=_body(campus="test university"))
    assert proposed.status_code == 201 and proposed.json()["status"] == "PENDING_APPROVAL"
    camp_id = proposed.json()["id"]
    assert client.post(f"/api/ops/camps/{camp_id}/decision", headers=clinic, json={"decision": "APPROVE"}).status_code == 403
    client.post("/api/auth/logout", headers=clinic)

    user, sh = register(client, codes, "s@x.test")
    assert client.get("/api/camps", headers=sh).json()["items"] == []
    client.post("/api/auth/logout", headers=sh)

    ca = login(client, codes, "ca@x.test")
    pending = client.get("/api/ops/camps", headers=ca).json()["items"][0]
    assert pending["canDecide"] is True and pending["isHost"] is False
    assert client.post(f"/api/ops/camps/{camp_id}/decision", headers=ca, json={"decision": "APPROVE"}).json()["status"] == "PUBLISHED"
    client.post("/api/auth/logout", headers=ca)

    _verify(factory, user["id"])
    sh = login(client, codes, "s@x.test")
    assert [c["id"] for c in client.get("/api/camps", headers=sh).json()["items"]] == [camp_id]


def test_cancelling_a_camp_cancels_every_booking_and_tells_each_student(harness):
    client, factory, codes = harness
    _camp(factory, with_slot=True, capacity=1, campus=STUDENT_CAMPUS, eligibility="CAMPUS_ANY")
    one, h1 = register(client, codes, "one@x.test")
    client.post("/api/camps/camp1/book", headers=h1, json={"slotId": "camp1-slot1"})
    client.post("/api/auth/logout", headers=h1)
    two, h2 = register(client, codes, "two@x.test")
    client.post("/api/camps/camp1/waitlist", headers=h2, json={"slotId": "camp1-slot1"})
    client.post("/api/auth/logout", headers=h2)
    _, ca = _staff(client, codes, factory, "ca@x.test", "CAMPUS_ADMIN", campus=STUDENT_CAMPUS)
    done = client.post("/api/ops/camps/camp1/cancel", headers=ca, json={"reason": "Rain, the hall is closed"})
    assert done.status_code == 200 and done.json()["bookingsCancelled"] == 2
    assert _row(factory, one["id"]).status == "CANCELLED" and _row(factory, two["id"]).status == "CANCELLED"
    with factory() as db:
        told = {e.account_id for e in db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "CAMP_CANCELLED")).all()}
    assert told == {one["id"], two["id"]}
    client.post("/api/auth/logout", headers=ca)
    h1 = login(client, codes, "one@x.test")
    mine = client.get("/api/camps/bookings/me", headers=h1).json()["items"][0]
    assert mine["campCancelled"] is True and mine["cancelReason"] == "Rain, the hall is closed"


def test_another_campus_admin_cannot_see_or_cancel_the_camp(harness):
    client, factory, codes = harness
    _camp(factory, with_slot=True, campus=STUDENT_CAMPUS, eligibility="CAMPUS_ANY")
    _, other = _staff(client, codes, factory, "other@x.test", "CAMPUS_ADMIN", campus="BITS Pilani")
    assert client.get("/api/ops/camps", headers=other).json()["items"] == []
    assert client.post("/api/ops/camps/camp1/cancel", headers=other, json={"reason": "Not mine"}).status_code == 404
