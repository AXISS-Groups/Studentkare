"""Water, activity, heart rate, weight & BMI, and today's doses.

Owner-only clinical data (core/rule_l.py WELLNESS_STORES). The clock is pinned
through services.student_time.now_utc so day boundaries in the student's
timezone (platform.default_timezone unless they set another) can be crossed on
purpose.

Limits, windows and cut-offs are read from the settings registry (``S(key)``,
the declared default), never repeated here; each converted behaviour also has a
test that stores an override and sees the behaviour change (AGENTS.md rule 11).
"""
import json
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401

from core import rule_l
from core import settings_registry as R
from core import workflow_models as M
from services import student_time
from services.wellness_api import bmi_band, bmi_bands, compute_bmi
from services.wellness_messages import MESSAGES

ROOT = Path(__file__).resolve().parents[2]


def S(key):
    """A setting's declared default: the value in force when no override is stored."""
    return R.get_declaration(key).default


TZ = S("platform.default_timezone")


@pytest.fixture(autouse=True)
def _fresh_settings():
    R.reset_cache()
    yield
    R.reset_cache()


def override(factory, key, value):
    """Store a super admin's override, as PATCH /api/ops/settings/{key} would, and drop the cache."""
    with factory() as db:
        db.merge(M.SettingOverride(key=key, value=value, updated_by="test", updated_at=time.time()))
        db.commit()
    R.reset_cache()

# Wednesday 21 Oct 2026, 11:30 IST.
WED = datetime(2026, 10, 21, 6, 0, tzinfo=timezone.utc)


@pytest.fixture
def clock(monkeypatch):
    state = {"now": WED}
    monkeypatch.setattr(student_time, "now_utc", lambda: state["now"])
    return state


def _other(client, codes, current):
    """Sign the current student out and register a second one."""
    client.post("/api/auth/logout", headers=current)
    _, headers = register(client, codes, "other@example.test")
    return headers


def _back(client, codes, identifier, current):
    client.post("/api/auth/logout", headers=current)
    return login(client, codes, identifier)


# --- water --------------------------------------------------------------------

def test_water_progress_default_goal_and_undo_latest(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "water@example.test")

    empty = client.get("/api/wellness/water/today", headers=headers).json()
    assert empty == {"date": "2026-10-21", "timezone": TZ, "consumedMl": 0,
                     "goalMl": S("wellness.water_goal_ml_default"), "goalSource": "DEFAULT", "percent": 0,
                     "entries": []}

    first = client.post("/api/wellness/water", json={"amountMl": 250}, headers=headers)
    assert first.status_code == 201, first.text
    clock["now"] = WED + timedelta(minutes=10)
    second = client.post("/api/wellness/water", json={"amountMl": 500}, headers=headers).json()
    goal = S("wellness.water_goal_ml_default")
    assert (second["consumedMl"], second["percent"]) == (750, round(750 * 100 / goal))

    undone = client.delete("/api/wellness/water/latest", headers=headers).json()
    assert undone["removedId"] == second["id"]
    assert (undone["consumedMl"], undone["percent"]) == (250, round(250 * 100 / goal))
    assert client.delete("/api/wellness/water/latest", headers=headers).status_code == 200
    assert client.delete("/api/wellness/water/latest", headers=headers).status_code == 404


def test_water_goal_bounds_and_percent_over_goal(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "goal@example.test")
    low, high = S("wellness.water_goal_ml_min"), S("wellness.water_goal_ml_max")
    for bad in (low - 1, high + 1, 0, -100):
        refused = client.put("/api/wellness/water/goal", json={"goalMl": bad}, headers=headers)
        assert refused.status_code == 422
    assert refused.json()["detail"]["code"] == "WATER_GOAL_OUT_OF_RANGE"
    assert refused.json()["detail"]["values"] == {"min": low, "max": high}
    assert client.put("/api/wellness/water/goal", json={"goalMl": low}, headers=headers).status_code == 200
    goal = client.get("/api/wellness/water/goal", headers=headers).json()
    assert goal == {"goalMl": low, "goalSource": "OWNER", "minMl": low, "maxMl": high}
    over = low * 6 // 5                       # 120 % of the goal, in one entry
    assert over <= S("wellness.water_entry_ml_max")
    client.post("/api/wellness/water", json={"amountMl": over}, headers=headers)
    today = client.get("/api/wellness/water/today", headers=headers).json()
    assert today["percent"] == 120   # not capped; the bottle caps its own fill


@pytest.mark.parametrize("body", [{"amountMl": S("wellness.water_entry_ml_min") - 1},
                                  {"amountMl": S("wellness.water_entry_ml_max") + 1}, {"amountMl": -250}, {},
                                  {"amountMl": 250, "extra": 1}])
def test_water_entry_validation(harness, clock, body):
    client, factory, codes = harness
    _, headers = register(client, codes, "waterbad@example.test")
    assert client.post("/api/wellness/water", json=body, headers=headers).status_code == 422


def test_water_entry_time_validation(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "watertime@example.test")
    future = (WED + timedelta(hours=1)).isoformat()
    old = (WED - timedelta(days=S("wellness.entry_backdate_days") + 1)).isoformat()
    naive = "2026-10-21T09:00:00"
    for moment in (future, old, naive):
        assert client.post("/api/wellness/water", json={"amountMl": 250, "recordedAt": moment},
                           headers=headers).status_code == 422


def test_water_day_follows_the_students_timezone(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "tz@example.test")
    clock["now"] = datetime(2026, 10, 21, 18, 20, tzinfo=timezone.utc)      # 23:50 IST, Wed
    client.post("/api/wellness/water", json={"amountMl": 300}, headers=headers)
    assert client.get("/api/wellness/water/today", headers=headers).json()["consumedMl"] == 300

    clock["now"] = datetime(2026, 10, 21, 18, 40, tzinfo=timezone.utc)      # 00:10 IST, Thu
    thursday = client.get("/api/wellness/water/today", headers=headers).json()
    assert (thursday["date"], thursday["consumedMl"]) == ("2026-10-22", 0)
    # "−" only reaches back into today; yesterday's glass is not today's.
    assert client.delete("/api/wellness/water/latest", headers=headers).status_code == 404

    # A student whose timezone is UTC is still on Wednesday at 18:40 UTC.
    client.put("/api/notifications/preferences", json={"timezone": "UTC"}, headers=headers)
    utc = client.get("/api/wellness/water/today", headers=headers).json()
    assert (utc["date"], utc["timezone"], utc["consumedMl"]) == ("2026-10-21", "UTC", 300)

    # An unknown zone name falls back to the configured default rather than failing.
    client.put("/api/notifications/preferences", json={"timezone": "Mars/Olympus"}, headers=headers)
    assert client.get("/api/wellness/water/today", headers=headers).json()["timezone"] == TZ


def test_water_is_owner_only(harness, clock):
    client, factory, codes = harness
    _, mine = register(client, codes, "mine@example.test")
    entry = client.post("/api/wellness/water", json={"amountMl": 250}, headers=mine).json()
    client.put("/api/wellness/water/goal", json={"goalMl": 3000}, headers=mine)

    theirs = _other(client, codes, mine)
    seen = client.get("/api/wellness/water/today", headers=theirs).json()
    assert (seen["consumedMl"], seen["goalMl"], seen["entries"]) == (0, S("wellness.water_goal_ml_default"), [])
    assert client.delete("/api/wellness/water/latest", headers=theirs).status_code == 404
    assert client.delete(f"/api/health/readings/{entry['id']}", headers=theirs).status_code == 404

    mine = _back(client, codes, "mine@example.test", theirs)
    assert client.get("/api/wellness/water/today", headers=mine).json()["consumedMl"] == 250


def test_wellness_endpoints_require_sign_in(harness):
    client, factory, codes = harness
    for method, path in (("get", "/api/wellness/water/today"), ("post", "/api/wellness/water"),
                         ("get", "/api/activity/trends"), ("post", "/api/activity/entries"),
                         ("get", "/api/body/measurements"), ("post", "/api/body/measurements"),
                         ("get", "/api/meds/today"), ("delete", "/api/meds/doses/dose_x")):
        assert getattr(client, method)(path).status_code in (401, 403), path


# --- activity -----------------------------------------------------------------

def _day(client, headers, **values):
    return client.post("/api/activity/entries", json=values, headers=headers)


def test_activity_trends_this_week_with_best_day_tie(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "walk@example.test")
    assert _day(client, headers, date="2026-10-19", steps=5000).status_code == 201
    assert _day(client, headers, date="2026-10-20", steps=8000, distanceKm=6.1, floors=4).status_code == 201
    assert _day(client, headers, date="2026-10-21", steps=8000, standingMinutes=90).status_code == 201

    trends = client.get("/api/activity/trends?period=this_week", headers=headers).json()
    assert (trends["from"], trends["to"], trends["daysInPeriod"]) == ("2026-10-19", "2026-10-21", 3)
    assert trends["metrics"]["steps"] == {"unit": "steps", "total": 21000, "dailyAverage": 7000, "daysWithData": 3}
    assert trends["metrics"]["floors"] == {"unit": "floors", "total": 4, "dailyAverage": 4, "daysWithData": 1}
    assert trends["metrics"]["activeEnergyKcal"] == {"unit": "kcal", "total": None, "dailyAverage": None,
                                                     "daysWithData": 0}
    # Tie on 8000 steps: the earlier day wins.
    assert trends["bestDay"] == {"date": "2026-10-20", "steps": 8000, "distanceKm": 6.1, "floors": 4}
    assert [d["date"] for d in trends["days"]] == ["2026-10-19", "2026-10-20", "2026-10-21"]

    # A manual value for a day replaces the earlier one; it does not add to it.
    saved = _day(client, headers, date="2026-10-21", steps=9000).json()
    assert saved["steps"] == 9000 and saved["standingMinutes"] == 90
    trends = client.get("/api/activity/trends?period=this_week", headers=headers).json()
    assert trends["metrics"]["steps"]["total"] == 22000
    assert trends["bestDay"]["date"] == "2026-10-21"
    assert trends["bestDay"]["distanceKm"] is None


def test_activity_periods_and_empty_period(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "periods@example.test")
    _day(client, headers, date="2026-10-14", steps=4000)       # last week (Wed)
    _day(client, headers, date="2026-10-01", steps=3000)       # this month, not this or last week
    _day(client, headers, date="2026-02-01", steps=2000)       # this year only
    _day(client, headers, date="2026-10-20", steps=0)          # a zero day is data, never a best day

    def get(period):
        return client.get(f"/api/activity/trends?period={period}", headers=headers).json()

    this_week = get("this_week")
    assert this_week["metrics"]["steps"]["total"] == 0 and this_week["bestDay"] is None
    last_week = get("last_week")
    assert (last_week["from"], last_week["to"]) == ("2026-10-12", "2026-10-18")
    assert last_week["metrics"]["steps"]["total"] == 4000 and last_week["bestDay"]["date"] == "2026-10-14"
    month = get("month")
    assert (month["from"], month["daysInPeriod"]) == ("2026-10-01", 21)
    assert month["metrics"]["steps"]["total"] == 7000
    year = get("year")
    assert year["from"] == "2026-01-01" and year["metrics"]["steps"]["total"] == 9000
    assert year["bestDay"]["date"] == "2026-10-14"

    client.post("/api/auth/logout", headers=headers)
    _, empty = register(client, codes, "empty@example.test")
    nothing = client.get("/api/activity/trends?period=year", headers=empty).json()
    assert nothing["bestDay"] is None and nothing["days"] == []
    assert all(m["total"] is None and m["daysWithData"] == 0 for m in nothing["metrics"].values())


def test_activity_week_boundary_in_ist(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "monday@example.test")
    # Sunday 18 Oct 23:50 IST is last week; at 00:10 IST Monday 19 Oct this week begins.
    clock["now"] = datetime(2026, 10, 18, 18, 40, tzinfo=timezone.utc)
    assert client.get("/api/activity/trends", headers=headers).json()["from"] == "2026-10-19"
    clock["now"] = datetime(2026, 10, 18, 18, 20, tzinfo=timezone.utc)
    assert client.get("/api/activity/trends", headers=headers).json()["from"] == "2026-10-12"


def test_synced_and_manual_steps_are_not_double_counted(harness, clock):
    client, factory, codes = harness
    user, headers = register(client, codes, "sync@example.test")
    _day(client, headers, date="2026-10-21", steps=8000)
    with factory() as db:
        db.add(M.Reading(id="r-sync", account_id=user["id"], metric="steps", value=9500.0,
                         recorded_at="2026-10-21T04:00:00+00:00", source="HEALTH_CONNECT"))
        db.commit()
    trends = client.get("/api/activity/trends", headers=headers).json()
    assert trends["metrics"]["steps"]["total"] == 9500
    # Clearing the day removes only the manual value; the synced one stays.
    assert client.delete("/api/activity/entries/2026-10-21", headers=headers).status_code == 200
    assert client.get("/api/activity/trends", headers=headers).json()["metrics"]["steps"]["total"] == 9500
    assert client.delete("/api/activity/entries/2026-10-21", headers=headers).status_code == 404


TOO_OLD = (WED.date() - timedelta(days=S("wellness.activity_backdate_days") + 1)).isoformat()


@pytest.mark.parametrize("body", [
    {"date": "2026-10-22", "steps": 10},                     # tomorrow in IST
    {"date": TOO_OLD, "steps": 10},                          # older than the backdate window
    {"date": "2026-10-21"},                                  # nothing entered
    {"date": "2026-10-21", "steps": S("wellness.activity_steps_max") + 1},
    {"date": "2026-10-21", "steps": -1},
    {"date": "2026-10-21", "distanceKm": S("wellness.activity_distance_km_max") + 0.5},
    {"date": "2026-10-21", "floors": S("wellness.activity_floors_max") + 1},
    {"date": "2026-10-21", "activeEnergyKcal": S("wellness.activity_energy_kcal_max") + 1},
    {"date": "2026-10-21", "standingMinutes": 24 * 60 + 1},  # more minutes than a day has
    {"date": "2026-10-21", "heartRate": 70},                 # not an activity field
    {"date": "21-10-2026", "steps": 10},
])
def test_activity_entry_validation(harness, clock, body):
    client, factory, codes = harness
    _, headers = register(client, codes, "actbad@example.test")
    assert client.post("/api/activity/entries", json=body, headers=headers).status_code == 422


def test_activity_period_must_be_known(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "period@example.test")
    assert client.get("/api/activity/trends?period=all_time", headers=headers).status_code == 422


def test_activity_is_owner_only(harness, clock):
    client, factory, codes = harness
    _, mine = register(client, codes, "myact@example.test")
    _day(client, mine, date="2026-10-21", steps=6000)
    theirs = _other(client, codes, mine)
    seen = client.get("/api/activity/trends", headers=theirs).json()
    assert seen["metrics"]["steps"]["total"] is None and seen["bestDay"] is None
    assert client.delete("/api/activity/entries/2026-10-21", headers=theirs).status_code == 404
    mine = _back(client, codes, "myact@example.test", theirs)
    assert client.get("/api/activity/trends", headers=mine).json()["metrics"]["steps"]["total"] == 6000


# --- heart rate ---------------------------------------------------------------

def test_heart_rate_is_stored_raw_and_never_in_trends(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "heart@example.test")
    recorded = client.post("/api/health/readings", json={"metric": "heart", "value": 72,
                                                         "recordedAt": "2026-10-19T08:00:00+05:30"}, headers=headers)
    assert recorded.status_code == 201
    _day(client, headers, date="2026-10-19", steps=4000)
    for period in ("this_week", "last_week", "month", "year"):
        body = client.get(f"/api/activity/trends?period={period}", headers=headers).text.lower()
        assert "heart" not in body and "bpm" not in body and "72" not in body, period
    raw = client.get("/api/health/readings?days=3650", headers=headers).json()["items"]
    assert [(r["metric"], r["value"], r["unit"]) for r in raw if r["metric"] == "heart"] == [("heart", 72, "bpm")]

    theirs = _other(client, codes, headers)
    assert client.get("/api/health/readings?days=3650", headers=theirs).json()["items"] == []


def test_readings_list_survives_wellness_metrics(harness, clock):
    """GET /health/readings used to index METRICS directly and would 500 on a water row."""
    client, factory, codes = harness
    _, headers = register(client, codes, "mixed@example.test")
    client.post("/api/wellness/water", json={"amountMl": 250}, headers=headers)
    client.post("/api/body/measurements", json={"heightCm": 170}, headers=headers)
    response = client.get("/api/health/readings?days=3650", headers=headers)
    assert response.status_code == 200
    assert {(r["metric"], r["unit"]) for r in response.json()["items"]} == {("water", "ml"), ("height", "cm")}
    # The generic form still offers only its own metrics.
    offered = {m["id"] for m in client.get("/api/health/metrics", headers=headers).json()["items"]}
    assert not offered & {"water", "height", "distance", "floors", "active_energy", "standing_minutes"}


# --- weight, height and BMI ---------------------------------------------------

@pytest.mark.parametrize("weight,height,expected", [
    (70, 175, 22.9), (60, 160, 23.4), (72.5, 170, 25.1), (22.95, 100, 23.0), (50, 180, 15.4),
])
def test_bmi_computation_rounds_half_up_to_one_decimal(weight, height, expected):
    assert compute_bmi(weight, height) == expected


LOW, MID, HIGH = S("wellness.bmi_cutoff_low"), S("wellness.bmi_cutoff_mid"), S("wellness.bmi_cutoff_high")


@pytest.mark.parametrize("value,code", [
    (LOW - 3.5, "BMI_BAND_1"), (round(LOW - 0.1, 1), "BMI_BAND_1"), (LOW, "BMI_BAND_2"),
    (round(MID - 0.1, 1), "BMI_BAND_2"), (MID, "BMI_BAND_3"), (round(HIGH - 0.1, 1), "BMI_BAND_3"),
    (HIGH, "BMI_BAND_4"), (HIGH + 15.2, "BMI_BAND_4"),
])
def test_bmi_bands_follow_the_configured_cut_offs(harness, value, code):
    _, factory, _ = harness
    with factory() as db:
        assert bmi_band(value, bmi_bands(db))["code"] == code


def test_bmi_band_labels_are_neutral_and_shown_to_one_decimal(harness):
    _, factory, _ = harness
    with factory() as db:
        bands = bmi_bands(db)
    # The declared defaults are the WHO cut-offs for Asian populations (2004).
    assert (LOW, MID, HIGH) == (18.5, 23.0, 25.0)
    assert [b["label"] for b in bands] == ["Below 18.5", "18.5–22.9", "23–24.9", "25 and above"]
    assert [(b["from"], b["below"]) for b in bands] == [(None, LOW), (LOW, MID), (MID, HIGH), (HIGH, None)]


JUDGEMENT = re.compile(r"under ?weight|over ?weight|obes|normal|healthy|unhealthy|ideal|target|goal|risk|"
                       r"colou?r|red|green|amber|warning|progress|improv|lost|gained|change", re.I)


def test_body_measurements_bmi_is_neutral(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "body@example.test")
    nothing = client.get("/api/body/measurements", headers=headers).json()
    assert nothing["bmi"] is None and nothing["bmiUnavailable"] == "NEEDS_WEIGHT_AND_HEIGHT"

    saved = client.post("/api/body/measurements", json={"weightKg": 72.5, "heightCm": 170}, headers=headers)
    assert saved.status_code == 201, saved.text
    body = client.get("/api/body/measurements", headers=headers).json()
    assert body["weight"]["value"] == 72.5 and body["height"]["value"] == 170
    assert body["bmi"]["value"] == 25.1 and body["bmi"]["band"] == "BMI_BAND_4"
    with factory() as db:
        assert body["bmi"]["bands"] == bmi_bands(db)
    assert body["bmi"]["reference"]["code"] == "BMI_REFERENCE"
    assert set(body["bmi"]) == {"value", "unit", "band", "bands", "reference", "weightRecordedAt", "heightRecordedAt"}
    # Words of judgement, colours, goals, targets or change-over-time: none.
    assert not JUDGEMENT.search(json.dumps(body["bmi"])), json.dumps(body["bmi"])
    assert not {"goal", "target", "delta", "change", "trend"} & set(body)

    # A later weight replaces the one BMI is computed from; no difference is reported.
    clock["now"] = WED + timedelta(hours=1)
    client.post("/api/body/measurements", json={"weightKg": 70}, headers=headers)
    later = client.get("/api/body/measurements", headers=headers).json()
    assert later["bmi"]["value"] == 24.2 and len(later["entries"]) == 3
    assert all(set(e) == {"id", "metric", "value", "unit", "recordedAt", "source"} for e in later["entries"])


def test_bmi_is_not_computed_from_an_out_of_range_weight(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "range@example.test")
    client.post("/api/body/measurements", json={"heightCm": 170}, headers=headers)
    # The generic readings form accepts 0.1-500 kg; BMI refuses to use 5 kg.
    client.post("/api/health/readings", json={"metric": "weight", "value": 5,
                                              "recordedAt": datetime.now(timezone.utc).isoformat()}, headers=headers)
    body = client.get("/api/body/measurements", headers=headers).json()
    assert body["bmi"] is None and body["bmiUnavailable"] == "VALUE_OUT_OF_RANGE"


@pytest.mark.parametrize("body", [{"weightKg": S("wellness.weight_kg_min") - 0.1},
                                  {"weightKg": S("wellness.weight_kg_max") + 0.1},
                                  {"heightCm": S("wellness.height_cm_min") - 1},
                                  {"heightCm": S("wellness.height_cm_max") + 1},
                                  {}, {"weightKg": "NaN"}, {"weightKg": 60, "bmi": 22}])
def test_body_measurement_validation(harness, clock, body):
    client, factory, codes = harness
    _, headers = register(client, codes, "bodybad@example.test")
    assert client.post("/api/body/measurements", json=body, headers=headers).status_code == 422


def test_body_measurements_are_owner_only(harness, clock):
    client, factory, codes = harness
    _, mine = register(client, codes, "mybody@example.test")
    ids = client.post("/api/body/measurements", json={"weightKg": 60, "heightCm": 165}, headers=mine).json()["ids"]
    theirs = _other(client, codes, mine)
    seen = client.get("/api/body/measurements", headers=theirs).json()
    assert seen["weight"] is None and seen["bmi"] is None and seen["entries"] == []
    for reading_id in ids:
        assert client.delete(f"/api/health/readings/{reading_id}", headers=theirs).status_code == 404


def test_bmi_never_appears_outside_the_clinical_endpoint(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "nobmi@example.test")
    client.post("/api/body/measurements", json={"weightKg": 72.5, "heightCm": 170}, headers=headers)
    client.post("/api/wellness/water", json={"amountMl": 250}, headers=headers)
    _day(client, headers, date="2026-10-21", steps=5000)
    plan = client.post("/api/meds/plans", json={"name": "Vitamin D3", "timesPerDay": 1}, headers=headers).json()
    client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers)
    client.post("/api/meds/refill-reminder", json={"medId": plan["id"], "daysBefore": 3}, headers=headers)

    for path in ("/api/wellness/water/today", "/api/wellness/water/goal", "/api/activity/trends",
                 "/api/activity/trends?period=year", "/api/meds/today", "/api/meds/schedule", "/api/home",
                 "/api/health/readings?days=3650", "/api/health/metrics", "/api/health/preferences",
                 "/api/notifications/preferences"):
        response = client.get(path, headers=headers)
        assert response.status_code == 200, path
        assert "bmi" not in response.text.lower() and "kg/m" not in response.text, path
    with factory() as db:
        for event in db.scalars(select(M.OutboxEvent)).all():
            assert "bmi" not in json.dumps(event.payload).lower()


# --- doses today --------------------------------------------------------------

def test_meds_today_with_and_without_structured_frequency(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "doses@example.test")
    free = client.post("/api/meds/plans", json={"name": "Cetirizine", "frequency": "twice daily"}, headers=headers).json()
    assert free["timesPerDay"] is None
    twice = client.post("/api/meds/plans", json={"name": "Amoxicillin", "frequency": "BD", "timesPerDay": 2},
                        headers=headers).json()

    today = client.get("/api/meds/today", headers=headers).json()
    assert (today["date"], today["timezone"]) == ("2026-10-21", TZ)
    by_id = {p["planId"]: p for p in today["plans"]}
    # "twice daily" is free text: the count is unknown, not guessed as 2.
    assert (by_id[free["id"]]["dosesPlanned"], by_id[free["id"]]["nextSlot"]) == (None, None)
    assert (by_id[twice["id"]]["dosesPlanned"], by_id[twice["id"]]["dosesTaken"], by_id[twice["id"]]["nextSlot"]) == (2, 0, 1)

    first = client.post("/api/meds/log-dose", json={"medId": twice["id"]}, headers=headers).json()
    assert first["already_logged"] is False and first["doseId"]
    clock["now"] = WED + timedelta(minutes=1)
    second = client.post("/api/meds/log-dose", json={"medId": twice["id"]}, headers=headers).json()
    assert second["already_logged"] is False and second["dosesTaken"] == 2
    clock["now"] = WED + timedelta(minutes=2)
    third = client.post("/api/meds/log-dose", json={"medId": twice["id"]}, headers=headers).json()
    assert third["already_logged"] is True

    plan = {p["planId"]: p for p in client.get("/api/meds/today", headers=headers).json()["plans"]}[twice["id"]]
    assert (plan["dosesTaken"], plan["nextSlot"]) == (2, None)
    assert plan["undo"]["doseId"] == second["doseId"]

    # A plan without timesPerDay keeps the one-a-day behaviour.
    client.post("/api/meds/log-dose", json={"medId": free["id"]}, headers=headers)
    again = client.post("/api/meds/log-dose", json={"medId": free["id"]}, headers=headers).json()
    assert again["already_logged"] is True


def test_dose_undo_window(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "undo@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 3}, headers=headers).json()
    dose = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    window = S("meds.dose_undo_minutes")
    assert dose["undoUntil"] == (WED + timedelta(minutes=window)).isoformat()
    assert dose["code"] == "DOSE_RECORDED"

    clock["now"] = WED + timedelta(minutes=window - 1)
    assert client.delete(f"/api/meds/doses/{dose['doseId']}", headers=headers).status_code == 200
    assert client.get("/api/meds/today", headers=headers).json()["plans"][0]["dosesTaken"] == 0
    assert client.delete(f"/api/meds/doses/{dose['doseId']}", headers=headers).status_code == 404

    late = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    clock["now"] = WED + timedelta(minutes=(window - 1) + window + 1)
    assert client.get("/api/meds/today", headers=headers).json()["plans"][0]["undo"] is None
    too_late = client.delete(f"/api/meds/doses/{late['doseId']}", headers=headers)
    assert too_late.status_code == 409
    assert too_late.json()["detail"]["code"] == "DOSE_UNDO_TOO_LATE"
    assert too_late.json()["detail"]["values"] == {"minutes": window}
    assert client.get("/api/meds/today", headers=headers).json()["plans"][0]["dosesTaken"] == 1
    with factory() as db:
        assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "MED_DOSE_UNDONE")) is not None


def test_doses_are_owner_only(harness, clock):
    client, factory, codes = harness
    _, mine = register(client, codes, "mymeds@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 2}, headers=mine).json()
    dose = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=mine).json()

    theirs = _other(client, codes, mine)
    assert client.get("/api/meds/today", headers=theirs).json()["plans"] == []
    assert client.delete(f"/api/meds/doses/{dose['doseId']}", headers=theirs).status_code == 404
    assert client.patch(f"/api/meds/plans/{plan['id']}", json={"timesPerDay": 4}, headers=theirs).status_code == 404
    assert client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=theirs).json()["status"] == "NOT_FOUND"

    mine = _back(client, codes, "mymeds@example.test", theirs)
    today = client.get("/api/meds/today", headers=mine).json()["plans"][0]
    assert (today["dosesPlanned"], today["dosesTaken"]) == (2, 1)


def test_times_per_day_bounds_and_clearing(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "tpd@example.test")
    most = S("meds.times_per_day_max")
    for bad in (0, most + 1, -1):
        assert client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": bad}, headers=headers).status_code == 422
    plan = client.post("/api/meds/plans", json={"name": "Iron"}, headers=headers).json()
    for bad in ({"timesPerDay": 0}, {"timesPerDay": most + 1}, {}):
        assert client.patch(f"/api/meds/plans/{plan['id']}", json=bad, headers=headers).status_code == 422
    assert client.patch(f"/api/meds/plans/{plan['id']}", json={"timesPerDay": most},
                        headers=headers).json()["timesPerDay"] == most
    assert client.patch(f"/api/meds/plans/{plan['id']}", json={"timesPerDay": None}, headers=headers).json()["timesPerDay"] is None


def test_dose_day_follows_the_students_timezone(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "dosetz@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 1}, headers=headers).json()
    clock["now"] = datetime(2026, 10, 21, 18, 20, tzinfo=timezone.utc)      # 23:50 IST
    client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers)
    assert client.get("/api/meds/today", headers=headers).json()["plans"][0]["dosesTaken"] == 1
    clock["now"] = datetime(2026, 10, 21, 18, 40, tzinfo=timezone.utc)      # 00:10 IST next day
    today = client.get("/api/meds/today", headers=headers).json()
    assert today["date"] == "2026-10-22" and today["plans"][0]["dosesTaken"] == 0
    assert client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()["already_logged"] is False


def test_dose_logging_queues_nothing_and_reminders_name_no_medicine(harness, clock):
    from services.workflow_scheduler import REMINDER_MESSAGES, reminder_message

    client, factory, codes = harness
    _, headers = register(client, codes, "quiet@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Sertraline", "timesPerDay": 1}, headers=headers).json()
    dose = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    client.delete(f"/api/meds/doses/{dose['doseId']}", headers=headers)
    with factory() as db:
        assert db.scalars(select(M.OutboxEvent)).all() == []

    client.post("/api/meds/refill-reminder", json={"medId": plan["id"], "daysBefore": 3}, headers=headers)
    with factory() as db:
        event = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "medication_refill"))
    outside = reminder_message(event.event_type)
    assert "sertraline" not in outside.lower()
    for text in REMINDER_MESSAGES.values():
        assert "sertraline" not in text.lower() and "{" not in text


# --- Rule L and no gamification -----------------------------------------------

@pytest.mark.parametrize("kind", sorted(rule_l.WELLNESS_STORES))
def test_every_wellness_store_is_clinical(kind):
    assert rule_l.wellness_plane(kind) == rule_l.CLINICAL
    table = rule_l.WELLNESS_STORES[kind]
    assert table not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]


def test_unknown_wellness_kind_is_not_silently_classified():
    with pytest.raises(KeyError):
        rule_l.wellness_plane("sleep_score")


GAMIFIED = re.compile(r'"[^"]*(points|medal|badge|score|rank|streak|reward|leaderboard|level|xp|percentile|'
                      r'peers|average_student|classmates)[^"]*"\s*:', re.I)


def test_no_points_medals_or_comparisons_in_wellness_payloads(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "nomedals@example.test")
    client.post("/api/wellness/water", json={"amountMl": 2000}, headers=headers)
    _day(client, headers, date="2026-10-21", steps=20000, floors=30)
    client.post("/api/body/measurements", json={"weightKg": 60, "heightCm": 165}, headers=headers)
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 1}, headers=headers).json()
    client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers)
    for path in ("/api/wellness/water/today", "/api/activity/trends", "/api/activity/trends?period=year",
                 "/api/body/measurements", "/api/meds/today"):
        text = client.get(path, headers=headers).text
        assert not GAMIFIED.search(text), (path, GAMIFIED.search(text))


# --- settings overrides change the behaviour (AGENTS.md rule 11) ---------------

def test_override_water_goal_default_and_bounds(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovgoal@example.test")
    override(factory, "wellness.water_goal_ml_default", 2500)
    assert client.get("/api/wellness/water/today", headers=headers).json()["goalMl"] == 2500
    old_low = S("wellness.water_goal_ml_min")
    assert client.put("/api/wellness/water/goal", json={"goalMl": old_low}, headers=headers).status_code == 200
    override(factory, "wellness.water_goal_ml_min", old_low + 100)
    refused = client.put("/api/wellness/water/goal", json={"goalMl": old_low}, headers=headers)
    assert refused.status_code == 422 and refused.json()["detail"]["values"]["min"] == old_low + 100
    assert client.get("/api/wellness/water/goal", headers=headers).json()["minMl"] == old_low + 100


def test_override_water_entry_bounds(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovwater@example.test")
    amount = S("wellness.water_entry_ml_max")
    assert client.post("/api/wellness/water", json={"amountMl": amount}, headers=headers).status_code == 201
    override(factory, "wellness.water_entry_ml_max", amount - 1)
    refused = client.post("/api/wellness/water", json={"amountMl": amount}, headers=headers)
    assert refused.status_code == 422 and refused.json()["detail"]["code"] == "WATER_AMOUNT_OUT_OF_RANGE"


def test_override_entry_backdate_and_future_tolerance(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovback@example.test")
    two_days_ago = (WED - timedelta(days=2)).isoformat()
    assert client.post("/api/wellness/water", json={"amountMl": 250, "recordedAt": two_days_ago},
                       headers=headers).status_code == 201
    override(factory, "wellness.entry_backdate_days", 1)
    refused = client.post("/api/wellness/water", json={"amountMl": 250, "recordedAt": two_days_ago}, headers=headers)
    assert refused.status_code == 422
    assert refused.json()["detail"] == {"code": "ENTRY_TOO_OLD", "message": "An entry can be at most 1 days old.",
                                        "values": {"days": 1}}

    soon = (WED + timedelta(minutes=3)).isoformat()
    assert client.post("/api/body/measurements", json={"heightCm": 170, "recordedAt": soon},
                       headers=headers).status_code == 201
    override(factory, "wellness.entry_future_tolerance_minutes", 1)
    assert client.post("/api/body/measurements", json={"heightCm": 170, "recordedAt": soon},
                       headers=headers).json()["detail"]["code"] == "ENTRY_IN_FUTURE"


def test_override_activity_backdate_and_steps_max(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovact@example.test")
    assert _day(client, headers, date="2026-10-11", steps=5000).status_code == 201
    override(factory, "wellness.activity_backdate_days", 7)
    refused = _day(client, headers, date="2026-10-11", steps=5000)
    assert refused.status_code == 422 and refused.json()["detail"]["code"] == "ACTIVITY_DAY_TOO_OLD"

    override(factory, "wellness.activity_steps_max", 4000)
    too_many = _day(client, headers, date="2026-10-21", steps=5000)
    assert too_many.status_code == 422
    assert too_many.json()["detail"]["field"] == "steps" and too_many.json()["detail"]["values"]["max"] == 4000
    assert _day(client, headers, date="2026-10-21", steps=4000).status_code == 201


def test_override_body_bounds_change_what_is_accepted_and_used_for_bmi(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovbody@example.test")
    assert client.post("/api/body/measurements", json={"weightKg": 72.5, "heightCm": 170},
                       headers=headers).status_code == 201
    override(factory, "wellness.weight_kg_min", 75.0)
    body = client.get("/api/body/measurements", headers=headers).json()
    assert body["bmi"] is None and body["bmiUnavailable"] == "VALUE_OUT_OF_RANGE"
    refused = client.post("/api/body/measurements", json={"weightKg": 72.5}, headers=headers)
    assert refused.json()["detail"]["code"] == "WEIGHT_OUT_OF_RANGE"
    override(factory, "wellness.height_cm_max", 165.0)
    assert client.post("/api/body/measurements", json={"heightCm": 170},
                       headers=headers).json()["detail"]["code"] == "HEIGHT_OUT_OF_RANGE"


def test_override_bmi_cut_offs_move_the_band(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovbmi@example.test")
    client.post("/api/body/measurements", json={"weightKg": 72.5, "heightCm": 170}, headers=headers)   # 25.1
    assert client.get("/api/body/measurements", headers=headers).json()["bmi"]["band"] == "BMI_BAND_4"
    override(factory, "wellness.bmi_cutoff_high", 27.5)
    bmi = client.get("/api/body/measurements", headers=headers).json()["bmi"]
    assert bmi["band"] == "BMI_BAND_3"
    assert [b["label"] for b in bmi["bands"]][2:] == [f"{MID:g}–27.4", "27.5 and above"]


def test_override_body_entries_and_readings_caps(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovcap@example.test")
    for minutes in range(3):
        clock["now"] = WED + timedelta(minutes=minutes)
        client.post("/api/body/measurements", json={"heightCm": 170 + minutes}, headers=headers)
    assert len(client.get("/api/body/measurements", headers=headers).json()["entries"]) == 3
    assert len(client.get("/api/health/readings?days=3650", headers=headers).json()["items"]) == 3
    override(factory, "wellness.body_entries_list_cap", 2)
    override(factory, "health.readings_list_cap", 1)
    assert len(client.get("/api/body/measurements", headers=headers).json()["entries"]) == 2
    assert len(client.get("/api/health/readings?days=3650", headers=headers).json()["items"]) == 1


def test_override_default_timezone(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovtz@example.test")
    clock["now"] = datetime(2026, 10, 21, 18, 40, tzinfo=timezone.utc)      # Thu in IST, Wed in UTC
    assert client.get("/api/wellness/water/today", headers=headers).json()["date"] == "2026-10-22"
    override(factory, "platform.default_timezone", "UTC")
    today = client.get("/api/wellness/water/today", headers=headers).json()
    assert (today["date"], today["timezone"]) == ("2026-10-21", "UTC")
    assert client.get("/api/meds/today", headers=headers).json()["timezone"] == "UTC"
    # A configured name zoneinfo does not know falls back to the declared default.
    override(factory, "platform.default_timezone", "Mars/Olympus")
    assert client.get("/api/wellness/water/today", headers=headers).json()["timezone"] == TZ


def test_override_dose_undo_window(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovundo@example.test")
    override(factory, "meds.dose_undo_minutes", 5)
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 3}, headers=headers).json()
    dose = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    assert dose["undoUntil"] == (WED + timedelta(minutes=5)).isoformat()
    clock["now"] = WED + timedelta(minutes=6)
    assert client.get("/api/meds/today", headers=headers).json()["plans"][0]["undo"] is None
    late = client.delete(f"/api/meds/doses/{dose['doseId']}", headers=headers)
    assert late.status_code == 409 and late.json()["detail"]["values"] == {"minutes": 5}


def test_override_times_per_day_max(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "ovtpd@example.test")
    most = S("meds.times_per_day_max")
    assert client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": most + 1},
                       headers=headers).status_code == 422
    override(factory, "meds.times_per_day_max", most + 2)
    assert client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": most + 1},
                       headers=headers).status_code == 201
    override(factory, "meds.times_per_day_max", 2)
    refused = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 3}, headers=headers)
    assert refused.json()["detail"]["code"] == "TIMES_PER_DAY_OUT_OF_RANGE"


# --- every server message code has its copy in the app's i18n -------------------

I18N_ENTRY = re.compile(r"'wellness\.msg\.([A-Z0-9_]+)':\s*'((?:[^'\\]|\\.)*)'")
PLACEHOLDER = re.compile(r"\{(\w+)\}")


def _i18n_messages() -> dict[str, list[dict[str, str]]]:
    source = (ROOT / "src" / "i18n" / "areas" / "wellness.ts").read_text(encoding="utf-8")
    blocks = re.split(r"export const wellness(?:En|Te|Hi)\b", source)[1:]
    assert len(blocks) == 3, "wellness.ts must define en, te and hi"
    return {code: [dict(I18N_ENTRY.findall(block)).get(code, "") for block in blocks] for code in MESSAGES}


def test_every_message_code_has_i18n_copy_with_the_same_placeholders():
    for code, (en, te, hi) in _i18n_messages().items():
        assert en == MESSAGES[code], code
        wanted = set(PLACEHOLDER.findall(MESSAGES[code]))
        for text in (te, hi):
            assert text, f"{code} has no translation"
            assert set(PLACEHOLDER.findall(text)) == wanted, code


# --- skipped doses and the water week (Mobile 2.0 reminders) -----------------------

def test_skipped_dose_fills_a_slot_but_is_never_taken(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "skip@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 2}, headers=headers).json()

    skipped = client.post("/api/meds/skip-dose", json={"medId": plan["id"]}, headers=headers).json()
    assert (skipped["code"], skipped["outcome"], skipped["dosesTaken"], skipped["dosesSkipped"]) == ("DOSE_SKIPPED", "SKIPPED", 0, 1)
    today = client.get("/api/meds/today", headers=headers).json()["plans"][0]
    assert (today["dosesTaken"], today["dosesSkipped"], today["nextSlot"]) == (0, 1, 2)
    assert today["undo"] == {"doseId": skipped["doseId"], "undoUntil": skipped["undoUntil"], "outcome": "SKIPPED"}

    clock["now"] = WED + timedelta(minutes=1)
    taken = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    assert (taken["outcome"], taken["dosesTaken"], taken["dosesSkipped"]) == ("TAKEN", 1, 1)
    clock["now"] = WED + timedelta(minutes=2)
    full = client.post("/api/meds/skip-dose", json={"medId": plan["id"]}, headers=headers).json()
    assert full["already_logged"] is True and full["code"] == "DOSES_ALL_LOGGED_TODAY"

    # Schedule and adherence count taken doses only.
    schedule = client.get("/api/meds/schedule", headers=headers).json()
    assert schedule["todays_taken"] == 1


def test_a_day_with_only_skips_is_not_covered(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "skipcover@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 1}, headers=headers).json()
    client.post("/api/meds/skip-dose", json={"medId": plan["id"]}, headers=headers)
    schedule = client.get("/api/meds/schedule", headers=headers).json()
    assert schedule["todays_taken"] == 0
    assert schedule["adherence"]["windows"]["7"]["daysCovered"] == 0


def test_skip_undo_uses_the_same_window_and_is_owner_only(harness, clock):
    client, factory, codes = harness
    _, mine = register(client, codes, "skipundo@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": 1}, headers=mine).json()
    skipped = client.post("/api/meds/skip-dose", json={"medId": plan["id"]}, headers=mine).json()
    window = S("meds.dose_undo_minutes")
    assert skipped["undoUntil"] == (WED + timedelta(minutes=window)).isoformat()

    theirs = _other(client, codes, mine)
    assert client.post("/api/meds/skip-dose", json={"medId": plan["id"]}, headers=theirs).json()["status"] == "NOT_FOUND"
    assert client.delete(f"/api/meds/doses/{skipped['doseId']}", headers=theirs).status_code == 404

    mine = _back(client, codes, "skipundo@example.test", theirs)
    assert client.delete(f"/api/meds/doses/{skipped['doseId']}", headers=mine).status_code == 200
    today = client.get("/api/meds/today", headers=mine).json()["plans"][0]
    assert (today["dosesTaken"], today["dosesSkipped"], today["nextSlot"]) == (0, 0, 1)
    with factory() as db:
        assert db.scalars(select(M.OutboxEvent)).all() == []   # nobody is told about a skip


def test_skip_requires_sign_in(harness):
    client, factory, codes = harness
    assert client.post("/api/meds/skip-dose", json={"medId": "med_x"}).status_code in (401, 403)
    assert client.get("/api/wellness/water/days").status_code in (401, 403)


def test_water_days_are_local_days_with_unknown_not_zero(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "week@example.test")
    days = S("wellness.water_history_days")
    clock["now"] = WED - timedelta(days=2)
    client.post("/api/wellness/water", json={"amountMl": 250}, headers=headers)
    client.post("/api/wellness/water", json={"amountMl": 500}, headers=headers)
    clock["now"] = WED
    client.post("/api/wellness/water", json={"amountMl": 300}, headers=headers)

    week = client.get("/api/wellness/water/days", headers=headers).json()
    assert len(week["days"]) == days
    assert (week["to"], week["days"][-1]["date"]) == ("2026-10-21", "2026-10-21")
    by_date = {d["date"]: d for d in week["days"]}
    assert by_date["2026-10-19"] == {"date": "2026-10-19", "consumedMl": 750, "entries": 2}
    assert by_date["2026-10-21"]["consumedMl"] == 300
    assert by_date["2026-10-20"] == {"date": "2026-10-20", "consumedMl": None, "entries": 0}
    assert (week["goalMl"], week["goalSource"]) == (S("wellness.water_goal_ml_default"), "DEFAULT")
    assert not GAMIFIED.search(json.dumps(week))

    theirs = _other(client, codes, headers)
    assert all(d["consumedMl"] is None for d in client.get("/api/wellness/water/days", headers=theirs).json()["days"])


def test_override_water_history_days(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "weeklen@example.test")
    override(factory, "wellness.water_history_days", 14)
    assert len(client.get("/api/wellness/water/days", headers=headers).json()["days"]) == 14
