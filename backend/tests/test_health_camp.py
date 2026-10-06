"""Health camp registration, slot booking, check-in, and station-progress tests."""
import time

from sqlalchemy import select
from test_workflow_api import harness, register

from core import workflow_models as M


def _camp(factory, with_slot=False):
    with factory() as db:
        db.add(
            M.HealthCamp(
                id="camp1",
                name="Annual Camp",
                date="2026-10-01",
                location="Main Hall",
                what_to_bring="Bring your student ID and any current medical records.",
                active=True,
            )
        )
        for i, name in enumerate(["Registration", "Vitals", "Consultation", "Exit"]):
            db.add(
                M.HealthCampStation(
                    id=f"camp1-st{i}",
                    camp_id="camp1",
                    name=name,
                    sort=i,
                )
            )

        if with_slot:
            db.add(
                M.HealthCampSlot(
                    id="camp1-slot1",
                    camp_id="camp1",
                    slot_start="10:00 AM",
                    slot_end="10:30 AM",
                    capacity=1,
                    booked=0,
                    active=True,
                )
            )

        db.commit()


def test_camp_register_checkin_and_station_flow(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "camper@example.test")
    _camp(factory)

    camps = client.get("/api/camps", headers=headers).json()["items"]
    assert len(camps) == 1

    reg = client.post("/api/camps/camp1/register", headers=headers).json()
    assert reg["alreadyRegistered"] is False
    assert client.post("/api/camps/camp1/register", headers=headers).json()["alreadyRegistered"] is True

    # Check-in required before completing stations? We allow station completion after registration.
    client.post("/api/camps/camp1/check-in", headers=headers)
    status = client.get("/api/camps/camp1/me", headers=headers).json()
    assert status["registered"] is True and status["checkedIn"] is True

    complete = client.post("/api/camps/camp1/stations/camp1-st1", headers=headers).json()
    assert "camp1-st1" in complete["completedStations"]
    # Idempotent station completion.
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

    slots = client.get("/api/camps/camp1/slots", headers=headers)
    assert slots.status_code == 200
    slot = slots.json()["items"][0]

    assert slot["id"] == "camp1-slot1"
    assert slot["remaining"] == 1
    assert slot["available"] is True

    response = client.post(
        "/api/camps/camp1/book",
        headers=headers,
        json={"slotId": "camp1-slot1"},
    )

    assert response.status_code == 201
    payload = response.json()

    assert payload["camp"]["name"] == "Annual Camp"
    assert payload["camp"]["location"] == "Main Hall"
    assert payload["camp"]["whatToBring"] == (
        "Bring your student ID and any current medical records."
    )
    assert payload["slot"]["id"] == "camp1-slot1"
    assert payload["slot"]["slotStart"] == "10:00 AM"
    assert payload["slot"]["slotEnd"] == "10:30 AM"

    status = client.get("/api/camps/camp1/me", headers=headers).json()
    assert status["registered"] is True
    assert status["slotId"] == "camp1-slot1"

    with factory() as db:
        slot_row = db.get(M.HealthCampSlot, "camp1-slot1")
        attendance = db.scalar(
            select(M.CampAttendance).where(
                M.CampAttendance.camp_id == "camp1",
                M.CampAttendance.account_id == user["id"],
            )
        )
        assert slot_row.booked == 1
        assert attendance.slot_id == "camp1-slot1"


def test_camp_slot_full_and_duplicate_booking_rejected(harness):
    client, factory, codes = harness

    _, first_headers = register(client, codes, "camp-first@example.test")
    _camp(factory, with_slot=True)

    first = client.post(
        "/api/camps/camp1/book",
        headers=first_headers,
        json={"slotId": "camp1-slot1"},
    )
    assert first.status_code == 201

    duplicate = client.post(
        "/api/camps/camp1/book",
        headers=first_headers,
        json={"slotId": "camp1-slot1"},
    )
    assert duplicate.status_code == 409

    logout = client.post("/api/auth/logout", headers=first_headers)
    assert logout.status_code == 200

    _, second_headers = register(client, codes, "camp-second@example.test")

    full = client.post(
        "/api/camps/camp1/book",
        headers=second_headers,
        json={"slotId": "camp1-slot1"},
    )
    assert full.status_code == 409
