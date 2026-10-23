"""TOTP 2FA, persisted (RFC 6238, stdlib verification).

The secret and the pending second-step tokens used to live in process memory,
so a restart — or a second instance — forgot that an account had 2FA on, and
a super admin then signed in with the OTP alone. Both are now rows.

Secrets are sealed with Fernet under TWO_FACTOR_ENCRYPTION_KEY. Without a key,
only an explicit development/test environment may store a secret unsealed;
anywhere else setup refuses. A sealed secret that cannot be opened (key
missing or rotated away) verifies nothing: the sign-in is refused, never
waved through (AGENTS.md guardrails 1 and 2).
"""
import base64
import hashlib
import hmac
import os
import secrets
import struct
import time

from sqlalchemy.orm import Session

from core import workflow_models as M
from core.app_env import is_dev_or_test

SEALED = "fernet:"
PLAIN = "plain:"
PENDING_SECONDS = 300


class TwoFactorUnavailable(Exception):
    """2FA cannot be set up safely here (no encryption key outside dev/test)."""


def _dev_or_test() -> bool:
    return is_dev_or_test()


def _fernet():
    raw = os.getenv("TWO_FACTOR_ENCRYPTION_KEY", "").strip()
    if not raw:
        return None
    from cryptography.fernet import Fernet
    return Fernet(raw.encode())


def seal(secret: str) -> str:
    f = _fernet()
    if f is not None:
        return SEALED + f.encrypt(secret.encode()).decode()
    if _dev_or_test():
        return PLAIN + secret
    raise TwoFactorUnavailable("Set TWO_FACTOR_ENCRYPTION_KEY before turning on two-step sign-in.")


def unseal(sealed: str) -> str | None:
    """The secret, or None when it cannot be opened (which must deny)."""
    if sealed.startswith(PLAIN):
        return sealed[len(PLAIN):] if _dev_or_test() else None
    if sealed.startswith(SEALED):
        try:
            f = _fernet()
            return f.decrypt(sealed[len(SEALED):].encode()).decode() if f else None
        except Exception:
            return None
    return None


def _b32_decode(secret: str) -> bytes:
    s = secret.strip().replace(" ", "").upper()
    s += "=" * (-len(s) % 8)
    return base64.b32decode(s)


def totp_step(secret: str, token: str, step: int = 30, digits: int = 6, window: int = 1) -> int | None:
    """The 30 s step the token matches, or None."""
    token = (token or "").strip()
    if not token.isdigit() or len(token) != digits:
        return None
    try:
        key = _b32_decode(secret)
    except Exception:
        return None
    counter = int(time.time() // step)
    for delta in range(-window, window + 1):
        msg = struct.pack(">Q", counter + delta)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        offset = digest[-1] & 0x0F
        code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
        if hmac.compare_digest(str(code % (10 ** digits)).zfill(digits), token):
            return counter + delta
    return None


def totp_verify(secret: str, token: str, step: int = 30, digits: int = 6, window: int = 1) -> bool:
    return totp_step(secret, token, step, digits, window) is not None


def generate_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def get(db: Session, account_id: str) -> M.TwoFactorSecret | None:
    return db.get(M.TwoFactorSecret, account_id)


def is_enabled(db: Session, account_id: str) -> bool:
    row = get(db, account_id)
    return bool(row and row.enabled)


def start_setup(db: Session, account_id: str) -> tuple[str, bool]:
    """Keep an existing secret, or create one. Returns (secret, enabled)."""
    row = get(db, account_id)
    if row:
        secret = unseal(row.secret_sealed)
        if secret is not None:
            return secret, row.enabled
        if row.enabled:
            # The stored secret can't be opened. Don't silently replace it on an
            # account that relies on it: that would let setup reset 2FA.
            raise TwoFactorUnavailable("Two-step sign-in can't be read on this server. Ask a super admin to reset it.")
    secret = generate_secret()
    if row:
        row.secret_sealed = seal(secret)
        row.last_step = 0
    else:
        db.add(M.TwoFactorSecret(account_id=account_id, secret_sealed=seal(secret), enabled=False, verified_at=0.0, last_step=0))
    return secret, False


def check_code(db: Session, account_id: str, token: str) -> bool:
    """Verify an authenticator code once. Denies on anything it cannot check."""
    row = get(db, account_id)
    if not row:
        return False
    secret = unseal(row.secret_sealed)
    if secret is None:
        return False
    matched = totp_step(secret, token)
    if matched is None or matched <= (row.last_step or 0):
        return False
    row.last_step = matched
    return True


def create_pending(db: Session, account_id: str, ttl_seconds: int = PENDING_SECONDS, first_factor: str = "CODE") -> str:
    """``first_factor`` says what passed before this step: CODE (a one-time code), PASSCODE or PIN."""
    temp = secrets.token_urlsafe(24)
    db.add(M.TwoFactorPending(token_hash=hashlib.sha256(temp.encode()).hexdigest(), account_id=account_id,
                              expires_at=time.time() + ttl_seconds, first_factor=first_factor))
    return temp


def consume_pending_with_factor(db: Session, temp_token: str) -> tuple[str | None, str]:
    """Single use: the row is deleted whether or not the code that follows is right. (account id, first factor)."""
    if not temp_token:
        return None, ""
    row = db.get(M.TwoFactorPending, hashlib.sha256(temp_token.encode()).hexdigest())
    if not row:
        return None, ""
    account_id, expired, factor = row.account_id, time.time() > row.expires_at, row.first_factor or "CODE"
    db.delete(row)
    return (None, "") if expired else (account_id, factor)


def consume_pending(db: Session, temp_token: str) -> str | None:
    """Single use: the row is deleted whether or not the code that follows is right."""
    return consume_pending_with_factor(db, temp_token)[0]
