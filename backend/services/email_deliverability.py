"""Sync email deliverability gate for the OTP send path (CIR-74).

``send_otp`` in ``services.workflow_auth`` is a sync route, so it cannot
await the async gates in ``core.email_quality`` (``assess``/``allow_send``
need Mongo + event loop). This module exposes a sync check that:

1. Reuses the sync ``reject_reason()`` (disposable domains, junk local-parts).
2. Skips network checks for test/demo domains (``.test``, ``.example``,
   ``.invalid``, ``.localhost``) so fixtures never hit DNS.
3. Otherwise does a bounded MX-then-A lookup (worst case ~3s: two 1.5s
   queries, same budget as ``core.email_quality._has_mx``). A hard
   negative (NXDOMAIN / no nameservers / no answer on both MX and A)
   rejects with 422.

Deliberate availability tradeoff (documented exception to "fail closed"):
timeouts and unknown DNS errors fail OPEN (allow + attempt delivery).
Rationale: a timeout means unknown, not undeliverable — the SMTP/Postal
hop may still deliver — and minting a challenge grants nothing without
inbox access, so no session or privilege is conferred. Failing closed
here would lock every email user out of auth during any DNS outage.
``success:true`` after a passed gate still means provider-accepted, not
inbox-proven; the gate's job is to stop claiming success for destinations
DNS proves cannot receive mail.

Rate-limit ordering note: the caller runs ``limit()`` BEFORE this gate so
unbounded fake-domain requests cannot amplify into unbounded DNS load.
(Rejections still consume identifier budget; that quota-burn vector
pre-exists for valid requests and is bounded by the IP bucket.)

DNS semantics mirror ``core.email_quality._has_mx``; the resolver is an
injectable module-level callable so tests never touch the network.
"""
from __future__ import annotations

from typing import Callable, NamedTuple, Optional

from core.email_quality import reject_reason


class EmailRejection(NamedTuple):
    status: int
    reason: str


# Test/demo fixtures must never trigger real DNS lookups.
_TEST_DOMAINS = frozenset({"studentkare.test", "example.test"})
_TEST_SUFFIXES = (".test", ".example", ".invalid", ".localhost")

_UNDELIVERABLE = "This email domain cannot receive mail."


def _has_mx_or_a(domain: str) -> Optional[bool]:
    """True/False if DNS answers; None on timeout/unknown (do not block)."""
    try:
        import dns.resolver
    except Exception:
        return None
    try:
        resolver = dns.resolver.Resolver()
        resolver.lifetime = 1.5
        resolver.timeout = 1.5
        try:
            resolver.resolve(domain, "MX")
            return True
        except dns.resolver.NoAnswer:
            try:
                resolver.resolve(domain, "A")
                return True
            except Exception:
                return False
        except (dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
            return False
        except Exception:
            return None
    except Exception:
        return None


# Injectable DNS probe. Tests replace this; production uses real DNS.
_resolve_domain: Callable[[str], Optional[bool]] = _has_mx_or_a


def check_email_deliverable(
    email: str,
    dns_check: Callable[[str], Optional[bool]] | None = None,
) -> EmailRejection | None:
    """Sync gate. Returns None when acceptable, else status + reason."""
    address = (email or "").strip().lower()
    local, sep, domain = address.partition("@")
    if not sep or not local or "." not in domain:
        return EmailRejection(422, "Enter a valid email address.")
    domain = domain.rstrip(".")
    if not domain or "." not in domain:
        return EmailRejection(422, "Enter a valid email address.")

    reason = reject_reason(address)
    if reason:
        # Matches core.email_quality.require_ok precedent (HTTP 400).
        return EmailRejection(400, reason)

    if domain in _TEST_DOMAINS or domain.endswith(_TEST_SUFFIXES):
        return None

    try:
        ascii_domain = domain.encode("idna").decode("ascii")
    except Exception:
        return EmailRejection(422, "Enter a valid email address.")

    probe = dns_check or _resolve_domain
    try:
        hit = probe(ascii_domain)
    except Exception:
        hit = None
    if hit is False:
        return EmailRejection(422, _UNDELIVERABLE)
    return None
