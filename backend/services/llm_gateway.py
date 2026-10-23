"""
services.llm_gateway — the AI constitution, and the only path to a model.

AGENTS.md guardrail 3: the constitution is executable, not documentation. Every model
call in the backend goes through ``invoke()`` here, at the call site, and nothing else
in the codebase talks to a model runtime. ``invoke()``:

* fails closed when the constitution is not loaded or the asserted rule is unknown;
* runs the prompt through ``AISecurityGuardrail.validate_prompt`` (injection defence,
  secret and PII masking) and refuses a blocked prompt rather than sending it;
* prefixes the asserted rule's system mandate to every call;
* sanitises the output with ``AISecurityGuardrail.sanitize_output``;
* raises on every failure — the caller decides the deterministic fallback, and there
  is no permissive default here to fall into.

It never logs prompt or output text: only the rule, the model name, and the class of
an error. Prompts in a health product carry the user's words, and logs travel further
than the database.

The runtime is an on-prem Ollama (Rule-C, air-gapped). It is opt-in: with
``OLLAMA_URL`` unset there is no model, and callers answer deterministically. After a
transport failure the gateway stops trying for ``LLM_RETRY_AFTER_SECONDS`` so an
unreachable model costs one timeout, not one per request.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, Callable, Dict, Optional

import httpx

from core.ai_security_guardrails import AISecurityGuardrail

logger = logging.getLogger("services.llm_gateway")

DEFAULT_MODEL = "llama3.1:8b"
DEFAULT_TIMEOUT_SECONDS = 8.0
DEFAULT_RETRY_AFTER_SECONDS = 30.0

CONSTITUTION_RULES: Dict[str, str] = {
    "Rule-A": "No Prescriptive Diagnosis",
    "Rule-B": "Emergency Triage Escalation",
    "Rule-C": "Zero Training on Student Records",
    "Rule-D": "ABDM HIU/HIP Consent Strictness",
    "Rule-J1": "Deterministic & Auditable Routing",
    "Rule-J2": "State Transitions by Rules & Humans",
    "Rule-K1": "Isolated from student clinical vault",
    "Rule-K2": "Requires human sign-off",
    "Rule-K4": "Mandatory pixel provenance",
}

_PREAMBLE = "You are an AI assistant on Studentkare, a student health platform. "

CONSTITUTION_SYSTEM_PROMPTS: Dict[str, str] = {
    "Rule-A": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-A): NEVER provide a medical diagnosis, a drug or "
        "dosage, a dosage change, or a prescription. You may only restate approved "
        "educational information and refer the student to a licensed clinician."
    ),
    "Rule-B": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-B): EMERGENCY ESCALATION. If emergency symptoms "
        "or suicidal ideation are present, direct the person to 112 / campus SOS and "
        "crisis helplines."
    ),
    "Rule-C": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-C): Zero training on student records. Do not "
        "retain, store, or repeat private health identifiers."
    ),
    "Rule-D": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-D): Access to clinical records requires active "
        "patient consent."
    ),
    "Rule-J1": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-J1): Deterministic and auditable routing. Explain "
        "operational steps transparently."
    ),
    "Rule-J2": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-J2): No autonomous clinical state changes; state "
        "transitions belong to rules and humans."
    ),
    "Rule-K1": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-K1): Isolated from the student clinical vault."
    ),
    "Rule-K2": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-K2): Requires verified human clinical sign-off."
    ),
    "Rule-K4": _PREAMBLE + (
        "CONSTITUTIONAL MANDATE (Rule-K4): Mandatory data provenance."
    ),
}


class ConstitutionError(RuntimeError):
    """The constitution could not be enforced. The call is refused."""


class PromptBlocked(RuntimeError):
    """The security guardrail refused the prompt. It was not sent."""


class ModelUnavailable(RuntimeError):
    """No model is configured, the runtime is cooling off, or the call failed."""


class KillSwitchActive(ModelUnavailable):
    """The AI kill switch (settings registry ``ai.kill_switch_active``) is on.

    A ModelUnavailable, so every caller already shows its honest "AI is not
    available" path instead of an answer.
    """


_force_constitution_failure = False
_lock = threading.Lock()
_unavailable_until = 0.0


def set_force_constitution_failure(fail: bool) -> None:
    """Test hook: simulate a constitution that failed to load."""
    global _force_constitution_failure
    _force_constitution_failure = fail


def verify_constitution_loaded() -> bool:
    if _force_constitution_failure:
        return False
    return bool(CONSTITUTION_RULES) and set(CONSTITUTION_RULES) <= set(CONSTITUTION_SYSTEM_PROMPTS)


def ollama_url() -> str:
    """Read at call time, so configuration is not frozen at import."""
    return (os.environ.get("OLLAMA_URL") or "").strip().rstrip("/")


def model_name() -> str:
    return (os.environ.get("LLM_MODEL") or "").strip() or DEFAULT_MODEL


def _float_env(name: str, default: float) -> float:
    try:
        value = float(os.environ.get(name, ""))
    except ValueError:
        return default
    return value if value > 0 else default


def is_configured() -> bool:
    return bool(ollama_url())


def reset_availability() -> None:
    """Forget a previous transport failure (tests, and an operator after a fix)."""
    global _unavailable_until
    with _lock:
        _unavailable_until = 0.0


def _call_ollama(prompt: str, system: str, *, model: str, timeout: float) -> str:
    payload: Dict[str, Any] = {
        "model": model, "prompt": prompt, "system": system, "stream": False,
        "options": {"temperature": 0},
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(f"{ollama_url()}/api/generate", json=payload)
        resp.raise_for_status()
        return str(resp.json().get("response", ""))


# The transport. Replaced in tests with a fake model; nothing else should touch it.
_transport: Callable[..., str] = _call_ollama


def kill_switch_active() -> bool:
    """The platform-wide AI kill switch (audit M2), persisted in the settings registry."""
    from core.settings_registry import setting
    return setting("ai.kill_switch_active") is True


def invoke(prompt: str, *, rule_id: str, instructions: str = "",
           timeout: Optional[float] = None) -> str:
    """Call the model under the constitution. Returns sanitised text or raises.

    ``instructions`` are appended to the rule's system mandate — they never replace it.
    """
    if not verify_constitution_loaded():
        raise ConstitutionError("AI constitution failed to load; model call blocked (fail-closed).")
    if kill_switch_active():
        raise KillSwitchActive("AI kill switch is on")
    if rule_id not in CONSTITUTION_RULES:
        raise ValueError(f"[AI CONSTITUTION VIOLATION]: Invalid rule ID '{rule_id}'.")

    safe, sanitized, _metrics = AISecurityGuardrail.validate_prompt(prompt)
    if not safe or not sanitized:
        raise PromptBlocked("prompt refused by the security guardrail")

    if not is_configured():
        raise ModelUnavailable("no model configured")

    global _unavailable_until
    with _lock:
        if time.monotonic() < _unavailable_until:
            raise ModelUnavailable("model runtime cooling off after a failure")

    system = CONSTITUTION_SYSTEM_PROMPTS[rule_id]
    if instructions:
        system = f"{system}\n\n{instructions}"
    model = model_name()
    try:
        raw = _transport(sanitized, system, model=model,
                         timeout=timeout or _float_env("LLM_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))
    except Exception as exc:  # noqa: BLE001 — every failure is reported as unavailable
        with _lock:
            _unavailable_until = time.monotonic() + _float_env(
                "LLM_RETRY_AFTER_SECONDS", DEFAULT_RETRY_AFTER_SECONDS)
        # The class only: an httpx message can echo the request.
        logger.warning("model call failed rule=%s model=%s error=%s", rule_id, model, type(exc).__name__)
        record_error("generation", type(exc).__name__)
        raise ModelUnavailable(type(exc).__name__) from None

    return AISecurityGuardrail.sanitize_output(raw or "").strip()


# ── Health: the last model-runtime error, in words an admin can act on ────────

_last_error: Dict[str, Any] = {}


def record_error(where: str, error: str) -> None:
    """Remember the most recent failure (a stage and an error class, never text).

    Per process: on several replicas each reports its own. Good enough for "is the
    model reachable from here", which is what the admin screen asks.
    """
    with _lock:
        _last_error.clear()
        _last_error.update({"where": where, "error": error, "at": time.time()})


def last_error() -> Optional[Dict[str, Any]]:
    with _lock:
        return dict(_last_error) or None


def clear_last_error() -> None:
    with _lock:
        _last_error.clear()


# ── Embeddings: the same constitution, for vectors ────────────────────────────
#
# An embedding call sends text to a model just as a generation call does, so it
# goes through the same gate: constitution loaded, a known rule asserted (Rule-C:
# on-prem only, nothing trains on student text), the prompt guardrail (injection
# refused, secrets and PII masked) before anything leaves the process.

DEFAULT_EMBEDDING_MODEL = "bge-m3"
EMBEDDING_RULE = "Rule-C"

_embed_lock = threading.Lock()
_embed_unavailable_until = 0.0


def embedding_provider() -> str:
    return (os.environ.get("EMBEDDING_PROVIDER") or "local").strip().lower() or "local"


def embedding_url() -> str:
    """EMBEDDING_OLLAMA_URL when the embedding model runs elsewhere, else OLLAMA_URL."""
    return ((os.environ.get("EMBEDDING_OLLAMA_URL") or "").strip() or ollama_url()).rstrip("/")


def embedding_model() -> str:
    return (os.environ.get("EMBEDDING_MODEL") or "").strip() or DEFAULT_EMBEDDING_MODEL


def embeddings_configured() -> bool:
    return embedding_provider() == "ollama" and bool(embedding_url())


def reset_embedding_availability() -> None:
    global _embed_unavailable_until
    with _embed_lock:
        _embed_unavailable_until = 0.0


def _call_ollama_embed(text: str, *, model: str, timeout: float) -> list:
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(f"{embedding_url()}/api/embed", json={"model": model, "input": text})
        if resp.status_code == httpx.codes.NOT_FOUND:
            # Ollama before 0.3: the older single-prompt endpoint.
            resp = client.post(f"{embedding_url()}/api/embeddings", json={"model": model, "prompt": text})
            resp.raise_for_status()
            return list(resp.json().get("embedding") or [])
        resp.raise_for_status()
        vectors = resp.json().get("embeddings") or []
        return list(vectors[0]) if vectors else []


# Replaced in tests with a fake model; nothing else should touch it.
_embed_transport: Callable[..., list] = _call_ollama_embed


def embed(text: str, *, rule_id: str = EMBEDDING_RULE, timeout: Optional[float] = None) -> list:
    """Embed text with the on-prem model under the constitution. Returns floats or raises."""
    if not verify_constitution_loaded():
        raise ConstitutionError("AI constitution failed to load; embedding blocked (fail-closed).")
    if rule_id not in CONSTITUTION_RULES:
        raise ValueError(f"[AI CONSTITUTION VIOLATION]: Invalid rule ID '{rule_id}'.")

    safe, sanitized, _metrics = AISecurityGuardrail.validate_prompt(text)
    if not safe or not sanitized:
        raise PromptBlocked("text refused by the security guardrail")

    if not embeddings_configured():
        raise ModelUnavailable("no embedding model configured")

    global _embed_unavailable_until
    with _embed_lock:
        if time.monotonic() < _embed_unavailable_until:
            raise ModelUnavailable("embedding runtime cooling off after a failure")

    model = embedding_model()
    try:
        vector = _embed_transport(sanitized, model=model,
                                  timeout=timeout or _float_env("EMBEDDING_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))
        values = [float(value) for value in vector]
        if not values or any(value != value for value in values):  # empty, or NaN
            raise ValueError("empty or invalid vector")
    except Exception as exc:  # noqa: BLE001 — every failure is reported as unavailable
        with _embed_lock:
            _embed_unavailable_until = time.monotonic() + _float_env(
                "LLM_RETRY_AFTER_SECONDS", DEFAULT_RETRY_AFTER_SECONDS)
        logger.warning("embedding call failed model=%s error=%s", model, type(exc).__name__)
        record_error("embedding", type(exc).__name__)
        raise ModelUnavailable(type(exc).__name__) from None
    return values


def runtime_status(url: str, *, timeout: float = 2.0) -> Dict[str, Any]:
    """Whether the Ollama at ``url`` answers, and which models it has pulled.

    A health probe for the admin screen: it lists models and sends no prompt.
    """
    if not url:
        return {"reachable": None, "models": [], "error": ""}
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(f"{url}/api/tags")
            resp.raise_for_status()
            names = [str(item.get("name", "")) for item in resp.json().get("models", [])]
        return {"reachable": True, "models": sorted(name for name in names if name), "error": ""}
    except Exception as exc:  # noqa: BLE001 — a probe reports, never raises
        return {"reachable": False, "models": [], "error": type(exc).__name__}
