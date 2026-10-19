"""Water, activity, heart rate, weight & BMI, and today's doses.

Owner-only clinical data (core/rule_l.py WELLNESS_STORES). The clock is pinned
through services.student_time.now_utc so day boundaries in the student's
timezone (Asia/Kolkata unless they set another) can be crossed on purpose.
"""
import json
import re
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401

from core import rule_l
from core import workflow_models as M
from services import student_time
from services.wellness_api import BMI_BANDS, bmi_band, compute_bmi

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
    assert empty == {"date": "2026-10-21", "timezone": "Asia/Kolkata", "consumedMl": 0, "goalMl": 2000,
                     "goalSource": "DEFAULT", "percent": 0, "entries": []}

    first = client.post("/api/wellness/water", json={"amountMl": 250}, headers=headers)
    assert first.status_code == 201, first.text
    clock["now"] = WED + timedelta(minutes=10)
    second = client.post("/api/wellness/water", json={"amountMl": 500}, headers=headers).json()
    assert (second["consumedMl"], second["percent"]) == (750, 38)

    undone = client.delete("/api/wellness/water/latest", headers=headers).json()
    assert undone["removedId"] == second["id"]
    assert (undone["consumedMl"], undone["percent"]) == (250, 12)
    assert client.delete("/api/wellness/water/latest", headers=headers).status_code == 200
    assert client.delete("/api/wellness/water/latest", headers=headers).status_code == 404


def test_water_goal_bounds_and_percent_over_goal(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "goal@example.test")
    for bad in (499, 6001, 0, -100):
        assert client.put("/api/wellness/water/goal", json={"goalMl": bad}, headers=headers).status_code == 422
    assert client.put("/api/wellness/water/goal", json={"goalMl": 500}, headers=headers).status_code == 200
    goal = client.get("/api/wellness/water/goal", headers=headers).json()
    assert goal == {"goalMl": 500, "goalSource": "OWNER", "minMl": 500, "maxMl": 6000}
    client.post("/api/wellness/water", json={"amountMl": 600}, headers=headers)
    today = client.get("/api/wellness/water/today", headers=headers).json()
    assert today["percent"] == 120   # not capped; the bottle caps its own fill


@pytest.mark.parametrize("body", [{"amountMl": 9}, {"amountMl": 2001}, {"amountMl": -250}, {},
                                  {"amountMl": 250, "extra": 1}])
def test_water_entry_validation(harness, clock, body):
    client, factory, codes = harness
    _, headers = register(client, codes, "waterbad@example.test")
    assert client.post("/api/wellness/water", json=body, headers=headers).status_code == 422


def test_water_entry_time_validation(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "watertime@example.test")
    future = (WED + timedelta(hours=1)).isoformat()
    old = (WED - timedelta(days=8)).isoformat()
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

    # An unknown zone name falls back to Asia/Kolkata rather than failing.
    client.put("/api/notifications/preferences", json={"timezone": "Mars/Olympus"}, headers=headers)
    assert client.get("/api/wellness/water/today", headers=headers).json()["timezone"] == "Asia/Kolkata"


def test_water_is_owner_only(harness, clock):
    client, factory, codes = harness
    _, mine = register(client, codes, "mine@example.test")
    entry = client.post("/api/wellness/water", json={"amountMl": 250}, headers=mine).json()
    client.put("/api/wellness/water/goal", json={"goalMl": 3000}, headers=mine)

    theirs = _other(client, codes, mine)
    seen = client.get("/api/wellness/water/today", headers=theirs).json()
    assert (seen["consumedMl"], seen["goalMl"], seen["entries"]) == (0, 2000, [])
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


@pytest.mark.parametrize("body", [
    {"date": "2026-10-22", "steps": 10},                     # tomorrow in IST
    {"date": "2025-10-19", "steps": 10},                     # older than 366 days
    {"date": "2026-10-21"},                                  # nothing entered
    {"date": "2026-10-21", "steps": 100001},
    {"date": "2026-10-21", "steps": -1},
    {"date": "2026-10-21", "distanceKm": 200.5},
    {"date": "2026-10-21", "floors": 501},
    {"date": "2026-10-21", "activeEnergyKcal": 10001},
    {"date": "2026-10-21", "standingMinutes": 1441},
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


@pytest.mark.parametrize("value,band", [
    (15.0, "Below 18.5"), (18.4, "Below 18.5"), (18.5, "18.5–22.9"), (22.9, "18.5–22.9"),
    (23.0, "23–24.9"), (24.9, "23–24.9"), (25.0, "25 and above"), (40.2, "25 and above"),
])
def test_bmi_bands_are_who_asian_cut_offs(value, band):
    assert bmi_band(value) == band


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
    assert body["bmi"]["value"] == 25.1 and body["bmi"]["band"] == "25 and above"
    assert body["bmi"]["bands"] == [b["label"] for b in BMI_BANDS]
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


@pytest.mark.parametrize("body", [{"weightKg": 19.9}, {"weightKg": 350.1}, {"heightCm": 99}, {"heightCm": 251},
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
    assert (today["date"], today["timezone"]) == ("2026-10-21", "Asia/Kolkata")
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
    assert dose["undoUntil"] == (WED + timedelta(minutes=30)).isoformat()

    clock["now"] = WED + timedelta(minutes=29)
    assert client.delete(f"/api/meds/doses/{dose['doseId']}", headers=headers).status_code == 200
    assert client.get("/api/meds/today", headers=headers).json()["plans"][0]["dosesTaken"] == 0
    assert client.delete(f"/api/meds/doses/{dose['doseId']}", headers=headers).status_code == 404

    late = client.post("/api/meds/log-dose", json={"medId": plan["id"]}, headers=headers).json()
    clock["now"] = WED + timedelta(minutes=29 + 31)
    assert client.get("/api/meds/today", headers=headers).json()["plans"][0]["undo"] is None
    assert client.delete(f"/api/meds/doses/{late['doseId']}", headers=headers).status_code == 409
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
    for bad in (0, 7, -1):
        assert client.post("/api/meds/plans", json={"name": "Iron", "timesPerDay": bad}, headers=headers).status_code == 422
    plan = client.post("/api/meds/plans", json={"name": "Iron"}, headers=headers).json()
    for bad in ({"timesPerDay": 0}, {"timesPerDay": 7}, {}):
        assert client.patch(f"/api/meds/plans/{plan['id']}", json=bad, headers=headers).status_code == 422
    assert client.patch(f"/api/meds/plans/{plan['id']}", json={"timesPerDay": 6}, headers=headers).json()["timesPerDay"] == 6
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
