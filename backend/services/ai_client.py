"""
Studentkare — Enforced AI Constitution Client (G0.3)
Centralized Python wrapper loading AI Constitution and enforcing compliance before model calls.
"""
import logging
from typing import Any, Dict, Optional

from core.ai_security_guardrails import AISecurityGuardrail
from services.llm_gateway import LLMGateway, _call_ollama

logger = logging.getLogger("services.ai_client")

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

CONSTITUTION_SYSTEM_PROMPTS: Dict[str, str] = {
    "Rule-A": (
        "You are an AI assistant on Studentkare, a student health records platform. "
        "CONSTITUTIONAL MANDATE (Rule-A): NEVER provide a prescriptive medical diagnosis, drug dosage change, "
        "or clinical prescription. You may only summarize educational information and refer the student to a licensed clinician."
    ),
    "Rule-B": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-B): EMERGENCY ESCALATION. If any emergency symptoms "
        "(severe chest pain, shortness of breath, acute trauma, suicidal ideation) are detected, "
        "IMMEDIATELY escalate to 112 / campus SOS and provide crisis helpline contacts."
    ),
    "Rule-C": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-C): Zero Training on Student Records. Do not retain, store, or exfiltrate private health identifiers."
    ),
    "Rule-D": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-D): ABDM HIU/HIP Consent Strictness. Access to clinical records requires active patient consent."
    ),
    "Rule-J1": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-J1): Deterministic & Auditable Routing. Explain all operational steps transparently."
    ),
    "Rule-J2": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-J2): State Transitions by Rules & Humans. No autonomous clinical state mutations."
    ),
    "Rule-K1": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-K1): Isolated from student clinical vault. Commerce firewall enforced."
    ),
    "Rule-K2": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-K2): Requires verified human clinical sign-off."
    ),
    "Rule-K4": (
        "You are an AI assistant on Studentkare. "
        "CONSTITUTIONAL MANDATE (Rule-K4): Mandatory pixel and data provenance."
    ),
}

_force_constitution_failure: bool = False
_gateway = LLMGateway()


def set_force_constitution_failure(fail: bool) -> None:
    global _force_constitution_failure
    _force_constitution_failure = fail


def verify_constitution_loaded() -> bool:
    if _force_constitution_failure:
        return False
    return bool(CONSTITUTION_RULES and len(CONSTITUTION_RULES) > 0)


def invoke_ai_model(
    prompt: str,
    rule_id: str,
    context: Optional[Dict[str, Any]] = None,
    allow_llm: bool = True,
) -> Dict[str, Any]:
    """Single wrapper for calling AI models with Constitutional Prompt injection.

    Fails closed if Constitution fails to load or if prompt-injection is detected.
    Routes to Ollama when reachable, and falls back to deterministic rule assertion.
    """
    if not verify_constitution_loaded():
        raise RuntimeError("[AI CONSTITUTION FAILURE]: AI Constitution failed to load. Execution blocked (fail-closed).")

    if rule_id not in CONSTITUTION_RULES:
        raise ValueError(f"[AI CONSTITUTION VIOLATION]: Invalid rule ID '{rule_id}'.")

    # Guardrail DLP and Prompt-Injection Verification
    safe, sanitized_prompt, _ = AISecurityGuardrail.validate_prompt(prompt)
    if not safe:
        return {
            "status": "blocked",
            "output": sanitized_prompt or "[BLOCKED: Security policy violation detected]",
            "rule_asserted": rule_id,
            "rule_title": CONSTITUTION_RULES[rule_id],
            "provenance": "security_guardrail_block",
        }

    system_prompt = CONSTITUTION_SYSTEM_PROMPTS.get(rule_id, "")

    # Execute via local Ollama runtime if configured and allowed
    if allow_llm and _gateway.is_configured():
        try:
            raw_output = _call_ollama(sanitized_prompt, _gateway.model, system_prompt)
            output = AISecurityGuardrail.sanitize_output(raw_output)
            return {
                "status": "success",
                "output": output,
                "rule_asserted": rule_id,
                "rule_title": CONSTITUTION_RULES[rule_id],
                "provenance": f"ollama:{_gateway.model}",
            }
        except Exception as exc:
            logger.warning("Local Ollama runtime unreachable (%s); using deterministic constitutional fallback.", exc)

    # Deterministic Constitutional Fallback
    return {
        "status": "success",
        "output": sanitized_prompt,
        "rule_asserted": rule_id,
        "rule_title": CONSTITUTION_RULES[rule_id],
        "provenance": "deterministic_constitution_fallback",
    }
