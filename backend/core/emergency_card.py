"""
Studentkare Data Security Pattern — Emergency Card Exception Module
Compliance: Section 5 Emergency Card Exception Specification

Bounded Exception Model:
- Works with no network & no login (lock screen / printed sticker).
- Holds ONLY student-authored minimal emergency data.
- Separate artefact storage (not a view over T3 clinical vault).
- Contains mandatory honesty markers ("Stated by [name] on [date]. Not a medical record.").
- Contains printed card non-revocable warning.
- Every open logged to audit access ledger.
- STRICT RULE: T4 sensitive data is NEVER present on the emergency card.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from core.audit_chain import audit_ledger, AuditEvent
from core.consent_engine import PurposeCode


class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str


class StudentEmergencyCardPayload(BaseModel):
    """
    Student-authored minimal data payload. Separate artefact from T3 vault.
    """
    model_config = ConfigDict(extra="forbid")

    card_id: str
    student_id: str
    student_name: str
    blood_group: str
    allergies: List[str]
    chronic_conditions: List[str]
    current_medications: List[str]
    emergency_contacts: List[EmergencyContact]
    abha_number: Optional[str] = None
    stated_on_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))

    # Mandatory honesty markers and warnings
    disclaimer: str = Field(
        default="Not a medical record. Self-reported emergency data.",
        frozen=True
    )
    printed_revocation_warning: str = Field(
        default="Printed cards cannot be revoked remotely. Reprint and destroy physical card to update.",
        frozen=True
    )

    @field_validator("allergies", "chronic_conditions", "current_medications")
    @classmethod
    def exclude_t4_keywords(cls, items: List[str]) -> List[str]:
        """Strict check excluding T4 sensitive terms from emergency card payload."""
        t4_prohibited = {"hiv", "sti", "psychiatric", "antipsychotic", "substance", "rehab", "genetic", "abortion"}
        for item in items:
            for term in t4_prohibited:
                if term in item.lower():
                    raise ValueError(f"T4 sensitive information ('{term}') is strictly prohibited on Emergency Card")
        return items


class EmergencyCardManager:
    """
    Manager for creating, accessing, and logging Emergency Card reads.
    """

    def __init__(self):
        self._cards: Dict[str, StudentEmergencyCardPayload] = {}

    def save_card(self, card: StudentEmergencyCardPayload) -> None:
        """Store emergency card artefact separately from T3/T4 database."""
        self._cards[card.card_id] = card

    def read_card_offline_or_qr(
        self,
        card_id: str,
        reader_context: str = "LOCK_SCREEN_OR_PRINTED_QR"
    ) -> Optional[Dict[str, Any]]:
        """
        Reads emergency card without requiring user login or network authentication.
        Logs read event to audit ledger with time and context.
        """
        card = self._cards.get(card_id)
        if not card:
            return None

        # Log read access to audit ledger
        event = AuditEvent(
            actor_id=f"emergency_reader:{reader_context}",
            actor_type="HUMAN",
            purpose_code=PurposeCode.EMERGENCY_RESPONDER,
            rule_reference="Rule-Section5-EmergencyCard",
            tenant_id="emergency_access",
            subject_id=card.student_id,
            resource_types=["EmergencyCardMinimal"],
            outcome="SUCCESS",
        )
        audit_ledger.record_access_pre_render(event)

        res = card.model_dump()
        res["honesty_marker"] = f"Stated by {card.student_name} on {card.stated_on_date}. Not a medical record."
        return res


# Global instance
emergency_card_manager = EmergencyCardManager()
