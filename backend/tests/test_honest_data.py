"""No fake data shown as real (founder's cleanup, 2026-10-20).

* Device step sync is persisted to care_readings and read back by the activity
  trends; there is no in-memory store pretending to sync, no seeded demo row,
  and no "web pedometer" provider.
* The platform timezone comes from the settings registry
  (``platform.default_timezone``) everywhere it used to be a literal; an
  override changes each behaviour.

Values come from the registry (``S(key)``), never repeated here.
"""
import time
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401

from core import settings_registry as R
from core import workflow_models as M
from services import livekit_media, student_time

TZ_KEY = "platform.default_timezone"


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


def _today() -> date:
    """Today in the declared default zone (no override is stored in the sync tests).

    Not read through the registry here: a read without the test's session
    would cache defaults and hide the overrides a test stores later.
    """
    return student_time.now_utc().astimezone(ZoneInfo(S(TZ_KEY))).date()


# --- device sync ----------------------------------------------------------------

def _sync(client, headers, **fields):
    body = {"provider": "healthkit", "date": _today().isoformat(), **fields}
    return client.post("/api/v1/movement/background-sync", json=body, headers=headers)


def test_sync_is_persisted_and_shows_in_trends(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "sync@example.test")
    steps = S("wellness.activity_steps_max") // 2
    res = _sync(client, headers, steps=steps)
    assert res.status_code == 201, res.text
    assert res.json()["status"] == "SYNCED"
    assert res.json()["day"]["steps"] == steps
    with factory() as db:
        rows = db.scalars(select(M.Reading).where(M.Reading.account_id == user["id"])).all()
    assert [(r.metric, r.value, r.source) for r in rows] == [("steps", float(steps), "HEALTHKIT")]
    trends = client.get("/api/activity/trends?period=this_week", headers=headers).json()
    assert trends["metrics"]["steps"]["total"] == steps


def test_resync_replaces_that_providers_day_and_keeps_manual_rows(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "resync@example.test")
    manual = client.post("/api/activity/entries", json={"date": _today().isoformat(), "floors": 2}, headers=headers)
    assert manual.status_code == 201
    assert _sync(client, headers, steps=100).status_code == 201
    assert _sync(client, headers, steps=250).status_code == 201
    with factory() as db:
        rows = db.scalars(select(M.Reading).where(M.Reading.account_id == user["id"])).all()
    by_source = sorted((r.source, r.metric, r.value) for r in rows)
    assert by_source == [("HEALTHKIT", "steps", 250.0), ("MANUAL", "floors", 2.0)]


def test_sync_refuses_a_made_up_provider_and_empty_payloads(harness):
    client, _factory, codes = harness
    _, headers = register(client, codes, "badsync@example.test")
    assert _sync(client, headers, provider="web_pedometer", steps=10).status_code == 422
    assert _sync(client, headers).status_code == 422          # nothing read, nothing stored
    future = (_today() + timedelta(days=2)).isoformat()
    assert _sync(client, headers, date=future, steps=10).status_code == 422


def test_sync_bounds_follow_the_registry(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "syncbounds@example.test")
    high = S("wellness.activity_steps_max")
    assert _sync(client, headers, steps=high).status_code == 201
    override(factory, "wellness.activity_steps_max", high // 2)
    assert _sync(client, headers, steps=high).status_code == 422


def test_sync_needs_a_session_and_is_owner_only(harness):
    client, _factory, codes = harness
    assert client.post("/api/v1/movement/background-sync",
                       json={"provider": "healthkit", "date": _today().isoformat(), "steps": 5}).status_code == 401
    _, first = register(client, codes, "owner-a@example.test")
    assert _sync(client, first, steps=500).status_code == 201
    client.post("/api/auth/logout", headers=first)
    _, second = register(client, codes, "owner-b@example.test")
    trends = client.get("/api/activity/trends?period=this_week", headers=second).json()
    assert trends["metrics"]["steps"]["total"] is None
    # The old seeded history endpoint is gone rather than serving a demo row.
    assert client.get("/api/v1/movement/sync-history", headers=second).status_code in (404, 405)


# --- platform timezone ------------------------------------------------------------

def test_notification_timezone_follows_the_setting_until_chosen(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "tz@example.test")
    assert client.get("/api/notifications/preferences", headers=headers).json()["timezone"] == S(TZ_KEY)
    assert client.put("/api/notifications/preferences", json={"remindersEnabled": True},
                      headers=headers).status_code == 200
    override(factory, TZ_KEY, "UTC")
    # Never chosen: still follows the setting after a save without a timezone.
    assert client.get("/api/notifications/preferences", headers=headers).json()["timezone"] == "UTC"
    client.put("/api/notifications/preferences", json={"timezone": "Europe/London"}, headers=headers)
    override(factory, TZ_KEY, "Asia/Tokyo")
    assert client.get("/api/notifications/preferences", headers=headers).json()["timezone"] == "Europe/London"


def test_fortnight_and_slot_times_follow_the_setting(harness):
    _client, factory, _codes = harness
    # 18:40 UTC on the 15th is the 16th in IST (the declared default) but the 15th in UTC.
    moment = datetime(2026, 9, 15, 18, 40, tzinfo=timezone.utc).timestamp()
    from services.workflow_api import fortnight_bounds

    with factory() as db:
        assert fortnight_bounds(moment, db=db)[0] == "2026-09-16"
        override(factory, TZ_KEY, "UTC")
        assert fortnight_bounds(moment, db=db)[0] == "2026-09-01"
        assert livekit_media.parse_slot_time("2026-10-20T10:00", db).utcoffset() == timedelta(0)


def test_campus_today_and_reminder_zone_follow_the_setting(harness):
    _client, factory, _codes = harness
    from services import campus_departure, workflow_scheduler

    override(factory, TZ_KEY, "Pacific/Kiritimati")      # UTC+14: a different date from UTC for 14 hours a day
    kiritimati = ZoneInfo("Pacific/Kiritimati")
    with factory() as db:
        assert campus_departure.today_on_campus(db) == datetime.now(kiritimati).date()
        assert workflow_scheduler._recipient_zone(None, db) == kiritimati
        prefs = M.NotificationPreference(account_id="x", timezone="")
        assert workflow_scheduler._recipient_zone(prefs, db) == kiritimati
        prefs.timezone = "Europe/Paris"
        assert workflow_scheduler._recipient_zone(prefs, db) == ZoneInfo("Europe/Paris")
