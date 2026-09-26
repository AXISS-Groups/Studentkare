"""Envelope encryption for provider secrets persisted in care_system_settings.

- Secrets (keys matching _SECRET_HINTS) are Fernet-encrypted before write when
  INTEGRATIONS_ENCRYPTION_KEY holds a valid Fernet key. Otherwise values are
  stored as today (plaintext) and a one-time warning is logged.
- Legacy plaintext rows keep loading unchanged; only "$enc" markers decrypt.
- A missing/invalid key with markers present fails closed per provider
  (env defaults kept, feature effectively disabled) instead of silently
  dropping secrets.

Key management:
  Generate:  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  Configure: INTEGRATIONS_ENCRYPTION_KEY=<key>  (server env, never in git)
  Rotate:    boot with the OLD key, re-save each provider (SuperAdmin UI),
             then switch env to the NEW key and re-save once more.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger("services.integration_secret_vault")

MARKER = "$enc"
VERSION = "fernet-v1"

# Mirrors SECRET_HINTS in services.integration_config (kept local to avoid a
# circular import: integration_config imports this module).
_SECRET_HINTS = ("key", "secret", "token", "password", "service_account_json")

_warned_no_key = False


def _fernet() -> Optional[Any]:
    """Return a Fernet instance when a valid key is configured, else None."""
    global _warned_no_key
    raw = os.getenv("INTEGRATIONS_ENCRYPTION_KEY", "")
    if not raw:
        if not _warned_no_key:
            logger.warning("[vault] INTEGRATIONS_ENCRYPTION_KEY not set — provider secrets stored in plaintext")
            _warned_no_key = True
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(raw.encode("utf-8") if isinstance(raw, str) else raw)
    except Exception:
        if not _warned_no_key:
            logger.warning("[vault] INTEGRATIONS_ENCRYPTION_KEY invalid — provider secrets stored in plaintext")
            _warned_no_key = True
        return None


def _is_secret_field(name: str, value: Any) -> bool:
    return isinstance(value, str) and bool(value) and any(h in name.lower() for h in _SECRET_HINTS)


def encrypt_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Return a copy with secret strings Fernet-enveloped (or unchanged). Never raises."""
    f = _fernet()
    out: Dict[str, Any] = {}
    for k, v in (config or {}).items():
        if f is not None and _is_secret_field(k, v):
            try:
                out[k] = {MARKER: VERSION, "data": f.encrypt(str(v).encode("utf-8")).decode("utf-8")}
                continue
            except Exception as err:
                logger.warning("[vault] encrypt failed for field, storing plaintext: %s", str(err)[:120])
        out[k] = v
    return out


def decrypt_config(stored: Dict[str, Any]) -> Dict[str, Any]:
    """Reverse encrypt_config. Raises ValueError when markers cannot be opened."""
    out: Dict[str, Any] = {}
    for k, v in (stored or {}).items():
        if isinstance(v, dict) and v.get(MARKER) == VERSION:
            f = _fernet()
            if f is None:
                raise ValueError("encrypted provider secret present but INTEGRATIONS_ENCRYPTION_KEY is missing/invalid")
            try:
                out[k] = f.decrypt(str(v.get("data") or "").encode("utf-8")).decode("utf-8")
            except Exception as err:
                raise ValueError(f"cannot decrypt provider secret field: {str(err)[:80]}")
        else:
            out[k] = v
    return out
