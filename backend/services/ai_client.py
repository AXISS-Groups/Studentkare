"""
Studentkare — Enforced AI Constitution Client (G0.3)
Centralized Python wrapper loading AI Constitution and enforcing compliance before model calls.
"""
from typing import Any, Dict, Optional

CONSTITUTION_RULES: Dict[str, str] = {
    "Rule-A": "No Prescriptive Diagnosis",
    "Rule-B": "Emergency Triage Escalation",
    "Rule-C": "Zero Training on Student Records",
    "Rule-D": "ABDM HIU/HIP Consent Strictness",
    "Rule-J1": "Deterministic & Auditable Routing",
    "Rule-J2": "State Transitions by Rules & Humans",
    "Rule-K1": "Isolated from student clinical vault",
    "Rule-K2": "Requires human sign-off",
    "Rule-K4": "Mandatory pixel provenance"
}

_force_constitution_failure: bool = False


def set_force_constitution_failure(fail: bool) -> None:
    global _force_constitution_failure
    _force_constitution_failure = fail


def verify_constitution_loaded() -> bool:
    if _force_constitution_failure:
        return False
    return bool(CONSTITUTION_RULES and len(CONSTITUTION_RULES) > 0)


def invoke_ai_model(prompt: str, rule_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Single wrapper for calling AI models. Fails closed if Constitution fails to load."""
    if not verify_constitution_loaded():
        raise RuntimeError("[AI CONSTITUTION FAILURE]: AI Constitution failed to load. Execution blocked (fail-closed).")

    if rule_id not in CONSTITUTION_RULES:
        raise ValueError(f"[AI CONSTITUTION VIOLATION]: Invalid rule ID '{rule_id}'.")

    return {
        "status": "success",
        "output": prompt,
        "rule_asserted": rule_id,
        "rule_title": CONSTITUTION_RULES[rule_id]
    }
