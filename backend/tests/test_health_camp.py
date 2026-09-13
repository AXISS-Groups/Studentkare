"""Health camp registration, check-in, and station-progress tests."""
import time

from core import workflow_models as M
from test_workflow_api import harness, register


def _camp(factory):
    with factory() as db:
        db.add(M.HealthCamp(id="camp1", name="Annual Camp", date="2026-10-01", location="Main Hall", active=True))
        for i, name in enumerate(["Registration", "Vitals", "Consultation", "Exit"]):
            db.add(M.HealthCampStation(id=f"camp1-st{i}", camp_id="camp1", name=name, sort=i))
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
