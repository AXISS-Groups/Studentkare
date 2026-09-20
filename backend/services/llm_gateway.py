"""
services.llm_gateway — On-prem LLM inference gateway (Ollama / OpenAI-compatible).

A real, network-capable inference client that enforces the AI security
guardrails (prompt-injection defence, secret/PII DLP, output sanitisation) and
supports a deterministic fallback when no local model is reachable.  This keeps
the platform 100% air-gapped-compliant (Rule-C) while allowing real reasoning.
"""
from __future__ import annotations

import logging
import os
import asyncio
from typing import Any, Dict, Optional

import httpx

from core.ai_security_guardrails import AISecurityGuardrail

logger = logging.getLogger("services.llm_gateway")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.environ.get("LLM_MODEL", "llama3.1:8b")


def _call_ollama(prompt: str, model: str, system: Optional[str]) -> str:
    payload: Dict[str, Any] = {"model": model, "prompt": prompt, "stream": False}
    if system:
        payload["system"] = system
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(f"{OLLAMA_URL}/api/generate", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "")


class LLMGateway:
    """Thin wrapper with guardrail enforcement + deterministic fallback."""

    def __init__(self) -> None:
        self.ollama_url = OLLAMA_URL
        self.model = LLM_MODEL

    def is_configured(self) -> bool:
        return bool(os.environ.get("OLLAMA_URL"))

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        fallback: str = "",
    ) -> str:
        safe, sanitized_prompt, metrics = AISecurityGuardrail.validate_prompt(prompt)
        if not safe:
            return metrics.get("sanitized", "[BLOCKED: Security policy violation detected]")

        if self.is_configured():
            models_to_try = [self.model, "mistral"]
            for model_name in models_to_try:
                for attempt in range(3):
                    try:
                        raw = _call_ollama(sanitized_prompt, model_name, system)
                        return AISecurityGuardrail.sanitize_output(raw)
                    except Exception as exc:        
                        logger.warning(
                            "Model %s failed (attempt %d): %s", model_name, attempt + 1,exc
                        )
                        if attempt < 2:
                            await asyncio.sleep(2 ** attempt)
            logger.warning("All models unavailable; using deterministic fallback.")
        return fallback

    async def chat(self, messages: list, fallback: str = "") -> str:
        """Simple chat wrapper (OpenAI-style messages)."""
        prompt = "\n".join(f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages)
        return await self.generate(prompt, fallback=fallback)


llm_gateway = LLMGateway()
