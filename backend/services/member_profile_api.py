"""Owned profiles and revocable member IDs. QR codes never contain medical data."""
import re
import secrets
import time
import uuid
from datetime import date
from typing import Annotated, Literal

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field, StrictBool, field_validator, model_validator
from qrcode.image.svg import SvgPathImage
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.team_scope import RESERVED_CAMPUS_MESSAGE, is_reserved_campus
from services import check_in_pass, clinical_profile
from services.workflow_auth import (
    StrictModel,
    account_payload,
    adult_birth_date,
    authenticated_user,
    limit,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Member profile and identity"])
CAMPUS_FIELDS = frozenset({"university", "rollNumber"})
MedicalItem = Annotated[str, Field(min_length=1, max_length=160)]


class ProfileUpdate(StrictModel):
    fullName: str | None = Field(default=None, min_length=2, max_length=120)
    dob: date | None = None
    university: str | None = Field(default=None, max_length=160)
    rollNumber: str | None = Field(default=None, max_length=80)
    bloodGroup: Literal["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] | None = None
    # Where a sample pickup goes and which clinic the student is routed to.
    # Not identity: changing a room must not reset campus verification.
    hostelBlock: str | None = Field(default=None, max_length=120)
    room: str | None = Field(default=None, max_length=40)
    emergencyContactName: str | None = Field(default=None, max_length=120)
    emergencyContactPhone: str | None = Field(default=None, max_length=32)
    emergencyContactRelation: str | None = Field(default=None, max_length=60)
    allergies: list[MedicalItem] | None = Field(default=None, max_length=30)
    # True only when the student says they have no known allergies. An empty
    # allergies list without it means "not answered" (services/clinical_profile.py).
    noKnownAllergies: StrictBool | None = None
    chronicConditions: list[MedicalItem] | None = Field(default=None, max_length=30)

    @field_validator("*", mode="before")
    @classmethod
    def trim_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, list):
            return [item.strip() if isinstance(item, str) else item for item in value]
        return value

    @field_validator("university")
    @classmethod
    def not_the_team_campus(cls, value: str | None) -> str | None:
        # The team test campus holds no real student (core/team_scope.py).
        if is_reserved_campus(value):
            raise ValueError(RESERVED_CAMPUS_MESSAGE)
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
        if self.noKnownAllergies and self.allergies:
            raise ValueError("Either list allergies or say there are none, not both.")
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


def profile_payload(db: Session, account: M.Account) -> dict:
    """The owner's profile. bloodGroup, allergies and noKnownAllergies come from the
    clinical plane (services/clinical_profile.py); the shape the apps read is unchanged."""
    stored = account.profile or {}
    return {**account_payload(account),
            **{key: stored.get(key, "") for key in ("hostelBlock", "room", "emergencyContactName",
                                                    "emergencyContactPhone", "emergencyContactRelation")},
            **clinical_profile.read(db, account.id),
            "chronicConditions": stored.get("chronicConditions", []),
            "updatedAt": stored.get("profileUpdatedAt")}


@router.get("/profile")
def get_profile(response: Response, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    account = owned_account(db, user)
    return profile_payload(db, account)


@router.patch("/profile")
def update_profile(body: ProfileUpdate, response: Response, user: dict = Depends(authenticated_user),
                   db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    account = owned_account(db, user, lock=True)
    stored = dict(account.profile or {})
    changes = body.model_dump(mode="json", exclude_unset=True)
    # Campus and roll number are a student's own claim, checked by campus
    # verification. Staff campus scope is assigned by a super admin
    # (care_accounts.staff_campus) and team accounts stay on the team campus, so
    # no other account may write them here (audit C1).
    if CAMPUS_FIELDS & changes.keys() and (account.role != "STUDENT" or account.is_team_account):
        raise HTTPException(403, "Your campus is assigned by a super admin and can't be changed here.")
    clinical_profile.write(db, account.id, clinical_profile.pop_changes(changes))
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
    return profile_payload(db, account)


APPEARANCE_SAVE_CONFLICT = "APPEARANCE_SAVE_CONFLICT"


class AppearanceUpdate(StrictModel):
    appearance: Literal["SYSTEM", "DARK", "LIGHT"]


def appearance_payload(row: M.AppearancePreference | None) -> dict:
    # null means never chosen: each app keeps its own default rather than
    # being told the person picked SYSTEM.
    return {"appearance": row.appearance if row else None, "updatedAt": row.updated_at if row else None}


@router.get("/profile/appearance")
def get_appearance(response: Response, user: dict = Depends(authenticated_user),
                   db: Session = Depends(workflow_db)) -> dict:
    """The caller's own System / Dark / Light choice. There is no way to name another account."""
    response.headers["Cache-Control"] = "no-store"
    account = owned_account(db, user)
    return appearance_payload(db.get(M.AppearancePreference, account.id))


@router.patch("/profile/appearance")
def update_appearance(body: AppearanceUpdate, response: Response, user: dict = Depends(authenticated_user),
                      db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    account = owned_account(db, user)
    row = db.get(M.AppearancePreference, account.id)
    if row is None:
        db.add(M.AppearancePreference(account_id=account.id, appearance=body.appearance, updated_at=time.time()))
        try:
            db.commit()
        except IntegrityError:
            # Two devices saved a first choice at once and the other insert
            # won. Update that row instead; a second failure is a real error.
            db.rollback()
        row = db.get(M.AppearancePreference, account.id)
        if row is not None and row.appearance == body.appearance:
            return appearance_payload(row)
    if row is None:
        # A stable code for the apps (they show their own localised
        # appearance.saveFailed copy); the English text is for API readers.
        raise HTTPException(409, {"code": APPEARANCE_SAVE_CONFLICT,
                                  "message": "Could not save your appearance. Try again."})
    row.appearance = body.appearance
    row.updated_at = time.time()
    db.commit()
    return appearance_payload(row)


# --- setup answers: primary goal and activity level --------------------------------------
#
# Asked one per screen during setup, every one skippable. The goals are neutral
# on purpose: there is no "lose weight" option and no weight, BMI or body
# target anywhere, because for students that invites disordered eating and it
# would be a score about the body (AGENTS.md guardrail 4). "" means not
# answered, and is also how an answer is cleared.
#
# These two tuples are protocol values (AGENTS.md rule 11: an enum of protocol
# values is its own definition), declared once here; the app mirrors them in
# src/features/auth/viewmodel/SetupQuestionViewModel.ts and a test keeps the two
# equal. Each value's label is i18n (onboard.goal.<VALUE>, onboard.activity.<VALUE>
# in en/te/hi). The list is deliberately NOT editable server data: a new option
# cannot be shown without its three translations, which ship with a release
# anyway, and keeping the vocabulary in reviewed code is what guarantees that no
# weight or body-target option can ever be switched on from an admin screen.

PRIMARY_GOALS = ("STAY_ACTIVE", "SLEEP_BETTER", "MANAGE_STRESS", "BUILD_ROUTINE", "RECORDS_IN_ONE_PLACE")
ACTIVITY_LEVELS = ("MOSTLY_SEATED", "SOME_WALKING", "ACTIVE_MOST_DAYS", "VERY_ACTIVE")
NOT_ANSWERED = ""
PrimaryGoal = Literal[(NOT_ANSWERED, *PRIMARY_GOALS)]
ActivityLevel = Literal[(NOT_ANSWERED, *ACTIVITY_LEVELS)]
SETUP_ANSWERS_STUDENT_ONLY = "SETUP_ANSWERS_STUDENT_ONLY"


class WellnessGoalsUpdate(StrictModel):
    primaryGoal: PrimaryGoal | None = None
    activityLevel: ActivityLevel | None = None

    @model_validator(mode="after")
    def reject_nulls(self) -> "WellnessGoalsUpdate":
        if any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("Use an empty string to clear an answer, not null.")
        return self


def student_only(user: dict) -> None:
    # These are a student's own setup answers. Staff accounts have no setup
    # questions, so the endpoint refuses them rather than storing anything.
    if user["role"] != "STUDENT":
        # Code + English, as elsewhere (e.g. OUTSIDE_WINDOW): the setup screens
        # never show this text; they show their own i18n error.
        raise HTTPException(403, {"code": SETUP_ANSWERS_STUDENT_ONLY,
                                  "message": "Only a student account has setup answers."})


def wellness_payload(row: M.WellnessGoal | None) -> dict:
    return {"primaryGoal": row.primary_goal if row else NOT_ANSWERED,
            "activityLevel": row.activity_level if row else NOT_ANSWERED,
            "updatedAt": row.updated_at if row and row.updated_at else None}


@router.get("/profile/wellness")
def get_wellness_goals(response: Response, user: dict = Depends(authenticated_user),
                       db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    student_only(user)
    account = owned_account(db, user)
    return wellness_payload(db.get(M.WellnessGoal, account.id))


@router.patch("/profile/wellness")
def update_wellness_goals(body: WellnessGoalsUpdate, response: Response, user: dict = Depends(authenticated_user),
                          db: Session = Depends(workflow_db)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    student_only(user)
    account = owned_account(db, user, lock=True)
    row = db.get(M.WellnessGoal, account.id)
    if row is None:
        row = M.WellnessGoal(account_id=account.id, primary_goal=NOT_ANSWERED, activity_level=NOT_ANSWERED,
                             updated_at=0)
        db.add(row)
    changes = body.model_dump(exclude_unset=True)
    if "primaryGoal" in changes:
        row.primary_goal = changes["primaryGoal"]
    if "activityLevel" in changes:
        row.activity_level = changes["activityLevel"]
    row.updated_at = time.time()
    # The audit says that the answers changed, never what they are.
    record_audit(db, user, "WELLNESS_GOALS_UPDATED", account.id)
    db.commit()
    return wellness_payload(row)


def identity_summary(db: Session, account: M.Account) -> dict:
    campus = db.get(M.CampusVerification, account.id)
    return {"memberId": f"SK-{account.id.upper()}", "fullName": account.full_name,
            "university": campus.university if campus else (account.profile or {}).get("university", ""),
            "rollNumber": campus.roll_number if campus else (account.profile or {}).get("rollNumber", ""),
            "campusStatus": campus.status if campus else "NOT_SUBMITTED"}


def qr_matrix(code: str) -> list[str]:
    """The same QR as rows of "1" (dark) and "0" (light), quiet zone included.

    The native app has no SVG renderer, so it draws these cells itself. The
    code is still issued here; the client only paints it.
    """
    qr = qrcode.QRCode(border=4)
    qr.add_data(code)
    qr.make(fit=True)
    return ["".join("1" if cell else "0" for cell in row) for row in qr.get_matrix()]


def identity_payload(db: Session, account: M.Account) -> dict:
    """The member card, with this 30-second step's signed QR and code, and the
    next ten minutes of codes (passWindow) for a weak signal at the counter.

    Each code is refused at the counter outside its own step, so a screenshot
    stops working within a minute.
    """
    stored = account.profile or {}
    secret = stored.get("digitalIdSecret")
    payload = {**identity_summary(db, account), "issued": bool(secret), "issuedAt": stored.get("digitalIdIssuedAt")}
    if secret:
        try:
            current = check_in_pass.current(account.id, secret)
            upcoming = check_in_pass.window(account.id, secret)
        except check_in_pass.PassSigningUnavailable as exc:
            raise HTTPException(503, str(exc)) from exc
        image = qrcode.make(current["token"], image_factory=SvgPathImage, border=4)
        payload.update(code=current["token"], passCode=current["passCode"], expiresAt=current["expiresAt"],
                       rotateSeconds=current["rotateSeconds"], qrSvg=image.to_string(encoding="unicode"),
                       qrMatrix=qr_matrix(current["token"]),
                       # Ten minutes of codes so a weak signal at the counter doesn't
                       # break the pass. Clients keep these in memory only.
                       passWindow=[{**entry, "qrMatrix": qr_matrix(entry["token"])} for entry in upcoming])
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
    # The scanned QR, or the 6-digit code read out at the counter.
    code: str = Field(min_length=1, max_length=180)
    # With a 6-digit code: the member ID printed on the pass (SK-…).
    memberId: str = Field(default="", max_length=90)


NOT_A_LIVE_CARD = "This pass code is invalid, revoked, or belongs to an inactive account."
STALE_CARD = "This pass code has expired, was already used, or does not match. Ask the student to show the live pass."


@router.post("/identity/verify")
def verify_identity(body: VerifyCode, response: Response, user: dict = Depends(authenticated_user),
                    db: Session = Depends(workflow_db)) -> dict:
    """Check a pass at the counter. Fresh (this or the last 30 s step) and single use."""
    response.headers["Cache-Control"] = "no-store"
    # Pharmacy, lab and clinic counters check passes too (SK-123); they get the
    # identity summary only — name, campus, roll number — never health data.
    if user["role"] not in {"CAMPUS_ADMIN", "NMC_DOCTOR", "SUPER_ADMIN", "VENDOR"}:
        raise HTTPException(403, "Campus, clinical or partner staff access is required.")
    limit(db, f"identity-verify:{user['id']}", 60, 60)
    code = body.code.strip()
    try:
        if re.fullmatch(r"[0-9]{6}", code):
            member = body.memberId.strip().upper()
            if not member.startswith("SK-"):
                raise HTTPException(422, "Enter the member ID shown on the pass with the 6-digit code.")
            account = db.scalar(select(M.Account).where(func.upper(M.Account.id) == member[3:]).with_for_update())
            secret = (account.profile or {}).get("digitalIdSecret", "") if account else ""
            if not account or not account.active or not secret:
                raise HTTPException(404, NOT_A_LIVE_CARD)
            step = check_in_pass.code_step(account.id, secret, code)
        else:
            parsed = check_in_pass.parse_token(code)
            if not parsed:
                raise HTTPException(404, NOT_A_LIVE_CARD)
            account_id, step, sig = parsed
            account = db.scalar(select(M.Account).where(M.Account.id == account_id).with_for_update())
            secret = (account.profile or {}).get("digitalIdSecret", "") if account else ""
            if not account or not account.active or not secret or not check_in_pass.token_matches(account.id, secret, step, sig):
                raise HTTPException(404, NOT_A_LIVE_CARD)
            if step not in check_in_pass.fresh_steps():
                step = None
    except check_in_pass.PassSigningUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    stored = dict(account.profile or {})
    if step is None or step <= int(stored.get("passLastStep", -1)):
        record_audit(db, user, "DIGITAL_ID_REFUSED_STALE", account.id)
        db.commit()
        raise HTTPException(410, STALE_CARD)
    stored["passLastStep"] = step
    account.profile = stored
    record_audit(db, user, "DIGITAL_ID_VERIFIED", account.id)
    result = identity_summary(db, account)
    db.commit()
    return result
