"""Reminder delivery: appointment and medicine reminders leave the outbox over
WhatsApp or email, honour the student's settings, and never carry clinical detail."""
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core import workflow_models as M
from core.email_templates import reminder_email
from services import integration_config, otp_delivery
from services import workflow_scheduler as scheduler
from services.db_sql import Base
from services.workflow_api import outbox_admin_row

DRUG = "Sertraline"
CLINICAL_WORDS = (DRUG.lower(), "depress", "anxiety", "diagnos", "counsell", "psychiat", "mg", "dose", "tablet")


@pytest.fixture
def factory(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(integration_config, "INTEGRATIONS_DB", {})
    monkeypatch.setattr(scheduler, "in_quiet_hours", lambda *args: False)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def outbound(monkeypatch):
    """Capture every message instead of calling OpenWA / SMTP / Postal."""
    sent = []
    monkeypatch.setattr(otp_delivery, "_send_openwa",
                        lambda chat_id, text: sent.append(("WHATSAPP", chat_id, text)) or {"status": "sent"})
    monkeypatch.setattr(otp_delivery, "send_notification_email",
                        lambda to, subject, html, plain: sent.append(("EMAIL", to, subject, html, plain)) or {"status": "sent"})
    return sent


def _student(db, account_id, *, channel="WHATSAPP", identifier="9876543210", reminders=True, email=True, active=True):
    db.add(M.Account(id=account_id, identifier=identifier, channel=channel, full_name="Student",
                     role="STUDENT", active=active, profile={}, created_at=time.time()))
    db.add(M.NotificationPreference(account_id=account_id, reminders_enabled=reminders, email_enabled=email))


def _refill(db, account_id, event_id="evt-refill"):
    # The real enqueue path (POST /meds/refill-reminder) stores the medicine name.
    db.add(M.OutboxEvent(id=event_id, event_type="medication_refill", account_id=account_id,
                         dedupe_key=f"k-{event_id}", payload={"medId": "m1", "name": DRUG, "daysBefore": 3},
                         status="PENDING", created_at=time.time()))


def _appointment(db, account_id, *, starts_in_minutes, minutes_before=60, status="CONFIRMED", event_id="evt-appt"):
    start = datetime.now(ZoneInfo("Asia/Kolkata")) + timedelta(minutes=starts_in_minutes)
    db.add(M.AvailabilitySlot(id=f"slot-{event_id}", provider_id="prov", catalog_item_id="counselling",
                              slot_start=start.strftime("%Y-%m-%dT%H:%M"),
                              slot_end=(start + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M"),
                              capacity=1, booked=1, active=True))
    db.add(M.Appointment(id=f"appt-{event_id}", account_id=account_id, provider_id="prov",
                         catalog_item_id="counselling", slot_id=f"slot-{event_id}", status=status,
                         created_at=time.time(), updated_at=time.time()))
    db.add(M.OutboxEvent(id=event_id, event_type="appointment_reminder", account_id=account_id,
                         dedupe_key=f"k-{event_id}",
                         payload={"appointmentId": f"appt-{event_id}", "minutesBefore": minutes_before},
                         status="PENDING", created_at=time.time()))


def _assert_no_clinical_detail(text):
    lowered = text.lower()
    for word in CLINICAL_WORDS:
        assert word not in lowered, f"{word!r} leaked into {text!r}"


def test_refill_reminder_is_delivered_over_whatsapp(factory, outbound):
    with factory() as db:
        _student(db, "s1")
        _refill(db, "s1")
        db.commit()
        result = scheduler._process_outbox(db)
        event = db.get(M.OutboxEvent, "evt-refill")
        assert (event.status, event.last_error, event.attempts) == ("SENT", "", 1)
        assert result["delivered"] == 1 and result["failed"] == 0
    assert len(outbound) == 1
    channel, chat_id, text = outbound[0]
    assert channel == "WHATSAPP" and chat_id == "919876543210@c.us"
    assert text == "You have a medicine reminder in Student Kare. Open the app for details."


def test_reminder_goes_by_email_for_an_email_account(factory, outbound):
    with factory() as db:
        _student(db, "s2", channel="EMAIL", identifier="asha@college.example")
        _refill(db, "s2")
        db.commit()
        scheduler._process_outbox(db)
        assert db.get(M.OutboxEvent, "evt-refill").status == "SENT"
    channel, to, subject, html, plain = outbound[0]
    assert channel == "EMAIL" and to == "asha@college.example"
    for text in (subject, html, plain):
        _assert_no_clinical_detail(text)


def test_appointment_reminder_is_delivered_once_due(factory, outbound):
    with factory() as db:
        _student(db, "s3")
        _appointment(db, "s3", starts_in_minutes=30, minutes_before=60)
        db.commit()
        scheduler._process_outbox(db)
        assert db.get(M.OutboxEvent, "evt-appt").status == "SENT"
    assert outbound[0][2] == "You have an upcoming appointment in Student Kare. Open the app for details."


def test_appointment_reminder_waits_until_due(factory, outbound):
    with factory() as db:
        _student(db, "s4")
        _appointment(db, "s4", starts_in_minutes=3 * 24 * 60, minutes_before=60)
        db.commit()
        result = scheduler._process_outbox(db)
        event = db.get(M.OutboxEvent, "evt-appt")
        assert (event.status, event.last_error, event.attempts) == ("PENDING", "not_due", 0)
        assert result["deferred"] == 1 and result["stuck"] == 0
    assert outbound == []


@pytest.mark.parametrize("status,starts_in,reason", [
    ("CANCELLED", 30, "appointment_not_active"),
    ("CONFIRMED", -10, "appointment_passed"),
])
def test_no_reminder_for_a_cancelled_or_past_appointment(factory, outbound, status, starts_in, reason):
    with factory() as db:
        _student(db, "s5")
        _appointment(db, "s5", starts_in_minutes=starts_in, status=status)
        db.commit()
        scheduler._process_outbox(db)
        event = db.get(M.OutboxEvent, "evt-appt")
        assert (event.status, event.last_error) == ("SUPPRESSED", reason)
    assert outbound == []


def test_reminder_for_someone_elses_appointment_fails_closed(factory, outbound):
    with factory() as db:
        _student(db, "owner")
        _student(db, "other", identifier="9000000001")
        _appointment(db, "owner", starts_in_minutes=30)
        db.get(M.OutboxEvent, "evt-appt").account_id = "other"
        db.commit()
        scheduler._process_outbox(db)
        event = db.get(M.OutboxEvent, "evt-appt")
        assert (event.status, event.last_error) == ("FAILED", "appointment_not_found")
    assert outbound == []


def test_suppressed_when_reminders_are_switched_off(factory, outbound):
    with factory() as db:
        _student(db, "s6", reminders=False)
        _refill(db, "s6")
        _appointment(db, "s6", starts_in_minutes=30)
        db.commit()
        result = scheduler._process_outbox(db)
        assert result["suppressed"] == 2
        for event_id in ("evt-refill", "evt-appt"):
            event = db.get(M.OutboxEvent, event_id)
            assert (event.status, event.last_error) == ("SUPPRESSED", "reminders_disabled")
    assert outbound == []


def test_suppressed_when_email_is_switched_off_for_an_email_account(factory, outbound):
    with factory() as db:
        _student(db, "s7", channel="EMAIL", identifier="ravi@college.example", email=False)
        _refill(db, "s7")
        db.commit()
        scheduler._process_outbox(db)
        event = db.get(M.OutboxEvent, "evt-refill")
        assert (event.status, event.last_error) == ("SUPPRESSED", "email_disabled")
    assert outbound == []


def test_deferred_during_quiet_hours_then_sent(factory, outbound, monkeypatch):
    monkeypatch.setattr(scheduler, "in_quiet_hours", lambda *args: True)
    with factory() as db:
        _student(db, "s8")
        _refill(db, "s8")
        _appointment(db, "s8", starts_in_minutes=30)
        db.commit()
        result = scheduler._process_outbox(db)
        assert result["deferred"] == 2 and result["stuck"] == 0
        for event_id in ("evt-refill", "evt-appt"):
            event = db.get(M.OutboxEvent, event_id)
            assert (event.status, event.last_error, event.attempts) == ("PENDING", "quiet_hours", 0)
        assert outbound == []

        monkeypatch.setattr(scheduler, "in_quiet_hours", lambda *args: False)
        scheduler._process_outbox(db)
        assert db.get(M.OutboxEvent, "evt-refill").status == "SENT"
        assert db.get(M.OutboxEvent, "evt-appt").status == "SENT"
    assert len(outbound) == 2


def test_no_route_fails_visibly(factory, outbound):
    with factory() as db:
        _student(db, "gone", active=False)
        _refill(db, "gone", event_id="evt-inactive")
        _refill(db, "", event_id="evt-orphan")
        db.commit()
        result = scheduler._process_outbox(db)
        assert result["failed"] == 2
        for event_id in ("evt-inactive", "evt-orphan"):
            event = db.get(M.OutboxEvent, event_id)
            assert (event.status, event.last_error) == ("FAILED", "reminder_no_recipient")
    assert outbound == []


def test_unconfigured_channel_uses_attempts_instead_of_claiming_sent(factory):
    with factory() as db:
        _student(db, "s9")
        _refill(db, "s9")
        db.commit()
        scheduler._process_outbox(db)  # OpenWA is not configured in tests.
        event = db.get(M.OutboxEvent, "evt-refill")
        assert (event.status, event.attempts, event.last_error) == ("PENDING", 1, "openwa_not_configured")


def test_medication_reminder_ignores_payload_body_and_recipient(factory, outbound):
    with factory() as db:
        _student(db, "s10")
        db.add(M.OutboxEvent(id="evt-med", event_type="MEDICATION_REMINDER", account_id="s10", dedupe_key="k-med",
                             payload={"channel": "WHATSAPP", "to": "9111111111", "body": f"Take {DRUG} 50 mg now"},
                             status="PENDING", created_at=time.time()))
        db.commit()
        scheduler._process_outbox(db)
        assert db.get(M.OutboxEvent, "evt-med").status == "SENT"
    channel, chat_id, text = outbound[0]
    assert chat_id == "919876543210@c.us"
    _assert_no_clinical_detail(text)


def test_message_text_has_no_clinical_detail():
    for event_type in scheduler.REMINDER_EVENT_TYPES:
        text = scheduler.reminder_message(event_type)
        assert "Student Kare" in text
        _assert_no_clinical_detail(text)
    subject, html, plain = reminder_email(scheduler.reminder_message("medication_refill"))
    for part in (subject, html, plain):
        _assert_no_clinical_detail(part)


def test_admin_outbox_row_shows_the_reminder_channel_masked(factory):
    with factory() as db:
        _student(db, "s11")
        _student(db, "s12", channel="EMAIL", identifier="meera@college.example")
        _refill(db, "s11", event_id="evt-wa")
        _refill(db, "s12", event_id="evt-mail")
        db.commit()
        wa = outbox_admin_row(db.get(M.OutboxEvent, "evt-wa"), db)
        mail = outbox_admin_row(db.get(M.OutboxEvent, "evt-mail"), db)
    assert wa["channel"] == "WHATSAPP" and wa["recipientMasked"] == "••• 10"
    assert mail["channel"] == "EMAIL" and mail["recipientMasked"] == "m•••@•••.example"
    assert DRUG not in str(wa) + str(mail)
