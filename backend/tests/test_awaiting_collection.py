"""Samples booked and never collected must surface.

Nothing compared a lab order's slot to the clock. An order could sit in BOOKED
indefinitely while the clinician believed a test was under way and the student
believed it was handled — a result nobody was waiting for, and nobody chasing.
"""
import pytest

from services.clinical_fulfilment import (
    COLLECTION_GRACE_HOURS,
    COLLECTION_PENDING_STATES,
    NO_SLOT_GRACE_HOURS,
    overdue_collection,
    parse_slot,
)

HOUR = 3600.0
SLOT_ISO = "2027-01-15T10:00:00Z"
SLOT = parse_slot(SLOT_ISO)


class TestParseSlot:
    def test_reads_an_iso_slot_with_a_zulu_suffix(self):
        assert parse_slot("2027-01-15T10:00:00Z") == pytest.approx(SLOT)

    def test_treats_a_naive_timestamp_as_utc_rather_than_guessing(self):
        assert parse_slot("2027-01-15T10:00:00") == pytest.approx(SLOT)

    @pytest.mark.parametrize("value", ["", "   ", "tomorrow-ish", "15/01/2027", None])
    def test_unreadable_values_yield_nothing(self, value):
        assert parse_slot(value) is None


class TestOverdueCollection:
    def test_inside_the_grace_period_is_not_overdue(self):
        # A phlebotomist running late is not an alert.
        assert overdue_collection("BOOKED", SLOT_ISO, 0, SLOT + (COLLECTION_GRACE_HOURS - 1) * HOUR) == (False, "")

    def test_past_the_grace_period_is_overdue(self):
        overdue, reason = overdue_collection("BOOKED", SLOT_ISO, 0, SLOT + (COLLECTION_GRACE_HOURS + 1) * HOUR)
        assert (overdue, reason) == (True, "slot_passed")

    @pytest.mark.parametrize("status", sorted(COLLECTION_PENDING_STATES))
    def test_every_pre_collection_state_is_checked(self, status):
        # RECOLLECTION_REQUIRED matters most: the first sample already failed.
        assert overdue_collection(status, SLOT_ISO, 0, SLOT + 99 * HOUR)[0] is True

    @pytest.mark.parametrize("status", ["SAMPLE_COLLECTED", "IN_TRANSIT", "REPORT_RELEASED", "CANCELLED"])
    def test_a_collected_or_closed_order_is_never_overdue(self, status):
        assert overdue_collection(status, SLOT_ISO, 0, SLOT + 999 * HOUR) == (False, "")

    def test_no_reason_is_given_when_nothing_is_wrong(self):
        # A caller reading the reason blindly must not be handed one.
        assert overdue_collection("BOOKED", SLOT_ISO, 0, SLOT)[1] == ""


class TestFallsBackToAge:
    """slot_start has no format validation, so some orders have no usable slot.
    Those are judged on age — and an unreadable slot must surface the order
    rather than hide it. For a safety check, prefer the visible failure."""

    def test_an_old_order_with_no_slot_is_overdue(self):
        now = 1_800_000_000.0
        assert overdue_collection("ASSIGNED", "", now - (NO_SLOT_GRACE_HOURS + 1) * HOUR, now) == (True, "no_slot_recorded")

    def test_a_fresh_order_with_no_slot_is_not(self):
        now = 1_800_000_000.0
        assert overdue_collection("ASSIGNED", "", now - HOUR, now) == (False, "")

    def test_an_unparseable_slot_is_judged_on_age_not_ignored(self):
        now = 1_800_000_000.0
        assert overdue_collection("BOOKED", "tomorrow-ish", now - (NO_SLOT_GRACE_HOURS + 1) * HOUR, now)[0] is True

    def test_a_missing_created_at_does_not_crash(self):
        assert overdue_collection("BOOKED", "", None, 1_800_000_000.0)[0] is True
