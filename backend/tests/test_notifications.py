"""Notification inbox tests."""
import time

from sqlalchemy import select
from test_workflow_api import harness, register

from core import workflow_models as M
from services.workflow_scheduler import enqueue


def test_notification_inbox_and_read_state(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "notify@example.test")

    # Queue two notifications for this account.
    with factory() as db:
        enqueue(db, "appointment_reminder", "dedupe-1", {"appointmentId": "a1"}, account_id=user["id"])
        enqueue(db, "medication_refill", "dedupe-2", {"medId": "m1"}, account_id=user["id"])
        db.commit()

    inbox = client.get("/api/notifications", headers=headers).json()["items"]
    assert len(inbox) == 2
    assert all(item["readAt"] is None for item in inbox)

    event_id = inbox[0]["id"]
    assert client.post(f"/api/notifications/{event_id}/read", headers=headers).status_code == 200
    inbox = client.get("/api/notifications", headers=headers).json()["items"]
    assert any(item["id"] == event_id and item["readAt"] for item in inbox)


def test_inbox_is_account_scoped(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "notify2@example.test")
    with factory() as db:
        enqueue(db, "appointment_reminder", "dedupe-3", {"appointmentId": "a1"}, account_id=user["id"])
        db.commit()
    # Log out, then register a different account and confirm isolation.
    client.post("/api/auth/logout", headers=headers)
    other_headers = register(client, codes, "other@example.test")[1]
    assert client.get("/api/notifications", headers=other_headers).json()["items"] == []
