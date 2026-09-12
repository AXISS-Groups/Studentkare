"""TOTP 2FA store + RFC 6238 verification (stdlib only, no extra deps).

Leaf module — no app imports. Keyed by persistent account id so it works
with the SQL-backed auth. In-memory: swap to a table for multi-instance prod.
"""
import base64
import hashlib
import hmac
import secrets
import struct
import time

# account_id -> {"secret": str, "enabled": bool, "verified_at": float|None}
TWO_FA_STORE: dict = {}
# tempToken -> {"account_id": str, "exp": float}
TWO_FA_PENDING: dict = {}


def _b32_decode(secret: str) -> bytes:
    s = secret.strip().replace(" ", "").upper()
    s += "=" * (-len(s) % 8)
    return base64.b32decode(s)


def totp_verify(secret: str, token: str, step: int = 30, digits: int = 6, window: int = 1) -> bool:
    token = (token or "").strip()
    if not token.isdigit() or len(token) != digits:
        return False
    try:
        key = _b32_decode(secret)
    except Exception:
        return False
    counter = int(time.time() // step)
    for delta in range(-window, window + 1):
        msg = struct.pack(">Q", counter + delta)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        offset = digest[-1] & 0x0F
        code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
        if str(code % (10 ** digits)).zfill(digits) == token:
            return True
    return False


def generate_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def is_enabled(account_id: str) -> bool:
    entry = TWO_FA_STORE.get(account_id)
    return bool(entry and entry.get("enabled"))


def create_pending(account_id: str, ttl_seconds: int = 300) -> str:
    temp = secrets.token_urlsafe(24)
    TWO_FA_PENDING[temp] = {"account_id": account_id, "exp": time.time() + ttl_seconds}
    return temp


def consume_pending(temp_token: str) -> str | None:
    pending = TWO_FA_PENDING.pop(temp_token or "", None)
    if not pending or time.time() > pending.get("exp", 0):
        return None
    return pending["account_id"]
