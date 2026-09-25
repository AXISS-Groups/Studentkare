"""Owned profiles and revocable member IDs. QR codes never contain medical data."""
import hmac
import re
import secrets
import time
import uuid
from datetime import date
from typing import Annotated, Literal

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field, field_validator, model_validator
from qrcode.image.svg import SvgPathImage
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services.workflow_auth import (
    StrictModel,
    account_payload,
    adult_birth_date,
    authenticated_user,
    limit,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Member profile and identity"])
MedicalItem = Annotated[str, Field(min_length=1, max_length=160)]


class ProfileUpdate(StrictModel):
    fullName: str | None = Field(default=None, min_length=2, max_length=120)
    dob: date | None = None
    university: str | None = Field(default=None, max_length=160)
    rollNumber: str | None = Field(default=None, max_length=80)
    bloodGroup: Literal["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] | None = None
    emergencyContactName: str | None = Field(default=None, max_length=120)
    emergencyContactPhone: str | None = Field(default=None, max_length=32)
    emergencyContactRelation: str | None = Field(default=None, max_length=60)
    allergies: list[MedicalItem] | None = Field(default=None, max_length=30)
    chronicConditions: list[MedicalItem] | None = Field(default=None, max_length=30)

    @field_validator("*", mode="before")
    @classmethod
    def trim_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, list):
            return [item.strip() if isinstance(item, str) else item for item in value]
        return value

    @field_validator("dob")
    @classmethod
    def valid_birth_date(cls, value: date | None) -> date | None:
        # The same 18+ rule as registration. Without it an adult account could
        # edit itself into a minor's, and the signup gate would mean nothing.
        return adult_birth_date(value) if value else value

    @field_validator("emergencyContactPhone")
    @classmethod
    def valid_phone(cls, value: str | None) -> str | None:
        if not value:
            return value
        normalized = re.sub(r"[\s()-]", "", value)
        if not re.fullmatch(r"\+?[0-9]{7,15}", normalized):
            raise ValueError("Enter a phone number with 7–15 digits, optionally starting with +.")
        return normalized

    @model_validator(mode="after")
    def reject_nulls(self) -> "ProfileUpdate":
        if any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("Use an empty string or list to clear optional details, not null.")
        return self


def owned_account(db: Session, user: dict, *, lock: bool = False) -> M.Account:
    query = select(M.Account).where(M.Account.id == user["id"], M.Account.active.is_(True))
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    account = db.scalar(query)
    if not account:
        raise HTTPException(401, "Sign in to continue.")
    return account


def record_audit(db: Session, user: dict, action: str, subject: str) -> None:
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user["id"], action=action,
                           resource_id=subject, created_at=time.time()))


def profile_payload(account: M.Account) -> dict:
    stored = account.profile or {}
    return {**account_payload(account),
            **{key: stored.get(key, "") for key in ("emergencyContactName", "emergencyContactPhone", "emergencyContactRelation")},
            "allergies": stored.get("allergies", []), "chronicConditions": stored.get("chronicConditions", []),
            "updatedAt": stored.get("profileUpdatedAt")}


@router.get("/profile")
def get_profile(response: Response, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return profile_payload(owned_account(db, user))


@router.patch("/profile")
def update_profile(body: ProfileUpdate, response: Response, user: dict = Depends(authenticated_user),
                   db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    account = owned_account(db, user, lock=True)
    stored = dict(account.profile or {})
    changes = body.model_dump(mode="json", exclude_unset=True)
    identity_changed = any(value != (account.full_name if key == "fullName" else stored.get(key, ""))
                           for key, value in changes.items() if key in {"fullName", "dob", "university", "rollNumber"})
    if "fullName" in changes:
        account.full_name = changes.pop("fullName")
    stored.update(changes)
    if identity_changed:
        stored.update(isVerifiedStudent=False, ageVerified=False)
        stored.pop("digitalIdSecret", None)
        stored.pop("digitalIdIssuedAt", None)
        campus = db.get(M.CampusVerification, account.id)
        if campus:
            campus.status = "PENDING"
            campus.university = stored.get("university", "")
            campus.roll_number = stored.get("rollNumber", "")
            campus.verified_by = ""
            campus.verified_at = 0
    stored["profileUpdatedAt"] = time.time()
    account.profile = stored
    record_audit(db, user, "PROFILE_UPDATED", account.id)
    db.commit()
    return profile_payload(account)


def identity_summary(db: Session, account: M.Account) -> dict:
    campus = db.get(M.CampusVerification, account.id)
    return {"memberId": f"SK-{account.id.upper()}", "fullName": account.full_name,
            "university": campus.university if campus else (account.profile or {}).get("university", ""),
            "rollNumber": campus.roll_number if campus else (account.profile or {}).get("rollNumber", ""),
            "campusStatus": campus.status if campus else "NOT_SUBMITTED"}


def identity_payload(db: Session, account: M.Account) -> dict:
    stored = account.profile or {}
    secret = stored.get("digitalIdSecret")
    payload = {**identity_summary(db, account), "issued": bool(secret), "issuedAt": stored.get("digitalIdIssuedAt")}
    if secret:
        code = f"SACARE-ID:{account.id}.{secret}"
        image = qrcode.make(code, image_factory=SvgPathImage, border=4)
        payload.update(code=code, qrSvg=image.to_string(encoding="unicode"))
    return payload


@router.get("/identity")
def get_identity(response: Response, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return identity_payload(db, owned_account(db, user))


@router.post("/identity", status_code=201)
def issue_identity(response: Response, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    limit(db, f"identity-issue:{user['id']}", 20, 3600)
    account = owned_account(db, user, lock=True)
    account.profile = {**(account.profile or {}), "digitalIdSecret": secrets.token_urlsafe(32), "digitalIdIssuedAt": time.time()}
    record_audit(db, user, "DIGITAL_ID_ISSUED", account.id)
    db.commit()
    return identity_payload(db, account)


@router.delete("/identity")
def revoke_identity(response: Response, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    account = owned_account(db, user, lock=True)
    stored = dict(account.profile or {})
    stored.pop("digitalIdSecret", None)
    stored.pop("digitalIdIssuedAt", None)
    account.profile = stored
    record_audit(db, user, "DIGITAL_ID_REVOKED", account.id)
    db.commit()
    return identity_payload(db, account)


class VerifyCode(StrictModel):
    code: str = Field(min_length=1, max_length=180)


@router.post("/identity/verify")
def verify_identity(body: VerifyCode, response: Response, user: dict = Depends(authenticated_user),
                    db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    if user["role"] not in {"CAMPUS_ADMIN", "NMC_DOCTOR", "SUPER_ADMIN"}:
        raise HTTPException(403, "Campus or clinical staff access is required.")
    limit(db, f"identity-verify:{user['id']}", 60, 60)
    match = re.fullmatch(r"SACARE-ID:([a-zA-Z0-9_-]{1,80})\.([a-zA-Z0-9_-]{43})", body.code.strip())
    account = db.get(M.Account, match[1]) if match else None
    secret = (account.profile or {}).get("digitalIdSecret", "") if account else ""
    if not account or not account.active or not secret or not hmac.compare_digest(secret, match[2]):
        raise HTTPException(404, "This code is invalid, revoked, or belongs to an inactive account.")
    record_audit(db, user, "DIGITAL_ID_VERIFIED", account.id)
    result = identity_summary(db, account)
    db.commit()
    return result
