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
from typing import List

from sqlalchemy import select

from core import workflow_models as M


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
        if db is not None:
            today = time.strftime("%Y-%m-%d")
            for plan in plans:
                dose = db.scalar(
                    select(M.MedicationDose).where(M.MedicationDose.plan_id == plan["id"], M.MedicationDose.dose_date == today)
                )
                if dose:
                    taken_count += 1
        return {
            "user_id": account_id,
            "plans": plans,
            "daily_completion_rate": round((taken_count / len(plans)) * 100, 1) if plans else 0.0,
            "todays_taken": taken_count,
            "loop_status": "MONITORING",
            "last_loop_check": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
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
