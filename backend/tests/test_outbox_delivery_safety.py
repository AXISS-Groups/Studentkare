"""Outbox: no repeat sends after a hard kill, per-event backoff, deferral slots."""
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from test_workflow_scheduler_bounds import factory  # noqa: F401

from core import workflow_models as M
from services import workflow_scheduler as scheduler

T0 = 1_800_000_000.0


class Clock:
    def __init__(self, t=T0):
        self.t = t

    def __call__(self):
        return self.t


@pytest.fixture
def clock(monkeypatch):
    c = Clock()
    monkeypatch.setattr(scheduler, "now_seconds", c)
    return c


def _sos(event_id="sos", created=1.0):
    return M.OutboxEvent(id=event_id, event_type="BLOOD_SOS", dedupe_key=event_id, created_at=created,
                         payload={"phone": "+91 90000 00000", "text": "Need O-"})


def _generic(event_id, created=1.0, account_id=""):
    return M.OutboxEvent(id=event_id, event_type="GENERIC_NOTIFICATION", dedupe_key=event_id, created_at=created,
                         account_id=account_id, payload={"channel": "EMAIL", "to": "a@b.in", "body": "hi"})


class HardKill(BaseException):
    """Stands in for SIGKILL/OOM: nothing after the provider call runs."""


def test_event_is_committed_as_sending_before_the_provider_call(factory, clock, monkeypatch):  # noqa: F811
    seen = []

    def deliver(event):
        with factory() as other:
            row = other.get(M.OutboxEvent, event.id)
            seen.append((row.status, row.next_attempt_at))
        return {"status": "sent"}

    monkeypatch.setattr(scheduler, "_deliver_event", deliver)
    with factory() as db:
        db.add(_sos())
        db.commit()
        scheduler._process_outbox(db)
    assert seen == [("SENDING", T0 + scheduler.LEASE_SECONDS)]
    with factory() as db:
        row = db.get(M.OutboxEvent, "sos")
        assert (row.status, row.next_attempt_at, row.attempts) == ("SENT", 0.0, 1)


def test_hard_kill_never_resends_and_earlier_sends_stay_recorded(factory, clock, monkeypatch):  # noqa: F811
    calls = []

    def deliver(event):
        calls.append(event.id)
        if event.id == "second":
            raise HardKill()
        return {"status": "sent"}

    monkeypatch.setattr(scheduler, "_deliver_event", deliver)
    with factory() as db:
        db.add_all([_sos("first", 1.0), _sos("second", 2.0)])
        db.commit()
        with pytest.raises(HardKill):
            scheduler._process_outbox(db)
    with factory() as db:
        assert db.get(M.OutboxEvent, "first").status == "SENT"  # committed per event
        assert db.get(M.OutboxEvent, "second").status == "SENDING"

    # A new worker after the restart: the in-flight event is not sent again.
    with factory() as db:
        result = scheduler._process_outbox(db)
    assert calls == ["first", "second"]
    assert result["interrupted"] == 0
    # Once the claim deadline passes it is failed visibly, still not resent.
    clock.t += scheduler.LEASE_SECONDS + 1
    with factory() as db:
        result = scheduler._process_outbox(db)
        row = db.get(M.OutboxEvent, "second")
        assert (row.status, row.last_error) == ("FAILED", "delivery_interrupted_outcome_unknown")
    assert calls == ["first", "second"]
    assert result["interrupted"] == 1 and result["failed"] == 1


@pytest.mark.parametrize("make, backoff", [
    (lambda: _generic("evt"), scheduler.OUTBOX_RETRY_BACKOFF_SECONDS),
    (lambda: _sos("evt"), scheduler.URGENT_RETRY_BACKOFF_SECONDS),
])
def test_failed_attempts_back_off_instead_of_burning_retries(factory, clock, monkeypatch, make, backoff):  # noqa: F811
    calls = []
    monkeypatch.setattr(scheduler, "_deliver_event",
                        lambda event: calls.append(clock.t) or {"status": "failed", "reason": "provider down"})
    with factory() as db:
        db.add(make())
        db.commit()
        scheduler._process_outbox(db)
        row = db.get(M.OutboxEvent, "evt")
        assert (row.status, row.attempts, row.next_attempt_at) == ("PENDING", 1, T0 + backoff[0])

        clock.t += backoff[0] - 1  # not yet due: skipped, no provider call
        assert scheduler._process_outbox(db)["pending"] == 0
        assert len(calls) == 1

        clock.t += 1
        scheduler._process_outbox(db)
        row = db.get(M.OutboxEvent, "evt")
        assert (row.attempts, row.next_attempt_at) == (2, clock.t + backoff[1])

        clock.t += backoff[1]
        scheduler._process_outbox(db)
        row = db.get(M.OutboxEvent, "evt")
        assert (row.status, row.attempts, row.next_attempt_at) == ("FAILED", 3, 0.0)
    assert len(calls) == scheduler.OUTBOX_MAX_ATTEMPTS
    # Three attempts span minutes of outage, not one 45 s pass after another.
    assert calls[-1] - calls[0] == backoff[0] + backoff[1]


def test_urgent_backoff_is_shorter_but_not_faster_than_a_pass():
    assert scheduler.URGENT_RETRY_BACKOFF_SECONDS < scheduler.OUTBOX_RETRY_BACKOFF_SECONDS
    assert min(scheduler.URGENT_RETRY_BACKOFF_SECONDS) >= scheduler.WORKER_POLL_SECONDS


def test_quiet_hours_defer_until_the_window_ends_and_free_the_batch(factory, clock, monkeypatch):  # noqa: F811
    sent = []
    monkeypatch.setattr(scheduler, "_deliver_event", lambda event: sent.append(event.id) or {"status": "sent"})
    monkeypatch.setattr(scheduler, "in_quiet_hours", lambda start, end, at: True)
    with factory() as db:
        db.add(M.Account(id="quiet", identifier="quiet@example.test", channel="EMAIL", full_name="Q",
                         role="STUDENT", active=True, profile={}, created_at=0.0))
        db.add(M.NotificationPreference(account_id="quiet", quiet_start="22:00", quiet_end="07:00"))
        db.add_all([_generic(f"held-{i:02d}", float(i), "quiet") for i in range(25)])
        db.add(_generic("later", 100.0))  # no preferences: sendable
        db.commit()
        first = scheduler._process_outbox(db)
        assert first["deferred"] == 25 and sent == []
        held = db.get(M.OutboxEvent, "held-00")
        assert held.status == "PENDING" and held.next_attempt_at > T0
        local = datetime.fromtimestamp(held.next_attempt_at, ZoneInfo(scheduler.DEFAULT_TIMEZONE))
        assert (local.hour, local.minute) == (7, 0)
        # The deferred rows no longer occupy the 25 slots.
        second = scheduler._process_outbox(db)
        assert sent == ["later"] and second["deferred"] == 0


def test_defer_until_helper_keeps_an_event_out_until_due(factory, clock, monkeypatch):  # noqa: F811
    sent = []
    monkeypatch.setattr(scheduler, "_deliver_event", lambda event: sent.append(event.id) or {"status": "sent"})
    with factory() as db:
        event = _generic("reminder")
        scheduler.defer_until(event, T0 + 600)
        db.add(event)
        db.commit()
        scheduler._process_outbox(db)
        assert sent == []
        clock.t += 600
        scheduler._process_outbox(db)
        assert sent == ["reminder"]


def test_quiet_hours_end_wraps_to_the_next_day():
    tz = ZoneInfo("Asia/Kolkata")
    late = datetime(2026, 10, 17, 23, 30, tzinfo=tz)
    early = datetime(2026, 10, 17, 2, 0, tzinfo=tz)
    assert scheduler.quiet_hours_end("07:00", late) == datetime(2026, 10, 18, 7, 0, tzinfo=tz).timestamp()
    assert scheduler.quiet_hours_end("07:00", early) == datetime(2026, 10, 17, 7, 0, tzinfo=tz).timestamp()
    assert scheduler.quiet_hours_end("bad", early) == early.timestamp() + 300


@pytest.fixture
def slack(monkeypatch):
    from services import slack_notifier
    posts = []
    monkeypatch.setattr(slack_notifier, "post_ops_alert", lambda text, **kw: posts.append((text, kw)) or {"success": True})
    return posts


def _flags(db):
    from sqlalchemy import select
    return db.scalars(select(M.OpsEvent).where(M.OpsEvent.kind == "URGENT_DELIVERY_FAILED")).all()


def test_interrupted_urgent_event_is_flagged_to_super_admin_and_slack(factory, clock, monkeypatch, slack):  # noqa: F811
    from services import ops_feed

    def kill(event):
        raise HardKill()

    monkeypatch.setattr(scheduler, "_deliver_event", kill)
    with factory() as db:
        db.add_all([_sos("sos"), _generic("plain", 2.0)])
        db.commit()
        with pytest.raises(HardKill):
            scheduler._process_outbox(db)  # dies holding the SOS
    clock.t += scheduler.LEASE_SECONDS + 1
    monkeypatch.setattr(scheduler, "_deliver_event", lambda event: {"status": "sent"})
    with factory() as db:
        scheduler._process_outbox(db)
        flags = _flags(db)
        assert len(flags) == 1
        flag = flags[0]
        assert (flag.severity, flag.domain, flag.resource_type, flag.resource_id) == (
            "CRITICAL", "SAFETY", "outbox_event", "sos")
        assert "BLOOD_SOS" in flag.summary and "••• 00" in flag.summary
        assert "90000" not in flag.summary and "Need O-" not in flag.summary
        # Super admin only: not in a clinician's or campus admin's slice.
        assert ops_feed.feed(db, {"role": "SUPER_ADMIN", "id": "a"})["critical"] == 1
        for role in ("NMC_DOCTOR", "CAMPUS_ADMIN"):
            assert ops_feed.feed(db, {"role": role, "id": "b"})["items"] == []
    assert len(slack) == 1
    text, kwargs = slack[0]
    assert "BLOOD_SOS" in text and "90000" not in text and "Need O-" not in text
    assert kwargs["purpose"] == "ops"


def test_urgent_event_failing_finally_is_flagged_but_routine_ones_are_not(factory, clock, monkeypatch, slack):  # noqa: F811
    monkeypatch.setattr(scheduler, "_deliver_event", lambda event: {"status": "failed", "reason": "provider down"})
    with factory() as db:
        db.add_all([_sos("sos"), _generic("plain", 2.0)])
        db.commit()
        for _ in range(scheduler.OUTBOX_MAX_ATTEMPTS):
            scheduler._process_outbox(db)
            clock.t += 3600
        assert db.get(M.OutboxEvent, "sos").status == "FAILED"
        assert db.get(M.OutboxEvent, "plain").status == "FAILED"
        assert [flag.resource_id for flag in _flags(db)] == ["sos"]
    assert len(slack) == 1


def test_unrouted_urgent_event_is_flagged(factory, clock, slack):  # noqa: F811
    with factory() as db:
        db.add(M.OutboxEvent(id="sos-no-phone", event_type="BLOOD_SOS", dedupe_key="x", payload={"text": "t"}))
        db.commit()
        scheduler._process_outbox(db)
        assert db.get(M.OutboxEvent, "sos-no-phone").status == "FAILED"
        assert "no recipient" in _flags(db)[0].summary
    assert len(slack) == 1
