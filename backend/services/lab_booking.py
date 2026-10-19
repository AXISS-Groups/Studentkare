"""A student's lab booking follows its payment (the PR #140 order payment path).

POST /lab-orders (services/clinical_api.py) holds a place on the lab's
published slot and creates two rows in one request:

- a clinical ``care_lab_orders`` row in ``PENDING_PAYMENT``, with the
  collection address and the opaque id of the order that pays for it;
- a commerce ``care_orders`` row (``purpose="lab_booking"``) priced from the
  catalogue, paid exactly like a shop order: /orders/{id}/payment, the
  provider's checkout, /payment/verify or the signed webhook, expiry by the
  ``payment_expiry`` job, refunds by a super admin.

Decision: the lab order is created PENDING_PAYMENT and released to the lab's
queue only once its order is paid. The slot is held from the moment of booking,
so nobody is charged for a time that was not held; a PENDING_PAYMENT row is
never in the lab's queue, so a lab never sees an unpaid booking.

This module is the only bridge between the two planes, and it only ever goes
clinical-side: it reads an order's payment status (never a price) and moves
the lab order. Commerce code (services/payments.py) never reads a clinical
table; the endpoints that settle, cancel or expire an order call
``release_for_orders`` afterwards on the ordinary session.

    order PAID / PARTIALLY_REFUNDED   -> lab order BOOKED (lab told, student told)
    order EXPIRED / CANCELLED / REFUNDED -> lab order UNPAID_CANCELLED, slot place given back
    order UNPAID                      -> nothing yet
"""
from __future__ import annotations

import logging
import time
import uuid

from sqlalchemy import select, update

from core import workflow_models as M
from services import ops_feed
from services import payments as P

logger = logging.getLogger("services.lab_booking")

PENDING_PAYMENT = "PENDING_PAYMENT"
# Its order expired, was cancelled or refunded before it was ever paid for: the
# lab never knew of it and never will.
UNPAID_CANCELLED = "UNPAID_CANCELLED"
#: Statuses a laboratory never sees, in its queue or anywhere else.
HIDDEN_FROM_LAB = (PENDING_PAYMENT, UNPAID_CANCELLED)
LAB_BOOKING = "lab_booking"
MAX_BATCH = 50

_RELEASE = {P.PAID, P.PARTIALLY_REFUNDED}
_DROP = {P.EXPIRED, P.CANCELLED, P.REFUNDED}


def _audit(db, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=actor_id, action=action, resource_id=resource_id,
                           created_at=time.time()))


def give_back_slot(db, slot_id: str | None) -> None:
    if slot_id:
        db.execute(update(M.AvailabilitySlot).where(M.AvailabilitySlot.id == slot_id, M.AvailabilitySlot.booked > 0)
                   .values(booked=M.AvailabilitySlot.booked - 1))


def release_settled(db, order_ids: list[str] | None = None, limit: int = MAX_BATCH) -> dict:
    """Move PENDING_PAYMENT lab orders whose order has been decided. Flushes; the caller commits.

    ``order_ids`` narrows it to those orders; None sweeps (the scheduled job).
    Each move is a compare-and-set on PENDING_PAYMENT, so a webhook racing the
    client's verify, or the job, moves a row once.
    """
    statement = (select(M.LabOrder.id, M.LabOrder.patient_id, M.LabOrder.lab_id, M.LabOrder.slot_id,
                        M.Order.payment_status)
                 .join(M.Order, M.Order.id == M.LabOrder.commerce_order_id)
                 .where(M.LabOrder.status == PENDING_PAYMENT, M.Order.payment_status != P.UNPAID))
    if order_ids is not None:
        ids = sorted({i for i in order_ids if i})
        if not ids:
            return {"summary": {"booked": 0, "released": 0}}
        statement = statement.where(M.LabOrder.commerce_order_id.in_(ids))
    rows = db.execute(statement.order_by(M.LabOrder.created_at, M.LabOrder.id).limit(limit)).all()
    booked = released = 0
    stamp = time.time()
    for lab_order_id, patient_id, lab_id, slot_id, payment_status in rows:
        if payment_status in _RELEASE:
            if not db.execute(update(M.LabOrder).where(M.LabOrder.id == lab_order_id,
                                                       M.LabOrder.status == PENDING_PAYMENT)
                              .values(status="BOOKED", updated_at=stamp)).rowcount:
                continue
            _audit(db, "system", "LAB_ORDER_BOOKED", lab_order_id)
            # The lab learns of it only now. Counts and states only (no test name).
            ops_feed.publish(db, "LAB_ORDER_BOOKED", "LAB", summary="Lab booking paid · ready to schedule collection",
                             actor_id=patient_id, actor_role="STUDENT", subject_id=patient_id,
                             provider_id=lab_id, resource_type="lab_order", resource_id=lab_order_id)
            ops_feed.notify(db, patient_id, "LAB_BOOKING_CONFIRMED", dedupe_key=f"lab:{lab_order_id}:BOOKED",
                            summary="Your lab test is booked. See it under Prescriptions & tests.",
                            resource_type="lab_order", resource_id=lab_order_id)
            booked += 1
        elif payment_status in _DROP:
            if not db.execute(update(M.LabOrder).where(M.LabOrder.id == lab_order_id,
                                                       M.LabOrder.status == PENDING_PAYMENT)
                              .values(status=UNPAID_CANCELLED, updated_at=stamp)).rowcount:
                continue
            give_back_slot(db, slot_id)
            _audit(db, "system", "LAB_BOOKING_RELEASED", lab_order_id)
            released += 1
    db.flush()
    return {"summary": {"booked": booked, "released": released}}


def release_for_orders(db, order_ids: list[str]) -> None:
    """After an endpoint settled, cancelled or expired these orders. Commits.

    The payment is already recorded by then. If this step fails the lab order
    simply stays PENDING_PAYMENT — out of the lab's queue, the safe side — and
    the ``payment_expiry`` sweep moves it on its next run.
    """
    try:
        release_settled(db, order_ids)
        db.commit()
    except Exception as exc:  # noqa: BLE001 — leaves the booking pending (hidden from the lab); the sweep retries
        db.rollback()
        logger.warning("lab booking release deferred to the sweep: %s", type(exc).__name__)


def order_id_for_provider_order(db, provider_order_id: str, payable_kind: str = "", payable_id: str = "") -> str:
    """The care_orders id a provider event is about, or ''. Reads the commerce intent table only."""
    if provider_order_id:
        found = db.scalar(select(M.PaymentIntent.payable_id).where(
            M.PaymentIntent.provider_order_id == provider_order_id, M.PaymentIntent.payable_kind == P.SHOP_ORDER))
        if found:
            return found
    return payable_id if payable_kind == P.SHOP_ORDER else ""
