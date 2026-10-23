"""SuperAdmin-configurable integrations: PostHog, OpenWA, Postal, Firebase, OTP + 2FA policy.

- GET /api/config/public — non-secret config for frontend init (no auth), plus the
  public settings from core/settings_registry.py under ``settings``.
- GET/PUT /api/admin/integrations (+ /{provider}/test) — SUPER_ADMIN only, audit-logged.
- GET /api/auth/2fa/status, POST /api/auth/2fa/setup|enable|disable|challenge — TOTP authenticator 2FA.
- POST /api/ops/accounts/{id}/2fa/reset — SUPER_ADMIN resets another account's lost authenticator.
"""
import time
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from core import settings_registry
from core import workflow_models as M
from core.app_env import is_production
from services import integration_secret_vault as vault
from services import ops_feed, twofa_store
from services.integration_config import (
    INTEGRATIONS_DB,
    is_secret_field,
    public_config,
    sanitize,
    save_to_db,
)
from services.otp_delivery import reset_whatsapp_status, whatsapp_status
from services.workflow_auth import (
    FAIL_CLOSED_TWO_FACTOR_ROLES,
    KNOWN_ROLES,
    StrictModel,
    authenticated_user,
    issue_session,
    limit,
    remember_device,
    require_super_admin,
    session_payload,
    two_factor_required,
    two_factor_setup_user,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Integrations"])


def _audit(db: DBSession, user: dict, action: str, resource_id: str):
    import uuid
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user.get("id", ""),
                           action=action[:80], resource_id=resource_id, created_at=time.time()))
    db.commit()


class ConfigUpdate(StrictModel):
    config: dict = Field(default_factory=dict)


class TwoFAToken(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    token: str = ""
    tempToken: str | None = None


@router.get("/config/public")
def get_public_config(response: Response, db: DBSession = Depends(workflow_db)):
    # Unauthenticated: the app reads these at boot, before anyone signs in.
    response.headers["Cache-Control"] = f"public, max-age={settings_registry.CACHE_TTL_SECONDS}"
    return {**public_config(), "settings": settings_registry.public_values(db)}


TWOFA_KEYS = frozenset({"enforced_roles", "issuer"})


def _check_two_factor_policy(candidate: dict) -> None:
    """The 2FA policy can be tightened through this API but never switched off in production (audit M4)."""
    unknown = set(candidate) - TWOFA_KEYS
    if unknown:
        raise HTTPException(422, f"Unknown 2FA settings: {', '.join(sorted(unknown))}.")
    roles = candidate.get("enforced_roles")
    if isinstance(roles, str):
        roles = roles.split(",")
    if not isinstance(roles, list) or not all(isinstance(r, str) for r in roles):
        raise HTTPException(422, "enforced_roles must be a list of role names.")
    roles = sorted({r.strip().upper() for r in roles if r.strip()})
    if not set(roles) <= KNOWN_ROLES:
        raise HTTPException(422, f"Unknown role in enforced_roles: {', '.join(sorted(set(roles) - KNOWN_ROLES))}.")
    if is_production() and not FAIL_CLOSED_TWO_FACTOR_ROLES <= set(roles):
        raise HTTPException(422, "Two-step sign-in can't be switched off for "
                                 f"{', '.join(sorted(FAIL_CLOSED_TWO_FACTOR_ROLES))} in production.")
    candidate["enforced_roles"] = roles


@router.get("/admin/integrations")
def list_integrations(user: dict = Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    # WhatsApp can be configured and still not deliver (the session logged out):
    # say which, so ops know to re-link it rather than re-enter keys.
    return {"integrations": {k: sanitize(k) for k in INTEGRATIONS_DB},
            "status": {"openwa": whatsapp_status(db)}}


@router.put("/admin/integrations/{provider}")
def update_integration(provider: str, body: ConfigUpdate,
                       user: dict = Depends(require_super_admin),
                       db: DBSession = Depends(workflow_db)):
    if provider not in INTEGRATIONS_DB:
        raise HTTPException(404, f"Unknown provider '{provider}'")
    current = INTEGRATIONS_DB[provider]
    candidate = dict(current)
    for k, v in (body.config or {}).items():
        if k.endswith(("_masked", "_set")):
            continue
        # A form that round-trips the masked placeholder must not overwrite the real secret with it.
        if is_secret_field(k) and isinstance(v, str) and "••••" in v:
            continue
        candidate[k] = v
    if provider == "twofa":
        _check_two_factor_policy(candidate)
    # Fail closed before anything changes: no plaintext secret in production (audit M4).
    try:
        vault.require_key_for(candidate)
    except vault.VaultKeyMissing as exc:
        raise HTTPException(503, {"code": "INTEGRATIONS_KEY_MISSING", "message": str(exc)})
    current.clear()
    current.update(candidate)
    save_to_db(provider)
    if provider == "openwa":
        reset_whatsapp_status()
    _audit(db, user, "INTEGRATION_CONFIG_UPDATED", provider)
    return {"success": True, "provider": provider, "config": sanitize(provider)}


@router.post("/admin/integrations/{provider}/test")
def test_integration(provider: str, user: dict = Depends(require_super_admin)):
    if provider == "openwa":
        # The same session check that decides whether students are offered WhatsApp.
        status = whatsapp_status(refresh=True)
        if not status["configured"]:
            return {"success": False, "connected": False, "state": status["state"],
                    "message": "OpenWA not configured (base_url/api_key/session_id required)"}
        return {"success": status["connected"], "connected": status["connected"], "state": status["state"],
                "message": "WhatsApp session connected" if status["connected"]
                else f"OpenWA is configured but the WhatsApp session is not connected ({status['reason']}). "
                     "Re-link it by scanning the session QR code in OpenWA."}
    if provider == "posthog":
        cfg = INTEGRATIONS_DB["posthog"]
        if not cfg.get("enabled") or not cfg.get("api_key"):
            return {"success": False, "message": "PostHog disabled or api_key missing"}
        try:
            r = httpx.post(f"{(cfg.get('host') or 'https://app.posthog.com').rstrip('/')}/capture/",
                           json={"api_key": cfg["api_key"], "event": "integration_test",
                                 "properties": {"source": "studentkare-superadmin"}}, timeout=10)
            return {"success": 200 <= r.status_code < 300, "http": r.status_code, "message": "Test event sent to PostHog"}
        except (httpx.HTTPError, OSError, ValueError) as err:
            return {"success": False, "message": str(err)[:300]}
    if provider == "postal":
        cfg = INTEGRATIONS_DB["postal"]
        if not cfg.get("enabled"):
            return {"success": False, "message": "Postal disabled"}
        if not cfg.get("api_url") or not cfg.get("server_api_key"):
            return {"success": False, "message": "Postal not configured (api_url/server_api_key required)"}
        try:
            r = httpx.options(f"{cfg['api_url'].rstrip('/')}/api/v1/send/message", timeout=10)
            return {"success": True, "http": r.status_code, "message": f"Postal reachable at {cfg['api_url']}"}
        except httpx.HTTPStatusError as err:
            return {"success": True, "http": err.response.status_code,
                    "message": f"Postal reachable (HTTP {err.response.status_code} on probe)"}
        except (httpx.HTTPError, OSError, ValueError) as err:
            return {"success": False, "message": str(err)[:300]}
    if provider == "firebase":
        cfg = INTEGRATIONS_DB["firebase"]
        if not cfg.get("enabled"):
            return {"success": False, "message": "Firebase disabled"}
        missing = [k for k in ("api_key", "project_id", "app_id") if not cfg.get(k)]
        if missing:
            return {"success": False, "message": f"Missing Firebase fields: {missing}"}
        return {"success": True, "message": f"Firebase config valid for project '{cfg.get('project_id')}' (client SDK init)"}
    if provider == "slack":
        cfg = INTEGRATIONS_DB["slack"]
        if not cfg.get("enabled"):
            return {"success": False, "message": "Slack disabled"}
        if not cfg.get("bot_token") or not cfg.get("default_channel"):
            return {"success": False, "message": "Slack not configured (bot_token/default_channel required)"}
        try:
            r = httpx.post("https://slack.com/api/auth.test",
                           headers={"Authorization": f"Bearer {cfg['bot_token']}"},
                           timeout=10)
            try:
                data = r.json()
            except ValueError:
                return {"success": False, "message": f"Slack auth.test unreachable (HTTP {r.status_code})"}
            if 200 <= r.status_code < 300 and data.get("ok") is True:
                team = str(data.get("team") or "")[:80]
                user = str(data.get("user") or "")[:80]
                return {"success": True, "message": f"Slack connected (team: {team or 'unknown'}, bot: {user or 'unknown'}) — alerts will post to {cfg.get('default_channel')}"}
            err = str(data.get("error") or "unknown_error")[:120]
            return {"success": False, "message": f"Slack rejected token: {err}"}
        except (httpx.HTTPError, OSError, ValueError) as err:
            return {"success": False, "message": str(err)[:300]}
    if provider == "abdm_hfr":
        # Never a live call: the connector reports exactly what it can and cannot do.
        from services import hfr_registry
        current = hfr_registry.status()
        return {"success": False, "state": current["state"], "message": current["message"]}
    if provider == "medicine_ocr":
        # Says whether photos of medicine strips can be read here; reads nothing.
        from services import medicine_ocr
        state = medicine_ocr.status()["state"]
        return {"success": state == medicine_ocr.READY, "state": state,
                "message": {"READY": "The Tesseract reader is installed and on.",
                            "UNAVAILABLE": "Switched on, but the Tesseract program is not installed on this server.",
                            }.get(state, "Not switched on. Reading photos of medicine strips is off.")}
    if provider in ("otp", "twofa"):
        return {"success": True, "message": f"{provider} policy valid", "config": sanitize(provider)}
    if provider == "platform":
        from services.integration_config import app_domain, brand_name
        return {"success": True, "message": f"Platform settings valid — domain: {app_domain()}, brand: {brand_name()}", "config": sanitize(provider)}
    raise HTTPException(404, f"Unknown provider '{provider}'")


class SlackNotifyBody(StrictModel):
    text: str = Field(default="", max_length=2800)
    channel: str = Field(default="", max_length=120)


@router.post("/admin/integrations/slack/notify")
def send_slack_alert(body: SlackNotifyBody,
                     user: dict = Depends(require_super_admin),
                     db: DBSession = Depends(workflow_db)):
    """Send a real non-PHI ops alert to Slack. SUPER_ADMIN only, audit-logged.

    PHI-bearing text is refused (fail closed, nothing sent). The bot token
    is never returned, logged, or echoed.
    """
    from services.slack_notifier import post_ops_alert
    result = post_ops_alert(body.text, body.channel or None)
    _audit(db, user, "SLACK_ALERT_SENT" if result.get("success") else "SLACK_ALERT_REFUSED",
           str(body.channel or INTEGRATIONS_DB.get("slack", {}).get("default_channel") or "")[:80])
    if result.get("success"):
        return {"success": True, "channel": result.get("channel"), "ts": result.get("ts")}
    return {"success": False, "reason": str(result.get("reason") or "send_failed")[:120]}


@router.post("/admin/platform/asset/{asset_type}")
def upload_platform_asset(
    asset_type: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_super_admin),
    db: DBSession = Depends(workflow_db)
):
    """Upload header logo or browser favicon (max 3MB, PNG/JPEG/WEBP/SVG/ICO)."""
    if asset_type not in ("logo", "favicon"):
        raise HTTPException(400, "Asset type must be 'logo' or 'favicon'.")
    content = file.file.read(3 * 1024 * 1024 + 1)
    if len(content) > 3 * 1024 * 1024:
        raise HTTPException(413, "Asset file must be 3 MB or smaller.")

    # Virus scanning
    from services.security_scanner import scan_file_for_viruses
    scan_file_for_viruses(content)

    # Store in care_documents
    import uuid
    doc_id = f"asset_{asset_type}_{uuid.uuid4().hex[:12]}"
    filename = file.filename or f"{asset_type}.png"
    mime = file.content_type or "image/png"

    doc = M.CareDocument(
        id=doc_id,
        account_id=user["id"],
        category="ASSET",
        title=f"Platform {asset_type.title()}",
        filename=filename,
        mime_type=mime,
        size_bytes=len(content),
        content=content,
        created_at=time.time(),
    )
    db.add(doc)

    asset_url = f"/api/platform/asset/{asset_type}?t={int(time.time())}"
    INTEGRATIONS_DB["platform"][f"{asset_type}_url"] = asset_url
    save_to_db("platform")
    _audit(db, user, f"PLATFORM_{asset_type.upper()}_UPLOADED", doc_id)
    db.commit()
    return {"success": True, "assetType": asset_type, "url": asset_url}


@router.get("/platform/asset/{asset_type}")
def get_platform_asset(asset_type: str, db: DBSession = Depends(workflow_db)):
    """Serve uploaded logo or favicon publicly."""
    if asset_type not in ("logo", "favicon"):
        raise HTTPException(404, "Asset not found.")
    doc = db.scalar(
        select(M.CareDocument)
        .where(M.CareDocument.category == "ASSET", M.CareDocument.title.like(f"%{asset_type}%"))
        .order_by(M.CareDocument.created_at.desc())
    )
    if not doc or not doc.content:
        raise HTTPException(404, f"No custom {asset_type} found.")
    return Response(
        content=doc.content,
        media_type=doc.mime_type or "image/png",
        headers={"Cache-Control": "public, max-age=86400"}
    )



def _qr_rows(text: str) -> list[str]:
    """The QR as rows of "1" (dark) and "0" (light), quiet zone included."""
    import qrcode
    qr = qrcode.QRCode(border=4)
    qr.add_data(text)
    qr.make(fit=True)
    return ["".join("1" if cell else "0" for cell in row) for row in qr.get_matrix()]


@router.get("/auth/2fa/status")
def status_2fa(response: Response, user: dict = Depends(two_factor_setup_user), db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    enabled = twofa_store.is_enabled(db, user["id"])
    account = db.get(M.Account, user["id"])
    required = account is not None and two_factor_required(db, account)
    return {"enabled": enabled, "required": required, "setupRequired": required and not enabled}


@router.post("/auth/2fa/setup")
def setup_2fa(response: Response, user: dict = Depends(two_factor_setup_user), db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    # Once 2FA is on the secret is never shown again: a stolen session must not
    # be able to read it and copy the authenticator.
    if twofa_store.is_enabled(db, user["id"]):
        raise HTTPException(409, "Two-step sign-in is already on. Turn it off first to move it to a new app.")
    issuer = INTEGRATIONS_DB.get("twofa", {}).get("issuer", "StudentKare")
    try:
        secret, _enabled = twofa_store.start_setup(db, user["id"])
    except twofa_store.TwoFactorUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    db.commit()
    account = user.get("email") or user.get("phone") or user["id"]
    otpauth = (f"otpauth://totp/{urllib.parse.quote(issuer)}:{urllib.parse.quote(str(account))}"
               f"?secret={secret}&issuer={urllib.parse.quote(issuer)}&digits=6&period=30")
    return {"success": True, "secret": secret, "otpauthUrl": otpauth, "qrMatrix": _qr_rows(otpauth), "enabled": False}


@router.post("/auth/2fa/enable")
def enable_2fa(body: TwoFAToken, user: dict = Depends(two_factor_setup_user), db: DBSession = Depends(workflow_db)):
    limit(db, f"2fa-code:{user['id']}", 10, 300)
    row = twofa_store.get(db, user["id"])
    if not row:
        raise HTTPException(400, "Run 2FA setup first")
    if not twofa_store.check_code(db, user["id"], body.token):
        db.commit()
        raise HTTPException(400, "Invalid authenticator code")
    row.enabled = True
    row.verified_at = time.time()
    db.commit()
    _audit(db, user, "TWO_FACTOR_ENABLED", user["id"])
    return {"success": True, "message": "Two-factor authentication enabled"}


@router.post("/auth/2fa/disable")
def disable_2fa(body: TwoFAToken, user: dict = Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    row = twofa_store.get(db, user["id"])
    if not row or not row.enabled:
        return {"success": True, "message": "2FA already disabled"}
    # A role that must use 2FA can't switch it off: that would hand the next
    # sign-in back to the OTP alone. A lost app is a reset, not a disable.
    account = db.get(M.Account, user["id"])
    if account is None or two_factor_required(db, account):
        raise HTTPException(403, {"code": "TWO_FACTOR_REQUIRED_FOR_ROLE",
                                  "message": "Your role needs two-step sign-in, so it can't be turned off."})
    limit(db, f"2fa-code:{user['id']}", 10, 300)
    if not twofa_store.check_code(db, user["id"], body.token):
        db.commit()
        raise HTTPException(400, "Invalid authenticator code")
    row.enabled = False
    db.commit()
    _audit(db, user, "TWO_FACTOR_DISABLED", user["id"])
    return {"success": True, "message": "Two-factor authentication disabled"}


@router.post("/auth/2fa/challenge")
def challenge_2fa(body: TwoFAToken, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    account_id, first_factor = twofa_store.consume_pending_with_factor(db, body.tempToken or "")
    if not account_id:
        db.commit()
        raise HTTPException(401, "Expired 2FA session. Verify your code again.")
    if not twofa_store.check_code(db, account_id, body.token):
        # The pending token is spent: a wrong code means starting sign-in again.
        db.commit()
        raise HTTPException(400, "Invalid authenticator code")
    account = db.get(M.Account, account_id)
    if not account or not account.active:
        raise HTTPException(404, "No active account was found.")
    code_proven = time.time() if first_factor == "CODE" else 0.0
    named = db.get(M.NamedSuperAdmin, account.id) if account.role == "SUPER_ADMIN" else None
    if named is not None and not named.totp_signed_in_at:
        # The first sign-in through the authenticator: what retiring the shared
        # super admin waits for (services/named_super_admins.py).
        named.totp_signed_in_at = time.time()
        _audit(db, {"id": account.id}, "NAMED_SUPER_ADMIN_TOTP_SIGN_IN", account.id)
    csrf = issue_session(db, account, response, request, code_verified_at=code_proven)
    remember_device(db, account, request, response)
    db.commit()
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf}


class TwoFactorResetInput(StrictModel):
    reason: str = Field(min_length=10, max_length=500)


@router.post("/ops/accounts/{account_id}/2fa/reset")
def reset_2fa(account_id: str, body: TwoFactorResetInput, user: dict = Depends(require_super_admin),
              db: DBSession = Depends(workflow_db)):
    """A lost authenticator: remove the account's 2FA and end its sessions.

    Never on yourself: a super admin who could reset their own second factor
    would make it no factor at all. The reason is audited; the secret never is.
    An account whose role must use 2FA comes back held until it enrols again.
    """
    reason = " ".join(body.reason.split())
    if len(reason) < 10:
        raise HTTPException(422, "Give a reason of at least 10 characters.")
    if account_id == user["id"]:
        raise HTTPException(403, "You can't reset your own two-step sign-in. Ask another super admin.")
    account = db.get(M.Account, account_id)
    if account is None:
        raise HTTPException(404, "No account with that id.")
    row = twofa_store.get(db, account_id)
    if row is None:
        raise HTTPException(409, "This account has no two-step sign-in to reset.")
    db.delete(row)
    # A second step already in flight must not finish either.
    db.execute(delete(M.TwoFactorPending).where(M.TwoFactorPending.account_id == account_id))
    ended = db.execute(delete(M.Session).where(M.Session.account_id == account_id)).rowcount or 0
    import uuid
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user["id"], action="TWO_FACTOR_RESET",
                           resource_id=account_id, created_at=time.time()))
    ops_feed.publish(db, "TWO_FACTOR_RESET", "ACCOUNT", severity="CRITICAL",
                     summary=f"Two-step sign-in reset by a super admin. Reason: {reason}"[:300],
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=account_id,
                     resource_type="account", resource_id=account_id)
    # The holder hears it from us: a reset they didn't ask for is how they'd spot misuse.
    ops_feed.notify(db, account_id, "TWO_FACTOR_RESET", dedupe_key=f"2fa-reset:{account_id}:{time.time():.6f}",
                    summary="Your two-step sign-in was reset by a Studentkare administrator and you were signed out. "
                            "Sign in again and set it up with your authenticator app. If you didn't ask for this, contact support.",
                    resource_type="account", resource_id=account_id)
    db.commit()
    return {"id": account_id, "sessionsEnded": ended,
            "setupRequired": two_factor_required(db, account)}
