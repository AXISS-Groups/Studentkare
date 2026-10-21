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

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from core import workflow_models as M
from core.settings_registry import setting
from services import student_time
from services.wellness_messages import coded

ADHERENCE_WINDOWS = (7, 30)
SECONDS_PER_MINUTE = 60
# A dose row's outcome (care_medication_doses.outcome). Only TAKEN is a dose taken.
TAKEN = "TAKEN"
SKIPPED = "SKIPPED"


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
                    M.MedicationDose.account_id == account_id, M.MedicationDose.dose_date == today.isoformat(),
                    M.MedicationDose.outcome == TAKEN,
                )
            ).all()))
        return {
            "user_id": account_id,
            "plans": plans,
            "todays_taken": taken_count,
            "adherence": self.adherence(db, account_id, today),
            "loop_status": "MONITORING",
            "last_loop_check": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    def adherence(self, db, account_id: str, today: date | None = None) -> dict:
        """Adherence over each window and the recent days with no dose logged.

        No streak and no score (AGENTS.md guardrail 4: no gamification of body
        metrics): a streak rewards tapping "taken", not taking the dose. A
        skipped dose does not cover its day.

        One query for every dose, rather than one per plan per day.
        """
        today = today or date.today()
        if db is None:
            return {"windows": {}, "missedDays": [], "trackedSince": None}

        plans = db.scalars(
            select(M.MedicationPlan).where(
                M.MedicationPlan.account_id == account_id, M.MedicationPlan.active.is_(True)
            )
        ).all()
        if not plans:
            return {"windows": {}, "missedDays": [], "trackedSince": None}

        dose_dates = set(
            db.scalars(
                select(M.MedicationDose.dose_date).where(
                    M.MedicationDose.account_id == account_id, M.MedicationDose.outcome == TAKEN)
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
            "missedDays": missed_days(dose_dates, active_from, today, ADHERENCE_WINDOWS[0]),
            "trackedSince": active_from.isoformat(),
        }

    def log_dose_taken(self, db, account_id: str, med_id: str) -> dict:
        """Log a dose taken, idempotently. Returns whether it was newly recorded."""
        return self._log_dose(db, account_id, med_id, TAKEN)

    def skip_dose(self, db, account_id: str, med_id: str) -> dict:
        """Record that the student skipped a dose. It fills a slot of the day but is never a dose taken."""
        return self._log_dose(db, account_id, med_id, SKIPPED)

    def _log_dose(self, db, account_id: str, med_id: str, outcome: str) -> dict:
        """Log one dose occurrence (taken or skipped) idempotently.

        A plan with a structured ``times_per_day`` has up to that many doses
        on the student's local day; one without has one a day, as before.
        Taken and skipped doses both fill the day's slots. A further log that
        day is not recorded and says so.
        """
        recorded = "DOSE_RECORDED" if outcome == TAKEN else "DOSE_SKIPPED"
        if db is None:
            return {"status": "SUCCESS", "already_logged": False, **coded(recorded)}
        plan = db.scalar(
            select(M.MedicationPlan).where(M.MedicationPlan.id == med_id, M.MedicationPlan.account_id == account_id)
        )
        if not plan:
            return {"status": "NOT_FOUND", **coded("MEDICATION_NOT_FOUND")}
        now = student_time.now_utc()
        local = now.astimezone(student_time.student_zone(db, account_id))
        today = local.date().isoformat()
        limit = plan.times_per_day or 1
        outcomes = db.scalars(select(M.MedicationDose.outcome).where(
            M.MedicationDose.plan_id == plan.id, M.MedicationDose.dose_date == today)).all()
        taken = sum(1 for o in outcomes if o == TAKEN)
        skipped = len(outcomes) - taken
        if len(outcomes) >= limit:
            code = "DOSE_ALREADY_LOGGED_TODAY" if limit == 1 else "DOSES_ALL_LOGGED_TODAY"
            return {"status": "SUCCESS", "already_logged": True, **coded(code), "dosesTaken": taken,
                    "dosesSkipped": skipped}
        dose_id = f"dose_{uuid.uuid4().hex[:12]}"
        taken_at = now.timestamp()
        db.add(M.MedicationDose(
            id=dose_id, plan_id=plan.id, account_id=account_id,
            dose_date=today, dose_time=local.strftime("%H:%M:%S"), taken_at=taken_at, outcome=outcome,
        ))
        try:
            db.commit()
        except IntegrityError:
            # The same plan logged twice within one second: one dose, not two.
            db.rollback()
            return {"status": "SUCCESS", "already_logged": True, **coded("DOSE_ALREADY_LOGGED"), "dosesTaken": taken,
                    "dosesSkipped": skipped}
        if outcome == TAKEN:
            taken += 1
        else:
            skipped += 1
        return {"status": "SUCCESS", "already_logged": False, **coded(recorded), "outcome": outcome,
                "doseId": dose_id, "undoUntil": _undo_until(taken_at, dose_undo_seconds(db)),
                "dosesTaken": taken, "dosesSkipped": skipped}

    def undo_dose(self, db, account_id: str, dose_id: str) -> str:
        """Remove a dose (taken or skipped) logged by mistake. Returns OK, NOT_FOUND or TOO_LATE.

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
        frequency is never turned into a count. ``dosesTaken`` counts doses
        taken only; ``dosesSkipped`` the ones the student skipped. ``nextSlot``
        is the ordinal of the next dose (2 = second dose of the day), after
        taken and skipped ones; no clock times are stored, so none is offered.
        ``undo`` is the latest log of the day while it can still be taken back.
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
            logged = by_plan.get(plan.id, [])
            taken = sum(1 for dose in logged if (dose.outcome or TAKEN) == TAKEN)
            planned = plan.times_per_day
            last = logged[-1] if logged else None
            undo = None
            if last is not None and now - (last.taken_at or 0.0) <= window:
                undo = {"doseId": last.id, "undoUntil": _undo_until(last.taken_at, window),
                        "outcome": last.outcome or TAKEN}
            items.append({
                "planId": plan.id, "name": plan.name, "dosage": plan.dosage,
                "dosesPlanned": planned, "dosesTaken": taken, "dosesSkipped": len(logged) - taken,
                "nextSlot": len(logged) + 1 if planned is not None and len(logged) < planned else None,
                "undo": undo,
            })
        return {"date": today, "timezone": zone.key, "plans": items}

medication_adherence_loop_agent = MedicationAdherenceLoopAgent()
