"""The emergency card in the phone wallet (Apple Wallet, Google Wallet).

Plan docs/plans/tier1-emergency-card-wallet-2026-10-24.md (Tier 1, approved by
Krishna Chintakayala 2026-10-24; legal and clinical sign-off owed, so both wallets
stay off through the settings registry until then).

What goes on a pass is the student's choice: name, blood group and one emergency
contact are on by default, allergies, health conditions and medicines are each a
separate opt-in. "Call 112" and Tele-MANAS 14416 are always on it. The content is
rebuilt from the student's own records whenever it is needed; only a hash of it is
kept, so a change is noticed and pushed without copying a health value here.

* Apple: a signed .pkpass downloaded once through a single-use link, then kept up to
  date through Apple's PassKit web service (``/api/wallet/apple/v1/...``) and empty APNs
  pushes. The contents stay on the student's devices.
* Google: the object is written to Google's Wallet API (Google stores it), so it needs
  the ``WALLET_GOOGLE`` consent (services/consent_ledger.py); the save link names only
  the object id.

Revoked (voided, every detail removed from the copy left on the phone or at Google)
when the student removes it, withdraws the Google consent, asks to delete the account,
or leaves campus. Every change is audited by pass id; nothing here logs content, tokens
or push tokens, and no URL carries a health value (serials are random).
"""
from __future__ import annotations

import hashlib
import json
import secrets
import time
import uuid
from dataclasses import asdict, dataclass
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import clinical_profile, consent_ledger, ops_feed, wallet_apple, wallet_google
from services.workflow_auth import StrictModel, authenticated_user, workflow_db

router = APIRouter(tags=["Emergency card wallet"])

APPLE = "APPLE"
GOOGLE = "GOOGLE"
PLATFORMS = (APPLE, GOOGLE)
ACTIVE = "ACTIVE"
VOIDED = "VOIDED"

# Why a pass was voided.
REMOVED = "REMOVED"
CONSENT_WITHDRAWN = "CONSENT_WITHDRAWN"
ACCOUNT_DELETION = "ACCOUNT_DELETION"
LEFT_CAMPUS = "LEFT_CAMPUS"

FIELDS = ("name", "blood", "contact", "allergies", "conditions", "medicines")
DEFAULT_FIELDS = ("name", "blood", "contact")
WALLET_UNAVAILABLE = "WALLET_UNAVAILABLE"
WALLET_FAILED = "WALLET_FAILED"
CONSENT_REQUIRED = "WALLET_GOOGLE_CONSENT_REQUIRED"
PUSH_GIVE_UP_KIND = "WALLET_PASS_PUSH_FAILED"
JOB_BATCH = 50
INDIA_MOBILE_DIGITS = 10
SERIAL_BYTES = 16
DOWNLOAD_TOKEN_BYTES = 32
SECONDS_PER_MINUTE = 60
# Longest download token or Apple device id we accept (ours are 43 characters; Apple's ids are short).
MAX_TOKEN_LENGTH = 128


def _now() -> float:
    return time.time()


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=actor_id, action=action, resource_id=resource_id,
                           created_at=_now()))


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


# --- availability -------------------------------------------------------------------------------

def available(db: Session | None = None) -> dict[str, bool]:
    """Which wallets may be offered: turned on in settings AND their credentials configured."""
    return {
        "apple": bool(setting("emergency_card.wallet_apple_enabled", db)) and wallet_apple.config() is not None,
        "google": bool(setting("emergency_card.wallet_google_enabled", db)) and wallet_google.config() is not None,
    }


# --- content ------------------------------------------------------------------------------------

@dataclass(frozen=True)
class PassContent:
    """What a pass shows. A field the student did not switch on is None (left off the pass)."""
    name: str | None
    blood: str | None
    contact: dict | None
    allergies: list[str] | None
    conditions: list[str] | None
    medicines: list[str] | None

    def as_dict(self) -> dict:
        return asdict(self)


def _phone(raw: str) -> str:
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) == INDIA_MOBILE_DIGITS:
        return f"+91 {digits}"
    return raw.strip()


def build_content(db: Session, account: M.Account, fields: list[str]) -> PassContent:
    """The pass content from the student's own records, only for the fields they chose."""
    chosen = set(fields)
    stored = account.profile or {}
    clinical = clinical_profile.read(db, account.id)
    medicines = None
    if "medicines" in chosen:
        medicines = list(db.scalars(select(M.MedicationPlan.name).where(
            M.MedicationPlan.account_id == account.id, M.MedicationPlan.active.is_(True))
            .order_by(M.MedicationPlan.created_at)).all())
    return PassContent(
        name=account.full_name if "name" in chosen else None,
        blood=clinical["bloodGroup"] if "blood" in chosen else None,
        contact={"name": str(stored.get("emergencyContactName", "")),
                 "phone": _phone(str(stored.get("emergencyContactPhone", "")))} if "contact" in chosen else None,
        allergies=list(clinical["allergies"]) if "allergies" in chosen else None,
        conditions=list(stored.get("chronicConditions", [])) if "conditions" in chosen else None,
        medicines=medicines,
    )


def content_for(db: Session, row: M.WalletPass) -> dict | None:
    """The content of this pass now; None for a voided pass (it then carries nothing)."""
    if row.status != ACTIVE:
        return None
    account = db.get(M.Account, row.account_id)
    if account is None:
        return None
    return build_content(db, account, list(row.fields or [])).as_dict()


def _content_hash(content: dict | None) -> str:
    return _hash(json.dumps(content, sort_keys=True, ensure_ascii=False))


def _refresh(db: Session, row: M.WalletPass) -> bool:
    """Re-hash the content; a change bumps updated_at and queues a push. Staged."""
    digest = _content_hash(content_for(db, row))
    if digest == row.content_hash:
        return False
    row.content_hash = digest
    row.updated_at = _now()
    row.push_pending = True
    row.push_attempts = 0
    return True


def sync_account(db: Session, account_id: str) -> int:
    """After the card changed: queue an update for each active pass whose content changed. Staged."""
    rows = db.scalars(select(M.WalletPass).where(M.WalletPass.account_id == account_id,
                                                 M.WalletPass.status == ACTIVE)).all()
    changed = sum(1 for row in rows if _refresh(db, row))
    for row in rows:
        if row.push_pending:
            _audit(db, account_id, "WALLET_PASS_UPDATE_QUEUED", row.id)
    return changed


def revoke(db: Session, account_id: str, reason: str, platform: str | None = None) -> int:
    """Void every active pass (of one platform, or all) and queue the void. Staged.

    The voided pass carries no detail at all, so the copy left on a phone or at
    Google says only that the card was removed.
    """
    query = select(M.WalletPass).where(M.WalletPass.account_id == account_id, M.WalletPass.status == ACTIVE)
    if platform:
        query = query.where(M.WalletPass.platform == platform)
    rows = db.scalars(query).all()
    now = _now()
    for row in rows:
        row.status = VOIDED
        row.voided_at = now
        row.void_reason = reason
        row.updated_at = now
        row.content_hash = _content_hash(None)
        row.push_pending = True
        row.push_attempts = 0
        row.download_token_hash = ""
        row.download_expires_at = 0.0
        _audit(db, account_id, f"WALLET_PASS_VOIDED_{reason}", row.id)
    return len(rows)


# --- delivery to the wallets -----------------------------------------------------------------------

def _push_one(db: Session, row: M.WalletPass) -> None:
    """Send one queued update or void. Raises the wallet's error on failure."""
    content = content_for(db, row)
    if row.platform == APPLE:
        cfg = wallet_apple.config()
        if cfg is None:
            raise wallet_apple.AppleWalletError("Apple Wallet is not configured")
        registrations = db.scalars(select(M.WalletRegistration).where(M.WalletRegistration.pass_id == row.id)).all()
        if registrations:
            gone = set(wallet_apple.push(cfg, [r.push_token for r in registrations]))
            for registration in registrations:
                if registration.push_token in gone:
                    db.delete(registration)
        return
    cfg_g = wallet_google.config()
    if cfg_g is None:
        raise wallet_google.GoogleWalletError("Google Wallet is not configured")
    wallet_google.upsert_object(cfg_g, row.serial, wallet_google.object_body(cfg_g, row.serial, content, row.updated_at))


def push_pending(db: Session, account_id: str | None = None, limit: int = JOB_BATCH) -> dict:
    """Deliver queued updates and voids. Staged; the caller commits. Failures stay queued."""
    query = select(M.WalletPass).where(M.WalletPass.push_pending.is_(True))
    if account_id:
        query = query.where(M.WalletPass.account_id == account_id)
    rows = db.scalars(query.order_by(M.WalletPass.updated_at).limit(limit)).all()
    max_attempts = setting("emergency_card.wallet_push_max_attempts", db)
    sent = failed = 0
    for row in rows:
        try:
            _push_one(db, row)
        except (wallet_apple.AppleWalletError, wallet_google.GoogleWalletError):
            failed += 1
            row.push_attempts += 1
            _audit(db, "system", "WALLET_PASS_PUSH_FAILED", row.id)
            if row.push_attempts >= max_attempts:
                row.push_pending = False
                ops_feed.publish(db, PUSH_GIVE_UP_KIND, "ACCOUNT", severity="CRITICAL",
                                 summary=f"A {row.platform.title()} Wallet pass update could not be sent "
                                         f"after {row.push_attempts} attempts",
                                 resource_type="wallet_pass", resource_id=row.id)
            continue
        row.push_pending = False
        row.push_attempts = 0
        row.pushed_at = _now()
        _audit(db, "system", "WALLET_PASS_PUSHED", row.id)
        sent += 1
    return {"sent": sent, "failed": failed}


def deliver(db: Session, account_id: str) -> None:
    """After a commit in a request: send this account's queued pushes now and commit.

    Delivery is not a gate (the change is already saved and the pass is already
    voided on our side); a failure stays queued for the ``wallet_passes`` job.
    """
    push_pending(db, account_id)
    db.commit()


def run_job(db: Session) -> dict:
    """Worker job ``wallet_passes``: notice content changes, read Google save state, push. Never commits."""
    active = db.scalars(select(M.WalletPass).where(M.WalletPass.status == ACTIVE)
                        .order_by(M.WalletPass.updated_at).limit(JOB_BATCH * 4)).all()
    changed = sum(1 for row in active if _refresh(db, row))
    checked = 0
    cfg_g = wallet_google.config()
    if cfg_g is not None:
        for row in [r for r in active if r.platform == GOOGLE and not r.in_wallet][:JOB_BATCH]:
            try:
                row.in_wallet = wallet_google.has_users(cfg_g, row.serial)
                checked += 1
            except wallet_google.GoogleWalletError:
                continue
    result = push_pending(db)
    db.flush()
    return {"summary": {"changed": changed, "googleChecked": checked, **result}}


# --- the student's endpoints ---------------------------------------------------------------------

def require_student(user=Depends(authenticated_user)):
    if user["role"] != "STUDENT":
        raise HTTPException(403, "The emergency card belongs to a student account.")
    return user


def _account(db: Session, user: dict) -> M.Account:
    account = db.scalar(select(M.Account).where(M.Account.id == user["id"], M.Account.active.is_(True)))
    if account is None:
        raise HTTPException(401, "Sign in to continue.")
    return account


def _pass_payload(db: Session, row: M.WalletPass) -> dict:
    if row.platform == APPLE:
        in_wallet = db.scalar(select(M.WalletRegistration.id).where(M.WalletRegistration.pass_id == row.id).limit(1)) is not None
    else:
        in_wallet = row.in_wallet
    return {"platform": row.platform, "status": row.status, "fields": list(row.fields or []),
            "updatedAt": row.updated_at, "inWallet": in_wallet and row.status == ACTIVE,
            "pending": row.push_pending}


def status_payload(db: Session, account_id: str) -> dict:
    rows = db.scalars(select(M.WalletPass).where(M.WalletPass.account_id == account_id)
                      .order_by(M.WalletPass.updated_at.desc())).all()
    passes = [_pass_payload(db, row) for row in rows if row.status == ACTIVE or row.push_pending]
    consent = next((row for row in consent_ledger._for_purpose(consent_ledger._rows(db, account_id),
                                                                consent_ledger.WALLET_GOOGLE) if not row.withdrawn_at), None)
    return {"available": available(db), "fields": list(FIELDS), "defaultFields": list(DEFAULT_FIELDS),
            "passes": passes, "googleConsentVersion": consent_ledger.WALLET_GOOGLE_CONSENT_VERSION,
            "googleConsent": None if consent is None else {"version": consent.version, "givenAt": consent.recorded_at}}


@router.get("/api/wallet/emergency-card")
def wallet_status(response: Response, user=Depends(require_student), db: Session = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    return status_payload(db, user["id"])


class PassRequest(StrictModel):
    fields: list[Literal["name", "blood", "contact", "allergies", "conditions", "medicines"]] = Field(max_length=6)


class GooglePassRequest(PassRequest):
    # The student ticked the Google consent on the field picker, in this language,
    # for this wording version (it must be the current one).
    consentGranted: bool
    consentVersion: str = Field(max_length=40)
    language: Literal["en", "te", "hi"] = "en"


def _active(db: Session, account_id: str, platform: str) -> M.WalletPass | None:
    return db.scalar(select(M.WalletPass).where(M.WalletPass.account_id == account_id,
                                                M.WalletPass.platform == platform, M.WalletPass.status == ACTIVE))


def _upsert_pass(db: Session, account: M.Account, platform: str, fields: list[str]) -> M.WalletPass:
    chosen = [f for f in FIELDS if f in set(fields)]
    row = _active(db, account.id, platform)
    now = _now()
    if row is None:
        row = M.WalletPass(id=uuid.uuid4().hex, account_id=account.id, platform=platform,
                           serial=secrets.token_hex(SERIAL_BYTES), fields=chosen, status=ACTIVE, content_hash="",
                           created_at=now, updated_at=now, voided_at=0.0, void_reason="", push_pending=False,
                           push_attempts=0, pushed_at=0.0, in_wallet=False, download_token_hash="",
                           download_expires_at=0.0)
        db.add(row)
        db.flush()
        _audit(db, account.id, f"WALLET_PASS_ADDED_{platform}", row.id)
    else:
        row.fields = chosen
        _audit(db, account.id, f"WALLET_PASS_FIELDS_CHANGED_{platform}", row.id)
    row.content_hash = _content_hash(content_for(db, row))
    row.updated_at = now
    return row


@router.post("/api/wallet/emergency-card/apple")
def add_apple(body: PassRequest, response: Response, user=Depends(require_student), db: Session = Depends(workflow_db)):
    """Make (or re-make with new fields) the Apple pass; answers a single-use download link."""
    response.headers["Cache-Control"] = "no-store"
    if not available(db)["apple"]:
        raise HTTPException(409, {"code": WALLET_UNAVAILABLE, "message": "Apple Wallet isn't available."})
    account = _account(db, user)
    row = _upsert_pass(db, account, APPLE, body.fields)
    # A device that already holds this serial gets the new fields through an update.
    row.push_pending = True
    token = secrets.token_urlsafe(DOWNLOAD_TOKEN_BYTES)
    row.download_token_hash = _hash(token)
    row.download_expires_at = _now() + setting("emergency_card.wallet_download_minutes", db) * SECONDS_PER_MINUTE
    db.commit()
    deliver(db, account.id)
    # Relative to the API base, as every client path is (src/data/services/http.ts).
    return {**status_payload(db, account.id), "downloadPath": f"/wallet/apple/download/{token}"}


@router.get("/api/wallet/apple/download/{token}")
def download_apple(token: str, db: Session = Depends(workflow_db)):
    """The .pkpass, once, through the link the student just asked for (no session needed:
    Safari or the Wallet sheet opens it outside the app). Wrong, used or old → 404."""
    if len(token) > MAX_TOKEN_LENGTH:
        raise HTTPException(404, "This link has expired. Add the card again from your emergency card.")
    row = db.scalar(select(M.WalletPass).where(M.WalletPass.download_token_hash == _hash(token),
                                               M.WalletPass.status == ACTIVE))
    cfg = wallet_apple.config()
    if row is None or row.download_expires_at < _now() or cfg is None:
        raise HTTPException(404, "This link has expired. Add the card again from your emergency card.")
    row.download_token_hash = ""
    row.download_expires_at = 0.0
    _audit(db, row.account_id, "WALLET_PASS_DOWNLOADED", row.id)
    data = wallet_apple.build_pkpass(cfg, row.serial, content_for(db, row), row.updated_at)
    db.commit()
    return Response(content=data, media_type=wallet_apple.MIME_TYPE,
                    headers={"Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="emergency-card.pkpass"'})


@router.post("/api/wallet/emergency-card/google")
def add_google(body: GooglePassRequest, response: Response, user=Depends(require_student),
               db: Session = Depends(workflow_db)):
    """Write the Google pass (with consent) and answer the save link, which names only the object."""
    response.headers["Cache-Control"] = "no-store"
    if not available(db)["google"]:
        raise HTTPException(409, {"code": WALLET_UNAVAILABLE, "message": "Google Wallet isn't available."})
    if not body.consentGranted or body.consentVersion != consent_ledger.WALLET_GOOGLE_CONSENT_VERSION:
        raise HTTPException(409, {"code": CONSENT_REQUIRED,
                                  "message": "Google stores Google Wallet passes, so this needs your consent."})
    cfg = wallet_google.config()
    account = _account(db, user)
    consent_ledger.record_change(db, account.id, account.id, consent_ledger.WALLET_GOOGLE, True, body.language)
    row = _upsert_pass(db, account, GOOGLE, body.fields)
    try:
        wallet_google.upsert_object(cfg, row.serial, wallet_google.object_body(cfg, row.serial, content_for(db, row),
                                                                               row.updated_at))
    except wallet_google.GoogleWalletError:
        # Nothing added, nothing recorded: the consent and the pass row go with the rollback.
        db.rollback()
        raise HTTPException(502, {"code": WALLET_FAILED,
                                  "message": "Google Wallet didn't answer. Nothing was added. Try again."}) from None
    row.push_pending = False
    row.pushed_at = _now()
    db.commit()
    return {**status_payload(db, account.id), "saveUrl": wallet_google.save_url(cfg, row.serial)}


@router.delete("/api/wallet/emergency-card/{platform}")
def remove(platform: Literal["apple", "google"], response: Response, user=Depends(require_student),
           db: Session = Depends(workflow_db)):
    """Remove the card from that wallet: the pass is voided and emptied. The Google consent stays
    as it is (withdraw it on Privacy & consent)."""
    response.headers["Cache-Control"] = "no-store"
    revoke(db, user["id"], REMOVED, platform=platform.upper())
    db.commit()
    deliver(db, user["id"])
    return status_payload(db, user["id"])


# --- Apple PassKit web service (called by Apple Wallet on the device) -------------------------------
# https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes

APPLE_SERVICE = "/api/wallet/apple/v1"


def _apple_pass(db: Session, pass_type: str, serial: str, authorization: str | None) -> tuple[wallet_apple.AppleConfig, M.WalletPass]:
    cfg = wallet_apple.config()
    if cfg is None or pass_type != cfg.pass_type_id or not wallet_apple.token_matches(cfg, serial, authorization):
        raise HTTPException(401)
    row = db.scalar(select(M.WalletPass).where(M.WalletPass.serial == serial, M.WalletPass.platform == APPLE))
    if row is None:
        raise HTTPException(401)
    return cfg, row


class AppleRegistration(StrictModel):
    pushToken: str = Field(min_length=1, max_length=256)


@router.post(f"{APPLE_SERVICE}/devices/{{device}}/registrations/{{pass_type}}/{{serial}}")
def apple_register(device: str, pass_type: str, serial: str, body: AppleRegistration, response: Response,
                   authorization: str | None = Header(None), db: Session = Depends(workflow_db)):
    _cfg, row = _apple_pass(db, pass_type, serial, authorization)
    if len(device) > MAX_TOKEN_LENGTH:
        raise HTTPException(400)
    existing = db.scalar(select(M.WalletRegistration).where(M.WalletRegistration.pass_id == row.id,
                                                            M.WalletRegistration.device_library_id == device))
    if existing is not None:
        existing.push_token = body.pushToken
        db.commit()
        response.status_code = 200
        return {}
    db.add(M.WalletRegistration(id=uuid.uuid4().hex, pass_id=row.id, device_library_id=device,
                                push_token=body.pushToken, created_at=_now()))
    _audit(db, row.account_id, "WALLET_PASS_DEVICE_REGISTERED", row.id)
    db.commit()
    response.status_code = 201
    return {}


@router.delete(f"{APPLE_SERVICE}/devices/{{device}}/registrations/{{pass_type}}/{{serial}}")
def apple_unregister(device: str, pass_type: str, serial: str, authorization: str | None = Header(None),
                     db: Session = Depends(workflow_db)):
    _cfg, row = _apple_pass(db, pass_type, serial, authorization)
    db.execute(delete(M.WalletRegistration).where(M.WalletRegistration.pass_id == row.id,
                                                  M.WalletRegistration.device_library_id == device))
    _audit(db, row.account_id, "WALLET_PASS_DEVICE_UNREGISTERED", row.id)
    db.commit()
    return {}


@router.get(f"{APPLE_SERVICE}/devices/{{device}}/registrations/{{pass_type}}")
def apple_updated_serials(device: str, pass_type: str, passesUpdatedSince: str | None = None,  # noqa: N803 — Apple's name
                          db: Session = Depends(workflow_db)):
    cfg = wallet_apple.config()
    if cfg is None or pass_type != cfg.pass_type_id:
        return Response(status_code=204)
    rows = db.scalars(select(M.WalletPass).join(M.WalletRegistration, M.WalletRegistration.pass_id == M.WalletPass.id)
                      .where(M.WalletRegistration.device_library_id == device, M.WalletPass.platform == APPLE)).all()
    try:
        since = float(passesUpdatedSince) if passesUpdatedSince else 0.0
    except ValueError:
        since = 0.0
    updated = [row for row in rows if row.updated_at > since]
    if not updated:
        return Response(status_code=204)
    return {"serialNumbers": [row.serial for row in updated],
            "lastUpdated": repr(max(row.updated_at for row in updated))}


@router.get(f"{APPLE_SERVICE}/passes/{{pass_type}}/{{serial}}")
def apple_latest_pass(pass_type: str, serial: str, request: Request, authorization: str | None = Header(None),
                      db: Session = Depends(workflow_db)):
    cfg, row = _apple_pass(db, pass_type, serial, authorization)
    from email.utils import formatdate, parsedate_to_datetime

    since = request.headers.get("if-modified-since")
    if since:
        try:
            if int(row.updated_at) <= parsedate_to_datetime(since).timestamp():
                return Response(status_code=304)
        except (TypeError, ValueError):
            pass
    data = wallet_apple.build_pkpass(cfg, row.serial, content_for(db, row), row.updated_at)
    return Response(content=data, media_type=wallet_apple.MIME_TYPE,
                    headers={"Last-Modified": formatdate(row.updated_at, usegmt=True), "Cache-Control": "no-store"})


@router.post(f"{APPLE_SERVICE}/log")
def apple_log() -> dict:
    """Apple Wallet's error reports. Not read and not logged: they can name pass details."""
    return {}
