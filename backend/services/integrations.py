"""SuperAdmin-configurable integrations: PostHog, OpenWA, Postal, Firebase, OTP + 2FA policy.

- GET /api/config/public — non-secret config for frontend init (no auth).
- GET/PUT /api/admin/integrations (+ /{provider}/test) — SUPER_ADMIN only, audit-logged.
- POST /api/auth/2fa/setup|enable|disable|challenge — TOTP authenticator 2FA.
"""
import time
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services.integration_config import (
    INTEGRATIONS_DB,
    public_config,
    sanitize,
    save_to_db,
)
from services.twofa_store import TWO_FA_STORE, consume_pending, generate_secret, totp_verify
from services.workflow_auth import (
    StrictModel,
    account_payload,
    authenticated_user,
    issue_session,
    require_super_admin,
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
def get_public_config():
    return public_config()


@router.get("/admin/integrations")
def list_integrations(user: dict = Depends(require_super_admin)):
    return {"integrations": {k: sanitize(k) for k in INTEGRATIONS_DB}}


@router.put("/admin/integrations/{provider}")
def update_integration(provider: str, body: ConfigUpdate,
                       user: dict = Depends(require_super_admin),
                       db: DBSession = Depends(workflow_db)):
    if provider not in INTEGRATIONS_DB:
        raise HTTPException(404, f"Unknown provider '{provider}'")
    current = INTEGRATIONS_DB[provider]
    for k, v in (body.config or {}).items():
        if k.endswith("_masked"):
            continue
        current[k] = v
    save_to_db(provider)
    _audit(db, user, "INTEGRATION_CONFIG_UPDATED", provider)
    return {"success": True, "provider": provider, "config": sanitize(provider)}


@router.post("/admin/integrations/{provider}/test")
def test_integration(provider: str, user: dict = Depends(require_super_admin)):
    if provider == "openwa":
        cfg = INTEGRATIONS_DB["openwa"]
        if not cfg.get("base_url") or not cfg.get("api_key") or not cfg.get("session_id"):
            return {"success": False, "connected": False, "message": "OpenWA not configured (base_url/api_key/session_id required)"}
        try:
            r = httpx.get(f"{cfg['base_url'].rstrip('/')}/api/sessions/{cfg['session_id']}",
                          headers={"X-API-Key": cfg["api_key"]}, timeout=10)
            return {"success": 200 <= r.status_code < 300, "connected": 200 <= r.status_code < 300, "http": r.status_code}
        except (httpx.HTTPError, OSError, ValueError) as err:
            return {"success": False, "connected": False, "message": str(err)[:300]}
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



@router.post("/auth/2fa/setup")
def setup_2fa(user: dict = Depends(authenticated_user)):
    issuer = INTEGRATIONS_DB.get("twofa", {}).get("issuer", "StudentKare")
    existing = TWO_FA_STORE.get(user["id"])
    secret = (existing or {}).get("secret") or generate_secret()
    TWO_FA_STORE[user["id"]] = {"secret": secret, "enabled": bool((existing or {}).get("enabled")),
                                "verified_at": (existing or {}).get("verified_at")}
    account = user.get("email") or user.get("phone") or user["id"]
    otpauth = (f"otpauth://totp/{urllib.parse.quote(issuer)}:{urllib.parse.quote(str(account))}"
               f"?secret={secret}&issuer={urllib.parse.quote(issuer)}&digits=6&period=30")
    return {"success": True, "secret": secret, "otpauthUrl": otpauth,
            "enabled": TWO_FA_STORE[user["id"]]["enabled"]}


@router.post("/auth/2fa/enable")
def enable_2fa(body: TwoFAToken, user: dict = Depends(authenticated_user)):
    entry = TWO_FA_STORE.get(user["id"])
    if not entry:
        raise HTTPException(400, "Run 2FA setup first")
    if not totp_verify(entry["secret"], body.token):
        raise HTTPException(400, "Invalid authenticator code")
    entry["enabled"] = True
    entry["verified_at"] = time.time()
    return {"success": True, "message": "Two-factor authentication enabled"}


@router.post("/auth/2fa/disable")
def disable_2fa(body: TwoFAToken, user: dict = Depends(authenticated_user)):
    entry = TWO_FA_STORE.get(user["id"])
    if not entry or not entry.get("enabled"):
        return {"success": True, "message": "2FA already disabled"}
    if not totp_verify(entry["secret"], body.token):
        raise HTTPException(400, "Invalid authenticator code")
    entry["enabled"] = False
    return {"success": True, "message": "Two-factor authentication disabled"}


@router.post("/auth/2fa/challenge")
def challenge_2fa(body: TwoFAToken, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    account_id = consume_pending(body.tempToken or "")
    if not account_id:
        raise HTTPException(401, "Expired 2FA session. Verify your code again.")
    entry = TWO_FA_STORE.get(account_id)
    if not entry or not totp_verify(entry.get("secret", ""), body.token):
        raise HTTPException(400, "Invalid authenticator code")
    account = db.get(M.Account, account_id)
    if not account or not account.active:
        raise HTTPException(404, "No active account was found.")
    csrf = issue_session(db, account, response, request)
    db.commit()
    return {"success": True, "user": account_payload(account), "csrfToken": csrf}
