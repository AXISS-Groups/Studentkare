"""Super Admin notification outbox: reads and acts on the durable care_outbox_events table."""
import time

import pytest
from sqlalchemy import select
from test_clinical_fulfilment import make_staff
from test_workflow_api import harness, login  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import otp_delivery
from services import workflow_scheduler as scheduler

OUTBOX = "/api/v1/admin/notifications/outbox"
BODY = "HbA1c 9.1% — please book a review"


def _event(db, event_id, *, status="PENDING", event_type="GENERIC_NOTIFICATION", payload=None,
           attempts=0, last_error="", created_at=None):
    db.add(M.OutboxEvent(
        id=event_id, event_type=event_type, account_id="", dedupe_key=f"key-{event_id}",
        payload=payload if payload is not None else {"channel": "EMAIL", "to": "ravi.kumar@college.example.in", "body": BODY},
        attempts=attempts, status=status, created_at=created_at or time.time(), last_error=last_error,
    ))


@pytest.fixture
def admin(harness):  # noqa: F811
    client, factory, codes = harness
    make_staff(factory, "outbox-admin", "SUPER_ADMIN", "outbox-admin@example.test")
    return client, factory, login(client, codes, "outbox-admin@example.test")


def test_lists_the_durable_outbox_without_bodies_and_with_masked_contacts(admin):
    client, factory, headers = admin
    with factory() as db:
        _event(db, "evt-email", created_at=3)
        _event(db, "evt-sos", event_type="BLOOD_SOS", payload={"phone": "+91 98765 43210", "text": BODY},
               status="FAILED", attempts=3, last_error="Gateway rejected +91 98765 43210 for ravi@x.org", created_at=2)
        _event(db, "evt-inbox", event_type="LAB_REPORT_RELEASED", payload={"summary": BODY}, created_at=1)
        db.commit()
    response = client.get(OUTBOX, headers=headers)
    assert response.status_code == 200
    items = response.json()["items"]
    assert [i["id"] for i in items] == ["evt-email", "evt-sos", "evt-inbox"]
    email, sos, inbox = items
    assert email["channel"] == "EMAIL" and email["recipientMasked"] == "r•••@•••.in"
    assert email["eventType"] == "GENERIC_NOTIFICATION" and email["maxAttempts"] == 3
    assert sos["channel"] == "WHATSAPP" and sos["recipientMasked"] == "••• 10"
    assert sos["lastError"] == "Gateway rejected ••• 10 for r•••@•••.org"
    assert inbox["channel"] == "IN_APP" and inbox["recipientMasked"] == ""
    text = response.text
    for leak in ("ravi", "college.example", "98765", "43210", "HbA1c", "please book", "payload", "body", "summary"):
        assert leak not in text


def test_outbox_endpoints_are_super_admin_only(harness):  # noqa: F811
    client, factory, codes = harness
    make_staff(factory, "outbox-campus", "CAMPUS_ADMIN", "outbox-campus@example.test")
    headers = login(client, codes, "outbox-campus@example.test")
    assert client.get(OUTBOX, headers=headers).status_code == 403
    assert client.post(f"{OUTBOX}/process", headers=headers).status_code == 403
    assert client.post(f"{OUTBOX}/requeue", json={"notificationId": "x"}, headers=headers).status_code == 403
    client.post("/api/auth/logout", headers=headers)
    assert client.get(OUTBOX).status_code == 401


def test_process_runs_real_delivery_and_records_the_run(admin, monkeypatch):
    client, factory, headers = admin
    sent = []
    monkeypatch.setattr(otp_delivery, "_send_email", lambda to, body: sent.append(to) or {"status": "sent"})
    with factory() as db:
        _event(db, "evt-ok")
        _event(db, "evt-inbox", event_type="LAB_REPORT_RELEASED", payload={"summary": BODY})
        db.commit()
    response = client.post(f"{OUTBOX}/process", headers=headers)
    assert response.status_code == 200, response.text
    run = response.json()
    assert run["processed"] == 2 and run["delivered"] == 1 and run["inApp"] == 1 and run["failed"] == 0
    assert run["pending"] == 0
    assert sent == ["ravi.kumar@college.example.in"]
    assert "ravi" not in response.text
    with factory() as db:
        assert db.get(M.OutboxEvent, "evt-ok").status == "SENT"
        # Already in the student's inbox, so it is done, with nothing sent outside.
        assert db.get(M.OutboxEvent, "evt-inbox").status == "SENT"
        assert db.get(M.AgentRun, run["runId"]).job_key == "reminder_reconcile"
        assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "OUTBOX_PROCESSED")) is not None


def test_process_never_marks_an_undelivered_message_sent(admin, monkeypatch):
    client, factory, headers = admin
    monkeypatch.setattr(otp_delivery, "_send_email", lambda to, body: {"status": "failed", "reason": f"bounce for {to}"})
    with factory() as db:
        _event(db, "evt-bad", attempts=2)
        db.commit()
    run = client.post(f"{OUTBOX}/process", headers=headers).json()
    assert run["delivered"] == 0 and run["failed"] == 1
    item = client.get(OUTBOX, headers=headers).json()["items"][0]
    assert item["status"] == "FAILED" and item["attempts"] == 3
    assert item["lastError"] == "bounce for r•••@•••.in"


def test_requeue_resets_only_failed_messages(admin):
    client, factory, headers = admin
    with factory() as db:
        _event(db, "evt-failed", status="FAILED", attempts=3, last_error="provider down")
        _event(db, "evt-sent", status="SENT", attempts=1)
        _event(db, "evt-pending")
        _event(db, "evt-suppressed", status="SUPPRESSED", last_error="email_disabled")
        db.commit()
    ok = client.post(f"{OUTBOX}/requeue", json={"notificationId": "evt-failed"}, headers=headers)
    assert ok.status_code == 200 and ok.json() == {"status": "SUCCESS"}
    for event_id in ("evt-sent", "evt-pending", "evt-suppressed"):
        refused = client.post(f"{OUTBOX}/requeue", json={"notificationId": event_id}, headers=headers)
        assert refused.status_code == 409
    missing = client.post(f"{OUTBOX}/requeue", json={"notificationId": "evt-gone"}, headers=headers)
    assert missing.json() == {"status": "NOT_FOUND"}
    with factory() as db:
        failed = db.get(M.OutboxEvent, "evt-failed")
        assert (failed.status, failed.attempts, failed.last_error) == ("PENDING", 0, "")
        assert db.get(M.OutboxEvent, "evt-sent").status == "SENT"
        assert db.get(M.OutboxEvent, "evt-suppressed").status == "SUPPRESSED"
        assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "OUTBOX_REQUEUED")).resource_id == "evt-failed"


def _student_in_quiet_hours(db, account_id):
    db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL", full_name="Student",
                     role="STUDENT", active=True, profile={}, created_at=time.time()))
    db.add(M.NotificationPreference(account_id=account_id))


def test_in_app_notices_finish_and_unrouted_events_still_block(admin, monkeypatch):
    monkeypatch.setattr(scheduler, "in_quiet_hours", lambda *args: True)
    client, factory, headers = admin
    with factory() as db:
        _student_in_quiet_hours(db, "student-1")
        db.add(M.OutboxEvent(id="evt-notice", event_type="LAB_REPORT_RELEASED", account_id="student-1",
                             dedupe_key="k-notice", payload={"summary": "Your report is ready"},
                             status="PENDING", created_at=1, last_error="unhandled_event_type:LAB_REPORT_RELEASED"))
        db.commit()
        # A notice stuck from before this fix is finished on the next pass, even in quiet hours.
        result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
        assert result["status"] == "SUCCESS"
        assert result["summary"]["outbox"]["in_app"] == 1
        notice = db.get(M.OutboxEvent, "evt-notice")
        assert (notice.status, notice.last_error, notice.attempts) == ("SENT", "", 0)

        # A reminder has no route yet: it fails visibly, never called delivered, and can be requeued.
        db.add(M.OutboxEvent(id="evt-reminder", event_type="appointment_reminder", account_id="",
                             dedupe_key="k-reminder", payload={"appointmentId": "a1", "summary": "x"},
                             status="PENDING", created_at=2))
        db.commit()
        result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
        assert result["status"] == "BLOCKED" and result["summary"]["outbox"]["failed"] == 1
        assert db.get(M.OutboxEvent, "evt-reminder").status == "FAILED"

    items = {i["id"]: i for i in client.get(OUTBOX, headers=headers).json()["items"]}
    assert items["evt-notice"]["channel"] == "IN_APP" and items["evt-notice"]["status"] == "SENT"
    assert items["evt-reminder"]["channel"] == "" and items["evt-reminder"]["status"] == "FAILED"
    assert items["evt-reminder"]["lastError"] == "unhandled_event_type:appointment_reminder"
    assert client.post(f"{OUTBOX}/requeue", json={"notificationId": "evt-reminder"}, headers=headers).json() == {"status": "SUCCESS"}


def test_quiet_hours_deferral_alone_does_not_block(admin, monkeypatch):
    monkeypatch.setattr(scheduler, "in_quiet_hours", lambda *args: True)
    _, factory, _ = admin
    with factory() as db:
        _student_in_quiet_hours(db, "student-2")
        db.add(M.OutboxEvent(id="evt-held", event_type="GENERIC_NOTIFICATION", account_id="student-2",
                             dedupe_key="k-held", payload={"channel": "EMAIL", "to": "a@b.example", "body": BODY},
                             status="PENDING", created_at=1))
        db.commit()
        result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
        assert result["status"] == "SUCCESS"
        assert result["summary"]["outbox"]["deferred"] == 1
        assert db.get(M.OutboxEvent, "evt-held").status == "PENDING"
