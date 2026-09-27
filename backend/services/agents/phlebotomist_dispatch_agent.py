"""
A stub for phlebotomist dispatch. Sample data — do not expose to a student.

ARCHITECTURE.md lists this as "Stub with logic", and PHLEBOTOMISTS_POOL below is
invented: made-up names, phone numbers, certifications and ratings. There is no
phlebotomist roster in the database and this assigns nobody.

It was reachable until now through POST /lab/book-slot, which returned all of it
to a student as status "CONFIRMED_DISPATCHED" — a named person and a phone number
for a home visit nobody was making. That endpoint is gone.

Three claims are out of the output too, so wiring this up again does not
reintroduce them: the "NABL-KIT-" prefix asserted an accreditation nothing
verifies, "temperature-controlled ... allocated" claimed a cold chain this system
does not track, and the kit code came from random.randint(1000, 9999) — 9000
possible values, so two samples collide readily, and a colliding sample
identifier is a clinical hazard rather than a cosmetic one.
"""
from __future__ import annotations

import secrets

from pydantic import BaseModel


class Phlebotomist(BaseModel):
    id: str
    name: str
    phone: str
    certification: str
    rating: float
    current_zone: str
    active_assignments: int


class DispatchResult(BaseModel):
    booking_id: str
    phlebotomist_name: str
    phlebotomist_phone: str
    estimated_arrival: str
    fasting_guideline: str
    sample_kit_code: str
    status: str
    ai_optimization_notes: str


PHLEBOTOMISTS_POOL = [
    Phlebotomist(
        id="phl_01",
        name="Rajesh Kumar",
        phone="+91 98112-44501",
        certification="NABL Senior Certified Phlebotomist",
        rating=4.9,
        current_zone="North Campus / Hostel Block A-D",
        active_assignments=2,
    ),
    Phlebotomist(
        id="phl_02",
        name="Priya Sharma",
        phone="+91 98733-12890",
        certification="Thyrocare / Dr. Lal Certified Tech",
        rating=4.85,
        current_zone="South Campus / Student Housing",
        active_assignments=1,
    ),
    Phlebotomist(
        id="phl_03",
        name="Amitabh Varma",
        phone="+91 99580-99214",
        certification="Studentkare NABL Lead Collector",
        rating=4.95,
        current_zone="Central Campus Main Gate",
        active_assignments=0,
    ),
]


class PhlebotomistDispatchAgent:
    def __init__(self) -> None:
        self.agent_name = "AI Phlebotomist Dispatch Agent"
        self.version = "1.0.0"

    def dispatch_for_booking(
        self,
        booking_id: str,
        test_name: str,
        slot_time: str,
        address: str,
        is_fasting: bool = True,
    ) -> DispatchResult:
        """Assigns optimal phlebotomist and generates preparation guidelines."""
        # Pick optimal phlebotomist based on lowest assignment load or random best match
        phl = min(PHLEBOTOMISTS_POOL, key=lambda x: x.active_assignments)

        fasting_note = (
            "⚠️ Fasting Required: Please fast (water permitted) for 8-10 hours prior to sample collection."
            if is_fasting
            else "✅ No fasting required for this test."
        )

        sample_kit = f"SAMPLE-KIT-{secrets.token_hex(5).upper()}"
        est_arrival = f"{slot_time} (Phlebotomist assigned: {phl.name})"

        notes = (
            f"AI Dispatch Agent analyzed location '{address}' and slot '{slot_time}'. "
            f"Would assign {phl.name} from the sample pool. "
            f"Sample kit reference {sample_kit}. Sample data: nobody is assigned."
        )

        return DispatchResult(
            booking_id=booking_id,
            phlebotomist_name=phl.name,
            phlebotomist_phone=phl.phone,
            estimated_arrival=est_arrival,
            fasting_guideline=fasting_note,
            sample_kit_code=sample_kit,
            status="SAMPLE_NOT_DISPATCHED",
            ai_optimization_notes=notes,
        )


phlebotomist_dispatch_agent = PhlebotomistDispatchAgent()
