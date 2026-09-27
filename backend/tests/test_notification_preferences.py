"""The stored notification preferences must actually govern delivery.

Before this, care_notification_preferences was a write-only table: the API
stored six settings and nothing anywhere read them, so a student could switch
reminders off and still receive them. These tests pin the behaviour down.
"""
from datetime import datetime

import pytest

from services.workflow_scheduler import in_quiet_hours, preference_verdict


class Prefs:
    """Stands in for a NotificationPreference row without touching a database."""

    def __init__(self, **overrides):
        self.reminders_enabled = True
        self.email_enabled = True
        self.quiet_start = "22:00"
        self.quiet_end = "08:00"
        self.timezone = "Asia/Kolkata"
        self.__dict__.update(overrides)


NOON = datetime(2026, 9, 25, 12, 0)
LATE = datetime(2026, 9, 25, 23, 30)
EARLY = datetime(2026, 9, 25, 3, 0)


class TestQuietHours:
    def test_window_wraps_past_midnight(self):
        assert in_quiet_hours("22:00", "08:00", LATE) is True
        assert in_quiet_hours("22:00", "08:00", EARLY) is True
        assert in_quiet_hours("22:00", "08:00", NOON) is False

    def test_window_within_one_day(self):
        assert in_quiet_hours("09:00", "17:00", NOON) is True
        assert in_quiet_hours("09:00", "17:00", EARLY) is False

    def test_empty_window_is_not_quiet(self):
        # start == end would otherwise be ambiguous between "never" and "always".
        assert in_quiet_hours("08:00", "08:00", NOON) is False

    @pytest.mark.parametrize("start,end", [("", ""), ("bad", "08:00"), (None, None)])
    def test_unparseable_window_never_silences_anything(self, start, end):
        # Fail towards delivering. A malformed setting must not swallow messages.
        assert in_quiet_hours(start, end, NOON) is False


class TestPreferenceVerdict:
    def test_reminders_off_suppresses_a_reminder(self):
        verdict, why = preference_verdict(Prefs(reminders_enabled=False), "MEDICATION_REMINDER", "WHATSAPP", NOON)
        assert (verdict, why) == ("suppress", "reminders_disabled")

    def test_reminders_off_does_not_touch_other_events(self):
        verdict, _ = preference_verdict(Prefs(reminders_enabled=False), "GENERIC_NOTIFICATION", "WHATSAPP", NOON)
        assert verdict == "send"

    def test_email_off_suppresses_only_the_email_channel(self):
        assert preference_verdict(Prefs(email_enabled=False), "GENERIC_NOTIFICATION", "EMAIL", NOON)[0] == "suppress"
        assert preference_verdict(Prefs(email_enabled=False), "GENERIC_NOTIFICATION", "WHATSAPP", NOON)[0] == "send"

    def test_quiet_hours_defer_rather_than_suppress(self):
        # Deferring keeps the event PENDING so it goes out when the window
        # passes. Suppressing would lose it; leaving a suppressed event PENDING
        # would retry it forever.
        verdict, why = preference_verdict(Prefs(), "GENERIC_NOTIFICATION", "WHATSAPP", LATE)
        assert (verdict, why) == ("defer", "quiet_hours")

    def test_missing_row_sends(self):
        # The column defaults are all on, so an account that never opened
        # settings must keep receiving what it would have received.
        assert preference_verdict(None, "MEDICATION_REMINDER", "EMAIL", NOON)[0] == "send"


class TestUrgentIsNeverGated:
    """AGENTS.md: help is always one tap away. A preference is not a reason to
    withhold an emergency, and neither is the hour."""

    @pytest.mark.parametrize("event_type", ["BLOOD_SOS", "CRISIS_ALERT"])
    @pytest.mark.parametrize("at", [NOON, LATE, EARLY])
    def test_urgent_events_always_send(self, event_type, at):
        everything_off = Prefs(reminders_enabled=False, email_enabled=False)
        assert preference_verdict(everything_off, event_type, "EMAIL", at) == ("send", "")
