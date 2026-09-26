"""Billing: plans, subscriptions, benefit quota, and institutional contracts.

Payment processing uses Razorpay's public API. When credentials are absent the
service returns an explicit unavailable state and never claims a charge. All
commercial entitlements are derived server-side from verified receipts,
subscription state, and recorded institutional payments — never from a
client-supplied plan selection.

Razorpay webhook delivery may be re-ordered or duplicated. Every activation path
is idempotent and reconciles against fetched provider state so an out-of-order
or repeated event cannot grant (or revoke) membership incorrectly.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import uuid
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session as DBSession

from core import billing_models as B
from core import workflow_models as W
from services import ops_feed
from services.workflow_auth import authenticated_user, require_super_admin, workflow_db

router = APIRouter(prefix="/api/billing", tags=["Billing"])

PLAN_IDS = ("FREE", "STUDENT_PLUS", "CAMPUS", "ENTERPRISE")
STUDENT_PLUS_PRICE_PAISE = 9900
STUDENT_PLUS_BENEFIT_LIMIT = 2


def now() -> float:
    return time.time()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


def _provider_configured() -> bool:
    return bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))


def _webhook_secret() -> str:
    return os.getenv("RAZORPAY_WEBHOOK_SECRET", "")


def gateway_request(method: str, path: str, body: dict | None = None, params: dict | None = None) -> dict:
    """Thin httpx adapter over the Razorpay REST API. Overridable in tests."""
    key_id, key_secret = os.getenv("RAZORPAY_KEY_ID", ""), os.getenv("RAZORPAY_KEY_SECRET", "")
    base = os.getenv("RAZORPAY_BASE_URL", "https://api.razorpay.com/v1").rstrip("/")
    response = httpx.request(
        method, f"{base}{path}", json=body, params=params,
        auth=(key_id, key_secret), timeout=20.0,
    )
    if response.status_code >= 400:
        raise HTTPException(502, "The payment provider could not complete the request.")
    return response.json()


def _verify_razorpay_webhook(raw: bytes, signature: str) -> bool:
    secret = _webhook_secret()
    if not secret:
        return False
    expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


def _verify_subscription_signature(payment_id: str, subscription_id: str, signature: str) -> bool:
    secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    if not secret:
        return False
    expected = hmac.new(secret.encode(), f"{payment_id}|{subscription_id}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


# ---------------------------------------------------------------------------
# Plan catalog (server-owned)
# ---------------------------------------------------------------------------

def _plan_payload(plan_id: str) -> dict:
    if plan_id == "FREE":
        return {"id": "FREE", "name": "Free Student Account", "price": "Free", "period": "forever",
                "audience": "student", "benefits": ["Personal health records", "Reading and document storage",
                "Emergency contact information", "Care service browsing", "Self-care tools"],
                "description": "Every account starts free."}
    if plan_id == "STUDENT_PLUS":
        return {"id": "STUDENT_PLUS", "name": "Student Plus", "price": 99, "period": "per month",
                "audience": "student", "benefits": ["Everything in Free", f"{STUDENT_PLUS_BENEFIT_LIMIT} care coordination requests per month",
                "Partner-funded discounts", "Priority support"], "description": "Monthly optional benefits pass."}
    if plan_id == "CAMPUS":
        return {"id": "CAMPUS", "name": "Campus", "price": 240, "period": "per student / per year",
                "audience": "institution", "benefits": ["Seat-based access", "Health camp coordination",
                "Request tracking", "Aggregate operational reporting"], "description": "Institution-paid campus care."}
    return {"id": "ENTERPRISE", "name": "Enterprise", "price": "Custom", "period": "per agreement",
            "audience": "institution", "benefits": ["Multi-campus access", "Clinician workflow tools",
            "Custom reporting", "Dedicated support"], "description": "Contact sales for a custom quote."}


@router.get("/plans")
def public_plans():
    plans = [_plan_payload(plan_id) for plan_id in PLAN_IDS]
    return {"plans": plans, "checkoutAvailable": _provider_configured(),
            "publicKey": os.getenv("RAZORPAY_KEY_ID", "") if _provider_configured() else ""}


# ---------------------------------------------------------------------------
# Subscription & benefit state
# ---------------------------------------------------------------------------

def _active_receipt_span(db: DBSession, account_id: str) -> tuple[float, float] | None:
    """The widest paid, non-refunded billing window for an account."""
    row = db.execute(
        select(func.coalesce(func.min(B.BillingReceipt.billing_start), 0),
               func.coalesce(func.max(B.BillingReceipt.billing_end), 0))
        .where(B.BillingReceipt.account_id == account_id,
               B.BillingReceipt.amount_paise >= STUDENT_PLUS_PRICE_PAISE,
               B.BillingReceipt.refunded_paise < B.BillingReceipt.amount_paise)
    ).one()
    start, end = row
    if not start:
        return None
    return float(start), float(end)


def _effective_plan(db: DBSession, account: W.Account) -> dict:
    span = _active_receipt_span(db, account.id)
    if span and span[0] <= now() < span[1]:
        subscription = db.scalar(select(B.BillingSubscription).where(B.BillingSubscription.account_id == account.id))
        return {"planId": "STUDENT_PLUS", "status": "ACTIVE", "periodStart": span[0], "periodEnd": span[1],
                "cancelAtPeriodEnd": bool(subscription and subscription.cancel_at_period_end)}
    seat = db.scalar(select(B.ContractSeat).where(B.ContractSeat.account_id == account.id))
    if seat:
        contract = db.get(B.EnterpriseContract, seat.contract_id)
        if contract and contract.status == "ACTIVE" and contract.period_start <= now() < contract.period_end:
            return {"planId": contract.plan_id, "status": "ACTIVE", "periodStart": contract.period_start,
                    "periodEnd": contract.period_end, "cancelAtPeriodEnd": False}
    return {"planId": "FREE", "status": "ACTIVE", "periodStart": 0.0, "periodEnd": 0.0, "cancelAtPeriodEnd": False}


def _receipt_payload(db: DBSession, account_id: str) -> list[dict]:
    rows = db.scalars(select(B.BillingReceipt).where(B.BillingReceipt.account_id == account_id)
                      .order_by(B.BillingReceipt.paid_at.desc()).limit(50)).all()
    return [{"invoiceId": row.provider_invoice_id, "amountPaise": row.amount_paise, "currency": row.currency,
             "paidAt": row.paid_at, "refundedPaise": row.refunded_paise,
             "periodStart": row.billing_start, "periodEnd": row.billing_end} for row in rows]


def _benefit_usage(db: DBSession, account_id: str, period_start: float) -> tuple[int, int]:
    used = db.scalar(select(func.count()).select_from(B.BenefitRequest)
                     .where(B.BenefitRequest.account_id == account_id,
                            B.BenefitRequest.created_at >= period_start)) or 0
    return used, STUDENT_PLUS_BENEFIT_LIMIT


def _me_payload(db: DBSession, account: W.Account) -> dict:
    plan = _effective_plan(db, account)
    used, limit = _benefit_usage(db, account.id, plan["periodStart"]) if plan["planId"] == "STUDENT_PLUS" else (0, 0)
    seat = db.scalar(select(B.ContractSeat).where(B.ContractSeat.account_id == account.id))
    contract = db.get(B.EnterpriseContract, seat.contract_id) if seat else None
    organization_plan = None
    if contract and contract.status == "ACTIVE":
        organization_plan = {"planId": contract.plan_id, "organization": contract.organization,
                             "periodStart": contract.period_start, "periodEnd": contract.period_end}
    return {"effectivePlanId": plan["planId"], "plan": _plan_payload(plan["planId"]),
            "status": plan["status"], "periodStart": plan["periodStart"], "periodEnd": plan["periodEnd"],
            "cancelAtPeriodEnd": plan["cancelAtPeriodEnd"], "checkoutAvailable": _provider_configured(),
            "organizationPlan": organization_plan, "benefits": {"limit": limit, "used": used},
            "receipts": _receipt_payload(db, account.id)}


class CheckoutInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    planId: str

    @field_validator("planId")
    @classmethod
    def only_student_plus(cls, value: str) -> str:
        if value != "STUDENT_PLUS":
            raise ValueError("Only Student Plus can be purchased online.")
        return value


@router.post("/subscription/checkout")
def start_subscription(body: CheckoutInput, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    if not _provider_configured():
        raise HTTPException(503, "Online payments are not configured. Contact support.")
    account = db.get(W.Account, user["id"])
    existing = db.scalar(select(B.BillingSubscription).where(B.BillingSubscription.account_id == account.id,
                                                              B.BillingSubscription.status.in_(["CREATED", "ACTIVE"])))
    if existing:
        return {"subscriptionId": existing.provider_subscription_id, "status": existing.status,
                "publicKey": os.getenv("RAZORPAY_KEY_ID", ""), "amountPaise": STUDENT_PLUS_PRICE_PAISE}
    subscription = gateway_request("POST", "/subscriptions", {
        "plan_id": os.getenv("RAZORPAY_PLUS_PLAN_ID", "plan_student_plus"),
        "customer_notify": True, "quantity": 1, "total_count": 12,
        "notes": {"accountId": account.id, "planId": "STUDENT_PLUS"},
    })
    row = B.BillingSubscription(id=_new_id("sub"), account_id=account.id, plan_id="STUDENT_PLUS",
                                provider_subscription_id=subscription["id"],
                                status=(subscription.get("status", "CREATED") or "CREATED").upper(),
                                created_at=now(), updated_at=now())
    db.add(row)
    ops_feed.publish(
        db, "SUBSCRIPTION_STARTED", "ACCOUNT",
        summary=f"Student Plus subscription started · ₹{STUDENT_PLUS_PRICE_PAISE / 100:.2f}",
        actor_id=account.id, actor_role=account.role, subject_id=account.id,
        resource_type="subscription", resource_id=row.id,
    )
    db.commit()
    return {"subscriptionId": subscription["id"], "status": row.status,
            "publicKey": os.getenv("RAZORPAY_KEY_ID", ""), "amountPaise": STUDENT_PLUS_PRICE_PAISE}


class VerifyInput(BaseModel):
    razorpay_subscription_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/subscription/verify")
def verify_subscription_payment(body: VerifyInput, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    if not _verify_subscription_signature(body.razorpay_payment_id, body.razorpay_subscription_id,
                                          body.razorpay_signature):
        raise HTTPException(400, "Payment verification failed.")
    subscription = db.scalar(select(B.BillingSubscription).where(
        B.BillingSubscription.account_id == user["id"],
        B.BillingSubscription.provider_subscription_id == body.razorpay_subscription_id))
    if not subscription:
        raise HTTPException(404, "Subscription not found.")
    # The authorization payment confirms intent only; entitlement is granted by
    # a verified paid invoice in a later reconciliation.
    return _me_payload(db, db.get(W.Account, user["id"]))


def _reconcile_subscription(db: DBSession, subscription: B.BillingSubscription) -> dict:
    """Pull provider invoices and upsert receipts idempotently."""
    invoices = gateway_request("GET", "/invoices", params={"subscription_id": subscription.provider_subscription_id})
    created = 0
    for invoice in invoices.get("items", []):
        if invoice.get("subscription_id") and invoice.get("subscription_id") != subscription.provider_subscription_id:
            continue
        if invoice.get("status") != "paid" or invoice.get("amount_due", 0) != 0:
            continue
        if invoice.get("currency") != "INR":
            continue
        existing = db.scalar(select(B.BillingReceipt).where(
            B.BillingReceipt.provider == "RAZORPAY",
            B.BillingReceipt.provider_invoice_id == invoice.get("id", "")))
        if existing:
            continue
        db.add(B.BillingReceipt(id=_new_id("rcpt"), account_id=subscription.account_id,
                                subscription_id=subscription.id, provider="RAZORPAY",
                                provider_invoice_id=invoice.get("id", ""),
                                provider_payment_id=invoice.get("payment_id", ""),
                                amount_paise=int(invoice.get("amount_paid", 0)),
                                currency=invoice.get("currency", "INR"),
                                billing_start=float(invoice.get("billing_start", 0)),
                                billing_end=float(invoice.get("billing_end", 0)),
                                paid_at=float(invoice.get("paid_at", now())), created_at=now()))
        created += 1
    _apply_refunds(db, subscription)
    db.commit()
    return {"reconciled": created}


def _apply_refunds(db: DBSession, subscription: B.BillingSubscription) -> None:
    for receipt in db.scalars(select(B.BillingReceipt).where(B.BillingReceipt.subscription_id == subscription.id)).all():
        if not receipt.provider_payment_id:
            continue
        payment = gateway_request("GET", f"/payments/{receipt.provider_payment_id}")
        refunded = int(payment.get("amount_refunded", 0) or 0)
        if refunded != receipt.refunded_paise:
            receipt.refunded_paise = refunded


def _activate_from_receipts(db: DBSession, subscription: B.BillingSubscription) -> None:
    for receipt in db.scalars(select(B.BillingReceipt).where(B.BillingReceipt.subscription_id == subscription.id)).all():
        if receipt.amount_paise <= 0 or receipt.refunded_paise >= receipt.amount_paise:
            continue
        if receipt.amount_paise < STUDENT_PLUS_PRICE_PAISE:
            continue
        if receipt.billing_start and receipt.billing_start > receipt.billing_end:
            continue
        subscription.status = "ACTIVE"
        if receipt.billing_start:
            subscription.current_start = receipt.billing_start
        if receipt.billing_end:
            subscription.current_end = receipt.billing_end
        subscription.updated_at = now()
        break


def _reconcile_all_for_account(db: DBSession, account_id: str) -> None:
    for subscription in db.scalars(select(B.BillingSubscription).where(B.BillingSubscription.account_id == account_id)).all():
        try:
            _reconcile_subscription(db, subscription)
        except HTTPException:
            raise
        _activate_from_receipts(db, subscription)
    db.commit()


@router.post("/subscription/sync")
def sync_subscription(user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    try:
        _reconcile_all_for_account(db, user["id"])
    except HTTPException as exc:
        raise HTTPException(exc.status_code, "Payment provider reconciliation is unavailable right now.")
    return _me_payload(db, db.get(W.Account, user["id"]))


@router.post("/subscription/cancel")
def cancel_subscription(user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    subscription = db.scalar(select(B.BillingSubscription).where(
        B.BillingSubscription.account_id == user["id"], B.BillingSubscription.status == "ACTIVE"))
    if not subscription:
        raise HTTPException(404, "No active subscription to cancel.")
    gateway_request("POST", f"/subscriptions/{subscription.provider_subscription_id}/cancel",
                    {"cancel_at_cycle_end": True})
    subscription.cancel_at_period_end = True
    subscription.updated_at = now()
    ops_feed.announce(
        db, account_id=user["id"], event_type="SUBSCRIPTION_CANCELLED", domain="ACCOUNT",
        dedupe_key=f"subscription:{subscription.id}:cancel",
        summary="Your subscription will end at the close of the current period.",
        severity="ATTENTION", actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="subscription", resource_id=subscription.id,
    )
    db.commit()
    return _me_payload(db, db.get(W.Account, user["id"]))


class BenefitInput(BaseModel):
    message: str = Field(min_length=10, max_length=2000)
    requestKey: str = Field(min_length=8, max_length=80)

    @field_validator("requestKey")
    @classmethod
    def valid_key(cls, value: str) -> str:
        if not value.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Invalid request key.")
        return value


@router.post("/benefit-requests", status_code=201)
def use_benefit(body: BenefitInput, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    account = db.get(W.Account, user["id"])
    plan = _effective_plan(db, account)
    if plan["planId"] != "STUDENT_PLUS":
        raise HTTPException(403, "Student Plus membership is required to use this benefit.")
    used, limit = _benefit_usage(db, account.id, plan["periodStart"])
    existing = db.scalar(select(B.BenefitRequest).where(B.BenefitRequest.account_id == account.id,
                                                        B.BenefitRequest.request_key == body.requestKey))
    if existing:
        return {"id": existing.id, "status": existing.status, "duplicate": True}
    if used >= limit:
        raise HTTPException(409, "This month's benefit allowance is used up.")
    row = B.BenefitRequest(id=_new_id("bnf"), account_id=account.id, request_key=body.requestKey,
                           message=body.message, created_at=now())
    db.add(row)
    db.commit()
    return {"id": row.id, "status": row.status, "duplicate": False}


# ---------------------------------------------------------------------------
# Razorpay webhook (idempotent, re-ordered deliveries reconciled)
# ---------------------------------------------------------------------------

@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, db: DBSession = Depends(workflow_db)):
    raw = await request.body()
    if not raw:
        raise HTTPException(400, "Invalid webhook payload.")
    signature = request.headers.get("x-razorpay-signature", "")
    if not _verify_razorpay_webhook(raw, signature):
        raise HTTPException(401, "Invalid webhook signature.")
    data = json.loads(raw)
    # Deliberately event-agnostic: whatever fired, we re-read the provider's own
    # invoices and upsert receipts by provider_invoice_id, so handling depends on
    # provider state rather than on the event name. That also makes a replayed
    # webhook a no-op, which is why the x-razorpay-event-id idempotency header is
    # not tracked. Both were being read into unused locals; removed rather than
    # left looking like an unfinished guard.
    entity = (data.get("payload", {}).get("subscription", {}).get("entity", {}) or {})
    provider_subscription_id = entity.get("id", "")
    subscription = db.scalar(select(B.BillingSubscription).where(
        B.BillingSubscription.provider_subscription_id == provider_subscription_id))
    if not subscription:
        return {"success": True, "ignored": True}
    had_receipt = db.scalar(select(B.BillingReceipt.id).where(
        B.BillingReceipt.subscription_id == subscription.id)) is not None
    _reconcile_subscription(db, subscription)
    _activate_from_receipts(db, subscription)
    db.commit()
    # A paid invoice is the source of truth; replayed or older events do not
    # change entitlement after reconciliation has run.
    return {"success": True, "duplicate": had_receipt}


# ---------------------------------------------------------------------------
# Institutional inquiries & contracts
# ---------------------------------------------------------------------------

class InquiryInput(BaseModel):
    organization: str = Field(min_length=2, max_length=160)
    contactName: str = Field(default="", max_length=120)
    email: str = Field(min_length=5, max_length=254)
    seats: int = Field(ge=0, le=1000000)
    planId: Literal["CAMPUS", "ENTERPRISE"] = "ENTERPRISE"
    message: str = Field(default="", max_length=4000)
    consent: bool

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        if "@" not in value or len(value) > 254:
            raise ValueError("Enter a valid email address.")
        return value.lower()


@router.post("/inquiries", status_code=201)
def submit_inquiry(body: InquiryInput, db: DBSession = Depends(workflow_db)):
    if not body.consent:
        raise HTTPException(422, "Consent to be contacted is required.")
    row = B.EnterpriseInquiry(id=_new_id("inq"), organization=body.organization, contact_name=body.contactName,
                              email=body.email, seats=body.seats, plan_id=body.planId, message=body.message,
                              consent=True, created_at=now(), updated_at=now())
    db.add(row)
    ops_feed.publish(
        db, "ENTERPRISE_INQUIRY", "SUPPORT", severity="ATTENTION",
        summary=f"Enterprise inquiry · {body.seats} seat(s) · {body.planId}",
        resource_type="inquiry", resource_id=row.id,
    )
    db.commit()
    return {"id": row.id, "status": row.status}


@router.get("/admin/inquiries")
def list_inquiries(user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    rows = db.scalars(select(B.EnterpriseInquiry).order_by(B.EnterpriseInquiry.created_at.desc()).limit(200)).all()
    return {"items": [{"id": row.id, "organization": row.organization, "contactName": row.contact_name,
                       "email": row.email, "seats": row.seats, "planId": row.plan_id, "message": row.message,
                       "status": row.status, "createdAt": row.created_at} for row in rows]}


class InquiryStatus(BaseModel):
    status: Literal["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]


@router.patch("/admin/inquiries/{inquiry_id}")
def update_inquiry(inquiry_id: str, body: InquiryStatus, user=Depends(require_super_admin),
                   db: DBSession = Depends(workflow_db)):
    if not db.execute(update(B.EnterpriseInquiry).where(B.EnterpriseInquiry.id == inquiry_id)
                      .values(status=body.status, updated_at=now())).rowcount:
        raise HTTPException(404, "Inquiry not found.")
    db.commit()
    return {"success": True}


class ContractInput(BaseModel):
    organization: str = Field(min_length=2, max_length=160)
    planId: Literal["CAMPUS", "ENTERPRISE"]
    managerEmail: str = Field(min_length=5, max_length=254)
    seats: int = Field(ge=1, le=1000000)
    annualAmountPaise: int = Field(ge=0, le=100000000)
    signedReference: str = Field(default="", max_length=160)

    @field_validator("managerEmail")
    @classmethod
    def valid_email(cls, value: str) -> str:
        if "@" not in value:
            raise ValueError("Enter a valid email address.")
        return value.lower()


@router.post("/admin/contracts", status_code=201)
def create_contract(body: ContractInput, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    manager = db.scalar(select(W.Account).where(W.Account.identifier == body.managerEmail))
    if not manager:
        raise HTTPException(422, "Select an existing manager account for this contract.")
    row = B.EnterpriseContract(id=_new_id("ctr"), organization=body.organization, manager_account_id=manager.id,
                               plan_id=body.planId, seats=body.seats, annual_amount_paise=body.annualAmountPaise,
                               signed_reference=body.signedReference, status="DRAFT",
                               created_at=now(), updated_at=now())
    db.add(row)
    ops_feed.publish(
        db, "CONTRACT_DRAFTED", "ACCOUNT",
        summary=f"Enterprise contract drafted · {body.seats} seat(s) · ₹{body.annualAmountPaise / 100:.2f}/year",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=manager.id,
        resource_type="contract", resource_id=row.id,
    )
    db.commit()
    return {"id": row.id, "status": row.status}


class ActivateInput(BaseModel):
    paymentReference: str = Field(min_length=3, max_length=160)
    amountPaise: int = Field(ge=0, le=100000000)
    periodStart: float
    periodEnd: float

    @model_validator(mode="after")
    def valid_period(self):
        if self.periodStart >= self.periodEnd:
            raise ValueError("Contract period must have a start before its end.")
        return self


@router.post("/admin/contracts/{contract_id}/activate")
def activate_contract(contract_id: str, body: ActivateInput, user=Depends(require_super_admin),
                      db: DBSession = Depends(workflow_db)):
    contract = db.get(B.EnterpriseContract, contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found.")
    if body.amountPaise < contract.annual_amount_paise:
        raise HTTPException(422, "Recorded payment is less than the contracted annual amount.")
    contract.status = "ACTIVE"
    contract.payment_reference = body.paymentReference
    contract.amount_paid_paise = body.amountPaise
    contract.period_start = body.periodStart
    contract.period_end = body.periodEnd
    contract.updated_at = now()
    ops_feed.publish(
        db, "CONTRACT_ACTIVATED", "ACCOUNT", severity="ATTENTION",
        summary=f"Enterprise contract activated · ₹{body.amountPaise / 100:.2f} recorded",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=contract.manager_account_id,
        resource_type="contract", resource_id=contract.id,
    )
    db.commit()
    return {"success": True, "status": contract.status}


def _contract_payload(db: DBSession, contract: B.EnterpriseContract) -> dict:
    seats = db.scalars(select(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id)).all()
    return {"id": contract.id, "organization": contract.organization, "planId": contract.plan_id,
            "status": contract.status, "seats": contract.seats,
            "assigned": [db.get(W.Account, seat.account_id).email for seat in seats
                         if db.get(W.Account, seat.account_id)],
            "annualAmountPaise": contract.annual_amount_paise,
            "amountPaidPaise": contract.amount_paid_paise,
            "periodStart": contract.period_start, "periodEnd": contract.period_end,
            "paymentReference": contract.payment_reference}


def _manager_contract(db: DBSession, account_id: str) -> B.EnterpriseContract | None:
    return db.scalar(select(B.EnterpriseContract).where(
        B.EnterpriseContract.manager_account_id == account_id, B.EnterpriseContract.status == "ACTIVE"))


@router.get("/contracts")
def my_contracts(user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    contract = _manager_contract(db, user["id"])
    if not contract:
        return {"items": []}
    return {"items": [_contract_payload(db, contract)]}


class SeatInput(BaseModel):
    email: str = Field(min_length=5, max_length=254)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        if "@" not in value:
            raise ValueError("Enter a valid email address.")
        return value.lower()


def _require_manager_contract(db: DBSession, account_id: str, contract_id: str) -> B.EnterpriseContract:
    contract = _manager_contract(db, account_id)
    if not contract or contract.id != contract_id:
        raise HTTPException(404, "Contract not found.")
    return contract


@router.post("/contracts/{contract_id}/members", status_code=201)
def add_seat(contract_id: str, body: SeatInput, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    contract = _require_manager_contract(db, user["id"], contract_id)
    member = db.scalar(select(W.Account).where(W.Account.identifier == body.email))
    if not member:
        raise HTTPException(422, "No account exists with that email.")
    count = db.scalar(select(func.count()).select_from(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id)) or 0
    if count >= contract.seats:
        raise HTTPException(409, "This contract's seat allowance is full.")
    if db.scalar(select(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id,
                                              B.ContractSeat.account_id == member.id)):
        return {"success": True, "duplicate": True}
    db.add(B.ContractSeat(id=_new_id("seat"), contract_id=contract.id, account_id=member.id, created_at=now()))
    db.commit()
    return {"success": True}


@router.get("/contracts/{contract_id}/members")
def list_seats(contract_id: str, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    contract = _require_manager_contract(db, user["id"], contract_id)
    rows = db.scalars(select(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id)).all()
    return {"items": [{"email": db.get(W.Account, row.account_id).email} for row in rows]}


@router.get("/me")
def billing_me(user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    return _me_payload(db, db.get(W.Account, user["id"]))
