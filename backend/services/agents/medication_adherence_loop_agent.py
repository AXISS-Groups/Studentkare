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
from datetime import date, timedelta
from typing import List

from sqlalchemy import select

from core import workflow_models as M

ADHERENCE_WINDOWS = (7, 30)
MAX_STREAK_LOOKBACK = 365


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
            "source": r.source, "active": r.active,
        } for r in rows]

    def add_plan(self, db, account_id: str, name: str, dosage: str = "", frequency: str = "") -> dict:
        plan_id = f"med_{uuid.uuid4().hex[:12]}"
        if db is not None:
            db.add(M.MedicationPlan(
                id=plan_id, account_id=account_id, name=name.strip()[:160],
                dosage=dosage.strip()[:120], frequency=frequency.strip()[:120],
                source="USER", active=True, created_at=time.time(),
            ))
            db.commit()
        return {"id": plan_id, "name": name, "dosage": dosage, "frequency": frequency, "source": "USER"}

    def get_user_schedule(self, db, account_id: str) -> dict:
        plans = self.list_plans(db, account_id)
        taken_count = 0
        if db is not None and plans:
            # One query for today across every plan, rather than one per plan.
            today = time.strftime("%Y-%m-%d")
            taken_count = len(set(db.scalars(
                select(M.MedicationDose.plan_id).where(
                    M.MedicationDose.account_id == account_id, M.MedicationDose.dose_date == today
                )
            ).all()))
        return {
            "user_id": account_id,
            "plans": plans,
            "daily_completion_rate": round((taken_count / len(plans)) * 100, 1) if plans else 0.0,
            "todays_taken": taken_count,
            "adherence": self.adherence(db, account_id),
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
        """Log a dose occurrence idempotently. Returns whether it was newly recorded."""
        if db is None:
            return {"status": "SUCCESS", "already_logged": False, "message": "Dose recorded for today."}
        plan = db.scalar(
            select(M.MedicationPlan).where(M.MedicationPlan.id == med_id, M.MedicationPlan.account_id == account_id)
        )
        if not plan:
            return {"status": "NOT_FOUND", "message": "Medication not found for this account."}
        today = time.strftime("%Y-%m-%d")
        now_time = time.strftime("%H:%M:%S")
        existing = db.scalar(
            select(M.MedicationDose).where(M.MedicationDose.plan_id == plan.id, M.MedicationDose.dose_date == today)
        )
        if existing:
            return {"status": "SUCCESS", "already_logged": True, "message": "Dose already logged today for this medication."}
        db.add(M.MedicationDose(
            id=f"dose_{uuid.uuid4().hex[:12]}", plan_id=plan.id, account_id=account_id,
            dose_date=today, dose_time=now_time, taken_at=time.time(),
        ))
        db.commit()
        return {"status": "SUCCESS", "already_logged": False, "message": "Dose recorded for today."}


medication_adherence_loop_agent = MedicationAdherenceLoopAgent()
