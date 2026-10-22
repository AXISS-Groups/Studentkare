"""
backend/core/ai_security_guardrails.py

Composite Cybersecurity & AI Guardrail Layer.
Combines Guardrails AI patterns, Anthropic Defense Harness standards, and PII/Secret DLP masking.
Protects AI endpoints and Agent K against prompt injection, secret leaks, and malicious payloads.
"""

import logging
import re
from typing import Any, Dict, Tuple

logger = logging.getLogger("ai_security_guardrails")

# Common Secret Regex Patterns (API keys, JWTs, Auth Tokens, Private Keys)
SECRET_PATTERNS = [
    (re.compile(r"sk-[a-zA-Z0-9]{32,}", re.IGNORECASE), "[REDACTED_API_KEY]"),
    (re.compile(r"bearer\s+[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_\.]+", re.IGNORECASE), "[REDACTED_JWT_TOKEN]"),
    (re.compile(r"ghp_[a-zA-Z0-9]{36}", re.IGNORECASE), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"xox[baprs]-[a-zA-Z0-9\-]{10,}", re.IGNORECASE), "[REDACTED_SLACK_TOKEN]"),
    (re.compile(r"-----BEGIN (RSA|EC|PGP|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END \1 PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
]

# Prompt Injection Patterns
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+all\s+previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s+prompt\s+override", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+DAN\s+mode", re.IGNORECASE),
    re.compile(r"reveal\s+your\s+system\s+prompt", re.IGNORECASE),
    re.compile(r"bypass\s+all\s+safety\s+filters", re.IGNORECASE),
    re.compile(r"<script>[\s\S]*?</script>", re.IGNORECASE),
]

# PII Patterns. Order matters: the longer identifiers are masked first, so a 14-digit
# ABHA number is never read as an Aadhaar plus two digits, nor an Aadhaar as a phone.
# Each entry is (pattern, replacement, check): ``check`` decides, per match, whether it
# is really that identifier (None masks every match).

# Verhoeff tables (the checksum UIDAI uses for the last digit of an Aadhaar number).
_VERHOEFF_D = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9), (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6), (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8), (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2), (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4), (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)
_VERHOEFF_P = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9), (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2), (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0), (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5), (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)


def verhoeff_valid(digits: str) -> bool:
    """Whether a digit string carries a valid Verhoeff check digit."""
    if not digits.isdigit():
        return False
    check = 0
    for index, char in enumerate(reversed(digits)):
        check = _VERHOEFF_D[check][_VERHOEFF_P[index % 8][int(char)]]
    return check == 0


AADHAAR_DIGITS = 12


def _digits(match: re.Match) -> str:
    return re.sub(r"\D", "", match.group(0))


def _is_aadhaar(match: re.Match) -> bool:
    # A real Aadhaar never starts with 0 or 1 and always passes Verhoeff. Without the
    # checksum, every 12-digit order or invoice number would be masked too.
    digits = _digits(match)
    return len(digits) == AADHAAR_DIGITS and digits[0] not in "01" and verhoeff_valid(digits)


# An identifier named in words is masked whatever its checksum says: "my aadhaar is
# 1234 5678 9012" is someone telling us their Aadhaar, typo or not.
_NAMED_AADHAAR = re.compile(r"(?i)\b(aadhaa?r|aadhar|uid(?:ai)?)\s*(?:no\.?|number|#)?\s*[:\-]?\s*\d{4}[\s-]?\d{4}[\s-]?\d{4}\b")
_NAMED_ROLL = re.compile(
    r"(?i)\b(roll|hall[\s-]?ticket|enrol?ment|registration|reg|admission)\s*(?:no\.?|number|num|#|id)\s*[:\-]?\s*[A-Za-z0-9][A-Za-z0-9/\-]{3,19}\b")

PII_PATTERNS = [
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[REDACTED_EMAIL]", None),
    # ABHA address: a handle on the ABDM domain (name@abdm, name@sbx in the sandbox).
    (re.compile(r"\b[A-Za-z0-9][A-Za-z0-9._]{2,}@(?:abdm|sbx)\b", re.IGNORECASE), "[REDACTED_ABHA_ADDRESS]", None),
    # ABHA number: 14 digits, written 91-1234-5678-9012 or run together.
    (re.compile(r"(?<!\d)\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)"), "[REDACTED_ABHA_NUMBER]", None),
    (_NAMED_AADHAAR, "[REDACTED_AADHAAR]", None),
    # Aadhaar: 12 digits, often in groups of four, checked with Verhoeff.
    (re.compile(r"(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)"), "[REDACTED_AADHAAR]", _is_aadhaar),
    # Indian mobile: optional +91 / 91 / 0, then ten digits starting 6-9.
    (re.compile(r"(?<![\d+])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)"), "[REDACTED_PHONE]", None),
    (_NAMED_ROLL, "[REDACTED_ROLL_NUMBER]", None),
    # University roll / hall-ticket numbers in the common JNTU-style shape, e.g. 21A91A0501.
    (re.compile(r"\b\d{2}[A-Z0-9]{2}\d[A-Z][0-9A-Z]\d{3}\b"), "[REDACTED_ROLL_NUMBER]", None),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_SSN]", None),
]


def mask_pii(text: str) -> Tuple[str, int]:
    """Mask every PII pattern in ``text``. Returns the masked text and how many were masked."""
    masked = 0

    def replace_with(replacement: str, check):
        def _replace(match: re.Match) -> str:
            nonlocal masked
            if check is not None and not check(match):
                return match.group(0)
            masked += 1
            return replacement
        return _replace

    for pattern, replacement, check in PII_PATTERNS:
        text = pattern.sub(replace_with(replacement, check), text)
    return text, masked


class AISecurityGuardrail:
    """Composite AI Guardrail Layer providing DLP, Prompt Injection Defense, and Output Sanitization."""

    @staticmethod
    def validate_prompt(prompt: str) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates and sanitizes incoming AI prompts.
        Returns: (is_safe: bool, sanitized_prompt: str, metrics: Dict[str, Any])
        """
        logger.debug(f"[AISecurityGuardrail DEBUG] Inspecting prompt len={len(prompt or '')}")

        if not prompt or not prompt.strip():
            return True, "", {"checks_passed": True, "prompt_injection": False, "secrets_redacted": 0}

        metrics = {
            "prompt_injection": False,
            "secrets_redacted": 0,
            "pii_redacted": 0,
            "checks_passed": True,
        }

        # 1. Prompt Injection Detection
        for inj_pattern in PROMPT_INJECTION_PATTERNS:
            if inj_pattern.search(prompt):
                logger.warning(f"[AISecurityGuardrail] PROMPT INJECTION BLOCKED: matched pattern '{inj_pattern.pattern}'")
                metrics["prompt_injection"] = True
                metrics["checks_passed"] = False
                return False, "[BLOCKED: Security policy violation detected (Prompt Injection attempt)]", metrics

        sanitized = prompt

        # 2. Secret Key & Auth Token DLP Masking
        for secret_regex, replacement in SECRET_PATTERNS:
            matches = secret_regex.findall(sanitized)
            if matches:
                metrics["secrets_redacted"] += len(matches)
                sanitized = secret_regex.sub(replacement, sanitized)

        # 3. PII Masking (email, Indian phone, Aadhaar, ABHA number and address, roll numbers)
        sanitized, metrics["pii_redacted"] = mask_pii(sanitized)

        logger.debug(f"[AISecurityGuardrail DEBUG] Prompt validation complete. Metrics: {metrics}")
        return True, sanitized, metrics

    @staticmethod
    async def validate_profanity(text: str) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates content using APILayer Bad Words API moderation.
        Returns: (is_clean: bool, censored_text: str, details: Dict[str, Any])
        """
        try:
            from core.apilayer_service import apilayer_service
            res = await apilayer_service.check_profanity(text)
            return res.get("is_clean", True), res.get("censored_content", text), res
        except Exception as e:
            logger.warning(f"[AISecurityGuardrail] Profanity check error fallback: {e}")
            return True, text, {"is_clean": True, "error": str(e)}

    @staticmethod
    def sanitize_output(output_text: str) -> str:
        """
        Sanitizes AI model responses to prevent secret/PII leaks, XSS script tag injection, or HTML breaches.
        """
        if not output_text:
            return ""

        sanitized = output_text
        # Redact secret tokens
        for secret_regex, replacement in SECRET_PATTERNS:
            sanitized = secret_regex.sub(replacement, sanitized)

        # Redact PII
        sanitized, _masked = mask_pii(sanitized)

        # Remove raw script tags
        sanitized = re.sub(r"<script[\s\S]*?>[\s\S]*?</script>", "[REMOVED_SCRIPT_TAG]", sanitized, flags=re.IGNORECASE)
        # Remove iframe tags
        sanitized = re.sub(r"<iframe[\s\S]*?>[\s\S]*?</iframe>", "[REMOVED_IFRAME_TAG]", sanitized, flags=re.IGNORECASE)
        return sanitized
