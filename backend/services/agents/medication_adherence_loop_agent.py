"""
services.agents.medication_adherence_loop_agent — Loop Agent for Daily Medication Tracking & Care Points.
Runs continuous evaluation of student dose compliance, manages streaks, and awards +10 Care Points.
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class MedItem(BaseModel):
    id: str
    name: str
    dosage: str
    timing: str
    is_taken: bool = False
    taken_at: Optional[str] = None


class AdherenceStatus(BaseModel):
    user_id: str
    current_streak_days: int
    total_points_earned: int
    daily_completion_rate: float
    todays_medications: List[MedItem]
    loop_status: str
    last_loop_check: str


DEMO_MEDS = [
    MedItem(id="m1", name="Tata 1mg Multivitamin Daily", dosage="1 Tablet", timing="08:30 AM (After Breakfast)", is_taken=True, taken_at="08:45 AM"),
    MedItem(id="m2", name="Vitamin D3 60K IU", dosage="1 Capsule", timing="01:30 PM (After Lunch)", is_taken=False),
    MedItem(id="m3", name="Omega-3 Deep Sea Fish Oil", dosage="1 Softgel", timing="09:00 PM (After Dinner)", is_taken=False),
]


class MedicationAdherenceLoopAgent:
    def __init__(self) -> None:
        self.agent_name = "Medication Adherence Loop Agent"
        self.version = "1.0.0"
        self.is_running = True

    def get_user_schedule(self, user_id: str) -> AdherenceStatus:
        """Returns student medication schedule and adherence telemetry."""
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        taken_count = sum(1 for m in DEMO_MEDS if m.is_taken)
        rate = round((taken_count / len(DEMO_MEDS)) * 100, 1)

        return AdherenceStatus(
            user_id=user_id,
            current_streak_days=5,
            total_points_earned=150,
            daily_completion_rate=rate,
            todays_medications=DEMO_MEDS,
            loop_status="ACTIVE_LOOP_MONITORING",
            last_loop_check=now_str,
        )

    def log_dose_taken(self, user_id: str, med_id: str) -> Dict[str, Any]:
        """Logs dose completion, updates streak, and awards +10 Care Points."""
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        for m in DEMO_MEDS:
            if m.id == med_id:
                m.is_taken = True
                m.taken_at = now_str

        taken_count = sum(1 for m in DEMO_MEDS if m.is_taken)
        all_done = taken_count == len(DEMO_MEDS)
        points_awarded = 10 if all_done else 0

        return {
            "status": "SUCCESS",
            "med_id": med_id,
            "is_taken": True,
            "all_daily_doses_completed": all_done,
            "points_awarded": points_awarded,
            "current_streak_days": 6 if all_done else 5,
            "message": "🎉 Dose recorded! +10 Care Points awarded for daily adherence streak!" if all_done else "Dose recorded successfully.",
        }


medication_adherence_loop_agent = MedicationAdherenceLoopAgent()
