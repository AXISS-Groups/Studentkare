"""
Studentkare Data Security Pattern — Hash-Chained Append-Only Audit Ledger
Compliance: DPDP Act 2023, DPDP Rules 2025 (Section 4 Audit Controls)

Implements cryptographic hash chaining for tamper-evident, append-only access logging:
  Entry[N].hash = HMAC-SHA256(Entry[N-1].hash + Entry[N].body)

Strict Rule: Audit write occurs BEFORE data renders; write failure blocks the read.
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field

from core.consent_engine import PurposeCode

logger = logging.getLogger(__name__)
AUDIT_HMAC_SECRET = "studentkare_audit_chain_hmac_secret_key"


class AuditEvent(BaseModel):
    """
    Immutable audit event payload logged for every T2/T3/T4 access attempt.
    """
    model_config = ConfigDict(extra="forbid")

    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    actor_id: str
    actor_type: str = Field(..., description="HUMAN | AGENT | SYSTEM")
    purpose_code: PurposeCode
    rule_reference: str = Field(..., description="RuleId reference, e.g. Rule-K1, Rule-K8")
    tenant_id: str
    subject_id: str
    resource_types: List[str]
    outcome: str = Field(..., description="SUCCESS | DENIED | BREAK_GLASS")
    consent_artefact_id: Optional[str] = None
    break_glass_session_id: Optional[str] = None
    previous_hash: Optional[str] = None
    current_hash: Optional[str] = None

    def serialize_body(self) -> str:
        """Serialize event body deterministically for hashing."""
        body = {
            "timestamp": self.timestamp.isoformat(),
            "actor_id": self.actor_id,
            "actor_type": self.actor_type,
            "purpose_code": self.purpose_code.value,
            "rule_reference": self.rule_reference,
            "tenant_id": self.tenant_id,
            "subject_id": self.subject_id,
            "resource_types": sorted(self.resource_types),
            "outcome": self.outcome,
            "consent_artefact_id": self.consent_artefact_id,
            "break_glass_session_id": self.break_glass_session_id,
        }
        return json.dumps(body, sort_keys=True)


class HashChainedAuditLedger:
    """
    In-memory / DB storage manager enforcing cryptographic hash chaining.
    """

    def __init__(self, secret: str = AUDIT_HMAC_SECRET):
        self.secret = secret
        self.chain: List[AuditEvent] = []
        self.last_hash: str = "GENESIS_BLOCK_HASH_STUDENTKARE_2026"

    def compute_event_hash(self, previous_hash: str, body_json: str) -> str:
        """Compute HMAC-SHA256 signature chaining the previous hash with the new event body."""
        msg = f"{previous_hash}:{body_json}".encode()
        return hmac.new(self.secret.encode(), msg, hashlib.sha256).hexdigest()

    def record_access_pre_render(self, event: AuditEvent) -> AuditEvent:
        """
        Record access event in hash chain BEFORE rendering data to client.
        If recording fails, raises RuntimeError to block data disclosure.
        """
        try:
            event.previous_hash = self.last_hash
            body_str = event.serialize_body()
            event.current_hash = self.compute_event_hash(self.last_hash, body_str)

            # Append to immutable chain
            self.chain.append(event)
            self.last_hash = event.current_hash
            logger.info("Audit chain event #%d logged for subject %s by actor %s", len(self.chain), event.subject_id, event.actor_id)
            return event
        except Exception as e:
            logger.error("AUDIT WRITE FAILURE: %s. Blocking data access.", e)
            raise RuntimeError(f"Audit write failure blocks data access: {e}") from e

    def verify_integrity(self) -> Tuple[bool, Optional[int]]:
        """
        Verifies full cryptographic chain integrity from Genesis to tip.
        Returns (is_valid, corrupted_index).
        """
        expected_prev = "GENESIS_BLOCK_HASH_STUDENTKARE_2026"
        for idx, event in enumerate(self.chain):
            if event.previous_hash != expected_prev:
                return False, idx
            recalculated = self.compute_event_hash(expected_prev, event.serialize_body())
            if event.current_hash != recalculated:
                return False, idx
            expected_prev = event.current_hash
        return True, None

    def get_student_access_ledger(self, student_id: str) -> List[Dict[str, Any]]:
        """
        Student-facing view of their consent and access ledger.
        """
        results = []
        for event in self.chain:
            if event.subject_id == student_id:
                results.append({
                    "timestamp": event.timestamp.isoformat(),
                    "actor_id": event.actor_id,
                    "actor_type": event.actor_type,
                    "purpose_code": event.purpose_code.value,
                    "resource_types": event.resource_types,
                    "outcome": event.outcome,
                    "consent_artefact_id": event.consent_artefact_id,
                    "break_glass": event.break_glass_session_id is not None,
                    "verification_hash": event.current_hash[:16] + "...",
                })
        return results


# Global audit ledger instance
audit_ledger = HashChainedAuditLedger()
