"""Appointment capacity, state transitions, and notification-preference tests."""
import time

from sqlalchemy import select
from test_workflow_api import (  # noqa: F401  (shared isolated-database fixture)
    harness,
    login,
    register,
)

from core import workflow_models as M


def _seed_catalog(factory):
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Provider", role="NMC_DOCTOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id="consult", provider_id="prov", kind="consultation", name="General Consult", brand="Clinic", category="general-care", description="consult", pack="30m", price_paise=29900, mrp_paise=49900, stock=0, active=True, requires_prescription=False, preparation=""))
        db.commit()


def test_appointment_booking_reserves_capacity(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "patient@example.test")
    _seed_catalog(factory)
    with factory() as db:
        db.add(M.AvailabilitySlot(id="slot1", provider_id="prov", catalog_item_id="consult", slot_start="2026-09-20T10:00", slot_end="2026-09-20T10:30", capacity=1, booked=0, active=True))
        db.commit()

    slots = client.get("/api/appointments/availability", params={"catalogItemId": "consult"}, headers=headers).json()["slots"]
    assert len(slots) == 1 and slots[0]["available"] == 1

    res = client.post("/api/appointments", json={"slotId": "slot1"}, headers=headers)
    assert res.status_code == 201
    appt_id = res.json()["id"]

    # Capacity is now reserved: a second booking must fail with 409.
    second = client.post("/api/appointments", json={"slotId": "slot1"}, headers=headers)
    assert second.status_code == 409

    # Cancel returns the capacity.
    cancel = client.patch(f"/api/appointments/{appt_id}", json={"status": "CANCELLED"}, headers=headers)
    assert cancel.status_code == 200
    slots = client.get("/api/appointments/availability", params={"catalogItemId": "consult"}, headers=headers).json()["slots"]
    assert slots[0]["available"] == 1


def test_appointment_state_transitions_are_enforced(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "patient2@example.test")
    _seed_catalog(factory)
    with factory() as db:
        db.add(M.AvailabilitySlot(id="slot2", provider_id="prov", catalog_item_id="consult", slot_start="2026-09-21T10:00", slot_end="2026-09-21T10:30", capacity=5, booked=0, active=True))
        db.commit()
    appt_id = client.post("/api/appointments", json={"slotId": "slot2"}, headers=headers).json()["id"]
    # REQUESTED -> CONFIRMED is valid; directly to COMPLETED is not.
    assert client.patch(f"/api/appointments/{appt_id}", json={"status": "COMPLETED"}, headers=headers).status_code == 409
    assert client.patch(f"/api/appointments/{appt_id}", json={"status": "CONFIRMED"}, headers=headers).status_code == 200
    assert client.patch(f"/api/appointments/{appt_id}", json={"status": "COMPLETED"}, headers=headers).status_code == 200


def test_reminder_respects_preferences_and_deduplicates(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "patient3@example.test")
    _seed_catalog(factory)
    with factory() as db:
        db.add(M.AvailabilitySlot(id="slot3", provider_id="prov", catalog_item_id="consult", slot_start="2026-09-22T10:00", slot_end="2026-09-22T10:30", capacity=5, booked=0, active=True))
        db.commit()
    appt_id = client.post("/api/appointments", json={"slotId": "slot3"}, headers=headers).json()["id"]

    client.put("/api/notifications/preferences", json={"remindersEnabled": False}, headers=headers)
    off = client.post(f"/api/appointments/{appt_id}/reminder", json={"minutesBefore": 60}, headers=headers)
    assert off.json()["queued"] is False

    client.put("/api/notifications/preferences", json={"remindersEnabled": True}, headers=headers)
    first = client.post(f"/api/appointments/{appt_id}/reminder", json={"minutesBefore": 60}, headers=headers)
    assert first.json()["queued"] is True
    with factory() as db:
        events = db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "appointment_reminder")).all()
        assert len(events) == 1


def test_staff_confirm_and_complete_appointment(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "patient4@example.test")
    _seed_catalog(factory)
    with factory() as db:
        db.add(M.AvailabilitySlot(id="slot4", provider_id="prov", catalog_item_id="consult", slot_start="2026-09-23T10:00", slot_end="2026-09-23T10:30", capacity=5, booked=0, active=True))
        db.commit()
    appt_id = client.post("/api/appointments", json={"slotId": "slot4"}, headers=headers).json()["id"]

    # A student cannot access the staff queue.
    assert client.get("/api/work/appointments", headers=headers).status_code == 403
    assert client.patch(f"/api/work/appointments/{appt_id}", json={"status": "CONFIRMED"}, headers=headers).status_code == 403

    # Staff login as the provider.
    with factory() as db:
        db.get(M.Account, "prov").role = "NMC_DOCTOR"
        db.commit()
    staff_headers = login(client, codes, "prov@example.test")

    listing = client.get("/api/work/appointments", headers=staff_headers)
    assert listing.status_code == 200
    assert any(item["id"] == appt_id for item in listing.json()["items"])

    confirm = client.patch(f"/api/work/appointments/{appt_id}", json={"status": "CONFIRMED"}, headers=staff_headers)
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "CONFIRMED"

    complete = client.patch(f"/api/work/appointments/{appt_id}", json={"status": "COMPLETED"}, headers=staff_headers)
    assert complete.status_code == 200
    assert complete.json()["status"] == "COMPLETED"
