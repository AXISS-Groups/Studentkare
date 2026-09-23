"""
services.agents.blood_emergency_agent — Blood donor registry and SOS broadcast.

All state is persisted in care_blood_donors / care_blood_sos_requests.
SOS broadcasts stage outbox events via workflow_scheduler.enqueue() for
delivery through otp_delivery (OpenWA WhatsApp / Postal email).
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from sqlalchemy import select

from core import workflow_models as M


class BloodDonor(BaseModel):
    id: str
    name: str
    blood_group: str
    hostel_block: str
    phone: str
    last_donated: str
    is_available: bool = True
    visible: bool = False


class BloodEmergencyAgent:
    def __init__(self) -> None:
        self.agent_name = "Campus Blood Emergency Agent"
        self.version = "2.0.0"

    def register_donor(self, db, account_id: str, donor: BloodDonor) -> dict:
        """Register a student blood donor (consent-required). Persists to DB."""
        row = M.BloodDonor(
            id=donor.id,
            account_id=account_id,
            blood_group=donor.blood_group.upper(),
            hostel_block=donor.hostel_block,
            phone=donor.phone,
            last_donated=donor.last_donated,
            is_available=donor.is_available,
            visible=donor.visible,
            created_at=time.time(),
        )
        db.add(row)
        db.commit()
        return {
            "id": row.id,
            "name": donor.name,
            "blood_group": row.blood_group,
            "hostel_block": row.hostel_block,
            "phone": row.phone,
            "last_donated": row.last_donated,
            "is_available": row.is_available,
            "visible": row.visible,
        }

    def get_donors(self, db, blood_group: Optional[str] = None, public: bool = False) -> List[dict]:
        """Query active donors. Public callers see consenting donors with redacted contact."""
        stmt = select(M.BloodDonor).where(M.BloodDonor.is_available.is_(True))
        if blood_group and blood_group != "ALL":
            stmt = stmt.where(M.BloodDonor.blood_group == blood_group.strip().upper())
        rows = db.scalars(stmt).all()
        out = []
        for d in rows:
            if public and not d.visible:
                continue
            item = {
                "id": d.id,
                "blood_group": d.blood_group,
                "hostel_block": d.hostel_block,
                "is_available": d.is_available,
                "last_donated": d.last_donated,
                "phone": "" if public else d.phone,
            }
            out.append(item)
        return out

    def trigger_sos_broadcast(
        self,
        db,
        account_id: str,
        patient_name: str,
        required_group: str,
        units: int,
        location: str,
        urgency: str = "CRITICAL",
    ) -> Dict[str, Any]:
        """Emergency blood broadcast to compatible campus donors.

        Stages outbox events for delivery via otp_delivery. Returns a summary
        immediately — actual messaging is async and idempotent.
        """
        from services.workflow_scheduler import enqueue

        now = time.time()
        req_upper = required_group.strip().upper()

        matching = db.scalars(
            select(M.BloodDonor).where(
                M.BloodDonor.is_available.is_(True),
                M.BloodDonor.visible.is_(True),
                M.BloodDonor.blood_group.in_([req_upper, "O-"]),
            )
        ).all()

        sos_id = f"sos_{uuid.uuid4().hex[:12]}"
        sos_row = M.BloodSOSRequest(
            id=sos_id,
            account_id=account_id,
            patient_name=patient_name,
            required_group=req_upper,
            units_needed=units,
            hospital_location=location,
            urgency=urgency,
            matching_donors_count=len(matching),
            status="QUEUED",
            created_at=now,
        )
        db.add(sos_row)
        db.flush()

        events_staged = 0
        for donor in matching:
            text = (
                f"BLOOD SOS: {patient_name} needs {units} unit(s) of {req_upper} "
                f"at {location}. Urgency: {urgency}. "
                f"Contact the health center immediately if you can donate."
            )
            enqueue(
                db,
                event_type="BLOOD_SOS",
                dedupe_key=f"sos_{sos_id}_{donor.id}",
                payload={"text": text, "phone": donor.phone, "donor_id": donor.id},
                account_id=donor.account_id,
            )
            events_staged += 1

        db.commit()

        return {
            "status": "SOS_QUEUED",
            "request_id": sos_id,
            "patient_name": patient_name,
            "required_group": req_upper,
            "units_needed": units,
            "hospital_location": location,
            "urgency": urgency,
            "matching_donors_count": len(matching),
            "events_staged": events_staged,
            "dispatched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
        }


blood_emergency_agent = BloodEmergencyAgent()
