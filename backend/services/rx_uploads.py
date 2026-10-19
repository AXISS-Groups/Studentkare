"""
services.rx_uploads — a student uploads a prescription in any common format and sends it to a pharmacist.

Endpoint groups:
  /pharmacies                                       active pharmacies a student can send to (name and area)
  /health/prescription-uploads                      the student's own prescription files: upload, list, delete
  /health/prescription-uploads/{id}/reviews         send one to a pharmacy's review queue
  /v1/pharmacy/rx-uploads/{id}/file-link, /file     the pharmacist opens it through a short-lived link
  /v1/pharmacy/rx-uploads/{id}/approve, /reject     the same five checks as an e-prescription review

What this does not do: no order, price or cart is made from a prescription. That
is the Tier 1 prescription-to-order flow, waiting for design review. Approving
records the pharmacist's outcome and tells the student; nothing else moves.

Privacy: the file is a vault document (category PRESCRIPTION) owned by the
student and is never queued for text extraction, because extracted fields go to a
platform-admin review queue. Only the pharmacist of the chosen pharmacy can open
it, through a link bound to their session that lasts two minutes, and every link
and view is audited. File bytes and names never reach a log or the ops feed.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import time
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from pydantic import Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import ops_feed, upload_files
from services.clinical_api import (
    RxReviewApproval,
    RxReviewRejection,
    StrictModel,
    _owns_pharmacy,
    audit,
    require_pharmacy,
)
from services.security_scanner import scan_file_for_viruses
from services.workflow_auth import authenticated_user, workflow_db

router = APIRouter(prefix="/api", tags=["Prescription uploads"])

CATEGORY = "PRESCRIPTION"
MAX_BYTES = 10 * 1024 * 1024
# Photos from any phone camera (JPEG, HEIC/HEIF, WebP, PNG), scans (PDF, TIFF).
# Office documents are refused: they are zip containers that can carry macros,
# and a prescription is a picture or a PDF.
ACCEPTED_TYPES = frozenset({
    upload_files.PDF, upload_files.JPEG, upload_files.PNG, upload_files.WEBP,
    upload_files.HEIC, upload_files.HEIF, upload_files.TIFF,
})
# Types a browser can show safely inline; the rest download.
INLINE_TYPES = frozenset({upload_files.PDF, upload_files.JPEG, upload_files.PNG, upload_files.WEBP})
LINK_TTL_SECONDS = 120
PENDING = "PENDING"


def _new_id() -> str:
    return uuid.uuid4().hex


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def require_student(user=Depends(authenticated_user)):
    if user["role"] != "STUDENT":
        raise HTTPException(403, "Prescription uploads are for students.")
    return user


def _licence_current(provider: M.ServiceProvider, now: float) -> bool:
    # Same rule as the pharmacy directory (clinical_api._licence_current): a licence number must be
    # on record; 0 means no expiry was recorded; a recorded expiry in the past is never valid.
    return bool(provider.licence_no) and (not provider.licence_expiry or provider.licence_expiry > now)


def _sendable_pharmacies(db: Session, now: float):
    rows = db.scalars(select(M.ServiceProvider).where(
        M.ServiceProvider.kind == "PHARMACY", M.ServiceProvider.active.is_(True),
    ).order_by(M.ServiceProvider.legal_name)).all()
    return [r for r in rows if _licence_current(r, now)]


# ══════════════════════════════════════════════════════════════════════════════
# Student
# ══════════════════════════════════════════════════════════════════════════════

# The pharmacy list a student picks from is GET /api/pharmacies in services/clinical_api.py.


def _upload_payload(doc: M.Document, size: int | None = None) -> dict:
    payload = {"id": doc.id, "title": doc.title, "filename": doc.filename, "mimeType": doc.mime_type,
               "createdAt": doc.created_at}
    if size is not None:
        payload["sizeBytes"] = size
    return payload


def _review_payload(review: M.RxUploadReview, pharmacy_name: str) -> dict:
    return {"id": review.id, "pharmacyId": review.pharmacy_id, "pharmacyName": pharmacy_name,
            "status": review.status, "rejectionReason": review.rejection_reason,
            "verifiedAt": review.verified_at or None, "sentAt": review.created_at}


@router.post("/health/prescription-uploads", status_code=201)
def upload_prescription(file: UploadFile = File(...), title: str = Form("Prescription", max_length=160),
                        user=Depends(require_student), db: Session = Depends(workflow_db)):
    """Store a prescription in the student's vault. The type is read from the bytes, then the file is scanned."""
    content = upload_files.read_capped(file.file, MAX_BYTES, "Prescriptions must be 10 MB or smaller.")
    if not content:
        raise HTTPException(422, "The file is empty.")
    mime = upload_files.sniff_mime(content)
    if mime not in ACCEPTED_TYPES:
        raise HTTPException(415, "Upload a photo (JPEG, PNG, HEIC, HEIF or WebP), a PDF or a TIFF scan.")
    # A prescription is never stored unscanned: no offline bypass, in any environment.
    scan_file_for_viruses(content, allow_offline_bypass=False)
    name = upload_files.safe_filename(file.filename, "prescription")
    stem = name.rsplit(".", 1)[0] if "." in name else name
    doc = M.Document(id=_new_id(), account_id=user["id"], title=(title.strip() or "Prescription")[:160],
                     category=CATEGORY, filename=f"{stem or 'prescription'}.{upload_files.EXTENSIONS[mime]}"[:180],
                     mime_type=mime, content=content, created_at=time.time())
    db.add(doc)
    audit(db, user["id"], "RX_UPLOAD_STORED", doc.id)
    db.commit()
    return _upload_payload(doc, len(content))


@router.get("/health/prescription-uploads")
def my_prescription_uploads(limit: int = Query(50, ge=1, le=100), user=Depends(require_student),
                            db: Session = Depends(workflow_db)):
    """The student's own prescription files, newest first, each with where it was sent and what came back."""
    docs = db.execute(select(M.Document.id, M.Document.title, M.Document.filename, M.Document.mime_type,
                             M.Document.created_at)
                      .where(M.Document.account_id == user["id"], M.Document.category == CATEGORY)
                      .order_by(M.Document.created_at.desc()).limit(limit)).all()
    ids = [d.id for d in docs]
    reviews = db.execute(select(M.RxUploadReview, M.ServiceProvider.legal_name)
                         .join(M.ServiceProvider, M.ServiceProvider.id == M.RxUploadReview.pharmacy_id)
                         .where(M.RxUploadReview.patient_id == user["id"], M.RxUploadReview.document_id.in_(ids))
                         .order_by(M.RxUploadReview.created_at.desc())).all() if ids else []
    by_doc: dict[str, list[dict]] = {}
    for review, name in reviews:
        by_doc.setdefault(review.document_id, []).append(_review_payload(review, name))
    return {"items": [{"id": d.id, "title": d.title, "filename": d.filename, "mimeType": d.mime_type,
                       "createdAt": d.created_at, "reviews": by_doc.get(d.id, [])} for d in docs],
            "total": len(docs)}


def withdraw_reviews_for_document(db: Session, document_id: str) -> int:
    """A deleted file can no longer be reviewed: pending reviews close and any open link dies."""
    return db.execute(update(M.RxUploadReview).where(
        M.RxUploadReview.document_id == document_id, M.RxUploadReview.status == PENDING,
    ).values(status="WITHDRAWN", link_token_hash="", link_issued_to="", link_expires_at=0.0,
             updated_at=time.time())).rowcount or 0


@router.delete("/health/prescription-uploads/{document_id}")
def delete_prescription_upload(document_id: str, user=Depends(require_student), db: Session = Depends(workflow_db)):
    doc = db.scalar(select(M.Document).where(M.Document.id == document_id, M.Document.account_id == user["id"],
                                             M.Document.category == CATEGORY))
    if not doc:
        raise HTTPException(404, "Prescription not found.")
    withdrawn = withdraw_reviews_for_document(db, doc.id)
    db.delete(doc)
    audit(db, user["id"], "RX_UPLOAD_DELETED", document_id)
    db.commit()
    return {"success": True, "withdrawnReviews": withdrawn}


class SendForReview(StrictModel):
    pharmacyId: str = Field(min_length=1, max_length=80)


@router.post("/health/prescription-uploads/{document_id}/reviews", status_code=201)
def send_for_review(document_id: str, body: SendForReview, user=Depends(require_student),
                    db: Session = Depends(workflow_db)):
    """Put the file in one pharmacy's review queue. One pending review per file at a time."""
    doc = db.scalar(select(M.Document.id).where(M.Document.id == document_id, M.Document.account_id == user["id"],
                                                M.Document.category == CATEGORY))
    if not doc:
        raise HTTPException(404, "Prescription not found.")
    now = time.time()
    pharmacy = db.get(M.ServiceProvider, body.pharmacyId)
    if not pharmacy or pharmacy.kind != "PHARMACY" or not pharmacy.active or not _licence_current(pharmacy, now):
        raise HTTPException(422, "Choose an active pharmacy from the list.")
    if db.scalar(select(M.RxUploadReview.id).where(M.RxUploadReview.document_id == document_id,
                                                   M.RxUploadReview.status == PENDING)):
        raise HTTPException(409, "This prescription is already waiting for a pharmacist.")
    review = M.RxUploadReview(id=_new_id(), document_id=document_id, patient_id=user["id"], pharmacy_id=pharmacy.id,
                              status=PENDING, checks={}, created_at=now, updated_at=now)
    db.add(review)
    ops_feed.publish(
        db, "RX_UPLOAD_SENT", "PHARMACY", summary="A student sent a prescription for pharmacist review",
        actor_id=user["id"], actor_role=user["role"], subject_id=user["id"],
        provider_id=pharmacy.id, resource_type="rx_upload_review", resource_id=review.id,
    )
    audit(db, user["id"], "RX_UPLOAD_SENT", review.id)
    db.commit()
    return _review_payload(review, pharmacy.legal_name)


# ══════════════════════════════════════════════════════════════════════════════
# Pharmacist
# ══════════════════════════════════════════════════════════════════════════════

def is_pharmacist(user: dict) -> bool:
    """A partner account a super admin typed as a pharmacy. Labs and clinics are not, whatever they own."""
    return user.get("role") == "VENDOR" and user.get("partnerKind") == "PHARMACY"


def pending_uploads_for(db: Session, user: dict, limit: int) -> list[dict]:
    """Uploaded prescriptions waiting in this pharmacist's queue. No patient id, file name or title (Rule L)."""
    if not is_pharmacist(user):
        return []
    mine = select(M.ServiceProvider.id).where(M.ServiceProvider.account_id == user["id"],
                                              M.ServiceProvider.kind == "PHARMACY")
    rows = db.execute(select(M.RxUploadReview, M.Document.mime_type)
                      .join(M.Document, M.Document.id == M.RxUploadReview.document_id)
                      .where(M.RxUploadReview.pharmacy_id.in_(mine), M.RxUploadReview.status == PENDING,
                             M.Document.account_id == M.RxUploadReview.patient_id)
                      .order_by(M.RxUploadReview.created_at.asc()).limit(limit)).all()
    return [{"reviewId": r.id, "receivedAt": r.created_at, "mimeType": mime, "source": "UPLOAD"} for r, mime in rows]


def _pharmacist_review(db: Session, user: dict, review_id: str) -> M.RxUploadReview:
    """This pharmacist's review. Another pharmacy's, or a lab's attempt, is indistinguishable from absent."""
    review = db.get(M.RxUploadReview, review_id)
    if not review or not is_pharmacist(user) or not _owns_pharmacy(db, user, review.pharmacy_id):
        raise HTTPException(404, "Prescription review not found.")
    return review


def _pending(db: Session, user: dict, review_id: str) -> M.RxUploadReview:
    review = _pharmacist_review(db, user, review_id)
    if review.status != PENDING:
        raise HTTPException(409, "This prescription has already been reviewed or was withdrawn.")
    return review


def _document_for(db: Session, review: M.RxUploadReview) -> M.Document:
    doc = db.scalar(select(M.Document).where(M.Document.id == review.document_id,
                                             M.Document.account_id == review.patient_id,
                                             M.Document.category == CATEGORY))
    if not doc:
        raise HTTPException(410, "The student has removed this prescription.")
    return doc


@router.post("/v1/pharmacy/rx-uploads/{review_id}/file-link")
def issue_file_link(review_id: str, user=Depends(require_pharmacy), db: Session = Depends(workflow_db)):
    """A two-minute link to the file, usable only by this pharmacist's session."""
    review = _pending(db, user, review_id)
    _document_for(db, review)
    token = secrets.token_urlsafe(32)
    review.link_token_hash = _hash(token)
    review.link_issued_to = user["id"]
    review.link_expires_at = time.time() + LINK_TTL_SECONDS
    review.updated_at = time.time()
    audit(db, user["id"], "RX_UPLOAD_LINK_ISSUED", review.id)
    db.commit()
    return {"url": f"/api/v1/pharmacy/rx-uploads/{review.id}/file?token={token}",
            "expiresAt": review.link_expires_at}


@router.get("/v1/pharmacy/rx-uploads/{review_id}/file")
def open_file(review_id: str, token: str = Query(min_length=16, max_length=128), user=Depends(require_pharmacy),
              db: Session = Depends(workflow_db)):
    """Serve the file to the pharmacist who was issued the link, while it lasts. Every view is audited."""
    review = _pending(db, user, review_id)
    if (review.link_issued_to != user["id"] or not review.link_token_hash
            or not hmac.compare_digest(review.link_token_hash, _hash(token))):
        raise HTTPException(403, "This link is not valid. Open the prescription again from your queue.")
    if review.link_expires_at <= time.time():
        raise HTTPException(403, "This link has expired. Open the prescription again from your queue.")
    doc = _document_for(db, review)
    review.last_viewed_at = time.time()
    audit(db, user["id"], "RX_UPLOAD_VIEWED", review.id)
    db.commit()
    disposition = "inline" if doc.mime_type in INLINE_TYPES else "attachment"
    extension = upload_files.EXTENSIONS.get(doc.mime_type, "bin")
    return Response(content=doc.content, media_type=doc.mime_type, headers={
        # The stored name may carry the student's name; the pharmacist gets a neutral one.
        "Content-Disposition": f'{disposition}; filename="prescription.{extension}"',
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
    })


def _close_link(review: M.RxUploadReview) -> None:
    review.link_token_hash = ""
    review.link_issued_to = ""
    review.link_expires_at = 0.0


@router.post("/v1/pharmacy/rx-uploads/{review_id}/approve")
def approve_upload(review_id: str, body: RxReviewApproval, user=Depends(require_pharmacy),
                   db: Session = Depends(workflow_db)):
    """A named pharmacist ticks the five checks. Records the outcome only; nothing is ordered or dispensed."""
    review = _pending(db, user, review_id)
    if not all(body.checks.model_dump().values()):
        raise HTTPException(422, "Every pharmacist check must be ticked before approving.")
    if not body.pharmacistName.strip():
        raise HTTPException(422, "Record the verifying pharmacist's name.")
    _document_for(db, review)
    now = time.time()
    review.status = "RX_VERIFIED"
    review.verified_by = body.pharmacistName.strip()
    review.verified_at = now
    review.reviewer_account_id = user["id"]
    review.checks = body.checks.model_dump()
    review.updated_at = now
    _close_link(review)
    ops_feed.notify(db, review.patient_id, "RX_UPLOAD_RX_VERIFIED", dedupe_key=f"rx-upload:{review.id}:RX_VERIFIED",
                    summary="A pharmacist has verified your prescription.",
                    resource_type="rx_upload_review", resource_id=review.id)
    ops_feed.publish(db, "RX_UPLOAD_RX_VERIFIED", "PHARMACY", summary="Uploaded prescription verified by a pharmacist",
                     actor_id=user["id"], actor_role=user["role"], subject_id=review.patient_id,
                     provider_id=review.pharmacy_id, resource_type="rx_upload_review", resource_id=review.id)
    audit(db, user["id"], "RX_UPLOAD_RX_VERIFIED", review.id)
    db.commit()
    return _outcome(review)


@router.post("/v1/pharmacy/rx-uploads/{review_id}/reject")
def reject_upload(review_id: str, body: RxReviewRejection, user=Depends(require_pharmacy),
                  db: Session = Depends(workflow_db)):
    """The pharmacist rejects with a reason the student is told."""
    review = _pending(db, user, review_id)
    reason = body.reason.strip()
    if not reason:
        raise HTTPException(422, "Give the patient a reason for the rejection.")
    now = time.time()
    review.status = "REJECTED"
    review.rejection_reason = reason
    review.reviewer_account_id = user["id"]
    review.updated_at = now
    _close_link(review)
    ops_feed.notify(db, review.patient_id, "RX_UPLOAD_REJECTED", dedupe_key=f"rx-upload:{review.id}:REJECTED",
                    summary="A pharmacist could not verify your prescription. Open the app to see why.",
                    resource_type="rx_upload_review", resource_id=review.id)
    ops_feed.publish(db, "RX_UPLOAD_REJECTED", "PHARMACY", severity="ATTENTION",
                     summary="Uploaded prescription rejected by a pharmacist",
                     actor_id=user["id"], actor_role=user["role"], subject_id=review.patient_id,
                     provider_id=review.pharmacy_id, resource_type="rx_upload_review", resource_id=review.id)
    audit(db, user["id"], "RX_UPLOAD_REJECTED", review.id)
    db.commit()
    return _outcome(review)


def _outcome(review: M.RxUploadReview) -> dict:
    return {"reviewId": review.id, "status": review.status, "verifiedBy": review.verified_by,
            "verifiedAt": review.verified_at or None, "rejectionReason": review.rejection_reason}
