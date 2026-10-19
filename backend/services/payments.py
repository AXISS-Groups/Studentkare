"""Collecting and refunding money for a payable, through whichever provider is configured.

A *payable* is anything with a server-side price, named by ``kind`` + ``id``.
Only ``shop_order`` is wired today; lab and consultation bookings plug in by
registering a ``PayableKind`` in ``PAYABLE_KINDS`` (load the amount, mark paid,
release on expiry). The flow is the same for every kind:

1. ``start_payment``: a provider order for the exact server-side amount
   (integer paise), recorded as a ``PaymentIntent``. Re-asking reuses the open
   intent, so a double tap does not make two provider orders.
2. The client pays on the provider's page (Razorpay Checkout, or the mock).
3. ``verify_client_payment``: the client's callback only *triggers* a check. The
   signature must verify, and the provider's own record of the payment (fetched,
   not taken from the client) must be captured, for this intent's order, for
   exactly its amount.
4. ``handle_webhook``: the provider's signed webhook does the same settlement
   independently and is the source of truth. Both paths go through
   ``settle_capture``, which is idempotent on the provider's payment id: a
   replay, or a webhook racing the verify, records one payment.
5. ``expire_unpaid_orders`` (scheduled job ``payment_expiry``) gives back the
   stock of orders not paid in time. A capture that lands after expiry is
   recorded and raised to ops for a refund; it never resurrects the order.
6. ``refund``: admin-only, full or partial, one row per Idempotency-Key.

Nothing here sends item names or health information to a provider (Rule L).
"""
from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from core import workflow_models as M
from services import ops_feed
from services.payment_gateway import (
    MockProvider,
    Payable,
    PaymentProvider,
    ProviderError,
    ProviderPayment,
    ProviderUnavailable,
    WebhookEvent,
    get_provider,
)

SHOP_ORDER = "shop_order"
DEFAULT_HOLD_MINUTES = 30
MAX_EXPIRY_BATCH = 50

UNAVAILABLE_MESSAGE = "Online payment isn't connected yet. Nothing was charged."
REFUND_UNAVAILABLE_MESSAGE = (
    "Refunds can't be issued from Studentkare for this payment because its provider isn't connected. "
    "Nothing was refunded; arrange it with the provider directly."
)
REFUND_FAILED_MESSAGE = "The payment provider could not issue the refund. Nothing was refunded; try again."
PROVIDER_FAILED_MESSAGE = "The payment provider could not be reached. Nothing was charged; try again."

# Order.payment_status values.
UNPAID, PAID, PARTIALLY_REFUNDED, REFUNDED, EXPIRED, CANCELLED = (
    "UNPAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "EXPIRED", "CANCELLED")
REFUNDABLE_ORDER_STATES = {PAID, PARTIALLY_REFUNDED, EXPIRED, CANCELLED}


def now() -> float:
    return time.time()


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:24]}"


def hold_seconds() -> int:
    """How long an unpaid order keeps its stock. PAYMENT_HOLD_MINUTES, default 30."""
    try:
        minutes = int(os.getenv("PAYMENT_HOLD_MINUTES", "") or DEFAULT_HOLD_MINUTES)
    except ValueError:
        minutes = DEFAULT_HOLD_MINUTES
    return max(minutes, 5) * 60


def _audit(db, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=actor_id, action=action,
                           resource_id=resource_id, created_at=now()))


# ---------------------------------------------------------------------------
# Payable kinds
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ShopOrderKind:
    """care_orders: the amount is ``total_paise``, priced by POST /orders from the catalogue."""

    kind: str = SHOP_ORDER

    def load(self, db, payable_id: str, account_id: str | None = None) -> Payable | None:
        order = db.get(M.Order, payable_id)
        if order is None or (account_id is not None and order.account_id != account_id):
            return None
        return Payable(kind=self.kind, id=order.id, account_id=order.account_id, amount_paise=order.total_paise)

    def refuse_payment(self, db, payable_id: str) -> str:
        """Why this payable cannot be paid now, or '' if it can."""
        order = db.get(M.Order, payable_id)
        if order.payment_status in (PAID, PARTIALLY_REFUNDED, REFUNDED):
            return "This order is already paid."
        if order.payment_status == EXPIRED:
            return "This order was not paid in time and has been released. Place it again."
        if order.payment_status == CANCELLED:
            return "This order was cancelled."
        if order.payment_due_at and order.payment_due_at <= now():
            return "This order was not paid in time and has been released. Place it again."
        return ""

    def expires_at(self, db, payable_id: str) -> float:
        order = db.get(M.Order, payable_id)
        return order.payment_due_at or (now() + hold_seconds())

    def mark_paid(self, db, payable_id: str) -> bool:
        """UNPAID -> PAID, atomically. False if it was not UNPAID (expired, cancelled, already paid)."""
        return bool(db.execute(update(M.Order).where(M.Order.id == payable_id, M.Order.payment_status == UNPAID)
                               .values(payment_status=PAID)).rowcount)


PAYABLE_KINDS = {SHOP_ORDER: ShopOrderKind()}


def payable_kind(kind: str) -> ShopOrderKind:
    handler = PAYABLE_KINDS.get(kind)
    if handler is None:
        raise HTTPException(422, "Unknown payable.")
    return handler


def payment_due_at_for_new_order(db) -> float:
    """Set on POST /orders: a deadline only when online payment is actually on offer."""
    try:
        get_provider(db)
    except ProviderUnavailable:
        return 0.0
    return now() + hold_seconds()


# ---------------------------------------------------------------------------
# Start, verify
# ---------------------------------------------------------------------------

def unavailable_payload(provider_name: str = "") -> dict:
    return {"configured": False, "status": "UNAVAILABLE", "provider": provider_name, "message": UNAVAILABLE_MESSAGE}


def intent_payload(intent: M.PaymentIntent, provider: PaymentProvider) -> dict:
    return {"configured": True, "status": intent.status, "intentId": intent.id, "provider": intent.provider,
            "testMode": intent.test_mode, "providerOrderId": intent.provider_order_id,
            "amountPaise": intent.amount_paise, "currency": intent.currency, "expiresAt": intent.expires_at,
            "payable": {"kind": intent.payable_kind, "id": intent.payable_id},
            "checkout": provider.client_options()}


def start_payment(db, payable: Payable) -> dict:
    """Open (or reuse) a provider order for ``payable``. Commits."""
    handler = payable_kind(payable.kind)
    refusal = handler.refuse_payment(db, payable.id)
    if refusal:
        raise HTTPException(409, refusal)
    try:
        provider = get_provider(db)
    except ProviderUnavailable:
        return unavailable_payload()
    open_intent = db.scalar(select(M.PaymentIntent).where(
        M.PaymentIntent.payable_kind == payable.kind, M.PaymentIntent.payable_id == payable.id,
        M.PaymentIntent.status == "CREATED", M.PaymentIntent.provider == provider.name,
        M.PaymentIntent.amount_paise == payable.amount_paise, M.PaymentIntent.expires_at > now(),
    ).order_by(M.PaymentIntent.created_at.desc()))
    if open_intent is not None:
        return intent_payload(open_intent, provider)
    intent_id = _id("pi")
    try:
        order = provider.create_order(payable, receipt=intent_id)
    except ProviderError:
        raise HTTPException(502, PROVIDER_FAILED_MESSAGE)
    stamp = now()
    intent = M.PaymentIntent(
        id=intent_id, payable_kind=payable.kind, payable_id=payable.id, account_id=payable.account_id,
        amount_paise=order.amount_paise, currency=order.currency, provider=provider.name,
        provider_order_id=order.provider_order_id, test_mode=provider.test_mode, status="CREATED",
        expires_at=handler.expires_at(db, payable.id), created_at=stamp, updated_at=stamp)
    db.add(intent)
    _audit(db, payable.account_id, "PAYMENT_STARTED", payable.id)
    db.commit()
    return intent_payload(intent, provider)


def _intent_for(db, payable: Payable, provider_order_id: str) -> M.PaymentIntent:
    intent = db.scalar(select(M.PaymentIntent).where(M.PaymentIntent.provider_order_id == provider_order_id))
    if intent is None or intent.payable_kind != payable.kind or intent.payable_id != payable.id:
        raise HTTPException(404, "Payment not found.")
    return intent


def mock_checkout(db, payable: Payable, provider_order_id: str, card_number: str) -> dict:
    """The mock's payment page. Only when the mock is the provider that opened this intent."""
    intent = _intent_for(db, payable, provider_order_id)
    try:
        provider = get_provider(db, intent.provider)
    except ProviderUnavailable:
        raise HTTPException(404, "Payment not found.")
    if not isinstance(provider, MockProvider) or intent.status != "CREATED":
        raise HTTPException(409, "This payment can't be completed here.")
    try:
        payment, signature = provider.checkout(intent.provider_order_id, intent.amount_paise, intent.currency, card_number)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    db.commit()
    return {"providerOrderId": payment.provider_order_id, "providerPaymentId": payment.provider_payment_id,
            "signature": signature, "outcome": payment.status, "errorCode": payment.error_code, "testMode": True}


def verify_client_payment(db, payable: Payable, provider_order_id: str, provider_payment_id: str, signature: str) -> dict:
    """The client says it paid: check the signature, then ask the provider. Commits."""
    intent = _intent_for(db, payable, provider_order_id)
    try:
        provider = get_provider(db, intent.provider)
    except ProviderUnavailable:
        raise HTTPException(503, UNAVAILABLE_MESSAGE)
    if not provider.verify_payment_signature(intent.provider_order_id, provider_payment_id, signature):
        _audit(db, payable.account_id, "PAYMENT_SIGNATURE_REJECTED", payable.id)
        db.commit()
        raise HTTPException(400, "Payment verification failed. Nothing was marked paid.")
    try:
        payment = provider.fetch_payment(provider_payment_id)
    except ProviderError:
        raise HTTPException(502, "The payment provider could not confirm this payment yet. Don't pay again; check the order shortly.")
    if payment.provider_order_id != intent.provider_order_id:
        _audit(db, payable.account_id, "PAYMENT_ORDER_MISMATCH", payable.id)
        db.commit()
        raise HTTPException(409, "That payment belongs to a different order.")
    outcome = apply_provider_payment(db, provider.name, payment)
    return {"outcome": outcome, **payment_status_payload(db, payable)}


def apply_provider_payment(db, provider_name: str, payment: ProviderPayment) -> str:
    """A provider's record of a payment, applied. Returns PAID, DUPLICATE, LATE, FAILED or PENDING."""
    if payment.status == "captured":
        return settle_capture(db, provider_name, payment.provider_payment_id, payment.provider_order_id,
                              payment.amount_paise)
    if payment.status == "failed":
        record_failure(db, provider_name, payment.provider_payment_id, payment.provider_order_id,
                       payment.amount_paise, payment.error_code)
        return "FAILED"
    # authorized / pending: Razorpay captures automatically; the webhook settles it.
    return "PENDING"


def _resolve(db, provider_order_id: str, payable_kind_name: str, payable_id: str) -> tuple[M.PaymentIntent | None, str, str]:
    intent = None
    if provider_order_id:
        intent = db.scalar(select(M.PaymentIntent).where(M.PaymentIntent.provider_order_id == provider_order_id))
    if intent is not None:
        return intent, intent.payable_kind, intent.payable_id
    return None, payable_kind_name, payable_id


def settle_capture(db, provider_name: str, provider_payment_id: str, provider_order_id: str, amount: object,
                   *, payable_kind_name: str = "", payable_id: str = "") -> str:
    """Record a captured payment exactly once and mark its payable paid. Commits.

    The amount must be an int equal to the intent's amount and the payable's
    current total. Anything else is refused (409) and left for a person: never
    rounded into PAID, never recorded as a payment.
    """
    provider_payment_id = (provider_payment_id or "").strip()
    if not provider_payment_id:
        raise HTTPException(422, "A settled payment needs the provider's reference.")
    existing = db.scalar(select(M.Payment).where(M.Payment.idempotency_key == provider_payment_id))
    if existing is not None and existing.status == "CAPTURED":
        return "DUPLICATE"
    intent, kind, pid = _resolve(db, provider_order_id, payable_kind_name, payable_id)
    if kind != SHOP_ORDER or not pid:
        raise HTTPException(404, "Order not found.")
    order = db.get(M.Order, pid)
    if order is None:
        raise HTTPException(404, "Order not found.")
    expected = intent.amount_paise if intent is not None else order.total_paise
    if type(amount) is not int or amount != expected or amount != order.total_paise:
        _audit(db, "system", "PAYMENT_AMOUNT_MISMATCH", order.id)
        ops_feed.publish(db, "PAYMENT_AMOUNT_MISMATCH", "MARKETPLACE", severity="CRITICAL",
                         summary="A provider reported a payment that does not match the order total",
                         subject_id=order.account_id, resource_type="order", resource_id=order.id)
        db.commit()
        raise HTTPException(409, "The settled amount does not match the order total.")
    stamp = now()
    if existing is None:
        existing = M.Payment(id=str(uuid.uuid4()), order_id=order.id, idempotency_key=provider_payment_id,
                             provider_ref=provider_payment_id, created_at=stamp)
        db.add(existing)
    existing.amount_paise = amount
    existing.status = "CAPTURED"
    existing.provider = provider_name
    existing.intent_id = intent.id if intent is not None else ""
    existing.failure_code = ""
    existing.settled_at = stamp
    if intent is not None:
        intent.status = "PAID"
        intent.updated_at = stamp
    outcome = "PAID" if PAYABLE_KINDS[SHOP_ORDER].mark_paid(db, order.id) else "LATE"
    if outcome == "PAID":
        _audit(db, "system", "PAYMENT_SETTLED", order.id)
        ops_feed.publish(db, "ORDER_PAID", "MARKETPLACE",
                         summary=f"Order paid · ₹{amount / 100:.2f}" + (" · test payment" if provider_name == "mock" else ""),
                         subject_id=order.account_id, resource_type="order", resource_id=order.id)
    else:
        # Expired, cancelled or already paid by another payment: the money is
        # real, the order is not. A person refunds it (POST /v1/orders/{id}/refund).
        _audit(db, "system", "PAYMENT_CAPTURED_LATE", order.id)
        ops_feed.publish(db, "PAYMENT_NEEDS_REFUND", "MARKETPLACE", severity="ATTENTION",
                         summary=f"Payment captured for an order that is {order.payment_status.lower()} · refund it",
                         subject_id=order.account_id, resource_type="order", resource_id=order.id)
    try:
        db.commit()
    except IntegrityError:
        # The webhook and the client's verify raced on the same payment id.
        db.rollback()
        return "DUPLICATE"
    return outcome


def record_failure(db, provider_name: str, provider_payment_id: str, provider_order_id: str, amount: object,
                   error_code: str, *, payable_kind_name: str = "", payable_id: str = "") -> None:
    """A declined attempt, recorded once. The intent stays open so the student can retry. Commits."""
    provider_payment_id = (provider_payment_id or "").strip()
    if not provider_payment_id:
        raise HTTPException(422, "A payment event needs the provider's reference.")
    if db.scalar(select(M.Payment.id).where(M.Payment.idempotency_key == provider_payment_id)):
        return
    intent, kind, pid = _resolve(db, provider_order_id, payable_kind_name, payable_id)
    order = db.get(M.Order, pid) if kind == SHOP_ORDER and pid else None
    if order is None:
        raise HTTPException(404, "Order not found.")
    db.add(M.Payment(id=str(uuid.uuid4()), order_id=order.id, amount_paise=amount if type(amount) is int else 0,
                     status="FAILED", provider=provider_name, provider_ref=provider_payment_id,
                     idempotency_key=provider_payment_id, intent_id=intent.id if intent is not None else "",
                     failure_code=(error_code or "")[:40], created_at=now()))
    _audit(db, "system", "PAYMENT_FAILED", order.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


def handle_webhook(db, provider: PaymentProvider, event: WebhookEvent) -> dict:
    """A signature-verified provider event. Idempotent; commits."""
    if event.kind == "captured":
        outcome = settle_capture(db, provider.name, event.provider_payment_id, event.provider_order_id,
                                 event.amount_paise, payable_kind_name=event.payable_kind, payable_id=event.payable_id)
        return {"success": True, "outcome": outcome}
    if event.kind == "failed":
        record_failure(db, provider.name, event.provider_payment_id, event.provider_order_id, event.amount_paise,
                       event.error_code, payable_kind_name=event.payable_kind, payable_id=event.payable_id)
        return {"success": True, "outcome": "FAILED"}
    if event.kind == "refunded" and event.provider_refund_id:
        row = db.scalar(select(M.Refund).where(M.Refund.provider_refund_id == event.provider_refund_id))
        if row is not None and row.status in ("PENDING", "REQUESTED"):
            _finish_refund(db, row, "PROCESSED" if event.refund_status == "processed" else "FAILED")
            db.commit()
        return {"success": True, "outcome": "REFUND_SYNCED"}
    return {"success": True, "outcome": "IGNORED"}


def payment_status_payload(db, payable: Payable) -> dict:
    order = db.get(M.Order, payable.id)
    payments = db.scalars(select(M.Payment).where(M.Payment.order_id == payable.id).order_by(M.Payment.created_at)).all()
    intent = db.scalar(select(M.PaymentIntent).where(M.PaymentIntent.payable_kind == payable.kind,
                                                     M.PaymentIntent.payable_id == payable.id)
                       .order_by(M.PaymentIntent.created_at.desc()))
    return {"paymentStatus": order.payment_status, "provider": intent.provider if intent else "",
            "testMode": bool(intent.test_mode) if intent else False,
            "amountPaise": payable.amount_paise, "paymentDueAt": order.payment_due_at or None,
            "payments": [{"status": p.status, "amountPaise": p.amount_paise, "providerRef": p.provider_ref,
                          "refundedPaise": p.refunded_paise, "failureCode": p.failure_code or None,
                          "settledAt": p.settled_at or None} for p in payments]}


# ---------------------------------------------------------------------------
# Expiry (scheduled job "payment_expiry")
# ---------------------------------------------------------------------------

def expire_unpaid_orders(db, at: float | None = None, limit: int = MAX_EXPIRY_BATCH) -> dict:
    """Release the stock of orders whose payment deadline passed. Flushes; the runner commits."""
    at = now() if at is None else at
    due = db.scalars(select(M.Order).where(
        M.Order.payment_status == UNPAID, M.Order.payment_due_at > 0, M.Order.payment_due_at <= at,
    ).order_by(M.Order.payment_due_at, M.Order.id).limit(limit)).all()
    expired = blocked = 0
    for order in due:
        lines = db.scalars(select(M.OrderLine).where(M.OrderLine.order_id == order.id)).all()
        if any(line.status not in ("REQUESTED", "CANCELLED") for line in lines):
            blocked += 1   # a provider already acted on it: a person decides
            continue
        if not db.execute(update(M.Order).where(M.Order.id == order.id, M.Order.payment_status == UNPAID)
                          .values(payment_status=EXPIRED)).rowcount:
            continue   # paid a moment ago
        for line in lines:
            if line.status != "REQUESTED":
                continue
            db.execute(update(M.OrderLine).where(M.OrderLine.id == line.id, M.OrderLine.status == "REQUESTED")
                       .values(status="CANCELLED"))
            if line.kind == "product":
                db.execute(update(M.CatalogEntry).where(M.CatalogEntry.id == line.item_id)
                           .values(stock=M.CatalogEntry.stock + line.quantity))
        db.execute(update(M.PaymentIntent).where(M.PaymentIntent.payable_kind == SHOP_ORDER,
                                                 M.PaymentIntent.payable_id == order.id,
                                                 M.PaymentIntent.status == "CREATED")
                   .values(status="EXPIRED", updated_at=at))
        _audit(db, "system", "ORDER_PAYMENT_EXPIRED", order.id)
        ops_feed.publish(db, "ORDER_PAYMENT_EXPIRED", "MARKETPLACE",
                         summary="Unpaid order released its stock", subject_id=order.account_id,
                         resource_type="order", resource_id=order.id)
        expired += 1
    db.flush()
    return {"summary": {"due": len(due), "expired": expired, "needs_review": blocked}}


def cancel_open_intents(db, kind: str, payable_id: str) -> None:
    db.execute(update(M.PaymentIntent).where(M.PaymentIntent.payable_kind == kind,
                                             M.PaymentIntent.payable_id == payable_id,
                                             M.PaymentIntent.status == "CREATED")
               .values(status="CANCELLED", updated_at=now()))


# ---------------------------------------------------------------------------
# Refunds
# ---------------------------------------------------------------------------

def refund_payload(row: M.Refund, duplicate: bool = False) -> dict:
    return {"refundId": row.id, "status": row.status, "amountPaise": row.amount_paise,
            "provider": row.provider, "providerRefundId": row.provider_refund_id or None,
            "duplicate": duplicate}


def _order_refund_status(db, order: M.Order) -> None:
    captured = db.scalars(select(M.Payment).where(M.Payment.order_id == order.id, M.Payment.status == "CAPTURED")).all()
    paid = sum(p.amount_paise for p in captured)
    refunded = sum(p.refunded_paise for p in captured)
    if order.payment_status not in (PAID, PARTIALLY_REFUNDED, REFUNDED):
        return   # a late capture on an expired/cancelled order keeps that state
    order.payment_status = REFUNDED if paid and refunded >= paid else (PARTIALLY_REFUNDED if refunded else PAID)


def _finish_refund(db, row: M.Refund, status: str) -> None:
    payment = db.get(M.Payment, row.payment_id)
    if status == "FAILED" and row.status != "FAILED":
        payment.refunded_paise = max(payment.refunded_paise - row.amount_paise, 0)
    row.status = status
    row.updated_at = now()
    _order_refund_status(db, db.get(M.Order, payment.order_id))


def refund(db, order_id: str, provider_payment_id: str, amount_paise: int, reason: str,
           idempotency_key: str, actor: dict) -> tuple[dict, bool]:
    """Refund part or all of a captured payment through the provider that took it.

    Returns (payload, newly_refunded). Commits. The amount reserved on the
    payment before the provider is called, so two concurrent refunds cannot
    together exceed what was captured.
    """
    replay = db.scalar(select(M.Refund).where(M.Refund.idempotency_key == idempotency_key))
    if replay is not None:
        payment = db.get(M.Payment, replay.payment_id)
        if replay.payable_id != order_id or payment.provider_ref != provider_payment_id or replay.amount_paise != amount_paise:
            raise HTTPException(409, "This Idempotency-Key was already used for a different refund.")
        return refund_payload(replay, duplicate=True), False
    order = db.get(M.Order, order_id)
    if order is None:
        raise HTTPException(404, "Order not found.")
    if order.payment_status not in REFUNDABLE_ORDER_STATES:
        raise HTTPException(409, "Only a paid order can be refunded.")
    payment = db.scalar(select(M.Payment).where(M.Payment.order_id == order_id,
                                                M.Payment.provider_ref == provider_payment_id))
    if payment is None:
        raise HTTPException(422, "That payment does not belong to this order.")
    if payment.status != "CAPTURED":
        raise HTTPException(409, "Only a captured payment can be refunded.")
    if amount_paise > payment.amount_paise - payment.refunded_paise:
        raise HTTPException(422, "A refund cannot exceed what was paid for the order.")
    try:
        provider = get_provider(db, payment.provider)
    except ProviderUnavailable:
        _audit(db, actor["id"], "ORDER_REFUND_UNAVAILABLE", order_id)
        # Ops sees the attempt; the student is told nothing, because nothing happened.
        ops_feed.publish(db, "ORDER_REFUND_UNAVAILABLE", "MARKETPLACE", severity="ATTENTION",
                         summary="Refund requested but not issued — the payment's provider is not connected",
                         actor_id=actor["id"], actor_role=actor.get("role", ""), subject_id=order.account_id,
                         resource_type="order", resource_id=order_id)
        db.commit()
        raise HTTPException(503, REFUND_UNAVAILABLE_MESSAGE)
    stamp = now()
    row = M.Refund(id=_id("rf"), payment_id=payment.id, payable_kind=SHOP_ORDER, payable_id=order_id,
                   amount_paise=amount_paise, provider=provider.name, status="REQUESTED",
                   idempotency_key=idempotency_key, reason=reason[:300], requested_by=actor["id"],
                   created_at=stamp, updated_at=stamp)
    db.add(row)
    # Reserve the amount atomically against concurrent refunds of the same payment.
    reserved = db.execute(update(M.Payment).where(
        M.Payment.id == payment.id, M.Payment.refunded_paise + amount_paise <= M.Payment.amount_paise,
    ).values(refunded_paise=M.Payment.refunded_paise + amount_paise)).rowcount
    if not reserved:
        db.rollback()
        raise HTTPException(422, "A refund cannot exceed what was paid for the order.")
    try:
        db.commit()   # the request exists before any money moves
    except IntegrityError:
        db.rollback()
        replay = db.scalar(select(M.Refund).where(M.Refund.idempotency_key == idempotency_key))
        if replay is None:
            raise HTTPException(409, "The refund could not be recorded. Try again.")
        return refund_payload(replay, duplicate=True), False
    try:
        result = provider.refund(payment.provider_ref, amount_paise, receipt=row.id)
    except ProviderError:
        db.rollback()
        row = db.get(M.Refund, row.id)
        _finish_refund(db, row, "FAILED")
        _audit(db, actor["id"], "ORDER_REFUND_FAILED", order_id)
        db.commit()
        raise HTTPException(502, REFUND_FAILED_MESSAGE)
    row.provider_refund_id = result.provider_refund_id
    _finish_refund(db, row, {"processed": "PROCESSED", "pending": "PENDING"}.get(result.status, "FAILED"))
    if row.status == "FAILED":
        _audit(db, actor["id"], "ORDER_REFUND_FAILED", order_id)
        db.commit()
        raise HTTPException(502, REFUND_FAILED_MESSAGE)
    _audit(db, actor["id"], "ORDER_REFUNDED", order_id)
    ops_feed.publish(db, "ORDER_REFUNDED", "MARKETPLACE", severity="ATTENTION",
                     summary=f"Refund {row.status.lower()} · ₹{amount_paise / 100:.2f}",
                     actor_id=actor["id"], actor_role=actor.get("role", ""), subject_id=order.account_id,
                     resource_type="order", resource_id=order_id)
    db.commit()
    return refund_payload(row), True
