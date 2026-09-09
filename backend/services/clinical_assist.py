"""
services.clinical_assist — M18 clinical evaluation (clinician-facing only).

Rule-K1 isolated (operational plane, no student PHR access). Deterministic
non-prescriptive differential assistance for a clinician — never a diagnosis
and never shown to a student.
"""
from __future__ import annotations

from typing import Any, Dict


def evaluate_clinical(vitals: Dict[str, Any], history_text: str = "") -> Dict[str, Any]:
    temp_f = vitals.get("tempF", 98.6)
    platelet = vitals.get("plateletCount", 240000)
    history_lower = history_text.lower()
    is_fever = temp_f > 100.0

    differentials: list = []
    alerts: list = []
    trends: list = []
    guidelines: list = ["National Tele-Consultation Standards (NRCES)"]

    if is_fever or "dengue" in history_lower or "headache" in history_lower:
        low_platelet = platelet < 150000
        differentials.append({
            "condition": "Viral Pyrexia / Suspected Dengue Fever",
            "confidence": 88 if low_platelet else 74,
            "evidence": f"Recorded temperature {temp_f}°F, reported symptoms in history, platelet count {platelet} /µL.",
        })
        alerts.append({
            "pair": "NSAID (Ibuprofen) + Suspected Dengue / Thrombocytopenia",
            "severity": "HIGH",
            "detail": "Avoid NSAIDs/Aspirin in suspected dengue due to increased risk of platelet dysfunction and GI bleeding. Paracetamol 650mg is safe alternative.",
        })
        guidelines.append("ICMR Guidelines for Management of Dengue in Outpatient Setup (2025)")

    if any(k in history_lower for k in ("cough", "throat", "cold")):
        differentials.append({
            "condition": "Acute Upper Respiratory Tract Infection",
            "confidence": 68,
            "evidence": "Pharyngeal complaints and respiratory history notes.",
        })

    if not differentials:
        differentials.append({
            "condition": "Routine Clinical Evaluation / Observation",
            "confidence": 50,
            "evidence": "Vitals stable. No high-risk symptom cluster detected in initial screen.",
        })

    trends.append({
        "test": "Platelet Count Monitor",
        "status": "ALERT" if platelet < 150000 else "WATCH",
        "note": f"Platelet count is currently {platelet} /µL (below normal range). Recommend immediate repeat CBC in 12-24 hours." if platelet < 150000 else f"Platelet count is currently {platelet} /µL. Recommend repeat CBC if fever persists beyond 72 hours.",
    })

    return {
        "differentialDiagnoses": differentials,
        "interactionAlerts": alerts,
        "abnormalTrends": trends,
        "recommendedGuidelines": guidelines,
    }
