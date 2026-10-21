"""Water, activity, and weight & height: a student's own wellness logs.

Owner-only, clinical plane (core/rule_l.py WELLNESS_STORES). Everything is a
row in ``care_readings``; the only new state is the water goal on
``care_preferences``. Another account's data is never read: every query is
filtered by the signed-in account, so someone else's id is a 404.

What this module will not do (AGENTS.md guardrail 4, DESIGN.md §6):
* no points, medals, streaks, scores, ranks or comparisons with other students;
* no heart rate in any trend — it is a clinical value and is returned raw to
  its owner only, by GET /health/readings;
* no BMI anywhere except GET /body/measurements. BMI is computed on read, is
  never stored, and never appears in a summary, home, widget or notification
  payload. Its bands are neutral labels: no colours, words of judgement,
  goals, targets, or change-over-time.

Days are the student's local calendar days (services/student_time.py).

Every limit, window and cut-off here is a setting (core/settings_registry.py,
``wellness.*``), read per request, so a super admin's override applies at once.
Every message is a stable code (services/wellness_messages.py) the app shows
from its i18n catalogues.
"""
from __future__ import annotations

import time
from collections import defaultdict
from datetime import date as Date
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import student_time
from services.wellness_messages import coded, error, message
from services.wellness_metrics import (
    ACTIVE_ENERGY,
    ACTIVITY_FIELDS,
    DISTANCE,
    FLOORS,
    HEIGHT,
    STEPS,
    WATER,
    WEIGHT,
    WELLNESS_METRICS,
)
from services.workflow_auth import StrictModel, authenticated_user, workflow_db

router = APIRouter(prefix="/api", tags=["Wellness logs"])

# Structural: a day has this many minutes, so no day has more standing minutes.
MINUTES_PER_DAY = 24 * 60

# The upper bound of each activity metric's manual daily total (lower bound 0).
ACTIVITY_MAX_KEYS: dict[str, str] = {
    STEPS: "wellness.activity_steps_max",
    DISTANCE: "wellness.activity_distance_km_max",
    FLOORS: "wellness.activity_floors_max",
    ACTIVE_ENERGY: "wellness.activity_energy_kcal_max",
}
BMI_CUTOFF_KEYS = ("wellness.bmi_cutoff_low", "wellness.bmi_cutoff_mid", "wellness.bmi_cutoff_high")


def _range(db, low_key: str, high_key: str) -> tuple:
    return setting(low_key, db), setting(high_key, db)


def _new_id() -> str:
    import uuid
    return str(uuid.uuid4())


def _audit(db, user, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_new_id(), actor_id=user["id"], action=action, resource_id=resource_id,
                           created_at=time.time()))


def _check_moment(db, moment: datetime | None) -> datetime:
    """An aware UTC timestamp for a new entry: now, or a past time the owner chose."""
    now = student_time.now_utc()
    if moment is None:
        return now
    if moment.tzinfo is None:
        raise error(422, "TIMEZONE_REQUIRED")
    moment = moment.astimezone(timezone.utc)
    if moment > now + timedelta(minutes=setting("wellness.entry_future_tolerance_minutes", db)):
        raise error(422, "ENTRY_IN_FUTURE")
    backdate_days = setting("wellness.entry_backdate_days", db)
    if moment < now - timedelta(days=backdate_days):
        raise error(422, "ENTRY_TOO_OLD", days=backdate_days)
    return moment


def _rows_between(db, account_id: str, metrics: set[str], start_utc: datetime, end_utc: datetime) -> list:
    """Owner's readings for ``metrics`` with start <= recorded_at < end.

    ``recorded_at`` is an ISO string, so the SQL range is padded by a day and
    the exact cut is made on the parsed timestamp — a string compare on mixed
    fractional-second formats is not trusted at the boundary.
    """
    pad = timedelta(days=1)
    rows = db.scalars(select(M.Reading).where(
        M.Reading.account_id == account_id,
        M.Reading.metric.in_(sorted(metrics)),
        M.Reading.recorded_at >= (start_utc - pad).isoformat(),
        M.Reading.recorded_at < (end_utc + pad).isoformat(),
    )).all()
    return [row for row in rows if start_utc <= student_time.parse_stored(row.recorded_at) < end_utc]


# --- Water ------------------------------------------------------------------

class WaterInput(StrictModel):
    # Bounds are settings, checked in the handler (wellness.water_entry_ml_*).
    amountMl: int
    recordedAt: datetime | None = None


class WaterGoalInput(StrictModel):
    # Bounds are settings, checked in the handler (wellness.water_goal_ml_*).
    goalMl: int


def _water_goal(db, account_id: str) -> tuple[int, str]:
    row = db.get(M.Preference, account_id)
    if row is not None and row.water_goal_ml is not None:
        return int(row.water_goal_ml), "OWNER"
    return setting("wellness.water_goal_ml_default", db), "DEFAULT"


def _goal_payload(db, goal: int, source: str) -> dict:
    low, high = _range(db, "wellness.water_goal_ml_min", "wellness.water_goal_ml_max")
    return {"goalMl": goal, "goalSource": source, "minMl": low, "maxMl": high}


def water_today(db, account_id: str) -> dict:
    zone = student_time.student_zone(db, account_id)
    today = student_time.local_today(zone)
    start, end = student_time.day_bounds_utc(today, zone)
    rows = sorted(_rows_between(db, account_id, {WATER}, start, end), key=lambda r: r.recorded_at)
    consumed = int(sum(row.value for row in rows))
    goal, goal_source = _water_goal(db, account_id)
    return {
        "date": today.isoformat(), "timezone": zone.key,
        "consumedMl": consumed, "goalMl": goal, "goalSource": goal_source,
        # Not capped: 2400 of 2000 is 120. A client drawing a bottle caps the fill.
        "percent": round(consumed * 100 / goal),
        "entries": [{"id": r.id, "amountMl": int(r.value), "recordedAt": r.recorded_at, "source": r.source}
                    for r in rows],
    }


@router.get("/wellness/water/today")
def get_water_today(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return water_today(db, user["id"])


@router.post("/wellness/water", status_code=201)
def log_water(body: WaterInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    low, high = _range(db, "wellness.water_entry_ml_min", "wellness.water_entry_ml_max")
    if not low <= body.amountMl <= high:
        raise error(422, "WATER_AMOUNT_OUT_OF_RANGE", min=low, max=high)
    moment = _check_moment(db, body.recordedAt)
    row = M.Reading(id=_new_id(), account_id=user["id"], metric=WATER, value=float(body.amountMl),
                    recorded_at=moment.isoformat(), source="MANUAL")
    db.add(row)
    _audit(db, user, "WATER_LOGGED", row.id)
    db.commit()
    return {"id": row.id, **water_today(db, user["id"])}


@router.delete("/wellness/water/latest")
def undo_latest_water(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The "−" control: remove the most recent water entry of today (local day).

    Corrections are deletions of the owner's own entry, never negative amounts,
    so a day's total is always a sum of real logs and cannot go below zero.
    Older entries are removed by id with DELETE /health/readings/{id}.
    """
    zone = student_time.student_zone(db, user["id"])
    start, end = student_time.day_bounds_utc(student_time.local_today(zone), zone)
    rows = _rows_between(db, user["id"], {WATER}, start, end)
    if not rows:
        raise error(404, "NO_WATER_TODAY")
    latest = max(rows, key=lambda r: (student_time.parse_stored(r.recorded_at), r.id))
    db.execute(delete(M.Reading).where(M.Reading.id == latest.id, M.Reading.account_id == user["id"]))
    _audit(db, user, "WATER_ENTRY_REMOVED", latest.id)
    db.commit()
    return {"removedId": latest.id, **water_today(db, user["id"])}


def water_days(db, account_id: str) -> dict:
    """The last ``wellness.water_history_days`` local days, oldest first, today last.

    A day with no entry has ``consumedMl`` null: nothing logged is unknown, not
    zero. The goal is today's; goals are not kept per day, so past days are not
    marked as met or missed.
    """
    zone = student_time.student_zone(db, account_id)
    today = student_time.local_today(zone)
    first = today - timedelta(days=setting("wellness.water_history_days", db) - 1)
    start, _ = student_time.day_bounds_utc(first, zone)
    _, end = student_time.day_bounds_utc(today, zone)
    totals: dict[Date, list[float]] = defaultdict(list)
    for row in _rows_between(db, account_id, {WATER}, start, end):
        totals[student_time.parse_stored(row.recorded_at).astimezone(zone).date()].append(row.value)
    goal, goal_source = _water_goal(db, account_id)
    days = []
    day = first
    while day <= today:
        amounts = totals.get(day, [])
        days.append({"date": day.isoformat(), "consumedMl": int(sum(amounts)) if amounts else None,
                     "entries": len(amounts)})
        day += timedelta(days=1)
    return {"timezone": zone.key, "from": first.isoformat(), "to": today.isoformat(),
            "goalMl": goal, "goalSource": goal_source, "days": days}


@router.get("/wellness/water/days")
def get_water_days(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return water_days(db, user["id"])


@router.get("/wellness/water/goal")
def get_water_goal(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    goal, source = _water_goal(db, user["id"])
    return _goal_payload(db, goal, source)


@router.put("/wellness/water/goal")
def set_water_goal(body: WaterGoalInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    low, high = _range(db, "wellness.water_goal_ml_min", "wellness.water_goal_ml_max")
    if not low <= body.goalMl <= high:
        raise error(422, "WATER_GOAL_OUT_OF_RANGE", min=low, max=high)
    row = db.get(M.Preference, user["id"])
    if row is None:
        row = M.Preference(account_id=user["id"])
        db.add(row)
    row.water_goal_ml = body.goalMl
    _audit(db, user, "WATER_GOAL_SET", user["id"])
    db.commit()
    return _goal_payload(db, body.goalMl, "OWNER")


# --- Activity ---------------------------------------------------------------

class ActivityDayInput(StrictModel):
    """One day's manual totals. Each metric given replaces that day's manual value.

    A total is never negative and standing minutes never exceed a day (both
    structural); the other upper bounds are settings, checked in the handler.
    """
    date: Date
    steps: int | None = Field(default=None, ge=0)
    distanceKm: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    floors: int | None = Field(default=None, ge=0)
    activeEnergyKcal: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    standingMinutes: int | None = Field(default=None, ge=0, le=MINUTES_PER_DAY)


def _check_activity(db, body: ActivityDayInput) -> None:
    if all(getattr(body, field) is None for field in ACTIVITY_FIELDS.values()):
        raise error(422, "ACTIVITY_EMPTY")
    for metric, key in ACTIVITY_MAX_KEYS.items():
        value, high = getattr(body, ACTIVITY_FIELDS[metric]), setting(key, db)
        if value is not None and value > high:
            raise HTTPException(422, {**coded("ACTIVITY_VALUE_OUT_OF_RANGE", min=0, max=high),
                                      "field": ACTIVITY_FIELDS[metric]})


# Where a day's activity number may come from, most trusted first. Sources are
# never added together: for each day and metric the first source in this order
# that has a value is the one shown, so the same walk read from Apple Health,
# counted by the phone's motion sensor and typed in by hand counts once.
# The platform health stores come first because they already merge the phone
# and a watch without double counting; the phone's own sensor is next; what the
# student typed is the fallback. A source not listed here (an older row) ranks
# after all of them.
SOURCE_PRIORITY: tuple[str, ...] = ("HEALTHKIT", "HEALTH_CONNECT", "PHONE_MOTION", "MANUAL")


def _rank(source: str) -> int:
    return SOURCE_PRIORITY.index(source) if source in SOURCE_PRIORITY else len(SOURCE_PRIORITY)


def _activity_days(rows, zone) -> dict[Date, dict[str, tuple[float, str]]]:
    """day -> metric -> (value, the source it came from).

    Within one source a day's entries add up; across sources the most trusted
    one (SOURCE_PRIORITY) is used and the others are ignored — never added, and
    not "whichever is larger", so a bigger number typed in by hand does not
    replace what a connected health store read. Equal rank (two phones on two
    platforms) keeps the larger, so one walk is still one number.
    """
    per_source: dict[tuple[Date, str, str], float] = defaultdict(float)
    for row in rows:
        per_source[(student_time.local_date_of(row.recorded_at, zone), row.metric, row.source)] += row.value
    days: dict[Date, dict[str, tuple[float, str]]] = defaultdict(dict)
    for (day, metric, source), value in per_source.items():
        held = days[day].get(metric)
        if held is None or (_rank(source), -value) < (_rank(held[1]), -held[0]):
            days[day][metric] = (value, source)
    return days


def _round(metric: str, value: float):
    whole = metric == STEPS or WELLNESS_METRICS.get(metric, ("", False))[1]
    if whole:
        return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _day_payload(day: Date, chosen: dict[str, tuple[float, str]]) -> dict:
    """One day's totals, and for each value the source it came from (so the app can say so)."""
    out: dict = {"date": day.isoformat()}
    for metric, field in ACTIVITY_FIELDS.items():
        out[field] = _round(metric, chosen[metric][0]) if metric in chosen else None
    out["sources"] = {field: chosen[metric][1] for metric, field in ACTIVITY_FIELDS.items() if metric in chosen}
    return out


def _store_day(db, user, body: ActivityDayInput, source: str, audit_action: str,
               backdate_key: str = "wellness.activity_backdate_days") -> dict:
    """Replace ``source``'s values for ``body.date`` with the ones given; return the merged day.

    Shared by manual entry (source MANUAL) and device sync (one source per
    provider), so a re-sync of the same day replaces that provider's numbers
    instead of adding to them, and never touches another source's rows: the
    server keeps one total per day per source. ``backdate_key`` is the setting
    for how far back this kind of entry may be dated.
    """
    _check_activity(db, body)
    zone = student_time.student_zone(db, user["id"])
    today = student_time.local_today(zone)
    if body.date > today:
        raise error(422, "ACTIVITY_DAY_IN_FUTURE")
    backdate_days = setting(backdate_key, db)
    if body.date < today - timedelta(days=backdate_days):
        raise error(422, "ACTIVITY_DAY_TOO_OLD", days=backdate_days)
    start, end = student_time.day_bounds_utc(body.date, zone)
    # Stored at local midday so the row always falls inside its own day.
    stamp = (start + (end - start) / 2).isoformat()
    given = {metric: getattr(body, field) for metric, field in ACTIVITY_FIELDS.items()
             if getattr(body, field) is not None}
    existing = [row for row in _rows_between(db, user["id"], set(given), start, end) if row.source == source]
    for row in existing:
        db.delete(row)
    for metric, value in given.items():
        db.add(M.Reading(id=_new_id(), account_id=user["id"], metric=metric, value=float(value),
                         recorded_at=stamp, source=source))
    _audit(db, user, audit_action, body.date.isoformat())
    db.commit()
    rows = _rows_between(db, user["id"], set(ACTIVITY_FIELDS), start, end)
    return _day_payload(body.date, _activity_days(rows, zone).get(body.date, {}))


@router.post("/activity/entries", status_code=201)
def save_activity_day(body: ActivityDayInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return _store_day(db, user, body, "MANUAL", "ACTIVITY_DAY_SAVED")


# --- Device sync (Apple Health / Health Connect) ------------------------------

# Provider -> care_readings.source. Only sources that count steps on the phone:
# the platform health stores and the phone's own motion coprocessor (iOS Core
# Motion's day total, read by the app). There is no "web pedometer" (a browser
# has no reliable step source), so none is accepted.
SYNC_SOURCES: dict[str, str] = {
    "healthkit": "HEALTHKIT",
    "health_connect": "HEALTH_CONNECT",
    "phone_motion": "PHONE_MOTION",
}


class DeviceSyncInput(ActivityDayInput):
    """One local day's totals read on the phone, as the app read them.

    The app sends only values the platform returned; a metric it could not read
    is left out, never filled with a guess. Bounds are the manual ones
    (``wellness.activity_*_max``); how far back a day may be is
    ``wellness.activity_sync_backdate_days`` (a phone keeps only recent days).
    """
    provider: Literal["healthkit", "health_connect", "phone_motion"]


@router.post("/v1/movement/background-sync", status_code=201)
def sync_device_day(body: DeviceSyncInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Persist a day's device totals to care_readings (owner only, clinical plane).

    They appear in GET /activity/trends beside manual entries. Each source keeps
    one total per day (re-sending a day replaces that provider's values), and
    the trends use the most trusted source per day (SOURCE_PRIORITY), never a sum.
    """
    day = _store_day(db, user, body, SYNC_SOURCES[body.provider], "ACTIVITY_DAY_SYNCED",
                     backdate_key="wellness.activity_sync_backdate_days")
    return {"status": "SYNCED", "provider": body.provider, "day": day}


@router.delete("/activity/entries/{day}")
def clear_activity_day(day: Date, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Remove the owner's manual activity values for one day. Synced rows stay."""
    zone = student_time.student_zone(db, user["id"])
    start, end = student_time.day_bounds_utc(day, zone)
    rows = [row for row in _rows_between(db, user["id"], set(ACTIVITY_FIELDS), start, end) if row.source == "MANUAL"]
    if not rows:
        raise error(404, "NO_ACTIVITY_FOR_DAY")
    for row in rows:
        db.delete(row)
    _audit(db, user, "ACTIVITY_DAY_CLEARED", day.isoformat())
    db.commit()
    return {"success": True}


Period = Literal["this_week", "last_week", "month", "year"]


def period_bounds(period: str, today: Date) -> tuple[Date, Date]:
    """Inclusive local dates. Weeks run Monday-Sunday; the current ones end today."""
    if period == "this_week":
        return today - timedelta(days=today.weekday()), today
    if period == "last_week":
        start = today - timedelta(days=today.weekday() + 7)
        return start, start + timedelta(days=6)
    if period == "month":
        return today.replace(day=1), today
    if period == "year":
        return today.replace(month=1, day=1), today
    raise ValueError(period)


def activity_trends(db, account_id: str, period: str) -> dict:
    zone = student_time.student_zone(db, account_id)
    first, last = period_bounds(period, student_time.local_today(zone))
    start, _ = student_time.day_bounds_utc(first, zone)
    _, end = student_time.day_bounds_utc(last, zone)
    rows = _rows_between(db, account_id, set(ACTIVITY_FIELDS), start, end)
    chosen = _activity_days(rows, zone)
    days = {day: {metric: pair[0] for metric, pair in metrics.items()} for day, metrics in chosen.items()}

    metrics: dict[str, dict] = {}
    for metric, field in ACTIVITY_FIELDS.items():
        values = [v[metric] for v in days.values() if metric in v]
        unit = STEPS if metric == STEPS else WELLNESS_METRICS[metric][0]
        metrics[field] = {
            "unit": unit,
            "total": _round(metric, sum(values)) if values else None,
            # Averaged over the days that have a value. Days with nothing
            # entered are unknown, not zero, so they are not counted.
            "dailyAverage": _round(metric, sum(values) / len(values)) if values else None,
            "daysWithData": len(values),
        }

    best = None
    stepped = [(day, v["steps"]) for day, v in days.items() if v.get("steps", 0) > 0]
    if stepped:
        # Highest steps; a tie goes to the earliest day.
        day, _ = min(stepped, key=lambda item: (-item[1], item[0]))
        best_values = days[day]
        best = {"date": day.isoformat(), "steps": _round("steps", best_values["steps"]),
                "distanceKm": _round("distance", best_values["distance"]) if "distance" in best_values else None,
                "floors": _round("floors", best_values["floors"]) if "floors" in best_values else None}

    return {
        "period": period, "timezone": zone.key, "from": first.isoformat(), "to": last.isoformat(),
        "daysInPeriod": (last - first).days + 1,
        "metrics": metrics,
        "bestDay": best,
        "days": [_day_payload(day, chosen[day]) for day in sorted(chosen)],
    }


@router.get("/activity/trends")
def get_activity_trends(period: Period = Query("this_week"), user=Depends(authenticated_user),
                        db: Session = Depends(workflow_db)):
    return activity_trends(db, user["id"], period)


# --- Weight, height and BMI (clinical; Tier 1 screen) -------------------------

# BMI bands: neutral labels only — no category names, colours, goals or
# targets. The cut-offs are clinical settings (wellness.bmi_cutoff_*, WHO
# expert consultation, Lancet 2004, for Asian populations; clinical owner).
# BMI is shown to one decimal, so a band ending below 23 reads "…–22.9".
BMI_DISPLAY_STEP = Decimal("0.1")


def bmi_bands(db=None) -> list[dict]:
    """The four bands from the configured cut-offs: code, bounds and English label."""
    low, mid, high = (setting(key, db) for key in BMI_CUTOFF_KEYS)

    def between(start: float, below: float) -> dict:
        to = float(Decimal(str(below)) - BMI_DISPLAY_STEP)
        return {"from": start, "below": below, "label": message("BMI_BAND_BETWEEN", **{"from": start, "to": to})}

    return [
        {"code": "BMI_BAND_1", "from": None, "below": low, "label": message("BMI_BAND_BELOW", below=low)},
        {"code": "BMI_BAND_2", **between(low, mid)},
        {"code": "BMI_BAND_3", **between(mid, high)},
        {"code": "BMI_BAND_4", "from": high, "below": None, "label": message("BMI_BAND_FROM", **{"from": high})},
    ]


class BodyMeasurementInput(StrictModel):
    # Bounds are settings (wellness.weight_kg_*, wellness.height_cm_*), checked in the handler.
    weightKg: float | None = Field(default=None, allow_inf_nan=False)
    heightCm: float | None = Field(default=None, allow_inf_nan=False)
    recordedAt: datetime | None = None


def _body_ranges(db) -> tuple[tuple[float, float], tuple[float, float]]:
    return (_range(db, "wellness.weight_kg_min", "wellness.weight_kg_max"),
            _range(db, "wellness.height_cm_min", "wellness.height_cm_max"))


def _check_body(db, body: BodyMeasurementInput) -> None:
    if body.weightKg is None and body.heightCm is None:
        raise error(422, "BODY_EMPTY")
    (w_low, w_high), (h_low, h_high) = _body_ranges(db)
    if body.weightKg is not None and not w_low <= body.weightKg <= w_high:
        raise error(422, "WEIGHT_OUT_OF_RANGE", min=w_low, max=w_high)
    if body.heightCm is not None and not h_low <= body.heightCm <= h_high:
        raise error(422, "HEIGHT_OUT_OF_RANGE", min=h_low, max=h_high)


def compute_bmi(weight_kg: float, height_cm: float) -> float:
    """kg/m², rounded half-up to one decimal."""
    metres = Decimal(str(height_cm)) / Decimal(100)
    return float((Decimal(str(weight_kg)) / (metres * metres)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def bmi_band(value: float, bands: list[dict]) -> dict:
    """Band of the rounded value, so the label always matches the number shown."""
    for band in bands:
        if band["below"] is None or value < band["below"]:
            return band
    raise AssertionError("unreachable")


def _latest(db, account_id: str, metric: str):
    return db.scalar(select(M.Reading).where(M.Reading.account_id == account_id, M.Reading.metric == metric)
                     .order_by(M.Reading.recorded_at.desc(), M.Reading.id.desc()).limit(1))


def _measure(row, unit: str):
    if row is None:
        return None
    return {"id": row.id, "value": row.value, "unit": unit, "recordedAt": row.recorded_at, "source": row.source}


def body_measurements(db, account_id: str) -> dict:
    weight, height = _latest(db, account_id, WEIGHT), _latest(db, account_id, HEIGHT)
    (w_low, w_high), (h_low, h_high) = _body_ranges(db)
    bmi = None
    unavailable = None
    if weight is None or height is None:
        unavailable = "NEEDS_WEIGHT_AND_HEIGHT"
    elif not (w_low <= weight.value <= w_high and h_low <= height.value <= h_high):
        # A weight from the generic form can be outside adult bounds; no BMI is
        # better than an absurd one.
        unavailable = "VALUE_OUT_OF_RANGE"
    else:
        value = compute_bmi(weight.value, height.value)
        bands = bmi_bands(db)
        # ``band`` is the code of the band the value falls in; the app shows
        # each band from wellness.msg.BMI_BAND_* with its bounds, ``label`` is
        # the English fallback.
        bmi = {"value": value, "unit": "kg/m²", "band": bmi_band(value, bands)["code"],
               "bands": bands, "reference": coded("BMI_REFERENCE"),
               "weightRecordedAt": weight.recorded_at, "heightRecordedAt": height.recorded_at}
    entries = db.scalars(select(M.Reading).where(M.Reading.account_id == account_id,
                                                 M.Reading.metric.in_([WEIGHT, HEIGHT]))
                         .order_by(M.Reading.recorded_at.desc())
                         .limit(setting("wellness.body_entries_list_cap", db))).all()
    return {
        "weight": _measure(weight, "kg"), "height": _measure(height, "cm"),
        "bmi": bmi, "bmiUnavailable": unavailable,
        # The owner's own entries, newest first, so one can be deleted
        # (DELETE /health/readings/{id}). No differences between them are computed.
        "entries": [{"id": r.id, "metric": r.metric, "value": r.value, "unit": "kg" if r.metric == WEIGHT else "cm",
                     "recordedAt": r.recorded_at, "source": r.source} for r in entries],
    }


@router.get("/body/measurements")
def get_body_measurements(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return body_measurements(db, user["id"])


@router.post("/body/measurements", status_code=201)
def add_body_measurement(body: BodyMeasurementInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _check_body(db, body)
    moment = _check_moment(db, body.recordedAt).isoformat()
    ids = []
    for metric, value in ((WEIGHT, body.weightKg), (HEIGHT, body.heightCm)):
        if value is None:
            continue
        row = M.Reading(id=_new_id(), account_id=user["id"], metric=metric, value=float(value),
                        recorded_at=moment, source="MANUAL")
        db.add(row)
        _audit(db, user, "BODY_MEASUREMENT_RECORDED", row.id)
        ids.append(row.id)
    db.commit()
    return {"ids": ids, **body_measurements(db, user["id"])}
