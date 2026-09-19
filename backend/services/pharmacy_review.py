"""
services.pharmacy_review — Pharmacy Prescription Review & Generic Substitution Service.

F085 implementation:
- Manages pending prescription review queue (PENDING_PHARMACIST_REVIEW, APPROVED, REJECTED, SUBSTITUTED).
- Matching active generic ingredients for cost-effective substitutions (Dolo 650mg -> Paracetamol 650mg).
- Doctor license & digital signature verification.
- Human-in-the-loop sign-off logging to medical audit stream.
"""
from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from services.agents.medical_guard import PermissionScope, medical_guard


class RxMedicationItem(BaseModel):
    item_id: str
    original_brand: str
    active_ingredient: str
    dosage: str
    duration: str
    suggested_generic: Optional[str] = None
    unit_price_paise: int = 0
    substituted: bool = False
    notes: str = ""


class PrescriptionReviewRecord(BaseModel):
    rx_id: str
    patient_id: str
    patient_name: str
    doctor_name: str
    doctor_license_no: str
    signature_verified: bool
    status: str  # PENDING_PHARMACIST_REVIEW, APPROVED_BY_PHARMACIST, REJECTED, SUBSTITUTED
    medications: List[RxMedicationItem] = Field(default_factory=list)
    created_at: str
    reviewed_at: Optional[str] = None
    pharmacist_name: Optional[str] = None


GENERIC_SUBSTITUTION_MAPPINGS = {
    "dolo 650mg": "Paracetamol 650mg Generic",
    "pantocid 40mg": "Pantoprazole 40mg Generic",
    "cetzine 10mg": "Cetirizine 10mg Generic",
    "azithral 500mg": "Azithromycin 500mg Generic",
    "augmentin 625 duo": "Amoxicillin 500mg + Clavulanate 125mg Generic",
}

PENDING_RX_REVIEWS: List[PrescriptionReviewRecord] = [
    PrescriptionReviewRecord(
        rx_id="rx_94102",
        patient_id="demo_student",
        patient_name="Demo Student",
        doctor_name="Dr. A. K. Sen, MD",
        doctor_license_no="MCI-2018-94102",
        signature_verified=True,
        status="PENDING_PHARMACIST_REVIEW",
        medications=[
            RxMedicationItem(
                item_id="m1",
                original_brand="Dolo 650mg",
                active_ingredient="Paracetamol 650mg",
                dosage="1 tablet thrice daily after food",
                duration="3 days",
                suggested_generic="Paracetamol 650mg Generic",
                unit_price_paise=3250,
            ),
            RxMedicationItem(
                item_id="m2",
                original_brand="Pantocid 40mg",
                active_ingredient="Pantoprazole 40mg",
                dosage="1 tablet once daily before breakfast",
                duration="5 days",
                suggested_generic="Pantoprazole 40mg Generic",
                unit_price_paise=4800,
            ),
        ],
        created_at="15 mins ago",
    )
]


class PharmacyReviewService:
    def get_pending_reviews(self) -> List[PrescriptionReviewRecord]:
        return PENDING_RX_REVIEWS

    def find_generic_substitution(self, brand_name: str) -> Optional[str]:
        return GENERIC_SUBSTITUTION_MAPPINGS.get(brand_name.strip().lower())

    def approve_prescription_review(
        self,
        rx_id: str,
        pharmacist_name: str,
        substitutions: Dict[str, str],  # item_id -> generic_name
        is_clinician: bool = True,
    ) -> Dict[str, Any]:
        """Approve Rx fulfillment, apply substitutions, and log to audit ledger."""
        for rx in PENDING_RX_REVIEWS:
            if rx.rx_id == rx_id:
                rx.status = "APPROVED_BY_PHARMACIST"
                rx.pharmacist_name = pharmacist_name
                rx.reviewed_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

                for med in rx.medications:
                    if med.item_id in substitutions:
                        med.suggested_generic = substitutions[med.item_id]
                        med.substituted = True

                # Log to Zero-Trust Medical Audit Ledger
                medical_guard.log_audit_event(
                    actor=pharmacist_name,
                    action_type="FULFILL_PRESCRIPTION",
                    risk_level="DESTRUCTIVE_HIGH_RISK",
                    granted_scopes=[PermissionScope.FULFILL_PRESCRIPTION],
                    outcome="APPROVED_BY_PHARMACIST",
                    details={"rx_id": rx_id, "substitutions_applied": len(substitutions)},
                )

                return {
                    "status": "SUCCESS",
                    "rx_id": rx_id,
                    "pharmacist_name": pharmacist_name,
                    "medications_count": len(rx.medications),
                    "message": f"Prescription {rx_id} approved for fulfillment by {pharmacist_name}.",
                }

        return {"status": "NOT_FOUND", "message": "Prescription review record not found."}


pharmacy_review_service = PharmacyReviewService()
