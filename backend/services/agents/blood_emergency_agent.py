"""
services.agents.blood_emergency_agent — Blood donor registry and SOS broadcast.

All state is persisted in care_blood_donors / care_blood_sos_requests.
SOS broadcasts stage outbox events via workflow_scheduler.enqueue() for
delivery through otp_delivery (OpenWA WhatsApp / Postal email).

Abuse limits (audit H1). A broadcast goes out on the platform's own WhatsApp,
so nothing here lets an account message a number it doesn't own or write the
words that go out:

* A donor's number is the donor account's own WhatsApp contact, verified by the
  one-time-code flow (services/contact_store.py). It is re-read at send time, so
  a contact that was changed or never verified gets nothing.
* A donor is listed only while the donor account's campus affiliation is
  VERIFIED, and a broadcast reaches only donors on the requester's campus
  (``campus`` = "" means every campus, which the API allows a super admin only).
* The message is a fixed template; the requester adds at most a short note
  (length checked by the API against the settings registry).
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from sqlalchemy import select

from core import workflow_models as M

BLOOD_GROUPS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
UNIVERSAL_DONOR = "O-"


def campus_key(value: str) -> str:
    return " ".join((value or "").split()).casefold()


def verified_campus(db, account_id: str) -> str:
    """The account's campus when its affiliation is VERIFIED, else ""."""
    row = db.get(M.CampusVerification, account_id)
    return row.university if row is not None and row.status == "VERIFIED" else ""


def verified_phone(db, account_id: str) -> str:
    """The account's own verified WhatsApp number, or ""."""
    from services.contact_store import verified_contact

    account = db.get(M.Account, account_id)
    return verified_contact(db, account, "WHATSAPP") if account is not None else ""


class BloodDonor(BaseModel):
    blood_group: str
    hostel_block: str
    is_available: bool = True
    visible: bool = False


class BloodEmergencyAgent:
    def __init__(self) -> None:
        self.agent_name = "Campus Blood Emergency Agent"
        self.version = "3.0.0"

    def register_donor(self, db, account_id: str, donor: BloodDonor) -> dict:
        """Register (or update) the account's own donor record. One per account.

        The number is the account's verified WhatsApp contact; the caller checks
        it exists before calling. Never a number typed by the caller.
        """
        phone = verified_phone(db, account_id)
        if not phone:
            raise ValueError("no verified WhatsApp number")
        row = db.scalar(select(M.BloodDonor).where(M.BloodDonor.account_id == account_id))
        if row is None:
            row = M.BloodDonor(id=f"bd_{uuid.uuid4().hex[:12]}", account_id=account_id,
                               last_donated="", created_at=time.time())
            db.add(row)
        row.blood_group = donor.blood_group.upper()
        row.hostel_block = donor.hostel_block
        row.phone = phone
        row.is_available = donor.is_available
        row.visible = donor.visible
        db.commit()
        return self.donor_payload(row)

    @staticmethod
    def donor_payload(row: M.BloodDonor) -> dict:
        """A donor as staff and the donor see it. The phone number is never returned."""
        return {"id": row.id, "blood_group": row.blood_group, "hostel_block": row.hostel_block,
                "is_available": row.is_available, "visible": row.visible, "last_donated": row.last_donated}

    def campus_donors(self, db, campus: Optional[str], blood_groups: Optional[List[str]] = None,
                      *, visible_only: bool = True) -> List[M.BloodDonor]:
        """Available donors whose own campus affiliation is VERIFIED and matches ``campus``.

        ``campus`` None means every campus (super admin only, checked by the API).
        """
        stmt = select(M.BloodDonor).where(M.BloodDonor.is_available.is_(True))
        if visible_only:
            stmt = stmt.where(M.BloodDonor.visible.is_(True))
        if blood_groups:
            stmt = stmt.where(M.BloodDonor.blood_group.in_(blood_groups))
        wanted = campus_key(campus) if campus is not None else None
        out = []
        for row in db.scalars(stmt.order_by(M.BloodDonor.created_at)).all():
            donor_campus = campus_key(verified_campus(db, row.account_id))
            if not donor_campus or (wanted is not None and donor_campus != wanted):
                continue
            out.append(row)
        return out

    @staticmethod
    def message(campus: str, group: str, units: int, urgency: str, note: str) -> str:
        """The fixed broadcast text. Only the note is the requester's own words."""
        where = f" at {campus}" if campus else ""
        text = (f"StudentKare blood SOS{where}: {units} unit(s) of {group} blood needed ({urgency.lower()}). "
                f"If you can donate, contact your campus health centre now.")
        return f"{text} Note from the requester: {note}" if note else text

    def trigger_sos_broadcast(
        self,
        db,
        account_id: str,
        required_group: str,
        units: int,
        campus: str,
        urgency: str = "CRITICAL",
        note: str = "",
    ) -> Dict[str, Any]:
        """Emergency blood broadcast to compatible donors on one campus ("" = every campus).

        Stages outbox events for delivery via otp_delivery. Returns a summary
        immediately — actual messaging is async and idempotent. The caller checks
        who may send, to which campus, and the rate limits before calling.
        """
        from services.workflow_scheduler import enqueue

        now = time.time()
        group = required_group.strip().upper()
        matching = self.campus_donors(db, campus or None, sorted({group, UNIVERSAL_DONOR}))

        sos_id = f"sos_{uuid.uuid4().hex[:12]}"
        db.add(M.BloodSOSRequest(
            id=sos_id, account_id=account_id, patient_name="", required_group=group, units_needed=units,
            hospital_location="", urgency=urgency, matching_donors_count=len(matching), status="QUEUED",
            created_at=now, campus=campus,
        ))
        db.flush()

        text = self.message(campus, group, units, urgency, note)
        staged: list[str] = []
        for donor in matching:
            # Re-read at send time: a changed or unverified number gets nothing.
            phone = verified_phone(db, donor.account_id)
            if not phone or donor.account_id == account_id:
                continue
            enqueue(db, event_type="BLOOD_SOS", dedupe_key=f"sos_{sos_id}_{donor.id}",
                    payload={"text": text, "phone": phone, "donor_id": donor.id}, account_id=donor.account_id)
            staged.append(donor.id)

        return {
            "status": "SOS_QUEUED",
            "request_id": sos_id,
            "required_group": group,
            "units_needed": units,
            "urgency": urgency,
            "campus": campus,
            "matching_donors_count": len(matching),
            "events_staged": len(staged),
            "staged_donor_ids": staged,
            "dispatched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
        }


blood_emergency_agent = BloodEmergencyAgent()
