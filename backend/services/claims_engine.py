"""
services.claims_engine — Claims adjudication decision package (Rule K1/K2/K4).

Deterministic, mirrors the frontend `claimsReviewer.ts`. Computes deductions
from only provenance-verified line items (Rule K4), surfaces FWA anomaly flags,
and produces a reviewer guidance note. The result is an AI recommendation for
human adjudicator sign-off (Rule K2) — never a final decision.
"""
from __future__ import annotations

from typing import Any, Dict, List


def _has_provenance(item: Dict[str, Any]) -> bool:
    prov = item.get("provenance")
    if not isinstance(prov, dict):
        return False
    page = prov.get("page")
    bbox = prov.get("bbox")
    return bool(prov.get("documentId")) and isinstance(page, int) and page > 0 and isinstance(bbox, list) and len(bbox) == 4


def adjudicate_claim(claim: Dict[str, Any]) -> Dict[str, Any]:
    line_items: List[Dict[str, Any]] = claim.get("lineItems", [])
    valid = [i for i in line_items if _has_provenance(i)]
    dropped = [i for i in line_items if not _has_provenance(i)]

    provenance_passed = len(dropped) == 0 and len(valid) > 0
    deductions = [i for i in valid if (i.get("deductionAmount") or 0) > 0]
    total_deductions = sum(i.get("deductionAmount") or 0 for i in deductions)
    total_valid_billed = sum(i.get("billedAmount") or 0 for i in valid)
    recommended = total_valid_billed - total_deductions

    dropped_note = (
        f"Rule-K4 Enforcement: Dropped {len(dropped)} untraceable finding(s) missing pixel provenance coordinates."
        if dropped
        else "All line items carry 100% verified document page & bounding-box coordinates (Rule K4)."
    )

    return {
        "claimId": claim.get("id"),
        "totalBilled": claim.get("totalBilled"),
        "recommendedApproved": recommended,
        "totalDeductions": total_deductions,
        "deductionBreakdown": [
            {"category": d.get("category"), "amount": d.get("deductionAmount"), "reason": d.get("deductionReason") or "Non-payable under standard policy wording"}
            for d in deductions
        ],
        "fwaAnomalyFlags": claim.get("anomalyFlags", []),
        "ruleVersionsApplied": "IRDAI-NME-v2025.2 / TARIFF-POL-CAMPUS-2026.1",
        "provenanceCheckPassed": provenance_passed,
        "droppedItemsCount": len(dropped),
        "droppedItemsDescription": "; ".join(i.get("itemDescription", "") for i in dropped) if dropped else None,
        "reviewerGuidanceNote": f"{dropped_note} This decision package is an AI recommendation for human adjudicator sign-off under Rule K2.",
        "ruleConstitutionStatement": "RULE K1: Isolated from student clinical vault. RULE K2: Requires human sign-off. RULE K4: Mandatory pixel provenance.",
    }
