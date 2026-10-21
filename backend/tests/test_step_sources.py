"""Automatic step counting: one number per day, from the most trusted source.

Sources, most trusted first (services/wellness_api.py SOURCE_PRIORITY): Apple
Health / Health Connect, then the phone's motion sensor, then what the student
typed. They are never added together and the larger one does not win; each
source keeps one total per day, and every day says which source its number
came from. A browser has no step source, so no "web" provider is accepted.

Limits are read from the settings registry (``S(key)``), never repeated here,
and each has an override test.
"""
import time
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401

from core import settings_registry as R
from core import workflow_models as M
from services import student_time
from services.wellness_api import SOURCE_PRIORITY, SYNC_SOURCES


def S(key):
    return R.get_declaration(key).default


@pytest.fixture(autouse=True)
def _fresh_settings():
    R.reset_cache()
    yield
    R.reset_cache()


def override(factory, key, value):
    with factory() as db:
        db.merge(M.SettingOverride(key=key, value=value, updated_by="test", updated_at=time.time()))
        db.commit()
    R.reset_cache()


# Wednesday 21 Oct 2026, 11:30 IST.
WED = datetime(2026, 10, 21, 6, 0, tzinfo=timezone.utc)
TODAY = "2026-10-21"


@pytest.fixture
def clock(monkeypatch):
    state = {"now": WED}
    monkeypatch.setattr(student_time, "now_utc", lambda: state["now"])
    return state


def _sync(client, headers, provider, **fields):
    body = {"provider": provider, "date": TODAY, **fields}
    return client.post("/api/v1/movement/background-sync", json=body, headers=headers)


def _manual(client, headers, **fields):
    return client.post("/api/activity/entries", json={"date": TODAY, **fields}, headers=headers)


def _today(client, headers):
    trends = client.get("/api/activity/trends?period=this_week", headers=headers).json()
    return next((d for d in trends["days"] if d["date"] == TODAY), None), trends


def test_priority_is_health_store_then_phone_sensor_then_typed(harness, clock):
    client, _factory, codes = harness
    _, headers = register(client, codes, "priority@example.test")

    # Typed only: the typed number, labelled as typed.
    assert _manual(client, headers, steps=12000).status_code == 201
    day, _ = _today(client, headers)
    assert (day["steps"], day["sources"]["steps"]) == (12000, "MANUAL")

    # The phone's sensor counted fewer: the sensor is used, not the larger typed number, not a sum.
    res = _sync(client, headers, "phone_motion", steps=7000)
    assert res.status_code == 201, res.text
    assert (res.json()["day"]["steps"], res.json()["day"]["sources"]["steps"]) == (7000, "PHONE_MOTION")

    # Apple Health connected: its total is used over both.
    res = _sync(client, headers, "healthkit", steps=6500, distanceKm=4.2)
    assert (res.json()["day"]["steps"], res.json()["day"]["sources"]["steps"]) == (6500, "HEALTHKIT")
    day, trends = _today(client, headers)
    assert day["steps"] == 6500 and day["sources"] == {"steps": "HEALTHKIT", "distanceKm": "HEALTHKIT"}
    assert trends["metrics"]["steps"]["total"] == 6500          # one day, one number


def test_each_metric_takes_its_own_most_trusted_source(harness, clock):
    client, _factory, codes = harness
    _, headers = register(client, codes, "permetric@example.test")
    _manual(client, headers, steps=3000, floors=4)
    _sync(client, headers, "health_connect", steps=5100)
    day, _ = _today(client, headers)
    # Health Connect sent steps only, so the typed floors still stand.
    assert day["sources"] == {"steps": "HEALTH_CONNECT", "floors": "MANUAL"}
    assert (day["steps"], day["floors"]) == (5100, 4)


def test_one_total_per_day_per_source(harness, clock):
    client, factory, codes = harness
    user, headers = register(client, codes, "onetotal@example.test")
    for steps in (800, 2400, 2350):            # a re-read may also go down (the store de-duplicated)
        assert _sync(client, headers, "phone_motion", steps=steps).status_code == 201
    _sync(client, headers, "healthkit", steps=2500)
    with factory() as db:
        rows = db.scalars(select(M.Reading).where(M.Reading.account_id == user["id"])).all()
    assert sorted((r.source, r.value) for r in rows) == [("HEALTHKIT", 2500.0), ("PHONE_MOTION", 2350.0)]
    day, _ = _today(client, headers)
    assert day["steps"] == 2500


def test_clearing_typed_steps_falls_back_to_nothing_invented(harness, clock):
    client, _factory, codes = harness
    _, headers = register(client, codes, "clear@example.test")
    _manual(client, headers, steps=4000)
    assert client.delete(f"/api/activity/entries/{TODAY}", headers=headers).status_code == 200
    day, trends = _today(client, headers)
    assert day is None                                        # no row, no zero, no estimate
    assert trends["metrics"]["steps"] == {"unit": "steps", "total": None, "dailyAverage": None, "daysWithData": 0}


def test_only_real_phone_sources_are_accepted(harness, clock):
    client, _factory, codes = harness
    _, headers = register(client, codes, "providers@example.test")
    assert set(SYNC_SOURCES) == {"healthkit", "health_connect", "phone_motion"}
    assert set(SYNC_SOURCES.values()) | {"MANUAL"} == set(SOURCE_PRIORITY)
    for fake in ("web_pedometer", "browser", "accelerometer", "MANUAL", ""):
        assert _sync(client, headers, fake, steps=10).status_code == 422, fake
    assert _sync(client, headers, "phone_motion").status_code == 422          # nothing read, nothing stored


def test_synced_steps_are_bounded_by_the_daily_maximum(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "max@example.test")
    high = S("wellness.activity_steps_max")
    for provider in SYNC_SOURCES:
        assert _sync(client, headers, provider, steps=high).status_code == 201, provider
        res = _sync(client, headers, provider, steps=high + 1)
        assert res.status_code == 422, provider
        assert res.json()["detail"]["code"] == "ACTIVITY_VALUE_OUT_OF_RANGE"
        assert res.json()["detail"]["values"]["max"] == high
    assert _sync(client, headers, "phone_motion", steps=-1).status_code == 422
    override(factory, "wellness.activity_steps_max", high // 2)
    assert _sync(client, headers, "health_connect", steps=high // 2 + 1).status_code == 422


def test_sync_only_reaches_back_as_far_as_the_setting(harness, clock):
    client, factory, codes = harness
    _, headers = register(client, codes, "backdate@example.test")
    days = S("wellness.activity_sync_backdate_days")
    edge = (WED.date() - timedelta(days=days)).isoformat()
    too_old = (WED.date() - timedelta(days=days + 1)).isoformat()
    assert _sync(client, headers, "healthkit", date=edge, steps=10).status_code == 201
    res = _sync(client, headers, "healthkit", date=too_old, steps=10)
    assert res.status_code == 422
    assert res.json()["detail"] == {"code": "ACTIVITY_DAY_TOO_OLD", "message": res.json()["detail"]["message"],
                                    "values": {"days": days}}
    # Typed entries keep their own, longer window.
    assert S("wellness.activity_backdate_days") > days
    assert client.post("/api/activity/entries", json={"date": too_old, "steps": 10}, headers=headers).status_code == 201
    # Tomorrow is refused for every source.
    tomorrow = (WED.date() + timedelta(days=1)).isoformat()
    assert _sync(client, headers, "phone_motion", date=tomorrow, steps=10).status_code == 422

    override(factory, "wellness.activity_sync_backdate_days", days + 1)
    assert _sync(client, headers, "healthkit", date=too_old, steps=10).status_code == 201


def test_live_sync_cadence_is_a_public_setting():
    decl = R.get_declaration("wellness.steps_live_sync_seconds")
    assert decl.public and decl.unit == "seconds" and decl.minimum >= 1
    assert R.get_declaration("wellness.activity_sync_backdate_days").public


def test_steps_are_owner_only_and_never_scored(harness, clock):
    client, _factory, codes = harness
    _, first = register(client, codes, "owner1@example.test")
    _sync(client, first, "phone_motion", steps=9000)
    text = client.get("/api/activity/trends?period=this_week", headers=first).text
    for word in ("points", "medal", "badge", "score", "streak", "goal", "rank", "reward"):
        assert word not in text.lower(), word
    client.post("/api/auth/logout", headers=first)
    _, second = register(client, codes, "owner2@example.test")
    day, _ = _today(client, second)
    assert day is None
