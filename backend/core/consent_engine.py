"""
Studentkare Data Security Pattern — Purpose-Bound Access Control & Signed Consent Engine
Compliance: DPDP Act 2023, DPDP Rules 2025, ABDM / DEPA Guidelines

Defines PurposeCode closed enum and signed ConsentArtefact structure.
Enforces gateway-level consent validation: time-bound, purpose-bound, resource-bound,
and instant revocation checking.
"""

import hmac
import hashlib
import json
from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field, field_validator, ConfigDict

SECRET_CONSENT_KEY = "studentkare_consent_signing_key_secret_key"


class PurposeCode(str, Enum):
    """Closed enum of purpose codes for T3/T4 access. No GENERAL or ADMIN exists."""
    STUDENT_SELF = "STUDENT_SELF"
    CLINICIAN_ACTIVE_CONSULT = "CLINICIAN_ACTIVE_CONSULT"
    EMERGENCY_RESPONDER = "EMERGENCY_RESPONDER"
    CAMP_STATION = "CAMP_STATION"
    DPDP_REQUEST = "DPDP_REQUEST"
    BREAK_GLASS = "BREAK_GLASS"


class GranteeInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    grantee_type: str = Field(..., description="CLINICIAN | INSTITUTION | INSURER")
    id: str
    name: str

    @field_validator("grantee_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid = {"CLINICIAN", "INSTITUTION", "INSURER"}
        if v not in valid:
            raise ValueError(f"Invalid grantee_type: {v}. Must be one of {valid}")
        return v


class ConsentArtefact(BaseModel):
    """
    Signed, tamper-evident consent artefact modeling ABDM / DEPA principles.
    """
    model_config = ConfigDict(extra="forbid")

    id: str
    student_id: str
    grantee: GranteeInfo
    purpose: PurposeCode
    data_types: List[str] = Field(..., description="Explicit FHIR resource types, e.g. ['Observation', 'MedicationRequest']")
    valid_from: datetime
    valid_until: datetime
    revoked_at: Optional[datetime] = None
    signature: Optional[str] = None

    @field_validator("data_types")
    @classmethod
    def validate_data_types(cls, v: List[str]) -> List[str]:
        if not v or "all" in [x.lower() for x in v]:
            raise ValueError("data_types must be an explicit list of resources and cannot be empty or 'all'")
        return v

    def compute_signature(self, secret_key: str = SECRET_CONSENT_KEY) -> str:
        """Compute HMAC-SHA256 tamper-evident signature for consent artefact payload."""
        payload = {
            "id": self.id,
            "student_id": self.student_id,
            "grantee": self.grantee.model_dump(),
            "purpose": self.purpose.value,
            "data_types": sorted(self.data_types),
            "valid_from": self.valid_from.isoformat(),
            "valid_until": self.valid_until.isoformat(),
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
        }
        json_str = json.dumps(payload, sort_keys=True)
        return hmac.new(secret_key.encode(), json_str.encode(), hashlib.sha256).hexdigest()

    def sign(self, secret_key: str = SECRET_CONSENT_KEY) -> None:
        self.signature = self.compute_signature(secret_key)

    def verify_signature(self, secret_key: str = SECRET_CONSENT_KEY) -> bool:
        if not self.signature:
            return False
        expected = self.compute_signature(secret_key)
        return hmac.compare_digest(self.signature, expected)


class ConsentGatewayValidator:
    """
    Gateway-level enforcement component. Fails closed if consent is invalid,
    expired, revoked, or non-matching.
    """

    @staticmethod
    def validate_access_request(
        artefact: ConsentArtefact,
        requested_purpose: PurposeCode,
        requested_grantee_id: str,
        requested_resource_type: str,
        now: Optional[datetime] = None
    ) -> Tuple[bool, str]:
        """
        Validates access request against signed consent artefact.
        Returns (is_allowed, reason).
        """
        if now is None:
            now = datetime.now(timezone.utc)

        # 1. Signature Integrity
        if not artefact.verify_signature():
            return False, "Consent artefact signature verification failed (tampered or unsigned)"

        # 2. Revocation Check (Immediate effect at gateway)
        if artefact.revoked_at is not None and now >= artefact.revoked_at:
            return False, "Consent artefact has been revoked"

        # 3. Time Window Validation
        if now < artefact.valid_from:
            return False, "Consent artefact is not yet active"
        if now > artefact.valid_until:
            return False, "Consent artefact has expired"

        # 4. Purpose Match
        if artefact.purpose != requested_purpose:
            return False, f"Purpose mismatch: artefact allows {artefact.purpose.value}, requested {requested_purpose.value}"

        # 5. Grantee Match
        if artefact.grantee.id != requested_grantee_id:
            return False, f"Grantee mismatch: artefact issued to {artefact.grantee.id}, requested by {requested_grantee_id}"

        # 6. Resource Type Match (explicit allowlist check)
        if requested_resource_type not in artefact.data_types:
            return False, f"Resource type mismatch: artefact allows {artefact.data_types}, requested {requested_resource_type}"

        return True, "Access granted under valid consent"
