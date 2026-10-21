"""Adherence is measured, not just logged.

get_user_schedule counted doses taken today and nothing else, so a student
could see "0%" at breakfast after a month of perfect adherence. These pin down
what the windows and the missed-day list actually mean. There is no streak
and no score (AGENTS.md guardrail 4): the API reports facts, not a game.
"""
from datetime import date, timedelta

import pytest
from test_workflow_api import harness, register  # noqa: F401 - harness is a pytest fixture

from services.agents import medication_adherence_loop_agent as agent_module
from services.agents.medication_adherence_loop_agent import (
    coverage,
    missed_days,
)

TODAY = date(2026, 9, 25)
LONG_AGO = date(2020, 1, 1)


def days_back(*offsets: int) -> set[str]:
    return {(TODAY - timedelta(days=offset)).isoformat() for offset in offsets}


class TestCoverage:
    def test_every_day_covered(self):
        assert coverage(days_back(*range(7)), LONG_AGO, TODAY, 7) == {
            "daysCovered": 7, "daysActive": 7, "rate": 1.0,
        }

    def test_partial_week(self):
        result = coverage(days_back(0, 1, 3, 5), LONG_AGO, TODAY, 7)
        assert (result["daysCovered"], result["daysActive"]) == (4, 7)
        assert result["rate"] == 0.57

    def test_a_new_plan_is_not_punished_for_days_before_it_existed(self):
        # Adding a medication today must not read as 29 missed days.
        assert coverage(days_back(0), TODAY, TODAY, 30) == {
            "daysCovered": 1, "daysActive": 1, "rate": 1.0,
        }

    def test_nothing_logged_at_all(self):
        assert coverage(set(), LONG_AGO, TODAY, 7)["rate"] == 0.0

    def test_a_plan_starting_tomorrow_has_no_rate_rather_than_zero(self):
        # A rate of 0.0 would read as total failure. There is simply nothing yet.
        assert coverage(set(), TODAY + timedelta(days=1), TODAY, 7) == {
            "daysCovered": 0, "daysActive": 0, "rate": None,
        }


class TestMissedDays:
    def test_lists_gaps_most_recent_first(self):
        assert missed_days(days_back(0, 1, 3, 5), LONG_AGO, TODAY, 7) == [
            "2026-09-23", "2026-09-21", "2026-09-19",
        ]

    def test_today_is_never_listed_as_missed(self):
        # The day is not over, so it cannot yet be a miss.
        assert TODAY.isoformat() not in missed_days(set(), LONG_AGO, TODAY, 7)

    def test_days_before_the_plan_existed_are_not_missed(self):
        assert missed_days(set(), TODAY - timedelta(days=2), TODAY, 30) == [
            "2026-09-24", "2026-09-23",
        ]


@pytest.mark.parametrize("window", [7, 30])
def test_rate_is_always_a_proportion(window):
    result = coverage(days_back(0, 2), LONG_AGO, TODAY, window)
    assert 0.0 <= result["rate"] <= 1.0


def test_no_streak_or_score_in_the_schedule(harness):
    """A logged dose is reported as a fact (taken today), never as a streak or a score."""
    client, factory, codes = harness
    _user, headers = register(client, codes, "nostreak@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Iron", "dosage": "1 tablet", "frequency": "daily"},
                       headers=headers).json()
    assert client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).status_code == 200
    schedule = client.get("/api/meds/schedule", headers=headers).json()
    assert schedule["todays_taken"] == 1
    assert set(schedule["adherence"]) == {"windows", "missedDays", "trackedSince"}
    flat = repr(schedule).lower()
    for word in ("streak", "score", "completion_rate", "rank", "points"):
        assert word not in flat
    assert not hasattr(agent_module, "current_streak")
