"""
services.crisis_gate — Server-side crisis gate for the read-only care navigator.

Python peer of ``src/ai/core/crisisGate.ts`` (M-5.1 / G0.1). The browser gate cannot
be trusted on its own: a client can be bypassed, and the navigator answers from the
server. This module is the authoritative evaluation.

Non-negotiable rules (mirrored from the TypeScript module):
 1. Fails closed. Any exception or non-string input evaluates to a crisis, never to
    "clear". A gate that cannot complete denies.
 2. Deterministic floor. Exact phrase matching runs first. A classifier may only ever
    escalate a clear result to crisis, never demote a crisis to clear.
 3. Overdose and toxicity queries must never return a lethal dose or toxicity
    threshold. The gate returns poison-control routing and no retrieved content.
 4. The query text is never logged. It is the most sensitive string in the system.

The phrase table below is kept byte-identical to the TypeScript table. Both are
safety-critical and must be edited together; ``tests/test_crisis_gate.py`` parses the
TypeScript source and fails the build if the two drift.
"""
from __future__ import annotations

import re

TELE_MANAS_PRIMARY = "14416"
TELE_MANAS_TOLL_FREE = "1-800-891-4416"
EMERGENCY_NUMBER = "112"
DEFAULT_CAMPUS_COUNSELLOR = "1800-599-0019"
POISON_HELPLINE = "1800-116-117"

# SYNC: src/ai/core/crisisGate.ts — CRISIS_PHRASE_MAPPINGS
# TODO(clinical-review): advisor-reviewed phrase floor (English, Hindi, Telugu, Hinglish).
CRISIS_PHRASE_MAPPINGS: list[tuple[str, str, str]] = [
    # --- English self-harm and suicidal intent ---
    (r"end\s+(my\s+)?life", "CRISIS_SELF_HARM", "EN"),
    (r"end\s+it\s+all", "CRISIS_SELF_HARM", "EN"),
    (r"kill\s+my\s*self", "CRISIS_SELF_HARM", "EN"),
    (r"kil\s+my\s*self", "CRISIS_SELF_HARM", "EN"),
    (r"suicid(e|al)", "CRISIS_SELF_HARM", "EN"),
    (r"sucidal", "CRISIS_SELF_HARM", "EN"),
    (r"self\s*harm", "CRISIS_SELF_HARM", "EN"),
    (r"cut(ting)?\s+(my\s+)?wrist", "CRISIS_SELF_HARM", "EN"),
    (r"exit\s+from\s+this\s+world", "CRISIS_SELF_HARM", "EN"),
    (r"can['’]?t\s+take\s+it\s+any\s*more", "CRISIS_SELF_HARM", "EN"),
    (r"want\s+to\s+die", "CRISIS_SELF_HARM", "EN"),
    # --- Hindi ---
    (r"जान\s+लेना", "CRISIS_SELF_HARM", "HI"),
    (r"आत्महत्या", "CRISIS_SELF_HARM", "HI"),
    (r"खुद\s+को\s+मार", "CRISIS_SELF_HARM", "HI"),
    (r"मरना\s+चाहता", "CRISIS_SELF_HARM", "HI"),
    # --- Telugu ---
    (r"చనిపోవాలని", "CRISIS_SELF_HARM", "TE"),
    (r"ఆత్మహత్య", "CRISIS_SELF_HARM", "TE"),
    (r"చనిపోతాను", "CRISIS_SELF_HARM", "TE"),
    # --- Hinglish / Tenglish ---
    (r"marne\s+ka\s+man", "CRISIS_SELF_HARM", "HINGLISH"),
    (r"ji\s+sakta", "CRISIS_SELF_HARM", "HINGLISH"),
    (r"chani\s*povali", "CRISIS_SELF_HARM", "HINGLISH"),
    (r"cheskuntanu", "CRISIS_SELF_HARM", "HINGLISH"),
    (r"suicide\s+kar\s+dunga", "CRISIS_SELF_HARM", "HINGLISH"),
    (r"jeena\s+nahi\s+hai", "CRISIS_SELF_HARM", "HINGLISH"),
    # --- Overdose / toxicity intent ---
    (r"how\s+many\s+pills\s+to\s+die", "CRISIS_OVERDOSE", "EN"),
    (r"lethal\s+dose", "CRISIS_OVERDOSE", "EN"),
    (r"overdose", "CRISIS_OVERDOSE", "EN"),
    (r"how\s+much\s+is\s+too\s+much", "CRISIS_OVERDOSE", "EN"),
    (r"maximum\s+dose\s+to\s+pass\s+out", "CRISIS_OVERDOSE", "EN"),
    (r"toxic\s+limit", "CRISIS_OVERDOSE", "EN"),
    (r"how\s+many\s+crocin\s+to\s+kill", "CRISIS_OVERDOSE", "EN"),
    # --- Medical emergency signals ---
    (r"chest\s+pain", "CRISIS_MEDICAL", "EN"),
    (r"can(not|'t)\s+breathe", "CRISIS_MEDICAL", "EN"),
    (r"bleeding\s+heavily", "CRISIS_MEDICAL", "EN"),
    (r"swelling\s+throat", "CRISIS_MEDICAL", "EN"),
    (r"unresponsive", "CRISIS_MEDICAL", "EN"),
    (r"seizure", "CRISIS_MEDICAL", "EN"),
    (r"anaphylaxis", "CRISIS_MEDICAL", "EN"),
]

# SYNC: src/ai/core/crisisGate.ts — CLEAR_HYPERBOLE_PATTERNS
# Everyday hyperbole. Only consulted when no crisis phrase matched: an explicit
# crisis phrase always wins over the allowlist.
CLEAR_HYPERBOLE_PATTERNS: list[str] = [
    r"dying\s+of\s+boredom",
    r"assignment\s+is\s+killing\s+me",
    r"murder\s+a\s+biryani",
    r"dead\s+tired",
    r"battery\s+died",
]

_COMPILED = [(re.compile(p, re.IGNORECASE), kind, lang) for p, kind, lang in CRISIS_PHRASE_MAPPINGS]
_COMPILED_HYPERBOLE = [re.compile(p, re.IGNORECASE) for p in CLEAR_HYPERBOLE_PATTERNS]


def _resources(kind: str) -> list[dict[str, str]]:
    """Contact cards rendered beside the message. Ordered most-immediate first."""
    if kind == "CRISIS_OVERDOSE":
        return [
            {"label": "National Poison Helpline", "number": POISON_HELPLINE, "detail": "24/7 poison control"},
            {"label": "Emergency Services", "number": EMERGENCY_NUMBER, "detail": "Ambulance and emergency care"},
            {"label": "Tele-MANAS", "number": TELE_MANAS_PRIMARY, "detail": "Free, confidential, 24/7"},
        ]
    if kind == "CRISIS_MEDICAL":
        return [
            {"label": "Emergency Services", "number": EMERGENCY_NUMBER, "detail": "Ambulance and emergency care"},
            {"label": "Tele-MANAS", "number": TELE_MANAS_PRIMARY, "detail": "Free, confidential, 24/7"},
        ]
    # Self-harm and the fail-closed path both lead with mental-health support.
    return [
        {"label": "Tele-MANAS", "number": TELE_MANAS_PRIMARY, "detail": "Free, confidential, 24/7 — English, Hindi, Telugu"},
        {"label": "Tele-MANAS (toll free)", "number": TELE_MANAS_TOLL_FREE, "detail": "Same service, toll-free line"},
        {"label": "Emergency Services", "number": EMERGENCY_NUMBER, "detail": "If you are in immediate danger"},
        {"label": "Campus Counsellor", "number": DEFAULT_CAMPUS_COUNSELLOR, "detail": "Student counselling support"},
    ]


def _message(kind: str, student_name: str) -> str:
    if kind == "CRISIS_OVERDOSE":
        return (
            f"{student_name}, if you or someone you know has taken medication in dangerous "
            f"quantities, seek emergency care now. Call the National Poison Helpline "
            f"({POISON_HELPLINE}), Emergency Services ({EMERGENCY_NUMBER}), or Tele-MANAS "
            f"({TELE_MANAS_PRIMARY}). I will not provide dosage or toxicity information."
        )
    if kind == "CRISIS_MEDICAL":
        return (
            f"{student_name}, this sounds like a medical emergency that needs immediate "
            f"assistance. Call Emergency Services ({EMERGENCY_NUMBER}), open your Emergency "
            f"Card, or contact your campus health centre right now."
        )
    if kind == "ERROR_FAIL_CLOSED":
        return (
            f"{student_name}, I could not complete that safely, so I am giving you support "
            f"options instead. Tele-MANAS ({TELE_MANAS_PRIMARY} / {TELE_MANAS_TOLL_FREE}) is "
            f"free, confidential and available 24/7. For immediate danger call "
            f"{EMERGENCY_NUMBER}."
        )
    return (
        f"{student_name}, I hear that you are going through a very painful time. You are not "
        f"alone. Please talk to someone right now who can support you. Tele-MANAS "
        f"({TELE_MANAS_PRIMARY} / {TELE_MANAS_TOLL_FREE}) is free, confidential, available "
        f"24/7 in English, Hindi and Telugu."
    )


def _crisis(kind: str, student_name: str, language: str = "") -> dict:
    return {
        "status": "error" if kind == "ERROR_FAIL_CLOSED" else "crisis",
        "isCrisis": True,
        "kind": kind,
        "language": language,
        "message": _message(kind, student_name),
        "resources": _resources(kind),
    }


def _clear() -> dict:
    return {"status": "clear", "isCrisis": False, "kind": "CLEAR", "language": "", "message": "", "resources": []}


def evaluate(text, student_name: str = "Student") -> dict:
    """Deterministic floor evaluation. Never raises; an internal failure is a crisis.

    The query is not logged, echoed into an exception message, or persisted here.
    """
    try:
        if not isinstance(text, str):
            return _crisis("ERROR_FAIL_CLOSED", student_name)

        normalized = text.strip().lower()
        if not normalized:
            return _clear()

        # An explicit crisis phrase outranks the hyperbole allowlist, so match first.
        for pattern, kind, language in _COMPILED:
            if pattern.search(normalized):
                return _crisis(kind, student_name, language)

        return _clear()
    except Exception:  # noqa: BLE001 — fail closed; the reason must not carry the query
        return _crisis("ERROR_FAIL_CLOSED", student_name)


def is_hyperbole(text: str) -> bool:
    """True when the text is a known everyday exaggeration and no crisis phrase matched.

    Exposed for tests and for a future classifier stage, which may use it to suppress a
    false escalation. It can never demote a deterministic crisis match.
    """
    try:
        normalized = (text or "").strip().lower()
        if any(pattern.search(normalized) for pattern, _, _ in _COMPILED):
            return False
        return any(pattern.search(normalized) for pattern in _COMPILED_HYPERBOLE)
    except Exception:  # noqa: BLE001
        return False
