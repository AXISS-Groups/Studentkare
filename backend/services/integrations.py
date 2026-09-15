"""SuperAdmin-configurable integrations: PostHog, OpenWA, Postal, Firebase, OTP + 2FA policy.

- GET /api/config/public — non-secret config for frontend init (no auth).
- GET/PUT /api/admin/integrations (+ /{provider}/test) — SUPER_ADMIN only, audit-logged.
- POST /api/auth/2fa/setup|enable|disable|challenge — TOTP authenticator 2FA.
"""
import time
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services.integration_config import INTEGRATIONS_DB, load_from_db, public_config, save_to_db, sanitize
from services.twofa_store import TWO_FA_STORE, consume_pending, generate_secret, totp_verify
from services.workflow_auth import (
    StrictModel, account_payload, authenticated_user, issue_session,
    require_super_admin, workflow_db,
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
    if provider in ("otp", "twofa"):
        return {"success": True, "message": f"{provider} policy valid", "config": sanitize(provider)}
    if provider == "platform":
        from services.integration_config import app_domain, brand_name
        return {"success": True, "message": f"Platform settings valid — domain: {app_domain()}, brand: {brand_name()}", "config": sanitize(provider)}
    raise HTTPException(404, f"Unknown provider '{provider}'")


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
