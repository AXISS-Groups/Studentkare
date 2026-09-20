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

# PII Patterns
PII_PATTERNS = [
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[REDACTED_EMAIL]"),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_SSN]"),
]


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

        # 3. PII Masking
        for pii_regex, replacement in PII_PATTERNS:
            matches = pii_regex.findall(sanitized)
            if matches:
                metrics["pii_redacted"] += len(matches)
                sanitized = pii_regex.sub(replacement, sanitized)

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
        for pii_regex, replacement in PII_PATTERNS:
            sanitized = pii_regex.sub(replacement, sanitized)

        # Remove raw script tags
        sanitized = re.sub(r"<script[\s\S]*?>[\s\S]*?</script>", "[REMOVED_SCRIPT_TAG]", sanitized, flags=re.IGNORECASE)
        # Remove iframe tags
        sanitized = re.sub(r"<iframe[\s\S]*?>[\s\S]*?</iframe>", "[REMOVED_IFRAME_TAG]", sanitized, flags=re.IGNORECASE)
        return sanitized
