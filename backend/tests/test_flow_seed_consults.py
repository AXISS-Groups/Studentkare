"""Live-run audit #7: in dev/test, a seeded consultation can be booked and reaches a doctor.

Consultations must be provided by an NMC_DOCTOR (CATALOG_PROVIDER_ROLES); the
seed gave them to the demo vendor and published no slots, so no booking could
ever reach a doctor. Dev/test seed only (services/demo_seed.py).
"""
from datetime import datetime, timezone

from sqlalchemy import select
from test_seed_demo import seed
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services.demo_seed import DEMO_DOCTOR, DEMO_VENDOR, seed_catalog_data, seed_demo_data


def test_seeded_consults_are_doctor_owned_with_future_slots(harness):
    _, factory, _ = harness
    seed(factory)
    with factory() as db:
        doctor = db.scalar(select(M.Account).where(M.Account.identifier == DEMO_DOCTOR))
        consults = db.scalars(select(M.CatalogEntry).where(M.CatalogEntry.kind == "consultation")).all()
        assert consults and {c.provider_id for c in consults} == {doctor.id}
        now = datetime.now(timezone.utc)
        for consult in consults:
            slots = db.scalars(select(M.AvailabilitySlot).where(M.AvailabilitySlot.catalog_item_id == consult.id)).all()
            assert slots, consult.id
            assert all(s.provider_id == doctor.id and datetime.fromisoformat(s.slot_start) > now for s in slots)


def test_a_seeded_consult_booking_reaches_the_doctor(harness):
    client, factory, codes = harness
    seed(factory)
    _, student = register(client, codes, "consult-booker@example.test")
    slot = client.get("/api/appointments/availability?catalogItemId=demo-general-consult", headers=student).json()["slots"][0]
    booked = client.post("/api/appointments", headers=student, json={"slotId": slot["id"]})
    assert booked.status_code == 201, booked.text
    # The student's list names the service, not only an internal id (live-run audit #13).
    mine = client.get("/api/appointments", headers=student).json()["items"]
    assert mine[0]["serviceName"] == "General Physician Teleconsultation"
    client.post("/api/auth/logout", headers=student)
    doctor = login(client, codes, DEMO_DOCTOR)
    items = client.get("/api/work/appointments", headers=doctor).json()["items"]
    assert [a["status"] for a in items] == ["REQUESTED"]
    assert client.patch(f"/api/work/appointments/{items[0]['id']}", headers=doctor,
                        json={"status": "CONFIRMED"}).status_code == 200


def test_an_older_dev_database_hands_its_consults_to_the_doctor(harness):
    _, factory, _ = harness
    with factory() as db:
        seed_catalog_data(db)   # vendor only: consults owned by the demo vendor, as before
        vendor = db.scalar(select(M.Account).where(M.Account.identifier == DEMO_VENDOR))
        assert {c.provider_id for c in db.scalars(select(M.CatalogEntry).where(M.CatalogEntry.kind == "consultation"))} == {vendor.id}
    with factory() as db:
        seed_demo_data(db)
        doctor = db.scalar(select(M.Account).where(M.Account.identifier == DEMO_DOCTOR))
        assert {c.provider_id for c in db.scalars(select(M.CatalogEntry).where(M.CatalogEntry.kind == "consultation"))} == {doctor.id}
