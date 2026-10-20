"""
services.agents.medication_adherence_loop_agent — Account-scoped medication tracking.

Replaces the previous shared, in-memory DEMO_MEDS list. Medication plans and dose
occurrences are now persisted per account, and dose logging is idempotent so a
duplicate log cannot double-count a reward or a "taken" state. A reminder never
implies a dose was taken.
"""
from __future__ import annotations

import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import List

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from core import workflow_models as M
from core.settings_registry import setting
from services import student_time
from services.wellness_messages import coded

ADHERENCE_WINDOWS = (7, 30)
MAX_STREAK_LOOKBACK = 365
SECONDS_PER_MINUTE = 60


def dose_undo_seconds(db=None) -> int:
    """How long a dose logged by mistake can be taken back (setting meds.dose_undo_minutes)."""
    return setting("meds.dose_undo_minutes", db) * SECONDS_PER_MINUTE


def _undo_until(taken_at: float, window_seconds: int) -> str:
    return datetime.fromtimestamp(taken_at + window_seconds, tz=timezone.utc).isoformat()


def coverage(dose_dates: set[str], active_from: date, today: date, window: int) -> dict:
    """How many of the last ``window`` days carry a logged dose.

    Reported as days covered, not doses taken. ``frequency`` is free text —
    "twice daily", "as needed", "on alternate days" — so how many doses a day
    ought to contain cannot be derived without guessing, and a rate built on a
    guess would be a number the student has no reason to trust. A day counts
    when at least one dose was logged.

    The window never starts before the plan existed, so adding a medication
    today does not read as 29 missed days.
    """
    start = max(active_from, today - timedelta(days=window - 1))
    if start > today:
        return {"daysCovered": 0, "daysActive": 0, "rate": None}
    days = [start + timedelta(days=offset) for offset in range((today - start).days + 1)]
    covered = sum(1 for day in days if day.isoformat() in dose_dates)
    return {"daysCovered": covered, "daysActive": len(days), "rate": round(covered / len(days), 2)}


def current_streak(dose_dates: set[str], today: date) -> int:
    """Consecutive days up to today with a logged dose.

    A dose not yet logged today does not break the streak: the day is not over,
    and telling someone at breakfast that they have lost a 40-day streak would
    be both wrong and discouraging.
    """
    cursor = today if today.isoformat() in dose_dates else today - timedelta(days=1)
    streak = 0
    while streak < MAX_STREAK_LOOKBACK and cursor.isoformat() in dose_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def missed_days(dose_dates: set[str], active_from: date, today: date, window: int) -> List[str]:
    """Days in the window with no dose logged, most recent first, excluding today."""
    start = max(active_from, today - timedelta(days=window - 1))
    out = []
    cursor = today - timedelta(days=1)
    while cursor >= start:
        if cursor.isoformat() not in dose_dates:
            out.append(cursor.isoformat())
        cursor -= timedelta(days=1)
    return out


class MedicationAdherenceLoopAgent:
    agent_name = "Medication Adherence Loop Agent"
    version = "1.1.0"

    def list_plans(self, db, account_id: str) -> List[dict]:
        if db is None:
            return []
        rows = db.scalars(
            select(M.MedicationPlan)
            .where(M.MedicationPlan.account_id == account_id, M.MedicationPlan.active.is_(True))
            .order_by(M.MedicationPlan.created_at)
        ).all()
        return [{
            "id": r.id, "name": r.name, "dosage": r.dosage, "frequency": r.frequency,
            "timesPerDay": r.times_per_day, "source": r.source, "active": r.active,
        } for r in rows]

    def add_plan(self, db, account_id: str, name: str, dosage: str = "", frequency: str = "",
                 times_per_day: int | None = None) -> dict:
        plan_id = f"med_{uuid.uuid4().hex[:12]}"
        if db is not None:
            db.add(M.MedicationPlan(
                id=plan_id, account_id=account_id, name=name.strip()[:160],
                dosage=dosage.strip()[:120], frequency=frequency.strip()[:120],
                times_per_day=times_per_day, source="USER", active=True, created_at=time.time(),
            ))
            db.commit()
        return {"id": plan_id, "name": name, "dosage": dosage, "frequency": frequency,
                "timesPerDay": times_per_day, "source": "USER"}

    def set_times_per_day(self, db, account_id: str, plan_id: str, times_per_day: int | None) -> dict | None:
        plan = db.scalar(select(M.MedicationPlan).where(
            M.MedicationPlan.id == plan_id, M.MedicationPlan.account_id == account_id))
        if plan is None:
            return None
        plan.times_per_day = times_per_day
        db.commit()
        return {"id": plan.id, "timesPerDay": plan.times_per_day}

    def get_user_schedule(self, db, account_id: str) -> dict:
        plans = self.list_plans(db, account_id)
        taken_count = 0
        today = student_time.local_today(student_time.student_zone(db, account_id))
        if db is not None and plans:
            # One query for today across every plan, rather than one per plan.
            taken_count = len(set(db.scalars(
                select(M.MedicationDose.plan_id).where(
                    M.MedicationDose.account_id == account_id, M.MedicationDose.dose_date == today.isoformat()
                )
            ).all()))
        return {
            "user_id": account_id,
            "plans": plans,
            "daily_completion_rate": round((taken_count / len(plans)) * 100, 1) if plans else 0.0,
            "todays_taken": taken_count,
            "adherence": self.adherence(db, account_id, today),
            "loop_status": "MONITORING",
            "last_loop_check": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    def adherence(self, db, account_id: str, today: date | None = None) -> dict:
        """Adherence over each window, plus the current streak and recent gaps.

        One query for every dose, rather than one per plan per day.
        """
        today = today or date.today()
        if db is None:
            return {"windows": {}, "currentStreak": 0, "missedDays": [], "trackedSince": None}

        plans = db.scalars(
            select(M.MedicationPlan).where(
                M.MedicationPlan.account_id == account_id, M.MedicationPlan.active.is_(True)
            )
        ).all()
        if not plans:
            return {"windows": {}, "currentStreak": 0, "missedDays": [], "trackedSince": None}

        dose_dates = set(
            db.scalars(
                select(M.MedicationDose.dose_date).where(M.MedicationDose.account_id == account_id)
            ).all()
        )
        earliest = min((plan.created_at or 0.0) for plan in plans)
        active_from = (
            date.fromtimestamp(earliest) if earliest else min(dose_dates, default=today.isoformat())
        )
        if isinstance(active_from, str):
            active_from = date.fromisoformat(active_from)

        return {
            "windows": {
                str(window): coverage(dose_dates, active_from, today, window)
                for window in ADHERENCE_WINDOWS
            },
            "currentStreak": current_streak(dose_dates, today),
            "missedDays": missed_days(dose_dates, active_from, today, ADHERENCE_WINDOWS[0]),
            "trackedSince": active_from.isoformat(),
        }

    def log_dose_taken(self, db, account_id: str, med_id: str) -> dict:
        """Log a dose occurrence idempotently. Returns whether it was newly recorded.

        A plan with a structured ``times_per_day`` takes up to that many doses
        on the student's local day; one without takes one a day, as before.
        A further log that day is not recorded and says so.
        """
        if db is None:
            return {"status": "SUCCESS", "already_logged": False, **coded("DOSE_RECORDED")}
        plan = db.scalar(
            select(M.MedicationPlan).where(M.MedicationPlan.id == med_id, M.MedicationPlan.account_id == account_id)
        )
        if not plan:
            return {"status": "NOT_FOUND", **coded("MEDICATION_NOT_FOUND")}
        now = student_time.now_utc()
        local = now.astimezone(student_time.student_zone(db, account_id))
        today = local.date().isoformat()
        limit = plan.times_per_day or 1
        taken = db.scalar(select(func.count()).select_from(M.MedicationDose).where(
            M.MedicationDose.plan_id == plan.id, M.MedicationDose.dose_date == today)) or 0
        if taken >= limit:
            code = "DOSE_ALREADY_LOGGED_TODAY" if limit == 1 else "DOSES_ALL_LOGGED_TODAY"
            return {"status": "SUCCESS", "already_logged": True, **coded(code), "dosesTaken": taken}
        dose_id = f"dose_{uuid.uuid4().hex[:12]}"
        taken_at = now.timestamp()
        db.add(M.MedicationDose(
            id=dose_id, plan_id=plan.id, account_id=account_id,
            dose_date=today, dose_time=local.strftime("%H:%M:%S"), taken_at=taken_at,
        ))
        try:
            db.commit()
        except IntegrityError:
            # The same plan logged twice within one second: one dose, not two.
            db.rollback()
            return {"status": "SUCCESS", "already_logged": True, **coded("DOSE_ALREADY_LOGGED"), "dosesTaken": taken}
        return {"status": "SUCCESS", "already_logged": False, **coded("DOSE_RECORDED"),
                "doseId": dose_id, "undoUntil": _undo_until(taken_at, dose_undo_seconds(db)), "dosesTaken": taken + 1}

    def undo_dose(self, db, account_id: str, dose_id: str) -> str:
        """Remove a dose logged by mistake. Returns OK, NOT_FOUND or TOO_LATE.

        Only the owner's own dose, and only within meds.dose_undo_minutes of logging
        it: after that the log is part of the record and stays.
        """
        dose = db.scalar(select(M.MedicationDose).where(
            M.MedicationDose.id == dose_id, M.MedicationDose.account_id == account_id))
        if dose is None:
            return "NOT_FOUND"
        if student_time.now_utc().timestamp() - (dose.taken_at or 0.0) > dose_undo_seconds(db):
            return "TOO_LATE"
        db.delete(dose)
        return "OK"

    def today(self, db, account_id: str) -> dict:
        """Each active plan's doses for the student's local day.

        ``dosesPlanned`` is the structured ``timesPerDay`` or null: free-text
        frequency is never turned into a count. ``nextSlot`` is the ordinal of
        the next dose (2 = second dose of the day); no clock times are stored,
        so none is offered.
        """
        zone = student_time.student_zone(db, account_id)
        now = student_time.now_utc().timestamp()
        today = student_time.local_today(zone).isoformat()
        plans = db.scalars(select(M.MedicationPlan).where(
            M.MedicationPlan.account_id == account_id, M.MedicationPlan.active.is_(True)
        ).order_by(M.MedicationPlan.created_at)).all()
        doses = db.scalars(select(M.MedicationDose).where(
            M.MedicationDose.account_id == account_id, M.MedicationDose.dose_date == today
        ).order_by(M.MedicationDose.taken_at)).all()
        by_plan: dict[str, list] = {}
        for dose in doses:
            by_plan.setdefault(dose.plan_id, []).append(dose)
        window = dose_undo_seconds(db)
        items = []
        for plan in plans:
            taken = by_plan.get(plan.id, [])
            planned = plan.times_per_day
            last = taken[-1] if taken else None
            undo = None
            if last is not None and now - (last.taken_at or 0.0) <= window:
                undo = {"doseId": last.id, "undoUntil": _undo_until(last.taken_at, window)}
            items.append({
                "planId": plan.id, "name": plan.name, "dosage": plan.dosage,
                "dosesPlanned": planned, "dosesTaken": len(taken),
                "nextSlot": len(taken) + 1 if planned is not None and len(taken) < planned else None,
                "undo": undo,
            })
        return {"date": today, "timezone": zone.key, "plans": items}

medication_adherence_loop_agent = MedicationAdherenceLoopAgent()
