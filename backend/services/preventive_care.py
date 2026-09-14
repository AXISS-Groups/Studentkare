"""Stored listings, explicit consent, and clinician-authored report follow-up.

No scraping, inference, prescribing, booking, or outbound delivery is performed.
Timestamps are Unix seconds. Clinical output is published only by an assigned
NMC_DOCTOR holding a current owner-granted share of the exact document.
"""
import hashlib
import json
import time
import uuid
from typing import Annotated, Generic, Literal, TypeVar
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import AfterValidator, BaseModel, Field, HttpUrl, StringConstraints, TypeAdapter, ValidationError, model_validator
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import preventive_models as P
from core import workflow_models as M
from services.workflow_auth import StrictModel, authenticated_user, require_super_admin, workflow_db

router = APIRouter(prefix="/api/preventive", tags=["Preventive care"])


def https_url(value: str) -> str:
    parsed = TypeAdapter(HttpUrl).validate_python(value)
    if parsed.scheme != "https" or parsed.username or parsed.password:
        raise ValueError("Use an HTTPS URL without embedded credentials.")
    if any(ord(char) < 33 for char in value) or urlsplit(value).hostname is None:
        raise ValueError("Use a valid HTTPS URL.")
    return value


HttpsUrl = Annotated[str, StringConstraints(max_length=2000), AfterValidator(https_url)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
Region = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
Identifier = Annotated[str, StringConstraints(min_length=1, max_length=80)]
Timestamp = Annotated[float, Field(gt=0, allow_inf_nan=False)]
Price = Annotated[int, Field(strict=True, ge=0, le=100000000)]
Pincode = Annotated[str, StringConstraints(pattern=r"^[1-9][0-9]{5}$")]
GuidanceLine = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
Topic = Literal["vaccines", "seasonal-health", "health-camps", "wellbeing"]


class ProviderInput(StrictModel):
    name: Name
    sourceUrl: HttpsUrl
    bookingUrl: HttpsUrl | None = None
    lastVerifiedAt: Timestamp | None = None
    expiresAt: Timestamp | None = None
    active: bool = True

    @model_validator(mode="after")
    def valid_dates(self):
        validate_dates(self.lastVerifiedAt, self.expiresAt)
        return self


class ProviderPatch(StrictModel):
    name: Name | None = None
    sourceUrl: HttpsUrl | None = None
    bookingUrl: HttpsUrl | None = None
    lastVerifiedAt: Timestamp | None = None
    expiresAt: Timestamp | None = None
    active: bool | None = None


class VaccineInput(StrictModel):
    providerId: Identifier
    vaccineName: Name
    pincode: Pincode
    region: Region = ""
    sourceUrl: HttpsUrl
    lastVerifiedAt: Timestamp | None = None
    expiresAt: Timestamp | None = None
    pricePaise: Price | None = None
    availability: Literal["UNKNOWN", "CONFIRMED"] = "UNKNOWN"
    active: bool = True

    @model_validator(mode="after")
    def valid_verification(self):
        validate_dates(self.lastVerifiedAt, self.expiresAt)
        if self.availability == "CONFIRMED" and (
            self.lastVerifiedAt is None or self.expiresAt is None or self.expiresAt <= time.time()
        ):
            raise ValueError("Confirmed availability requires manual verification and a future expiry.")
        return self


class VaccinePatch(StrictModel):
    providerId: Identifier | None = None
    vaccineName: Name | None = None
    pincode: Pincode | None = None
    region: Region | None = None
    sourceUrl: HttpsUrl | None = None
    lastVerifiedAt: Timestamp | None = None
    expiresAt: Timestamp | None = None
    pricePaise: Price | None = None
    availability: Literal["UNKNOWN", "CONFIRMED"] | None = None
    active: bool | None = None


class ProviderView(ProviderInput):
    id: str
    verificationStatus: Literal["UNVERIFIED", "VERIFIED", "EXPIRED"]


class VaccineView(VaccineInput):
    id: str
    providerName: str
    bookingUrl: HttpsUrl | None
    currency: Literal["INR"]
    verificationStatus: Literal["UNVERIFIED", "VERIFIED", "EXPIRED"]


Item = TypeVar("Item")


class Page(BaseModel, Generic[Item]):
    items: list[Item]
    total: int
    offset: int
    limit: int


def validate_dates(verified: float | None, expiry: float | None) -> None:
    if verified is not None and verified > time.time():
        raise ValueError("lastVerifiedAt cannot be in the future.")
    if expiry is not None and (verified is None or expiry <= verified):
        raise ValueError("expiresAt must follow lastVerifiedAt.")


PROVIDER_FIELDS = {"name": "name", "sourceUrl": "source_url", "bookingUrl": "booking_url",
                   "lastVerifiedAt": "last_verified_at", "expiresAt": "expires_at", "active": "active"}
VACCINE_FIELDS = {"providerId": "provider_id", "vaccineName": "vaccine_name", "pincode": "pincode",
                  "region": "region", "sourceUrl": "source_url", "lastVerifiedAt": "last_verified_at",
                  "expiresAt": "expires_at", "pricePaise": "price_paise", "availability": "availability", "active": "active"}


def fields_payload(row, fields: dict) -> dict:
    return {key: getattr(row, attr) for key, attr in fields.items()}


def verification(row) -> str:
    if row.expires_at is not None and row.expires_at <= time.time():
        return "EXPIRED"
    return "VERIFIED" if row.last_verified_at is not None else "UNVERIFIED"


def provider_payload(row: P.PreventiveProvider) -> dict:
    return {"id": row.id, **fields_payload(row, PROVIDER_FIELDS), "verificationStatus": verification(row)}


def vaccine_payload(row: P.VaccineOffering, provider: P.PreventiveProvider) -> dict:
    result = {"id": row.id, **fields_payload(row, VACCINE_FIELDS), "providerName": provider.name,
              "bookingUrl": provider.booking_url, "currency": "INR", "verificationStatus": verification(row)}
    if verification(row) != "VERIFIED" or verification(provider) != "VERIFIED":
        result["availability"] = "UNKNOWN"
    if verification(row) == "EXPIRED" or verification(provider) == "EXPIRED":
        result["pricePaise"] = None
    return result


def audit(db: Session, user: dict, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user["id"], action=action,
                           resource_id=resource_id, created_at=time.time()))


def page_result(db: Session, statement, offset: int, limit: int, serializer) -> dict:
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
    rows = db.execute(statement.offset(offset).limit(limit)).all()
    return {"items": [serializer(*row) for row in rows], "total": total, "offset": offset, "limit": limit}


@router.get("/providers", response_model=Page[ProviderView])
def providers(query: str = Query("", max_length=160), offset: int = Query(0, ge=0, le=10000),
              limit: int = Query(20, ge=1, le=100), db: Session = Depends(workflow_db)) -> dict:
    statement = select(P.PreventiveProvider).where(P.PreventiveProvider.active.is_(True))
    if query.strip():
        statement = statement.where(P.PreventiveProvider.name.icontains(query.strip(), autoescape=True))
    return page_result(db, statement.order_by(P.PreventiveProvider.name, P.PreventiveProvider.id), offset, limit, provider_payload)


@router.get("/vaccines", response_model=Page[VaccineView])
def vaccines(query: str = Query("", max_length=160), pincode: str = Query("", pattern=r"^$|^[1-9][0-9]{5}$"),
             provider: str = Query("", max_length=80), offset: int = Query(0, ge=0, le=10000),
             limit: int = Query(20, ge=1, le=100), db: Session = Depends(workflow_db)) -> dict:
    statement = select(P.VaccineOffering, P.PreventiveProvider).join(
        P.PreventiveProvider, P.PreventiveProvider.id == P.VaccineOffering.provider_id
    ).where(P.VaccineOffering.active.is_(True), P.PreventiveProvider.active.is_(True))
    if query.strip():
        statement = statement.where(or_(P.VaccineOffering.vaccine_name.icontains(query.strip(), autoescape=True),
                                         P.PreventiveProvider.name.icontains(query.strip(), autoescape=True)))
    if pincode:
        statement = statement.where(P.VaccineOffering.pincode == pincode)
    if provider:
        statement = statement.where(P.VaccineOffering.provider_id == provider)
    return page_result(db, statement.order_by(P.VaccineOffering.vaccine_name, P.VaccineOffering.id), offset, limit, vaccine_payload)


def apply_fields(row, body: StrictModel, fields: dict) -> None:
    for key, value in body.model_dump().items():
        setattr(row, fields[key], value)
    row.updated_at = time.time()


def merged_patch(row, body: StrictModel, fields: dict, schema):
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(422, "Supply at least one field to update.")
    current = fields_payload(row, fields)
    # An expired stored confirmation must not prevent an admin from deactivating
    # or correcting the listing. A fresh confirmation still needs new evidence.
    if schema is VaccineInput and row.expires_at is not None and row.expires_at <= time.time():
        current["availability"] = "UNKNOWN"
    try:
        return schema.model_validate({**current, **patch})
    except ValidationError as exc:
        raise HTTPException(422, [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]) from exc


@router.post("/ops/providers", status_code=201, response_model=ProviderView)
def create_provider(body: ProviderInput, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    row = P.PreventiveProvider(id=str(uuid.uuid4()))
    apply_fields(row, body, PROVIDER_FIELDS)
    db.add(row)
    audit(db, user, "PREVENTIVE_PROVIDER_CREATED", row.id)
    db.commit()
    return provider_payload(row)


@router.patch("/ops/providers/{provider_id}", response_model=ProviderView)
def patch_provider(provider_id: str, body: ProviderPatch, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    row = db.get(P.PreventiveProvider, provider_id)
    if row is None:
        raise HTTPException(404, "Provider not found.")
    apply_fields(row, merged_patch(row, body, PROVIDER_FIELDS, ProviderInput), PROVIDER_FIELDS)
    audit(db, user, "PREVENTIVE_PROVIDER_UPDATED", row.id)
    db.commit()
    return provider_payload(row)


def active_provider(db: Session, provider_id: str) -> P.PreventiveProvider:
    row = db.get(P.PreventiveProvider, provider_id)
    if row is None or not row.active:
        raise HTTPException(422, "Select an active stored provider listing.")
    return row


@router.post("/ops/vaccines", status_code=201, response_model=VaccineView)
def create_vaccine(body: VaccineInput, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    provider = active_provider(db, body.providerId)
    row = P.VaccineOffering(id=str(uuid.uuid4()))
    apply_fields(row, body, VACCINE_FIELDS)
    db.add(row)
    audit(db, user, "PREVENTIVE_VACCINE_CREATED", row.id)
    db.commit()
    return vaccine_payload(row, provider)


@router.patch("/ops/vaccines/{offering_id}", response_model=VaccineView)
def patch_vaccine(offering_id: str, body: VaccinePatch, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    row = db.get(P.VaccineOffering, offering_id)
    if row is None:
        raise HTTPException(404, "Vaccine offering not found.")
    merged = merged_patch(row, body, VACCINE_FIELDS, VaccineInput)
    provider = active_provider(db, merged.providerId)
    apply_fields(row, merged, VACCINE_FIELDS)
    audit(db, user, "PREVENTIVE_VACCINE_UPDATED", row.id)
    db.commit()
    return vaccine_payload(row, provider)


class PreferenceInput(StrictModel):
    seasonalEducationEnabled: Annotated[bool, Field(strict=True)]
    promotionsEnabled: Annotated[bool, Field(strict=True)]
    region: Region = ""
    topics: list[Topic] = Field(default_factory=list, max_length=4)

    @model_validator(mode="after")
    def unique_topics(self):
        if len(self.topics) != len(set(self.topics)):
            raise ValueError("Choose each topic once.")
        return self


class PreferenceView(PreferenceInput):
    consentVersion: int
    updatedAt: float | None


def preference_payload(row: P.PreventivePreference | None) -> dict:
    return {"seasonalEducationEnabled": row.seasonal_education_enabled if row else False,
            "promotionsEnabled": row.promotions_enabled if row else False,
            "region": row.region if row else "", "topics": row.topics if row else [],
            "consentVersion": row.consent_version if row else 1, "updatedAt": row.updated_at if row else None}


@router.get("/preferences", response_model=PreferenceView)
def preferences(user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    return preference_payload(db.get(P.PreventivePreference, user["id"]))


@router.put("/preferences", response_model=PreferenceView)
def put_preferences(body: PreferenceInput, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    # Serialize first writes as well as updates on the existing owner row.
    db.scalar(select(M.Account).where(M.Account.id == user["id"]).with_for_update())
    row = db.get(P.PreventivePreference, user["id"])
    if row is None:
        row = P.PreventivePreference(account_id=user["id"], consent_version=1)
        db.add(row)
    row.seasonal_education_enabled = body.seasonalEducationEnabled
    row.promotions_enabled = body.promotionsEnabled
    row.region = body.region
    row.topics = body.topics
    row.updated_at = time.time()
    audit(db, user, "PREVENTIVE_PREFERENCES_UPDATED", user["id"])
    db.commit()
    return preference_payload(row)


class ReviewRequest(StrictModel):
    documentId: Identifier


class AssignmentInput(StrictModel):
    clinicianId: Identifier
    expectedVersion: int = Field(ge=1)


class SourceRef(StrictModel):
    title: Name
    url: HttpsUrl


class GuidanceView(StrictModel):
    summary: str
    questions: list[str]
    nextSteps: list[str]
    sourceRefs: list[SourceRef]


class ReviewView(StrictModel):
    id: str
    documentId: str
    status: Literal["REQUESTED", "ASSIGNED", "APPROVED", "REJECTED", "WITHDRAWN"]
    version: int
    assignedClinicianId: str | None
    createdAt: float
    updatedAt: float
    reviewedBy: str | None
    reviewedAt: float | None
    guidance: GuidanceView | None


class QueueReviewView(ReviewView):
    shareId: str


class ReviewInput(StrictModel):
    expectedVersion: int = Field(ge=1)
    decision: Literal["APPROVED", "REJECTED"]
    summary: Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)] = ""
    questions: list[GuidanceLine] = Field(default_factory=list, max_length=10)
    nextSteps: list[GuidanceLine] = Field(default_factory=list, max_length=10)
    sourceRefs: list[SourceRef] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def reviewed_content(self):
        if self.decision == "APPROVED" and (not self.summary or not self.nextSteps or not self.sourceRefs):
            raise ValueError("Approval requires summary, nextSteps and sourceRefs.")
        if self.decision == "REJECTED" and (self.summary or self.questions or self.nextSteps or self.sourceRefs):
            raise ValueError("Rejected reviews cannot publish guidance.")
        return self


def require_clinician(user: dict = Depends(authenticated_user)) -> dict:
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "An assigned NMC doctor must review this report.")
    return user


def review_payload(row: P.ReportReview) -> dict:
    return {"id": row.id, "documentId": row.document_id, "status": row.status, "version": row.version,
            "assignedClinicianId": row.assigned_clinician_id, "createdAt": row.created_at, "updatedAt": row.updated_at,
            "reviewedBy": row.reviewed_by, "reviewedAt": row.reviewed_at,
            "guidance": row.guidance if row.status == "APPROVED" else None}


def review_statement():
    # Joining the owned document also fails closed on deleted/orphaned source records.
    return select(P.ReportReview).join(M.Document, M.Document.id == P.ReportReview.document_id).where(
        M.Document.account_id == P.ReportReview.account_id
    )


def eligible_shares(clinician_id: str):
    return select(M.RecordShare.id).where(
        M.RecordShare.document_id == P.ReportReview.document_id,
        M.RecordShare.owner_id == P.ReportReview.account_id,
        M.RecordShare.clinician_id == clinician_id,
        M.RecordShare.revoked.is_(False), M.RecordShare.expires_at > time.time(),
    )


@router.post("/report-reviews", status_code=201, response_model=ReviewView)
def request_review(body: ReviewRequest, response: Response, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    doc = db.scalar(select(M.Document).where(M.Document.id == body.documentId, M.Document.account_id == user["id"]))
    if doc is None:
        raise HTTPException(404, "Report not found.")
    if doc.category not in {"LAB", "CAMP_REPORT", "DISCHARGE_SUMMARY"}:
        raise HTTPException(422, "Select an uploaded lab, camp, or discharge report.")
    existing = db.scalar(select(P.ReportReview).where(P.ReportReview.document_id == doc.id, P.ReportReview.account_id == user["id"]))
    if existing:
        response.status_code = 200
        return review_payload(existing)
    now = time.time()
    row = P.ReportReview(id=str(uuid.uuid4()), document_id=doc.id, account_id=user["id"],
                         document_hash=hashlib.sha256(doc.content).hexdigest(), status="REQUESTED", version=1,
                         guidance={}, created_at=now, updated_at=now)
    db.add(row)
    audit(db, user, "PREVENTIVE_REVIEW_REQUESTED", row.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(P.ReportReview).where(P.ReportReview.document_id == body.documentId, P.ReportReview.account_id == user["id"]))
        if existing is None:
            raise HTTPException(409, "Report changed; refresh and try again.")
        response.status_code = 200
        return review_payload(existing)
    return review_payload(row)


@router.get("/report-reviews", response_model=Page[ReviewView])
def my_reviews(offset: int = Query(0, ge=0, le=10000), limit: int = Query(20, ge=1, le=100),
               user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    stmt = review_statement().where(P.ReportReview.account_id == user["id"]).order_by(P.ReportReview.created_at.desc(), P.ReportReview.id)
    return page_result(db, stmt, offset, limit, review_payload)


@router.get("/ops/report-reviews", response_model=Page[ReviewView])
def assignment_queue(offset: int = Query(0, ge=0, le=10000), limit: int = Query(20, ge=1, le=100),
                     user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    stmt = review_statement().where(P.ReportReview.status.in_(["REQUESTED", "ASSIGNED"])).order_by(P.ReportReview.created_at, P.ReportReview.id)
    return page_result(db, stmt, offset, limit, review_payload)


@router.get("/work/report-reviews", response_model=Page[QueueReviewView])
def clinician_queue(offset: int = Query(0, ge=0, le=10000), limit: int = Query(20, ge=1, le=100),
                    user: dict = Depends(require_clinician), db: Session = Depends(workflow_db)) -> dict:
    share_id = eligible_shares(user["id"]).order_by(M.RecordShare.expires_at.desc(), M.RecordShare.id).limit(1).correlate(P.ReportReview).scalar_subquery()
    stmt = review_statement().add_columns(share_id.label("share_id")).where(
        P.ReportReview.assigned_clinician_id == user["id"], P.ReportReview.status == "ASSIGNED",
        eligible_shares(user["id"]).exists(),
    ).order_by(P.ReportReview.created_at, P.ReportReview.id)
    return page_result(db, stmt, offset, limit, lambda row, share: {**review_payload(row), "shareId": share})


@router.post("/ops/report-reviews/{review_id}/assign", response_model=ReviewView)
def assign_review(review_id: str, body: AssignmentInput, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    row = db.scalar(review_statement().where(P.ReportReview.id == review_id))
    if row is None:
        raise HTTPException(404, "Review request not found.")
    clinician = db.get(M.Account, body.clinicianId)
    share = db.scalar(select(M.RecordShare).where(
        M.RecordShare.document_id == row.document_id, M.RecordShare.owner_id == row.account_id,
        M.RecordShare.clinician_id == body.clinicianId, M.RecordShare.revoked.is_(False),
        M.RecordShare.expires_at > time.time(),
    ).with_for_update())
    if clinician is None or not clinician.active or clinician.role != "NMC_DOCTOR" or share is None:
        raise HTTPException(422, "Assignment requires an active NMC doctor with a current owner-granted document share.")
    changed = db.execute(update(P.ReportReview).where(
        P.ReportReview.id == row.id, P.ReportReview.version == body.expectedVersion,
        P.ReportReview.status.in_(["REQUESTED", "ASSIGNED"]),
    ).values(assigned_clinician_id=body.clinicianId, status="ASSIGNED", version=P.ReportReview.version + 1, updated_at=time.time()))
    if not changed.rowcount:
        raise HTTPException(409, "Review is stale or no longer awaiting assignment.")
    audit(db, user, "PREVENTIVE_REVIEW_ASSIGNED", row.id)
    db.commit()
    db.refresh(row)
    return review_payload(row)


@router.post("/work/report-reviews/{review_id}/review", response_model=ReviewView)
def review_report(review_id: str, body: ReviewInput, user: dict = Depends(require_clinician), db: Session = Depends(workflow_db)) -> dict:
    row = db.scalar(review_statement().where(P.ReportReview.id == review_id, P.ReportReview.assigned_clinician_id == user["id"]))
    if row is None:
        raise HTTPException(404, "Assigned review not found.")
    share = db.scalar(select(M.RecordShare).where(
        M.RecordShare.document_id == row.document_id, M.RecordShare.owner_id == row.account_id,
        M.RecordShare.clinician_id == user["id"], M.RecordShare.revoked.is_(False),
        M.RecordShare.expires_at > time.time(),
    ).with_for_update())
    if share is None:
        raise HTTPException(403, "The document share has expired or been revoked.")
    doc = db.scalar(select(M.Document).where(M.Document.id == row.document_id, M.Document.account_id == row.account_id).with_for_update())
    if doc is None or hashlib.sha256(doc.content).hexdigest() != row.document_hash:
        raise HTTPException(409, "Source document changed; request a review of a new upload.")
    content = body.model_dump(exclude={"expectedVersion", "decision"}) if body.decision == "APPROVED" else {}
    content_hash = hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()
    changed = db.execute(update(P.ReportReview).where(
        P.ReportReview.id == row.id, P.ReportReview.version == body.expectedVersion,
        P.ReportReview.status == "ASSIGNED", P.ReportReview.assigned_clinician_id == user["id"],
        eligible_shares(user["id"]).exists(),
    ).values(status=body.decision, guidance=content, content_hash=content_hash,
             reviewed_by=user["id"], reviewed_at=time.time(), version=P.ReportReview.version + 1, updated_at=time.time()),
        execution_options={"synchronize_session": False})
    if not changed.rowcount:
        raise HTTPException(409, "Review is stale, withdrawn, or already decided.")
    audit(db, user, f"PREVENTIVE_REVIEW_{body.decision}", row.id)
    db.commit()
    db.refresh(row)
    return review_payload(row)


@router.post("/report-reviews/{review_id}/withdraw", response_model=ReviewView)
def withdraw_review(review_id: str, user: dict = Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    row = db.scalar(review_statement().where(P.ReportReview.id == review_id, P.ReportReview.account_id == user["id"]))
    if row is None:
        raise HTTPException(404, "Review request not found.")
    db.execute(update(P.ReportReview).where(P.ReportReview.id == row.id, P.ReportReview.status != "WITHDRAWN").values(
        status="WITHDRAWN", version=P.ReportReview.version + 1, updated_at=time.time()))
    audit(db, user, "PREVENTIVE_REVIEW_WITHDRAWN", row.id)
    db.commit()
    db.refresh(row)
    return review_payload(row)
