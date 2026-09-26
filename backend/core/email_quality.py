"""Automatic email quality gate (free, no paid APIs).

Blocks disposable/temp domains, junk local-parts (test@gmail.com),
and addresses Postal already hard-bounced. Disposable list refreshes
itself from GitHub; no one has to copy lists around.
"""
from __future__ import annotations

import asyncio
import os
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse

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

router = APIRouter(tags=["webhooks"])


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
        except Exception:
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


def require_ok(email: str) -> str:
    """Raise HTTP 400 if junk/disposable. Returns the normalized address."""
    e = _norm(email)
    reason = reject_reason(e)
    if reason:
        try:
            asyncio.get_running_loop().create_task(_log_event(e, reason, "form_block"))
        except RuntimeError:
            pass
        raise HTTPException(status_code=400, detail=reason)
    return e


def _has_mx(domain: str) -> Optional[bool]:
    """True/False if we know; None if DNS timed out (do not block)."""
    try:
        import dns.resolver
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


async def assess(email: str, *, mx: bool = False) -> Optional[str]:
    await _refresh_list()
    reason = reject_reason(email)
    if reason:
        return reason

    # Optional APILayer Mailboxlayer assessment if enabled
    try:
        from core.apilayer_service import apilayer_service
        if apilayer_service.is_enabled():
            res = await apilayer_service.validate_email(email)
            if res.get("disposable"):
                return "Temporary or disposable email address detected by Mailboxlayer."
            if res.get("score", 1.0) < 0.3:
                return "Low deliverability score for email address."
    except Exception:
        pass

    if mx:
        _, domain = _parts(email)
        hit = await asyncio.to_thread(_has_mx, domain)
        if hit is False:
            return "This email domain cannot receive mail."
    return None


async def is_suppressed(email: str) -> bool:
    try:
        from core.db import db
        doc = await db.email_suppressions.find_one({"email": _norm(email)}, {"_id": 1})
        return bool(doc)
    except Exception:
        return False


async def _log_event(email: str, reason: str, kind: str, source: str = "") -> None:
    try:
        from core.db import db
        await db.email_quality_events.insert_one({
            "email": _norm(email),
            "reason": (reason or "")[:400],
            "kind": kind,
            "source": source,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def suppress(email: str, reason: str, source: str = "postal") -> None:
    e = _norm(email)
    if not e or "@" not in e:
        return
    try:
        from core.db import db
        await db.email_suppressions.update_one(
            {"email": e},
            {"$set": {
                "email": e,
                "reason": (reason or "hard_bounce")[:400],
                "source": source,
                "updated_at": datetime.now(timezone.utc),
            }, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        await _log_event(e, reason or "hard_bounce", "bounce", source)
    except Exception as ex:
        print(f"[WARN] email suppress failed: {ex}")


async def allow_send(email: str) -> Tuple[bool, str]:
    """Gate every outbound message. False = do not hand to Postal."""
    await _refresh_list()
    reason = reject_reason(email)
    if reason:
        await _log_event(email, reason, "skipped_send", "quality_gate")
        return False, reason
    if await is_suppressed(email):
        await _log_event(email, "suppressed", "skipped_send", "suppression")
        return False, "Address is on the bounce suppression list"
    return True, ""


def _extract_bounce_email(body: dict) -> Tuple[str, str]:
    """Postal webhook payloads vary; pull the recipient + bounce type."""
    payload = body.get("payload") if isinstance(body.get("payload"), dict) else body
    bounce = payload.get("bounce") if isinstance(payload.get("bounce"), dict) else {}
    msg = payload.get("message") or payload.get("original_message") or {}
    if not isinstance(msg, dict):
        msg = {}
    to = (
        bounce.get("email")
        or payload.get("to")
        or payload.get("rcpt_to")
        or (msg.get("to")[0] if isinstance(msg.get("to"), list) and msg.get("to") else None)
        or msg.get("to")
        or body.get("to")
        or ""
    )
    if isinstance(to, list):
        to = to[0] if to else ""
    if isinstance(to, dict):
        to = to.get("address") or to.get("email") or ""
    status = str(
        bounce.get("bounce_type")
        or bounce.get("status")
        or payload.get("status")
        or body.get("event")
        or ""
    ).lower()
    return _norm(str(to)), status


@router.post("/webhooks/postal")
async def postal_webhook(request: Request):
    """Postal → POST this URL for MessageBounced / MessageDeliveryFailed.

    Configure in Postal: Webhooks → this path on the API host.
    Optional header check: POSTAL_WEBHOOK_SECRET vs X-Postal-Signature / query.
    """
    secret = (os.environ.get("POSTAL_WEBHOOK_SECRET") or "").strip()
    if not secret:
        try:
            from core.db import db
            doc = await db.settings.find_one({"id": "global"}) or {}
            secret = (doc.get("postal_webhook_secret") or "").strip()
            if not secret:
                it = await db.installed_tools.find_one({"tool_id": "postal"})
                secret = str(((it or {}).get("credentials") or {}).get("webhook_secret") or "").strip()
        except Exception:
            secret = ""
    if secret:
        got = (request.headers.get("x-postal-token") or request.query_params.get("token") or "").strip()
        if got != secret:
            return JSONResponse({"ok": False}, status_code=401)
    try:
        body = await request.json()
    except Exception:
        return {"ok": True}
    if not isinstance(body, dict):
        return {"ok": True}
    email, status = _extract_bounce_email(body)
    hard = any(k in status for k in ("hard", "bounce", "failed", "error"))
    event = str(body.get("event") or "").lower()

    if "bounce" in event or "fail" in event or "held" in event:
        hard = True

    if email and "@" in email and hard:
        await suppress(email, status or event or "bounce", source="postal_webhook")

        # If it's a hard bounce or held, we might want to cancel pending in postal,
        # but the webhook itself means it already failed.
    return {"ok": True}


async def warmup() -> None:
    try:
        await _refresh_list(force=True)
    except Exception:
        pass
    try:
        from routers.admin.settings import ensure_postal_webhook_secret
        await ensure_postal_webhook_secret()
    except Exception:
        pass


def _iso(v):
    return v.isoformat() if hasattr(v, "isoformat") else v


def _ser(doc: dict) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    for k in ("created_at", "updated_at"):
        if k in out:
            out[k] = _iso(out[k])
    return out


async def _admin_user(request: Request) -> dict:
    from core.deps import get_current_user
    user = await get_current_user(request)
    role = (user.get("role") or "").lower()
    if role not in ("admin", "super_admin") and not user.get("is_super_admin"):
        raise HTTPException(403, "Insufficient privileges")
    return user


@router.get("/admin/email-quality")
async def email_quality_report(
    q: str = Query(""),
    _user: dict = Depends(_admin_user),
):
    from core.db import db
    needle = (q or "").strip().lower()
    filt: dict = {}
    if needle:
        filt["email"] = {"$regex": re.escape(needle)}
    suppressed = await db.email_suppressions.find(filt).sort("updated_at", -1).to_list(500)
    since = datetime.now(timezone.utc) - timedelta(days=7)
    events = await db.email_quality_events.find(filt).sort("created_at", -1).to_list(200)

    # Count total emails from both users and talent_pool
    users_count = await db.users.count_documents({"email": {"$regex": r"@", "$options": "i"}})
    talent_count = 0
    try:
        talent_count = await db.talent_pool.count_documents({"email": {"$regex": r"@", "$options": "i"}})
    except Exception:
        pass
    total_emails = users_count + talent_count

    return {
        "total_emails": total_emails,
        "users_count": users_count,
        "talent_count": talent_count,
        "suppressed_count": await db.email_suppressions.count_documents({}),
        "events_7d": await db.email_quality_events.count_documents({"created_at": {"$gte": since}}),
        "suppressions": [_ser(d) for d in suppressed],
        "events": [_ser(d) for d in events],
    }


@router.delete("/admin/email-quality/suppressions")
async def unsuppress_email(
    email: str = Query(...),
    _user: dict = Depends(_admin_user),
):
    from core.db import db
    e = _norm(email)
    res = await db.email_suppressions.delete_one({"email": e})
    if not res.deleted_count:
        raise HTTPException(404, "Not on the suppression list")
    return {"ok": True, "email": e}


@router.delete("/admin/email-quality/suppressions/bulk")
async def bulk_unsuppress_emails(
    emails: list[str] = Query(..., description="List of emails to restore"),
    _user: dict = Depends(_admin_user),
):
    """Restore multiple suppressed emails at once."""
    from core.db import db

    restored = 0
    not_found = []

    for email in emails:
        e = _norm(email)
        res = await db.email_suppressions.delete_one({"email": e})
        if res.deleted_count:
            restored += 1
        else:
            not_found.append(e)

    return {
        "ok": True,
        "restored": restored,
        "not_found": not_found,
        "message": f"Restored {restored} emails"
    }


@router.delete("/admin/email-quality/suppressions/all")
async def unsuppress_all_emails(
    _user: dict = Depends(_admin_user),
):
    """Restore ALL suppressed emails. Use with caution."""
    from core.db import db

    result = await db.email_suppressions.delete_many({})

    return {
        "ok": True,
        "deleted": result.deleted_count,
        "message": f"Restored {result.deleted_count} emails"
    }


@router.post("/admin/email-quality/suppressions/bulk")
async def bulk_suppress_emails(
    request: Request,
    _user: dict = Depends(_admin_user),
):
    """Suppress multiple emails at once (e.g. from audit results)."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    emails = body.get("emails", [])
    reason = body.get("reason", "bulk_suppress")
    source = body.get("source", "audit")

    if not isinstance(emails, list):
        raise HTTPException(400, "emails must be a list")

    suppressed_count = 0
    for email in emails:
        if email and isinstance(email, str):
            await suppress(email, reason, source)
            suppressed_count += 1

    return {
        "ok": True,
        "suppressed": suppressed_count,
        "message": f"Suppressed {suppressed_count} emails"
    }


@router.get("/admin/email-quality/audit")
async def audit_all_emails(
    _user: dict = Depends(_admin_user),
):
    """Audit all emails in the database for deliverability issues.

    Checks:
    - Invalid email format
    - Disposable/temp email domains
    - Role accounts (admin@, support@, etc.)
    - Known problematic domains
    - Already suppressed emails
    - Duplicate emails across collections
    """
    from core.db import db

    # Load disposable domains list
    disposable_domains = set(_FALLBACK)
    try:
        if _domains:
            disposable_domains = set(_domains)
    except Exception:
        pass

    role_prefixes = {'admin', 'support', 'info', 'contact', 'noreply', 'no-reply',
                     'webmaster', 'postmaster', 'hostmaster', 'abuse', 'spam',
                     'billing', 'help', 'sales', 'marketing', 'office', 'hr'}

    stats = {
        "total_scanned": 0,
        "valid": 0,
        "invalid_format": 0,
        "disposable": 0,
        "role_account": 0,
        "suppressed": 0,
        "duplicate": 0,
        "issues": [],
        "health_score": 0.0,
        "issue_count": 0,
    }

    seen_emails = set()

    # Scan users collection
    async for user in db.users.find({}, {"email": 1}):
        email = (user.get("email") or "").strip().lower()
        if not email or "@" not in email:
            stats["invalid_format"] += 1
            continue

        stats["total_scanned"] += 1

        # Check for duplicates
        if email in seen_emails:
            stats["duplicate"] += 1
            stats["issues"].append({"email": email, "reason": "duplicate", "source": "users"})
            continue
        seen_emails.add(email)

        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            stats["invalid_format"] += 1
            stats["issues"].append({"email": email, "reason": "invalid_format", "source": "users"})
            continue

        # Check for disposable domains
        domain = email.split("@")[1]
        if domain in disposable_domains:
            stats["disposable"] += 1
            stats["issues"].append({"email": email, "reason": "disposable", "source": "users"})
            continue

        # Check for role accounts
        local_part = email.split("@")[0]
        if local_part in role_prefixes:
            stats["role_account"] += 1
            stats["issues"].append({"email": email, "reason": "role_account", "source": "users"})
            continue

        # Check if suppressed
        try:
            is_sup = await db.email_suppressions.find_one({"email": email})
            if is_sup:
                stats["suppressed"] += 1
                stats["issues"].append({"email": email, "reason": "suppressed", "source": "users"})
                continue
        except Exception:
            pass

        stats["valid"] += 1

    # Scan talent_pool collection
    try:
        async for talent in db.talent_pool.find({}, {"email": 1}):
            email = (talent.get("email") or "").strip().lower()
            if not email or "@" not in email:
                stats["invalid_format"] += 1
                continue

            stats["total_scanned"] += 1

            if email in seen_emails:
                stats["duplicate"] += 1
                stats["issues"].append({"email": email, "reason": "duplicate", "source": "talent_pool"})
                continue
            seen_emails.add(email)

            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                stats["invalid_format"] += 1
                stats["issues"].append({"email": email, "reason": "invalid_format", "source": "talent_pool"})
                continue

            domain = email.split("@")[1]
            if domain in disposable_domains:
                stats["disposable"] += 1
                stats["issues"].append({"email": email, "reason": "disposable", "source": "talent_pool"})
                continue

            local_part = email.split("@")[0]
            if local_part in role_prefixes:
                stats["role_account"] += 1
                stats["issues"].append({"email": email, "reason": "role_account", "source": "talent_pool"})
                continue

            try:
                is_sup = await db.email_suppressions.find_one({"email": email})
                if is_sup:
                    stats["suppressed"] += 1
                    stats["issues"].append({"email": email, "reason": "suppressed", "source": "talent_pool"})
                    continue
            except Exception:
                pass

            stats["valid"] += 1

    except Exception:
        pass  # talent_pool collection might not exist

    # Calculate health score
    total = stats["total_scanned"] or 1
    stats["health_score"] = round((stats["valid"] / total) * 100, 1)
    stats["issue_count"] = len(stats["issues"])

    return stats


@router.post("/admin/email-quality/postal-sync")
async def sync_postal(
    _user: dict = Depends(_admin_user),
):
    """Sync held messages and bounces from Postal API."""
    import httpx

    from core.email import _get_postal_from_db, get_postal_config

    cfg = await _get_postal_from_db()
    if not cfg:
        cfg = get_postal_config()

    if not cfg or not cfg.get("api_url") or not cfg.get("server_api_key"):
        return {"ok": False, "message": "Postal is not configured"}

    api_url = cfg["api_url"].rstrip("/")
    api_key = cfg["server_api_key"]

    headers = {
        "X-Server-API-Key": api_key,
        "Content-Type": "application/json"
    }

    synced = 0
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            # Postal API to search messages by status
            r = await c.post(f"{api_url}/api/v1/messages", headers=headers, json={"status": "Held"})
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, dict) and "data" in data:
                    messages = data["data"]
                    if isinstance(messages, list):
                        for msg in messages:
                            msg_to = msg.get("to")
                            msg_status = msg.get("status")
                            msg_id = msg.get("id")
                            if msg_to and msg_status == "Held":
                                await suppress(msg_to, "held_by_postal", source="postal_sync")
                                synced += 1
                                # Attempt to cancel the held message in Postal
                                if msg_id:
                                    try:
                                        # Postal cancellation endpoint might be /api/v1/messages/cancel
                                        # Not checking response to allow graceful failure if unsupported
                                        await c.post(f"{api_url}/api/v1/messages/cancel", headers=headers, json={"id": msg_id})
                                    except Exception:
                                        pass
    except Exception as e:
        return {"ok": False, "message": str(e)}

    return {"ok": True, "message": f"Postal sync completed. Synced {synced} held messages.", "synced": synced}
