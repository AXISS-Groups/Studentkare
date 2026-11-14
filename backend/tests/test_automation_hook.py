"""The automation hook sends allow-listed, identifier-free events to a self-hosted workflow tool."""
import json
import time

import httpx
import pytest
from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import workflow_models as M
from core.rule_l import PLATFORM, TABLE_PLANES
from services import automation_hook as hook
from services import ops_feed

URL = "http://n8n.internal:5678/webhook/studentkare"
SECRET = "test-secret"
SENT_KEYS = {"id", "kind", "domain", "severity", "at"}


class Receiver:
    def __init__(self, status=200, error=None):
        self.status, self.error, self.calls = status, error, []

    def __call__(self, url, *, content, headers, timeout):
        self.calls.append({"url": url, "body": content, "headers": headers})
        if self.error:
            raise self.error
        return httpx.Response(self.status)


@pytest.fixture
def receiver(monkeypatch):
    received = Receiver()
    monkeypatch.setattr(hook.httpx, "post", received)
    return received


def configure(monkeypatch, enabled="true", url=URL, secret=SECRET):
    monkeypatch.setenv("AUTOMATION_HOOK_ENABLED", enabled)
    monkeypatch.setenv("AUTOMATION_HOOK_URL", url)
    monkeypatch.setenv("AUTOMATION_HOOK_SECRET", secret)


def add_event(db, kind, domain, *, age=0.0, **extra):
    event = M.OpsEvent(id=f"evt-{kind}-{domain}-{int(age)}", kind=kind, domain=domain, severity="INFO",
                       actor_id="account-123", subject_id="student-456", provider_id="vendor-789",
                       resource_type="order", resource_id="order-abc", summary="1 item paid by a named student",
                       created_at=time.time() - age, **extra)
    db.add(event)
    return event.id


def run(factory):
    with factory() as db:
        result = hook.run_job(db)["summary"]
        db.commit()
    return result


def test_it_is_off_by_default_and_sends_nothing(harness, receiver, monkeypatch):
    _, factory, _ = harness
    for name in ("AUTOMATION_HOOK_ENABLED", "AUTOMATION_HOOK_URL", "AUTOMATION_HOOK_SECRET"):
        monkeypatch.delenv(name, raising=False)
    with factory() as db:
        add_event(db, "ORDER_PAID", "MARKETPLACE")
        db.commit()
    assert run(factory) == {"sent": 0, "skipped": "off"}
    assert receiver.calls == []


@pytest.mark.parametrize("url,secret", [("", SECRET), (URL, ""), ("", "")])
def test_enabled_but_half_configured_sends_nothing(harness, receiver, monkeypatch, url, secret):
    _, factory, _ = harness
    configure(monkeypatch, url=url, secret=secret)
    with factory() as db:
        add_event(db, "ORDER_PAID", "MARKETPLACE")
        db.commit()
    assert run(factory) == {"sent": 0, "skipped": "unconfigured"}
    assert receiver.calls == []


def test_only_allow_listed_events_leave_and_they_carry_no_identifier(harness, receiver, monkeypatch):
    _, factory, _ = harness
    configure(monkeypatch)
    with factory() as db:
        sent_id = add_event(db, "ORDER_PAID", "MARKETPLACE")
        add_event(db, "PAYMENT_NEEDS_REFUND", "PHARMACY")       # allowed kind, clinical-side domain
        add_event(db, "APPOINTMENT_REQUESTED", "CLINICAL")
        add_event(db, "CRISIS_GATE_TRIGGERED", "SAFETY")
        add_event(db, "RX_UPLOAD_REJECTED", "PHARMACY")
        add_event(db, "HOSTEL_VISIT_REQUESTED", "LAB")
        add_event(db, "SOMETHING_NEW", "MARKETPLACE")           # allowed domain, kind not on the list
        add_event(db, "ORDER_PAID", "MARKETPLACE", age=hook.RETRY_WINDOW_SECONDS + 60)  # too old
        db.commit()

    assert run(factory) == {"sent": 1, "waiting": 0}
    (call,) = receiver.calls
    assert call["url"] == URL
    payload = json.loads(call["body"])
    assert [event["id"] for event in payload["events"]] == [sent_id]
    (event,) = payload["events"]
    assert set(event) == SENT_KEYS
    assert event["kind"] == "ORDER_PAID" and event["domain"] == "MARKETPLACE"
    raw = call["body"].decode()
    for private in ("account-123", "student-456", "vendor-789", "order-abc", "named student", "summary"):
        assert private not in raw


def test_the_request_is_signed_so_the_receiver_can_reject_forgeries(harness, receiver, monkeypatch):
    _, factory, _ = harness
    configure(monkeypatch)
    with factory() as db:
        add_event(db, "ORDER_REFUNDED", "MARKETPLACE")
        db.commit()
    run(factory)
    (call,) = receiver.calls
    timestamp = call["headers"]["X-SK-Timestamp"]
    assert abs(int(timestamp) - time.time()) < 60
    assert call["headers"]["X-SK-Signature"] == hook.sign(SECRET, timestamp, call["body"])
    assert call["headers"]["X-SK-Signature"] != hook.sign("another-secret", timestamp, call["body"])
    assert SECRET not in call["body"].decode() and SECRET not in json.dumps(call["headers"])


def test_a_delivered_event_is_never_sent_again(harness, receiver, monkeypatch):
    _, factory, _ = harness
    configure(monkeypatch)
    with factory() as db:
        event_id = add_event(db, "RETURN_REQUESTED", "MARKETPLACE")
        db.commit()
    assert run(factory)["sent"] == 1
    assert run(factory) == {"sent": 0, "waiting": 0}
    assert len(receiver.calls) == 1
    with factory() as db:
        row = db.get(M.AutomationDelivery, event_id)
        assert row is not None and row.kind == "RETURN_REQUESTED"


@pytest.mark.parametrize("broken", [Receiver(status=500), Receiver(status=401),
                                    Receiver(error=httpx.ConnectError("down"))])
def test_a_failed_delivery_records_nothing_and_is_retried(harness, monkeypatch, broken):
    _, factory, _ = harness
    configure(monkeypatch)
    monkeypatch.setattr(hook.httpx, "post", broken)
    with factory() as db:
        event_id = add_event(db, "ORDER_PAID", "MARKETPLACE")
        db.commit()
    assert run(factory) == {"sent": 0, "waiting": 1}
    with factory() as db:
        assert db.get(M.AutomationDelivery, event_id) is None

    working = Receiver()
    monkeypatch.setattr(hook.httpx, "post", working)
    assert run(factory) == {"sent": 1, "waiting": 0}
    assert [event["id"] for event in json.loads(working.calls[0]["body"])["events"]] == [event_id]


def test_the_allow_list_stays_out_of_clinical_and_safety_ground():
    assert hook.ALLOWED_DOMAINS.isdisjoint({"CLINICAL", "PHARMACY", "LAB", "SAFETY"})
    assert hook.ALLOWED_DOMAINS <= ops_feed.DOMAINS | {"BILLING"}
    assert hook.ALLOWED_KINDS.isdisjoint(ops_feed.SUPER_ADMIN_ONLY_KINDS)
    assert TABLE_PLANES["care_automation_deliveries"] == PLATFORM


def test_the_scheduler_knows_the_job(harness):
    from services.workflow_scheduler import JOB_INTERVAL_OVERRIDES, PERIODIC_JOBS
    assert "automation_hook" in PERIODIC_JOBS
    assert JOB_INTERVAL_OVERRIDES["automation_hook"] <= 300
