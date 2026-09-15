"""Account-scoped medication plan, dose, and refill-reminder tests."""
import time

from sqlalchemy import select

from core import workflow_models as M
from test_workflow_api import harness, register


def test_medication_plan_and_idempotent_dose(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "med@example.test")

    plan = client.post("/api/meds/plans", json={"name": "Paracetamol", "dosage": "1 tablet", "frequency": "twice daily"}, headers=headers).json()
    assert plan["source"] == "USER"

    first = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    assert first["already_logged"] is False
    # Idempotent: a second log must not double-count.
    again = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    assert again["already_logged"] is True

    schedule = client.get("/api/meds/schedule", headers=headers).json()
    assert schedule["todays_taken"] == 1
    assert schedule["plans"][0]["name"] == "Paracetamol"


def test_refill_reminder_respects_preferences(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "refill@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Vitamin D3", "dosage": "1 capsule", "frequency": "weekly"}, headers=headers).json()

    # Reminders off -> not queued.
    client.put("/api/notifications/preferences", json={"remindersEnabled": False}, headers=headers)
    off = client.post("/api/meds/refill-reminder", json={"medId": plan["id"], "daysBefore": 3}, headers=headers).json()
    assert off["queued"] is False

    # Reminders on -> queued, deduplicated.
    client.put("/api/notifications/preferences", json={"remindersEnabled": True}, headers=headers)
    on = client.post("/api/meds/refill-reminder", json={"medId": plan["id"], "daysBefore": 3}, headers=headers).json()
    assert on["queued"] is True
    with factory() as db:
        events = db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "medication_refill")).all()
        assert len(events) == 1
