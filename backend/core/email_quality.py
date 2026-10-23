"""Automatic email quality gate (free, no paid APIs).

Blocks disposable/temp domains and junk local-parts (test@gmail.com). The
disposable list refreshes itself from GitHub; no one has to copy lists around.

There is no bounce-suppression list. One used to be read from MongoDB, which no
deployment runs: the lookup failed, was caught, and answered "not suppressed"
every time (audit TD-48). Postal keeps its own suppression list for hard bounces;
a Postgres-backed one here would need a bounce webhook to fill it, which is not
built.
"""
from __future__ import annotations

import asyncio
import re
import time
from typing import Optional, Tuple

# Community list used by PyPI. Fetched automatically; fallback if offline.
_LIST_URL = (
    "https://raw.githubusercontent.com/disposable-email-domains/"
    "disposable-email-domains/master/disposable_email_blocklist.conf"
)
_REFRESH_SECS = 24 * 3600

_FALLBACK = {
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
    "grr.la", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
    "throwawaymail.com", "yopmail.com", "yopmail.fr", "trashmail.com", "trashmail.net",
    "getnada.com", "emailondeck.com", "fakeinbox.com", "maildrop.cc", "dispostable.com",
    "mailnesia.com", "moakt.com", "tempail.com", "discard.email", "mailcatch.com",
    "mytrashmail.com", "tempinbox.com", "mailnull.com", "spamgourmet.com",
    "inboxkitten.com", "burnermail.io", "guerrillamailblock.com", "pokemail.net",
    "spam4.me", "bccto.me", "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com",
    "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com",
    "teleworm.us", "ein.email",
}

_JUNK_LOCAL = {
    "test", "testing", "tester", "asdf", "asdfg", "qwerty", "abc", "abcd",
    "xyz", "xxx", "fake", "dummy", "sample", "example", "noreply", "no-reply",
    "donotreply", "temp", "tmp", "guest", "bounce", "spam", "invalid", "null",
}

_JUNK_PREFIX = re.compile(r"^(test|testing|tester|fake|dummy|temp|tmp|asdf|qwerty)[0-9._-]*$")

# Placeholder locals like test@ are only blocked on public webmail.
# College inboxes (test@snist.edu.in) stay valid for events and fixtures.
_CONSUMER = {
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in",
    "ymail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
    "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
    "aol.com", "rediffmail.com", "zoho.com", "zohomail.com", "gmx.com",
    "mail.com",
}

_domains: set[str] = set(_FALLBACK)
_loaded_at = 0.0
_lock = asyncio.Lock()


def _norm(email: str) -> str:
    return (email or "").strip().lower()


def _parts(email: str) -> Tuple[str, str]:
    e = _norm(email)
    if "@" not in e:
        return "", ""
    local, domain = e.rsplit("@", 1)
    return local, domain


def _junk_local(local: str) -> bool:
    base = local.split("+", 1)[0]
    if base in _JUNK_LOCAL:
        return True
    return bool(_JUNK_PREFIX.match(base))


def _consumer_mailbox(domain: str) -> bool:
    d = domain.rstrip(".")
    return any(d == s or d.endswith("." + s) for s in _CONSUMER)


def _domain_blocked(domain: str) -> bool:
    d = domain.rstrip(".")
    while d:
        if d in _domains:
            return True
        if "." not in d:
            break
        d = d.split(".", 1)[1]
    return False


async def _refresh_list(force: bool = False) -> None:
    global _domains, _loaded_at
    now = time.time()
    if not force and _domains and (now - _loaded_at) < _REFRESH_SECS:
        return
    async with _lock:
        now = time.time()
        if not force and _domains and (now - _loaded_at) < _REFRESH_SECS:
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=12) as c:
                r = await c.get(_LIST_URL)
            if r.status_code == 200:
                fetched = {
                    line.strip().lower()
                    for line in r.text.splitlines()
                    if line.strip() and not line.startswith("#")
                }
                if len(fetched) > 100:
                    _domains = fetched | _FALLBACK
                    _loaded_at = now
                    return
        except Exception:  # noqa: BLE001 — the built-in fallback list still applies
            pass
        if not _loaded_at:
            _domains = set(_FALLBACK)
            _loaded_at = now


def reject_reason(email: str) -> Optional[str]:
    """Fast sync checks (no DNS, no DB). None = looks acceptable."""
    e = _norm(email)
    local, domain = _parts(e)
    if not local or not domain or "." not in domain:
        return "Invalid email address"
    if _junk_local(local) and _consumer_mailbox(domain):
        return "This looks like a test or placeholder email. Use your real inbox."
    if _domain_blocked(domain):
        return "Temporary / disposable email addresses are not allowed."
    return None


async def allow_send(email: str) -> Tuple[bool, str]:
    """Gate every outbound message. False = do not hand it to a provider."""
    await _refresh_list()
    reason = reject_reason(email)
    if reason:
        return False, reason
    return True, ""
