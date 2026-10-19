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
"""
from __future__ import annotations

import time
from collections import defaultdict
from datetime import date as Date
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, model_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import student_time
from services.wellness_metrics import (
    ACTIVITY_FIELDS,
    HEIGHT,
    HEIGHT_RANGE,
    WATER,
    WEIGHT,
    WEIGHT_RANGE,
    WELLNESS_METRICS,
)
from services.workflow_auth import StrictModel, authenticated_user, workflow_db

router = APIRouter(prefix="/api", tags=["Wellness logs"])

WATER_GOAL_DEFAULT_ML = 2000
WATER_GOAL_RANGE = (500, 6000)
# How far back a water entry or a body measurement may be dated.
BACKDATE_DAYS = 7
# How far back a manual activity day may be entered.
ACTIVITY_BACKDATE_DAYS = 366
FUTURE_TOLERANCE = timedelta(minutes=5)


def _new_id() -> str:
    import uuid
    return str(uuid.uuid4())


def _audit(db, user, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_new_id(), actor_id=user["id"], action=action, resource_id=resource_id,
                           created_at=time.time()))


def _check_moment(moment: datetime | None, backdate_days: int) -> datetime:
    """An aware UTC timestamp for a new entry: now, or a past time the owner chose."""
    now = student_time.now_utc()
    if moment is None:
        return now
    if moment.tzinfo is None:
        raise HTTPException(422, "Include the timezone with the time.")
    moment = moment.astimezone(timezone.utc)
    if moment > now + FUTURE_TOLERANCE:
        raise HTTPException(422, "An entry cannot be dated in the future.")
    if moment < now - timedelta(days=backdate_days):
        raise HTTPException(422, f"An entry can be at most {backdate_days} days old.")
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
    amountMl: int = Field(ge=10, le=2000)
    recordedAt: datetime | None = None


class WaterGoalInput(StrictModel):
    goalMl: int = Field(ge=WATER_GOAL_RANGE[0], le=WATER_GOAL_RANGE[1])


def _water_goal(db, account_id: str) -> tuple[int, str]:
    row = db.get(M.Preference, account_id)
    if row is not None and row.water_goal_ml is not None:
        return int(row.water_goal_ml), "OWNER"
    return WATER_GOAL_DEFAULT_ML, "DEFAULT"


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
    moment = _check_moment(body.recordedAt, BACKDATE_DAYS)
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
        raise HTTPException(404, "No water logged today.")
    latest = max(rows, key=lambda r: (student_time.parse_stored(r.recorded_at), r.id))
    db.execute(delete(M.Reading).where(M.Reading.id == latest.id, M.Reading.account_id == user["id"]))
    _audit(db, user, "WATER_ENTRY_REMOVED", latest.id)
    db.commit()
    return {"removedId": latest.id, **water_today(db, user["id"])}


@router.get("/wellness/water/goal")
def get_water_goal(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    goal, source = _water_goal(db, user["id"])
    return {"goalMl": goal, "goalSource": source, "minMl": WATER_GOAL_RANGE[0], "maxMl": WATER_GOAL_RANGE[1]}


@router.put("/wellness/water/goal")
def set_water_goal(body: WaterGoalInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.get(M.Preference, user["id"])
    if row is None:
        row = M.Preference(account_id=user["id"])
        db.add(row)
    row.water_goal_ml = body.goalMl
    _audit(db, user, "WATER_GOAL_SET", user["id"])
    db.commit()
    return {"goalMl": body.goalMl, "goalSource": "OWNER", "minMl": WATER_GOAL_RANGE[0], "maxMl": WATER_GOAL_RANGE[1]}


# --- Activity ---------------------------------------------------------------

class ActivityDayInput(StrictModel):
    """One day's manual totals. Each metric given replaces that day's manual value."""
    date: Date
    steps: int | None = Field(default=None, ge=0, le=100000)
    distanceKm: float | None = Field(default=None, ge=0, le=200, allow_inf_nan=False)
    floors: int | None = Field(default=None, ge=0, le=500)
    activeEnergyKcal: float | None = Field(default=None, ge=0, le=10000, allow_inf_nan=False)
    standingMinutes: int | None = Field(default=None, ge=0, le=1440)

    @model_validator(mode="after")
    def at_least_one(self):
        if all(getattr(self, field) is None for field in ACTIVITY_FIELDS.values()):
            raise ValueError("Enter at least one activity value.")
        return self


def _activity_day_values(rows, zone) -> dict[Date, dict[str, float]]:
    """day -> metric -> value.

    Within one source a day's entries add up; across sources the largest
    source wins rather than adding, so steps typed in by hand and the same
    steps synced later from Apple Health / Health Connect are not counted twice.
    """
    per_source: dict[tuple[Date, str, str], float] = defaultdict(float)
    for row in rows:
        per_source[(student_time.local_date_of(row.recorded_at, zone), row.metric, row.source)] += row.value
    days: dict[Date, dict[str, float]] = defaultdict(dict)
    for (day, metric, _source), value in per_source.items():
        days[day][metric] = max(days[day].get(metric, 0.0), value)
    return days


def _round(metric: str, value: float):
    whole = metric in ("steps",) or WELLNESS_METRICS.get(metric, ("", "", 0, 0, False))[4]
    if whole:
        return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _day_payload(day: Date, values: dict[str, float]) -> dict:
    out: dict = {"date": day.isoformat()}
    for metric, field in ACTIVITY_FIELDS.items():
        out[field] = _round(metric, values[metric]) if metric in values else None
    return out


@router.post("/activity/entries", status_code=201)
def save_activity_day(body: ActivityDayInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    zone = student_time.student_zone(db, user["id"])
    today = student_time.local_today(zone)
    if body.date > today:
        raise HTTPException(422, "Activity cannot be entered for a future day.")
    if body.date < today - timedelta(days=ACTIVITY_BACKDATE_DAYS):
        raise HTTPException(422, f"Activity can be entered for the last {ACTIVITY_BACKDATE_DAYS} days.")
    start, end = student_time.day_bounds_utc(body.date, zone)
    # Stored at local midday so the row always falls inside its own day.
    stamp = (start + (end - start) / 2).isoformat()
    given = {metric: getattr(body, field) for metric, field in ACTIVITY_FIELDS.items()
             if getattr(body, field) is not None}
    existing = [row for row in _rows_between(db, user["id"], set(given), start, end) if row.source == "MANUAL"]
    for row in existing:
        db.delete(row)
    for metric, value in given.items():
        db.add(M.Reading(id=_new_id(), account_id=user["id"], metric=metric, value=float(value),
                         recorded_at=stamp, source="MANUAL"))
    _audit(db, user, "ACTIVITY_DAY_SAVED", body.date.isoformat())
    db.commit()
    rows = _rows_between(db, user["id"], set(ACTIVITY_FIELDS), start, end)
    return _day_payload(body.date, _activity_day_values(rows, zone).get(body.date, {}))


@router.delete("/activity/entries/{day}")
def clear_activity_day(day: Date, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Remove the owner's manual activity values for one day. Synced rows stay."""
    zone = student_time.student_zone(db, user["id"])
    start, end = student_time.day_bounds_utc(day, zone)
    rows = [row for row in _rows_between(db, user["id"], set(ACTIVITY_FIELDS), start, end) if row.source == "MANUAL"]
    if not rows:
        raise HTTPException(404, "No activity entered for that day.")
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
    days = _activity_day_values(rows, zone)

    metrics: dict[str, dict] = {}
    for metric, field in ACTIVITY_FIELDS.items():
        values = [v[metric] for v in days.values() if metric in v]
        unit = "steps" if metric == "steps" else WELLNESS_METRICS[metric][1]
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
        "days": [_day_payload(day, days[day]) for day in sorted(days)],
    }


@router.get("/activity/trends")
def get_activity_trends(period: Period = Query("this_week"), user=Depends(authenticated_user),
                        db: Session = Depends(workflow_db)):
    return activity_trends(db, user["id"], period)


# --- Weight, height and BMI (clinical; Tier 1 screen) -------------------------

# WHO expert consultation, Lancet 2004: BMI cut-offs for Asian populations.
# Neutral labels only — no category names, colours, goals or targets.
BMI_BANDS = (
    {"label": "Below 18.5", "from": None, "below": 18.5},
    {"label": "18.5–22.9", "from": 18.5, "below": 23.0},
    {"label": "23–24.9", "from": 23.0, "below": 25.0},
    {"label": "25 and above", "from": 25.0, "below": None},
)
BMI_REFERENCE = "WHO cut-offs for Asian populations (2004). Shown for information only."


class BodyMeasurementInput(StrictModel):
    weightKg: float | None = Field(default=None, ge=WEIGHT_RANGE[0], le=WEIGHT_RANGE[1], allow_inf_nan=False)
    heightCm: float | None = Field(default=None, ge=HEIGHT_RANGE[0], le=HEIGHT_RANGE[1], allow_inf_nan=False)
    recordedAt: datetime | None = None

    @model_validator(mode="after")
    def at_least_one(self):
        if self.weightKg is None and self.heightCm is None:
            raise ValueError("Enter a weight, a height, or both.")
        return self


def compute_bmi(weight_kg: float, height_cm: float) -> float:
    """kg/m², rounded half-up to one decimal."""
    metres = Decimal(str(height_cm)) / Decimal(100)
    return float((Decimal(str(weight_kg)) / (metres * metres)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def bmi_band(value: float) -> str:
    """Band of the rounded value, so the label always matches the number shown."""
    for band in BMI_BANDS:
        if band["below"] is None or value < band["below"]:
            return band["label"]
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
    bmi = None
    unavailable = None
    if weight is None or height is None:
        unavailable = "NEEDS_WEIGHT_AND_HEIGHT"
    elif not (WEIGHT_RANGE[0] <= weight.value <= WEIGHT_RANGE[1] and HEIGHT_RANGE[0] <= height.value <= HEIGHT_RANGE[1]):
        # A weight from the generic form can be outside adult bounds; no BMI is
        # better than an absurd one.
        unavailable = "VALUE_OUT_OF_RANGE"
    else:
        value = compute_bmi(weight.value, height.value)
        bmi = {"value": value, "unit": "kg/m²", "band": bmi_band(value),
               "bands": [band["label"] for band in BMI_BANDS], "reference": BMI_REFERENCE,
               "weightRecordedAt": weight.recorded_at, "heightRecordedAt": height.recorded_at}
    entries = db.scalars(select(M.Reading).where(M.Reading.account_id == account_id,
                                                 M.Reading.metric.in_([WEIGHT, HEIGHT]))
                         .order_by(M.Reading.recorded_at.desc()).limit(100)).all()
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
    moment = _check_moment(body.recordedAt, BACKDATE_DAYS).isoformat()
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
