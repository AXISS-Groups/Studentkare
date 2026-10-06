import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from core import workflow_models as M
from services.workflow_auth import require_super_admin, workflow_db
from services import ops_feed

router = APIRouter(prefix="/api/v1/dpdp", tags=["DPDP"])

def new_id() -> str:
    return uuid.uuid4().hex

class ConsentPolicyInput(BaseModel):
    model_config = {"extra": "forbid"}
    version: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=160)
    changeSummary: str = Field(min_length=1, max_length=2000)
    forceReconsent: bool = False

@router.get("/erasure-queue")
def get_erasure_queue(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Returns pending requests with 30-day countdowns and legal exemption lists."""
    rows = db.scalars(select(M.DPDPErasureRequest).where(M.DPDPErasureRequest.status == "PENDING")).all()
    
    now = time.time()
    results = []
    for row in rows:
        days_remaining = max(0, int((row.scheduled_erasure_date - now) / 86400))
        results.append({
            "id": row.id,
            "studentId": row.student_id,
            "requestDate": row.request_date,
            "scheduledErasureDate": row.scheduled_erasure_date,
            "daysRemaining": days_remaining,
            "status": row.status,
            "legallyRetainedItems": row.legally_retained_items or ["Clinical Records", "Prescriptions", "Financial Transactions"],
        })
    return {"items": results}

@router.post("/erasure/{request_id}/process", status_code=200)
def process_erasure(request_id: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Executes deletion while retaining mandated records."""
    req = db.get(M.DPDPErasureRequest, request_id)
    if not req or req.status != "PENDING":
        raise HTTPException(404, "Erasure request not found or not pending.")
    
    account = db.get(M.Account, req.student_id)
    if account:
        account.full_name = "Redacted (DPDP Erasure)"
        account.identifier = f"erased_{account.id}"
        account.profile = {}
        account.active = False
        
        db.execute(delete(M.Session).where(M.Session.account_id == account.id))
        db.execute(delete(M.Preference).where(M.Preference.account_id == account.id))
        db.execute(delete(M.NotificationPreference).where(M.NotificationPreference.account_id == account.id))

    req.status = "COMPLETED"
    
    ops_feed.publish(
        db, "DPDP_ERASURE_PROCESSED", "ACCOUNT",
        severity="INFO",
        summary=f"DPDP erasure processed for account {req.student_id}",
        actor_id=user["id"], actor_role=user["role"], subject_id=req.student_id,
    )
    
    db.commit()
    return {"status": "success", "message": "Erasure processed successfully."}

@router.post("/consent-policy", status_code=201)
def update_consent_policy(body: ConsentPolicyInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Updates policy version and flags existing active student sessions for forced re-consent."""
    now = time.time()
    
    policy = M.DPDPConsentPolicyVersion(
        id=new_id(),
        version=body.version,
        title=body.title,
        change_summary=body.changeSummary,
        effective_date=now,
        force_reconsent=body.forceReconsent,
    )
    db.add(policy)
    
    if body.forceReconsent:
        student_accounts_subquery = select(M.Account.id).where(M.Account.role == "STUDENT")
        db.execute(
            delete(M.Session).where(
                M.Session.account_id.in_(student_accounts_subquery)
            )
        )
        
    ops_feed.publish(
        db, "DPDP_POLICY_UPDATED", "ACCOUNT",
        severity="ATTENTION" if body.forceReconsent else "INFO",
        summary=f"Consent policy updated to version {body.version}",
        actor_id=user["id"], actor_role=user["role"],
    )
        
    db.commit()
    
    return {
        "id": policy.id,
        "version": policy.version,
        "title": policy.title,
        "changeSummary": policy.change_summary,
        "effectiveDate": policy.effective_date,
        "forceReconsent": policy.force_reconsent,
    }
