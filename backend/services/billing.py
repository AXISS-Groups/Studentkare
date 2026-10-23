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

import json
import os
import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session as DBSession

from core import billing_models as B
from core import workflow_models as W
from core.rate_limiter import SlidingWindowRateLimiter
from core.settings_registry import cached_setting, setting
from services import ops_feed, razorpay_client
from services.commerce_session import commerce_db
from services.workflow_auth import authenticated_user, require_super_admin, workflow_db

router = APIRouter(prefix="/api/billing", tags=["Billing"])

PLAN_IDS = ("FREE", "STUDENT_PLUS", "PREMIUM", "CAMPUS", "ENTERPRISE")
PAISE_PER_RUPEE = 100
# The package is defined as three months; its price is the registry's.
QUARTER_PACKAGE_MONTHS = 3

# Plan prices and limits (AGENTS.md rule 11): core/settings_registry.py.
STUDENT_PLUS_MONTHLY_KEY = "billing.student_plus.monthly_inr"
STUDENT_PLUS_QUARTER_KEY = "billing.student_plus.quarter_package_inr"
PREMIUM_FROM_KEY = "billing.premium.from_monthly_inr"
CAMPUS_PRICE_KEY = "billing.campus.per_student_yearly_inr"
BENEFIT_LIMIT_KEY = "billing.student_plus.benefit_requests_per_month"
ENTITLING_RECEIPT_KEY = "billing.student_plus.min_entitling_receipt_inr"


def student_plus_monthly_paise(db: DBSession | None = None) -> int:
    return setting(STUDENT_PLUS_MONTHLY_KEY, db) * PAISE_PER_RUPEE


def _entitling_receipt_paise(db: DBSession) -> int:
    return setting(ENTITLING_RECEIPT_KEY, db) * PAISE_PER_RUPEE


def _benefit_limit(db: DBSession | None) -> int:
    return setting(BENEFIT_LIMIT_KEY, db)


def now() -> float:
    return time.time()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


def _provider_configured() -> bool:
    return razorpay_client.configured()


def gateway_request(method: str, path: str, body: dict | None = None, params: dict | None = None) -> dict:
    """Razorpay REST call (services/razorpay_client). Overridable in tests."""
    return razorpay_client.request(method, path, body, params)


def _verify_razorpay_webhook(raw: bytes, signature: str) -> bool:
    return razorpay_client.verify_webhook(raw, signature)


def _verify_subscription_signature(payment_id: str, subscription_id: str, signature: str) -> bool:
    return razorpay_client.verify_signature(f"{payment_id}|{subscription_id}", signature)


# ---------------------------------------------------------------------------
# Plan catalog (server-owned)
# ---------------------------------------------------------------------------

def _plan_payload(plan_id: str, db: DBSession | None = None) -> dict:
    """One plan. Numeric prices are whole rupees from the settings registry.

    ``priceFrom`` marks a starting price ("from ₹499"); ``packages`` lists
    prepaid bundles of a plan. Neither is sold online: checkout is the monthly
    Student Plus subscription only.
    """
    if plan_id == "FREE":
        return {"id": "FREE", "name": "Free Student Account", "price": "Free", "priceFrom": False,
                "period": "forever", "packages": [],
                "audience": "student", "benefits": ["Personal health records", "Reading and document storage",
                "Emergency contact information", "Care service browsing", "Self-care tools"],
                "description": "Every account starts free."}
    if plan_id == "STUDENT_PLUS":
        return {"id": "STUDENT_PLUS", "name": "Student Plus", "price": setting(STUDENT_PLUS_MONTHLY_KEY, db),
                "priceFrom": False, "period": "per month",
                "packages": [{"id": "QUARTER", "months": QUARTER_PACKAGE_MONTHS,
                              "price": setting(STUDENT_PLUS_QUARTER_KEY, db)}],
                "audience": "student", "benefits": ["Everything in Free", f"{_benefit_limit(db)} care coordination requests per month",
                "Partner-funded discounts", "Priority support"], "description": "Monthly optional benefits pass."}
    if plan_id == "PREMIUM":
        return {"id": "PREMIUM", "name": "Premium", "price": setting(PREMIUM_FROM_KEY, db), "priceFrom": True,
                "period": "per month", "packages": [], "audience": "student", "benefits": [],
                "description": "Premium starts at this price. It is not sold online yet."}
    if plan_id == "CAMPUS":
        return {"id": "CAMPUS", "name": "Campus", "price": setting(CAMPUS_PRICE_KEY, db), "priceFrom": False,
                "period": "per student / per year", "packages": [],
                "audience": "institution", "benefits": ["Seat-based access", "Health camp coordination",
                "Request tracking", "Aggregate operational reporting"], "description": "Institution-paid campus care."}
    return {"id": "ENTERPRISE", "name": "Enterprise", "price": "Custom", "priceFrom": False, "period": "per agreement",
            "packages": [], "audience": "institution", "benefits": ["Multi-campus access", "Clinician workflow tools",
            "Custom reporting", "Dedicated support"], "description": "Contact sales for a custom quote."}


@router.get("/plans")
def public_plans(db: DBSession = Depends(commerce_db)):
    plans = [_plan_payload(plan_id, db) for plan_id in PLAN_IDS]
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
               B.BillingReceipt.amount_paise >= _entitling_receipt_paise(db),
               B.BillingReceipt.refunded_paise < B.BillingReceipt.amount_paise)
    ).one()
    start, end = row
    if not start:
        return None
    return float(start), float(end)


def _effective_plan(db: DBSession, account_id: str) -> dict:
    span = _active_receipt_span(db, account_id)
    if span and span[0] <= now() < span[1]:
        subscription = db.scalar(select(B.BillingSubscription).where(B.BillingSubscription.account_id == account_id))
        return {"planId": "STUDENT_PLUS", "status": "ACTIVE", "periodStart": span[0], "periodEnd": span[1],
                "cancelAtPeriodEnd": bool(subscription and subscription.cancel_at_period_end)}
    seat = db.scalar(select(B.ContractSeat).where(B.ContractSeat.account_id == account_id))
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
    return used, _benefit_limit(db)


def _me_payload(db: DBSession, account_id: str) -> dict:
    plan = _effective_plan(db, account_id)
    used, limit = _benefit_usage(db, account_id, plan["periodStart"]) if plan["planId"] == "STUDENT_PLUS" else (0, 0)
    seat = db.scalar(select(B.ContractSeat).where(B.ContractSeat.account_id == account_id))
    contract = db.get(B.EnterpriseContract, seat.contract_id) if seat else None
    organization_plan = None
    if contract and contract.status == "ACTIVE":
        organization_plan = {"planId": contract.plan_id, "organization": contract.organization,
                             "periodStart": contract.period_start, "periodEnd": contract.period_end}
    return {"effectivePlanId": plan["planId"], "plan": _plan_payload(plan["planId"], db),
            "status": plan["status"], "periodStart": plan["periodStart"], "periodEnd": plan["periodEnd"],
            "cancelAtPeriodEnd": plan["cancelAtPeriodEnd"], "checkoutAvailable": _provider_configured(),
            "organizationPlan": organization_plan, "benefits": {"limit": limit, "used": used},
            "receipts": _receipt_payload(db, account_id)}


class CheckoutInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    planId: str

    @field_validator("planId")
    @classmethod
    def only_student_plus(cls, value: str) -> str:
        if value != "STUDENT_PLUS":
            raise ValueError("Only Student Plus can be purchased online.")
        return value


def _plan_id() -> str:
    return os.getenv("RAZORPAY_PLUS_PLAN_ID", "plan_student_plus")


def _require_plan_amount(db: DBSession) -> int:
    """The registry's monthly price, once the Razorpay plan is seen to charge exactly that.

    A Razorpay plan's amount is fixed when the plan is created. After a price
    change ops must create a new plan and point RAZORPAY_PLUS_PLAN_ID at it;
    until then checkout is refused rather than charging a price the page does
    not show.
    """
    expected = student_plus_monthly_paise(db)
    try:
        plan = gateway_request("GET", f"/plans/{_plan_id()}")
    except HTTPException:
        raise HTTPException(503, "Online payments are unavailable right now. Try again later.") from None
    item = plan.get("item") or {}
    if item.get("amount") != expected or item.get("currency") != "INR":
        raise HTTPException(503, "Student Plus checkout is paused while its price is updated. Contact support.")
    return expected


@router.post("/subscription/checkout")
def start_subscription(body: CheckoutInput, user=Depends(authenticated_user), db: DBSession = Depends(commerce_db)):
    if not _provider_configured():
        raise HTTPException(503, "Online payments are not configured. Contact support.")
    account_id = user["id"]
    existing = db.scalar(select(B.BillingSubscription).where(B.BillingSubscription.account_id == account_id,
                                                              B.BillingSubscription.status.in_(["CREATED", "ACTIVE"])))
    amount_paise = _require_plan_amount(db)
    if existing:
        return {"subscriptionId": existing.provider_subscription_id, "status": existing.status,
                "publicKey": os.getenv("RAZORPAY_KEY_ID", ""), "amountPaise": amount_paise}
    subscription = gateway_request("POST", "/subscriptions", {
        "plan_id": _plan_id(),
        "customer_notify": True, "quantity": 1, "total_count": 12,
        "notes": {"accountId": account_id, "planId": "STUDENT_PLUS"},
    })
    row = B.BillingSubscription(id=_new_id("sub"), account_id=account_id, plan_id="STUDENT_PLUS",
                                provider_subscription_id=subscription["id"],
                                status=(subscription.get("status", "CREATED") or "CREATED").upper(),
                                created_at=now(), updated_at=now())
    db.add(row)
    ops_feed.publish(
        db, "SUBSCRIPTION_STARTED", "ACCOUNT",
        summary=f"Student Plus subscription started · ₹{amount_paise / PAISE_PER_RUPEE:.2f}",
        actor_id=account_id, actor_role=user.get("role", ""), subject_id=account_id,
        resource_type="subscription", resource_id=row.id,
    )
    db.commit()
    return {"subscriptionId": subscription["id"], "status": row.status,
            "publicKey": os.getenv("RAZORPAY_KEY_ID", ""), "amountPaise": amount_paise}


class VerifyInput(BaseModel):
    razorpay_subscription_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/subscription/verify")
def verify_subscription_payment(body: VerifyInput, user=Depends(authenticated_user), db: DBSession = Depends(commerce_db)):
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
    return _me_payload(db, user["id"])


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
        if receipt.amount_paise < _entitling_receipt_paise(db):
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
def sync_subscription(user=Depends(authenticated_user), db: DBSession = Depends(commerce_db)):
    try:
        _reconcile_all_for_account(db, user["id"])
    except HTTPException as exc:
        raise HTTPException(exc.status_code, "Payment provider reconciliation is unavailable right now.")
    return _me_payload(db, user["id"])


@router.post("/subscription/cancel")
def cancel_subscription(user=Depends(authenticated_user), db: DBSession = Depends(commerce_db),
                        idb: DBSession = Depends(workflow_db)):
    subscription = db.scalar(select(B.BillingSubscription).where(
        B.BillingSubscription.account_id == user["id"], B.BillingSubscription.status == "ACTIVE"))
    if not subscription:
        raise HTTPException(404, "No active subscription to cancel.")
    gateway_request("POST", f"/subscriptions/{subscription.provider_subscription_id}/cancel",
                    {"cancel_at_cycle_end": True})
    subscription.cancel_at_period_end = True
    subscription.updated_at = now()
    summary = "Your subscription will end at the close of the current period."
    ops_feed.publish(
        db, "SUBSCRIPTION_CANCELLED", "ACCOUNT", summary=summary, severity="ATTENTION",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="subscription", resource_id=subscription.id,
    )
    db.commit()
    # The outbox is not a commerce table (Rule L), so the notification goes through
    # the normal session, after the change it describes has landed. It is deduped,
    # so a retried cancel notifies once.
    ops_feed.notify(idb, user["id"], "SUBSCRIPTION_CANCELLED", dedupe_key=f"subscription:{subscription.id}:cancel",
                    summary=summary, resource_type="subscription", resource_id=subscription.id)
    idb.commit()
    return _me_payload(db, user["id"])


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
def use_benefit(body: BenefitInput, user=Depends(authenticated_user), db: DBSession = Depends(commerce_db)):
    account_id = user["id"]
    plan = _effective_plan(db, account_id)
    if plan["planId"] != "STUDENT_PLUS":
        raise HTTPException(403, "Student Plus membership is required to use this benefit.")
    used, limit = _benefit_usage(db, account_id, plan["periodStart"])
    existing = db.scalar(select(B.BenefitRequest).where(B.BenefitRequest.account_id == account_id,
                                                        B.BenefitRequest.request_key == body.requestKey))
    if existing:
        return {"id": existing.id, "status": existing.status, "duplicate": True}
    if used >= limit:
        raise HTTPException(409, "This month's benefit allowance is used up.")
    row = B.BenefitRequest(id=_new_id("bnf"), account_id=account_id, request_key=body.requestKey,
                           message=body.message, created_at=now())
    db.add(row)
    db.commit()
    return {"id": row.id, "status": row.status, "duplicate": False}


# ---------------------------------------------------------------------------
# Razorpay webhook (idempotent, re-ordered deliveries reconciled)
# ---------------------------------------------------------------------------

@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, db: DBSession = Depends(commerce_db)):
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
        # Field(max_length=254) has already bounded the length.
        if "@" not in value:
            raise ValueError("Enter a valid email address.")
        return value.lower()


INQUIRY_EMAIL_WINDOW_SECONDS = 86400
INQUIRY_IP_WINDOW_SECONDS = 3600


def _inquiries_per_ip() -> int:
    return int(cached_setting("support.inquiries_per_ip_per_hour"))


# Unauthenticated, so per sender (audit L6): per network address here (per
# process), per email address below from the stored inquiries (across replicas).
inquiry_ip_limiter = SlidingWindowRateLimiter(max_requests=None, window_seconds=INQUIRY_IP_WINDOW_SECONDS,
                                              limit_source=_inquiries_per_ip, label="IP")


@router.post("/inquiries", status_code=201)
def submit_inquiry(body: InquiryInput, request: Request, db: DBSession = Depends(commerce_db)):
    if not body.consent:
        raise HTTPException(422, "Consent to be contacted is required.")
    limited, _count = inquiry_ip_limiter.is_rate_limited(request.client.host if request.client else "unknown")
    if limited:
        raise HTTPException(429, "Too many inquiries from this network. Please try again later.")
    recent = db.scalar(select(func.count()).select_from(B.EnterpriseInquiry).where(
        B.EnterpriseInquiry.email == body.email,
        B.EnterpriseInquiry.created_at > now() - INQUIRY_EMAIL_WINDOW_SECONDS)) or 0
    if recent >= int(setting("support.inquiries_per_email_per_day", db)):
        raise HTTPException(429, "We already have your inquiry. Our team will be in touch.")
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
def list_inquiries(user=Depends(require_super_admin), db: DBSession = Depends(commerce_db)):
    rows = db.scalars(select(B.EnterpriseInquiry).order_by(B.EnterpriseInquiry.created_at.desc()).limit(200)).all()
    return {"items": [{"id": row.id, "organization": row.organization, "contactName": row.contact_name,
                       "email": row.email, "seats": row.seats, "planId": row.plan_id, "message": row.message,
                       "status": row.status, "createdAt": row.created_at} for row in rows]}


class InquiryStatus(BaseModel):
    status: Literal["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]


@router.patch("/admin/inquiries/{inquiry_id}")
def update_inquiry(inquiry_id: str, body: InquiryStatus, user=Depends(require_super_admin),
                   db: DBSession = Depends(commerce_db)):
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
def create_contract(body: ContractInput, user=Depends(require_super_admin), db: DBSession = Depends(commerce_db),
                    idb: DBSession = Depends(workflow_db)):
    manager_id = _account_id_for_email(idb, body.managerEmail)
    if not manager_id:
        raise HTTPException(422, "Select an existing manager account for this contract.")
    row = B.EnterpriseContract(id=_new_id("ctr"), organization=body.organization, manager_account_id=manager_id,
                               plan_id=body.planId, seats=body.seats, annual_amount_paise=body.annualAmountPaise,
                               signed_reference=body.signedReference, status="DRAFT",
                               created_at=now(), updated_at=now())
    db.add(row)
    ops_feed.publish(
        db, "CONTRACT_DRAFTED", "ACCOUNT",
        summary=f"Enterprise contract drafted · {body.seats} seat(s) · ₹{body.annualAmountPaise / 100:.2f}/year",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=manager_id,
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
                      db: DBSession = Depends(commerce_db)):
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


def _account_id_for_email(idb: DBSession, email: str) -> str | None:
    """Identity lookup on the normal session: sk_commerce cannot read identifiers."""
    return idb.scalar(select(W.Account.id).where(W.Account.identifier == email))


def _emails(idb: DBSession, account_ids: list[str]) -> list[str]:
    """Seat holders' email addresses, in seat order (identity, normal session).

    This used to read ``Account.email``, which the model does not have, so any
    contract with an assigned seat failed with AttributeError.
    """
    if not account_ids:
        return []
    rows = dict(idb.execute(select(W.Account.id, W.Account.identifier)
                            .where(W.Account.id.in_(account_ids), W.Account.channel == "EMAIL")).all())
    return [rows[i] for i in account_ids if i in rows]


def _contract_payload(db: DBSession, idb: DBSession, contract: B.EnterpriseContract) -> dict:
    seats = db.scalars(select(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id)
                       .order_by(B.ContractSeat.created_at)).all()
    return {"id": contract.id, "organization": contract.organization, "planId": contract.plan_id,
            "status": contract.status, "seats": contract.seats,
            "assigned": _emails(idb, [seat.account_id for seat in seats]),
            "annualAmountPaise": contract.annual_amount_paise,
            "amountPaidPaise": contract.amount_paid_paise,
            "periodStart": contract.period_start, "periodEnd": contract.period_end,
            "paymentReference": contract.payment_reference}


def _manager_contract(db: DBSession, account_id: str) -> B.EnterpriseContract | None:
    return db.scalar(select(B.EnterpriseContract).where(
        B.EnterpriseContract.manager_account_id == account_id, B.EnterpriseContract.status == "ACTIVE"))


@router.get("/contracts")
def my_contracts(user=Depends(authenticated_user), db: DBSession = Depends(commerce_db),
                 idb: DBSession = Depends(workflow_db)):
    contract = _manager_contract(db, user["id"])
    if not contract:
        return {"items": []}
    return {"items": [_contract_payload(db, idb, contract)]}


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
def add_seat(contract_id: str, body: SeatInput, user=Depends(authenticated_user), db: DBSession = Depends(commerce_db),
             idb: DBSession = Depends(workflow_db)):
    contract = _require_manager_contract(db, user["id"], contract_id)
    member_id = _account_id_for_email(idb, body.email)
    if not member_id:
        raise HTTPException(422, "No account exists with that email.")
    count = db.scalar(select(func.count()).select_from(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id)) or 0
    if count >= contract.seats:
        raise HTTPException(409, "This contract's seat allowance is full.")
    if db.scalar(select(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id,
                                              B.ContractSeat.account_id == member_id)):
        return {"success": True, "duplicate": True}
    db.add(B.ContractSeat(id=_new_id("seat"), contract_id=contract.id, account_id=member_id, created_at=now()))
    db.commit()
    return {"success": True}


@router.get("/contracts/{contract_id}/members")
def list_seats(contract_id: str, user=Depends(authenticated_user), db: DBSession = Depends(commerce_db),
               idb: DBSession = Depends(workflow_db)):
    contract = _require_manager_contract(db, user["id"], contract_id)
    rows = db.scalars(select(B.ContractSeat).where(B.ContractSeat.contract_id == contract.id)
                      .order_by(B.ContractSeat.created_at)).all()
    return {"items": [{"email": email} for email in _emails(idb, [row.account_id for row in rows])]}


@router.get("/me")
def billing_me(user=Depends(authenticated_user), db: DBSession = Depends(commerce_db)):
    return _me_payload(db, user["id"])
