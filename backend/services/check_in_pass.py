"""The check-in pass: a signed QR and 6-digit code that change every 30 seconds.

The pass used to be a fixed string (`SACARE-ID:<account>.<secret>`), so a
screenshot of it kept working until the student revoked it. Now:

- The server signs (account, pass secret, 30 s step) with PASS_SIGNING_SECRET.
  The phone never holds a key: it shows what the server issued for this step.
- A code verifies only for the current or the previous step (at most ~60 s),
  and only once — a second scan of the same step is refused.
- Revoking the pass (DELETE /identity) drops the pass secret, which kills
  every code at once.

Offline: the phone never makes codes (that needs a key on the device, which
AGENTS.md guardrail 9 rules out). Instead the server pre-signs the next
WINDOW_STEPS steps (10 minutes) and the app holds them in memory only — never
in storage. A weak signal at the counter keeps working; each code is still
valid only in its own 30 s step, and once the window runs out, or the app is
closed while offline, the pass shows nothing and the counter falls back to the
college ID.
"""
import base64
import hashlib
import hmac
import os
import re
import time

STEP_SECONDS = 30
WINDOW_STEPS = 20  # 10 minutes of pre-signed codes, held in app memory only
PREFIX = "SKPASS1"
TOKEN = re.compile(rf"{PREFIX}:([a-zA-Z0-9_-]{{1,80}})\.([0-9]{{1,12}})\.([a-zA-Z0-9_-]{{22}})")

_dev_key = os.urandom(32)


class PassSigningUnavailable(Exception):
    """No signing key outside development/test: no pass can be issued or checked."""


def _key() -> bytes:
    configured = os.getenv("PASS_SIGNING_SECRET", "").strip()
    if configured:
        return configured.encode()
    if os.getenv("APP_ENV", "").strip().lower() in ("development", "testing"):
        return _dev_key
    raise PassSigningUnavailable("Set PASS_SIGNING_SECRET to issue check-in passes.")


def step_now(now: float | None = None) -> int:
    return int((time.time() if now is None else now) // STEP_SECONDS)


def _mac(purpose: str, account_id: str, pass_secret: str, step: int) -> bytes:
    return hmac.new(_key(), f"{purpose}|{account_id}|{pass_secret}|{step}".encode(), hashlib.sha256).digest()


def token_for(account_id: str, pass_secret: str, step: int) -> str:
    sig = base64.urlsafe_b64encode(_mac("qr", account_id, pass_secret, step)).decode()[:22]
    return f"{PREFIX}:{account_id}.{step}.{sig}"


def code_for(account_id: str, pass_secret: str, step: int) -> str:
    return str(int.from_bytes(_mac("code", account_id, pass_secret, step)[:8], "big") % 1_000_000).zfill(6)


def current(account_id: str, pass_secret: str, now: float | None = None) -> dict:
    step = step_now(now)
    return {"token": token_for(account_id, pass_secret, step), "passCode": code_for(account_id, pass_secret, step),
            "step": step, "expiresAt": (step + 1) * STEP_SECONDS, "rotateSeconds": STEP_SECONDS}


def window(account_id: str, pass_secret: str, now: float | None = None, steps: int = WINDOW_STEPS) -> list[dict]:
    """This step and the next ones, each valid only during its own 30 s."""
    first = step_now(now)
    return [{"step": s, "token": token_for(account_id, pass_secret, s), "passCode": code_for(account_id, pass_secret, s),
             "startsAt": s * STEP_SECONDS, "expiresAt": (s + 1) * STEP_SECONDS} for s in range(first, first + steps)]


def parse_token(value: str) -> tuple[str, int, str] | None:
    match = TOKEN.fullmatch(value.strip())
    return (match[1], int(match[2]), match[3]) if match else None


def fresh_steps(now: float | None = None) -> tuple[int, int]:
    """The steps a code may come from: this one, or the one that just ended."""
    step = step_now(now)
    return step, step - 1


def token_matches(account_id: str, pass_secret: str, step: int, sig: str) -> bool:
    return hmac.compare_digest(token_for(account_id, pass_secret, step).rsplit(".", 1)[1], sig)


def code_step(account_id: str, pass_secret: str, code: str, now: float | None = None) -> int | None:
    for step in fresh_steps(now):
        if hmac.compare_digest(code_for(account_id, pass_secret, step), code):
            return step
    return None
