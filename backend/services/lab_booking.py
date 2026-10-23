"""
services.lab_booking — a student books a lab test from the shop, pays, and a lab collector picks it up.

Endpoint groups:
  /lab-packages, /lab-packages/{id}/slots       bookable tests with their breakdown, and open times
  /lab-bookings, /lab-bookings/{id}             book (slot + address), read one booking
  /lab-orders/{id}/payment[...]                 pay through services/payments.py (payable kind lab_order)
  /work/lab-collectors                          a lab adds and retires its own collectors
  /collector/pickups[...]                       a collector's own pickups: collected, handed to lab

How a self-booked test moves:

1. ``POST /lab-bookings`` creates a clinical lab order (BOOKED, ordered by the
   student, home collection at a hostel room or a home address), reserves the
   chosen slot through the same rule as ``PUT /lab-orders/{id}/slot``, and a
   commerce charge (care_lab_order_charges) for the catalogue price, UNPAID,
   held for PAYMENT_HOLD_MINUTES. A hostel address also makes the hostel
   pickup (care_hostel_visit_requests), already the lab's.
2. The student pays (payable ``lab_order``). Settling touches the charge only.
3. Until the charge is paid the order is not in the lab's queue, the lab
   cannot act on it, and its hostel pickup is not shown to the lab
   (clinical_api.lab_may_see_clause). ``payment_expiry`` cancels a booking not
   paid in time and gives its slot back.
4. The lab assigns one of its own collectors (``PATCH /lab-orders/{id}``,
   ``collectorId``). The collector marks the sample collected (tube count,
   time) and handed to the lab (IN_TRANSIT); the lab confirms receipt.
5. Results follow the existing rule: the lab files the report, it is held,
   and only a reviewing doctor releases it. A self-booked test has no
   ordering doctor, so a doctor already caring for the student may pick it
   up, or a super admin assigns one from /work/lab-reviews (seeing test names
   and waiting time only). Nothing is released without that review, and no
   admin or collector ever reads a result.

Rule L: payment code reads commerce rows only. The provider is told "booking",
never "lab". No test name, address or anything clinical goes to a provider or
into a commerce row beyond the opaque lab order id.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import Field, field_validator, model_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import clinical_api as C
from services import clinical_fulfilment as F
from services import ops_feed, payments
from services.commerce_session import commerce_db
from services.payment_gateway import ProviderUnavailable, get_provider
from services.workflow_auth import (
    StrictModel,
    authenticated_user,
    normalize_identifier,
    require_staff,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Lab bookings"])

# The routes here that run as sk_commerce (Rule L): paying for a booking reads
# and settles the commerce charge only. Everything else stays on the app session.
COMMERCE_PATHS = (
    "POST /api/lab-orders/{order_id}/payment", "GET /api/lab-orders/{order_id}/payment",
    "POST /api/lab-orders/{order_id}/payment/verify", "POST /api/lab-orders/{order_id}/payment/mock-checkout",
)

COLLECTOR_ROLE = "LAB_COLLECTOR"
# A test that needs fasting is collected in the morning: only slots that start
# before this hour (in the slot's own time zone) are offered for it.
FASTING_LAST_START_HOUR = 11
MAX_TUBES = 12
ACTIVE_PICKUP_STATES = ("ASSIGNED", "SAMPLE_COLLECTED", "IN_TRANSIT")


def _id() -> str:
    return uuid.uuid4().hex


def _now() -> float:
    return time.time()


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=_now()))


# ── Packages ─────────────────────────────────────────────────────────────────

def _labs_for(db: Session, items) -> dict[str, M.ServiceProvider]:
    """The active laboratory each catalogue item's provider runs (first by id), keyed by provider account."""
    accounts = {i.provider_id for i in items}
    if not accounts:
        return {}
    labs: dict[str, M.ServiceProvider] = {}
    for lab in db.scalars(select(M.ServiceProvider).where(
            M.ServiceProvider.account_id.in_(accounts), M.ServiceProvider.kind == "LAB",
            M.ServiceProvider.active.is_(True)).order_by(M.ServiceProvider.id)).all():
        labs.setdefault(lab.account_id, lab)
    return labs


def _package_payload(item: M.CatalogEntry, lab: M.ServiceProvider) -> dict:
    """What a student sees before booking: names and prices, never a value or a range."""
    return {"id": item.id, "name": item.name, "pack": item.pack, "description": item.description,
            "pricePaise": item.price_paise, "mrpPaise": item.mrp_paise,
            "includes": [str(name) for name in (item.includes or [])][:120],
            "fastingHours": item.fasting_hours or 0, "reportHours": item.report_hours or 0,
            "preparation": item.preparation,
            "lab": {"id": lab.id, "name": lab.legal_name, "accreditation": lab.accreditation,
                    "homeCollection": lab.home_collection}}


@router.get("/lab-packages")
def lab_packages(db: Session = Depends(workflow_db)):
    """Lab tests and packages a student can book now, each with the tests it includes."""
    items = db.scalars(select(M.CatalogEntry).join(M.Account, M.Account.id == M.CatalogEntry.provider_id).where(
        M.CatalogEntry.kind == "lab", M.CatalogEntry.active.is_(True), M.CatalogEntry.price_paise > 0,
        M.Account.active.is_(True)).order_by(M.CatalogEntry.name, M.CatalogEntry.id)).all()
    labs = _labs_for(db, items)
    packages = [_package_payload(i, labs[i.provider_id]) for i in items
                if i.provider_id in labs and labs[i.provider_id].home_collection]
    return {"items": packages, "total": len(packages)}


def _bookable(db: Session, item_id: str) -> tuple[M.CatalogEntry, M.ServiceProvider]:
    item = db.get(M.CatalogEntry, item_id)
    if not item or item.kind != "lab" or not item.active:
        raise HTTPException(404, "No such test in the catalogue.")
    lab = _labs_for(db, [item]).get(item.provider_id)
    if lab is None:
        raise HTTPException(409, "No laboratory is taking bookings for this test yet.")
    if not lab.home_collection:
        raise HTTPException(409, "This laboratory does not collect samples at your hostel or home.")
    if item.price_paise <= 0:
        raise HTTPException(409, "This test can't be booked online yet.")
    return item, lab


def _offered(slot: M.AvailabilitySlot, item: M.CatalogEntry, now: float) -> bool:
    start = F.parse_slot(slot.slot_start)
    if start is None or start <= now or slot.booked >= slot.capacity:
        return False
    if item.fasting_hours:
        try:
            hour = datetime.fromisoformat(slot.slot_start.replace("Z", "+00:00")).hour
        except ValueError:
            return False
        return hour < FASTING_LAST_START_HOUR
    return True


def _package_slots(db: Session, item: M.CatalogEntry) -> list[M.AvailabilitySlot]:
    now = _now()
    rows = db.scalars(select(M.AvailabilitySlot).where(
        M.AvailabilitySlot.catalog_item_id == item.id, M.AvailabilitySlot.provider_id == item.provider_id,
        M.AvailabilitySlot.active.is_(True)).order_by(M.AvailabilitySlot.slot_start, M.AvailabilitySlot.id)).all()
    return [s for s in rows if _offered(s, item, now)]


@router.get("/lab-packages/{item_id}/slots")
def lab_package_slots(item_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Open collection times for a test. A fasting test is offered morning times only."""
    item, _lab = _bookable(db, item_id)
    return {"fastingHours": item.fasting_hours or 0,
            "slots": [{"id": s.id, "slotStart": s.slot_start, "slotEnd": s.slot_end,
                       "available": max(0, s.capacity - s.booked)} for s in _package_slots(db, item)]}


# ── Booking ──────────────────────────────────────────────────────────────────

class AddressInput(StrictModel):
    kind: Literal["HOSTEL", "HOME"]
    hostelBlock: str = Field(default="", max_length=80)
    room: str = Field(default="", max_length=40)
    line: str = Field(default="", max_length=300)
    city: str = Field(default="", max_length=100)
    pincode: str = Field(default="", max_length=6)
    landmark: str = Field(default="", max_length=120)

    @model_validator(mode="after")
    def complete(self):
        if self.kind == "HOSTEL":
            if not self.hostelBlock.strip() or not self.room.strip():
                raise ValueError("Enter your hostel block and room.")
        else:
            if len(self.line.strip()) < 10 or len(self.city.strip()) < 2:
                raise ValueError("Enter the full address where the sample is collected.")
            if not (len(self.pincode) == 6 and self.pincode.isdigit() and self.pincode[0] != "0"):
                raise ValueError("Enter a 6-digit pincode.")
        return self

    def stored(self) -> dict:
        if self.kind == "HOSTEL":
            return {"kind": "HOSTEL", "hostelBlock": self.hostelBlock.strip(), "room": self.room.strip()}
        return {"kind": "HOME", "line": self.line.strip(), "city": self.city.strip(), "pincode": self.pincode,
                "landmark": self.landmark.strip()}


class LabBookingInput(StrictModel):
    catalogItemId: str = Field(min_length=1, max_length=80)
    slotId: str = Field(min_length=1, max_length=80)
    address: AddressInput


def _booking_payload(db: Session, row: M.LabOrder) -> dict:
    """The student's own booking: the order, what it costs, and who collects it. No result fields."""
    charge = db.get(M.LabOrderCharge, row.id)
    lab = db.get(M.ServiceProvider, row.lab_id)
    item = db.get(M.CatalogEntry, row.catalog_item_id) if row.catalog_item_id else None
    slot = db.get(M.AvailabilitySlot, row.slot_id) if row.slot_id else None
    return {"order": C._student_lab_payload(db, row),
            "booking": {"labName": lab.legal_name if lab else "", "accreditation": lab.accreditation if lab else "",
                        "packageName": item.name if item else ", ".join(row.test_panel or []),
                        "includes": list(item.includes or []) if item else [],
                        "fastingHours": item.fasting_hours if item else 0,
                        "reportHours": item.report_hours if item else 0,
                        "slotEnd": slot.slot_end if slot else "",
                        "amountPaise": charge.amount_paise if charge else None,
                        "paymentStatus": charge.payment_status if charge else None,
                        "paymentDueAt": (charge.payment_due_at or None) if charge else None}}


@router.post("/lab-bookings", status_code=201)
def book_lab_test(body: LabBookingInput, idempotency_key: str = Header(..., min_length=8, max_length=80),
                  user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Book a catalogue test for yourself: a slot, where to collect, and the server's price to pay.

    Nothing reaches the lab until it is paid. Replaying the same Idempotency-Key
    returns the same booking; a different test under that key is a 409.
    """
    if user["role"] != "STUDENT":
        raise HTTPException(403, "Only a student account can book a test for themselves.")
    replay = db.scalar(select(M.LabOrderCharge).where(M.LabOrderCharge.account_id == user["id"],
                                                      M.LabOrderCharge.idempotency_key == idempotency_key))
    if replay is not None:
        if replay.catalog_item_id != body.catalogItemId:
            raise HTTPException(409, "This request key was already used for a different test.")
        return _booking_payload(db, db.get(M.LabOrder, replay.lab_order_id))

    item, lab = _bookable(db, body.catalogItemId)
    if body.slotId not in {s.id for s in _package_slots(db, item)}:
        raise HTTPException(409, "That time isn't available for this test. Choose another.")
    try:
        get_provider(db)
    except ProviderUnavailable:
        # A booking that can never be paid would never reach the lab: don't make one.
        raise HTTPException(503, "Online payment isn't connected yet, so tests can't be booked here. Nothing was booked.")

    now = _now()
    address = body.address.stored()
    row = M.LabOrder(
        id=_id(), prescription_id="", patient_id=user["id"], lab_id=lab.id, catalog_item_id=item.id,
        ordered_by=user["id"], test_panel=[item.name], clinical_indication="", collection_mode="HOME",
        collection_address=address, slot_start="", fasting_required=bool(item.fasting_hours),
        status=F.LAB_START, created_at=now, updated_at=now,
    )
    db.add(row)
    db.flush()
    C.reserve_lab_slot(db, row, body.slotId)   # 404/409 and a rollback if the time just went
    db.add(M.LabOrderCharge(lab_order_id=row.id, account_id=user["id"], catalog_item_id=item.id, lab_id=lab.id,
                            amount_paise=item.price_paise, payment_status=payments.UNPAID,
                            payment_due_at=now + payments.hold_seconds(), idempotency_key=idempotency_key,
                            created_at=now, updated_at=now))
    if address["kind"] == "HOSTEL":
        window = C.slot_window(db, row.slot_id) or (now, now + 3600)
        db.add(M.HostelVisitRequest(
            id=_id(), account_id=user["id"], service="LAB_PICKUP", hostel_block=address["hostelBlock"],
            room=address["room"], window_start=window[0], window_end=window[1], note="",
            status="ASSIGNED", assigned_provider_id=lab.account_id, lab_order_id=row.id,
            created_at=now, updated_at=now))
    _audit(db, user["id"], "LAB_ORDER_SELF_BOOKED", row.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()   # the same key raced itself
        replay = db.scalar(select(M.LabOrderCharge).where(M.LabOrderCharge.account_id == user["id"],
                                                          M.LabOrderCharge.idempotency_key == idempotency_key))
        if replay is None or replay.catalog_item_id != body.catalogItemId:
            raise HTTPException(409, "The booking could not be saved. Refresh and try again.")
        return _booking_payload(db, db.get(M.LabOrder, replay.lab_order_id))
    db.refresh(row)
    return _booking_payload(db, row)


def _own_self_booking(db: Session, user: dict, order_id: str) -> M.LabOrder:
    row = db.get(M.LabOrder, order_id)
    if row is None or row.patient_id != user["id"] or db.get(M.LabOrderCharge, order_id) is None:
        raise HTTPException(404, "Booking not found.")
    return row


@router.get("/lab-bookings/{order_id}")
def lab_booking(order_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return _booking_payload(db, _own_self_booking(db, user, order_id))


# ── Paying (commerce plane: reads and settles care_lab_order_charges only) ──

def _own_lab_payable(db: Session, order_id: str, user: dict):
    payable = payments.PAYABLE_KINDS[payments.LAB_ORDER].load(db, order_id, account_id=user["id"])
    if payable is None:
        raise HTTPException(404, "Booking not found.")
    return payable


class PaymentVerifyInput(StrictModel):
    providerOrderId: str = Field(min_length=1, max_length=120)
    providerPaymentId: str = Field(min_length=1, max_length=120)
    signature: str = Field(min_length=1, max_length=256)


class MockCheckoutInput(StrictModel):
    providerOrderId: str = Field(min_length=1, max_length=120)
    cardNumber: str = Field(min_length=12, max_length=23)


@router.post("/lab-orders/{order_id}/payment")
def start_lab_payment(order_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db),
                      idempotency_key: str = Header("", max_length=80)):
    return payments.start_payment(db, _own_lab_payable(db, order_id, user), idempotency_key)


@router.get("/lab-orders/{order_id}/payment")
def lab_payment_status(order_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    return payments.payment_status_payload(db, _own_lab_payable(db, order_id, user))


@router.post("/lab-orders/{order_id}/payment/verify")
def verify_lab_payment(order_id: str, body: PaymentVerifyInput, user=Depends(authenticated_user),
                       db: Session = Depends(commerce_db)):
    return payments.verify_client_payment(db, _own_lab_payable(db, order_id, user), body.providerOrderId,
                                          body.providerPaymentId, body.signature)


@router.post("/lab-orders/{order_id}/payment/mock-checkout")
def mock_lab_checkout(order_id: str, body: MockCheckoutInput, user=Depends(authenticated_user),
                      db: Session = Depends(commerce_db)):
    return payments.mock_checkout(db, _own_lab_payable(db, order_id, user), body.providerOrderId, body.cardNumber)


# ── Expiry (scheduled job payment_expiry) ────────────────────────────────────

def expire_unpaid_lab_bookings(db: Session, at: float | None = None, limit: int = payments.MAX_EXPIRY_BATCH) -> dict:
    """Cancel self-booked tests not paid by their deadline and give their slots back. Flushes; the runner commits.

    Runs on the app session (it touches the commerce charge and the clinical
    order together). An order the lab somehow already moved is left for a person.
    """
    at = _now() if at is None else at
    due = db.scalars(select(M.LabOrderCharge).where(
        M.LabOrderCharge.payment_status == payments.UNPAID, M.LabOrderCharge.payment_due_at > 0,
        M.LabOrderCharge.payment_due_at <= at,
    ).order_by(M.LabOrderCharge.payment_due_at, M.LabOrderCharge.lab_order_id).limit(limit)).all()
    expired = blocked = 0
    for charge in due:
        row = db.get(M.LabOrder, charge.lab_order_id)
        if row is not None and row.status not in (F.LAB_START, "CANCELLED"):
            blocked += 1
            continue
        if not db.execute(update(M.LabOrderCharge).where(
                M.LabOrderCharge.lab_order_id == charge.lab_order_id,
                M.LabOrderCharge.payment_status == payments.UNPAID).values(
                payment_status=payments.EXPIRED, updated_at=at)).rowcount:
            continue   # paid a moment ago
        db.execute(update(M.PaymentIntent).where(M.PaymentIntent.payable_kind == payments.LAB_ORDER,
                                                 M.PaymentIntent.payable_id == charge.lab_order_id,
                                                 M.PaymentIntent.status == "CREATED")
                   .values(status="EXPIRED", updated_at=at))
        if row is not None and row.status == F.LAB_START:
            C.release_lab_slot(db, row)
            row.status, row.updated_at = "CANCELLED", at
            C.sync_hostel_visit(db, row)
            ops_feed.notify(db, row.patient_id, "LAB_BOOKING_EXPIRED", dedupe_key=f"lab:{row.id}:EXPIRED",
                            summary="Your lab booking wasn't paid in time, so its collection slot was released.",
                            resource_type="lab_order", resource_id=row.id)
        _audit(db, "system", "LAB_BOOKING_PAYMENT_EXPIRED", charge.lab_order_id)
        ops_feed.publish(db, "LAB_BOOKING_EXPIRED", "MARKETPLACE",
                         summary="Unpaid lab booking released its slot", subject_id=charge.account_id,
                         resource_type="lab_order", resource_id=charge.lab_order_id)
        expired += 1
    db.flush()
    return {"summary": {"due": len(due), "expired": expired, "needs_review": blocked}}


# ── Collectors: a lab's own staff ────────────────────────────────────────────

def _my_labs(db: Session, user: dict) -> list[M.ServiceProvider]:
    return list(db.scalars(select(M.ServiceProvider).where(
        M.ServiceProvider.account_id == user["id"], M.ServiceProvider.kind == "LAB")).all()) \
        if user.get("role") == "VENDOR" else []


def _collector_payload(row: M.LabCollector, account: M.Account) -> dict:
    return {"id": row.id, "accountId": account.id, "labId": row.lab_id, "fullName": account.full_name,
            "identifier": account.identifier, "channel": account.channel,
            "active": bool(row.active and account.active), "createdAt": row.created_at}


@router.get("/work/lab-collectors")
def lab_collectors(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """The collectors of the labs this partner runs. Nobody else's."""
    labs = [lab.id for lab in _my_labs(db, user)]
    if not labs:
        raise HTTPException(403, "Only a laboratory partner manages collectors.")
    rows = db.execute(select(M.LabCollector, M.Account).join(M.Account, M.Account.id == M.LabCollector.account_id)
                      .where(M.LabCollector.lab_id.in_(labs)).order_by(M.Account.full_name)).all()
    return {"items": [_collector_payload(c, a) for c, a in rows], "total": len(rows)}


class CollectorInput(StrictModel):
    labId: str = Field(default="", max_length=80)
    fullName: str = Field(min_length=2, max_length=120)
    identifier: str = Field(min_length=3, max_length=254)
    channel: Literal["EMAIL", "WHATSAPP"]

    @field_validator("fullName")
    @classmethod
    def named(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Enter the collector's name.")
        return value


@router.post("/work/lab-collectors", status_code=201)
def add_lab_collector(body: CollectorInput, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """A lab adds one of its own staff as a sample collector, with their own sign-in."""
    labs = _my_labs(db, user)
    if not labs:
        raise HTTPException(403, "Only a laboratory partner adds collectors.")
    if body.labId:
        lab = next((lab for lab in labs if lab.id == body.labId), None)
        if lab is None:
            raise HTTPException(404, "No such laboratory of yours.")
    elif len(labs) == 1:
        lab = labs[0]
    else:
        raise HTTPException(422, "Choose which of your laboratories this collector works for.")
    identifier = normalize_identifier(body.identifier, body.channel)
    if db.scalar(select(M.Account.id).where(M.Account.identifier == identifier)):
        raise HTTPException(409, "An account already exists for those contact details.")
    now = _now()
    account = M.Account(id=_id(), identifier=identifier, channel=body.channel, full_name=body.fullName,
                        role=COLLECTOR_ROLE, active=True, profile={}, created_at=now, partner_kind="")
    db.add(account)
    db.flush()
    row = M.LabCollector(id=_id(), lab_id=lab.id, account_id=account.id, active=True, created_by=user["id"],
                         created_at=now)
    db.add(row)
    _audit(db, user["id"], "LAB_COLLECTOR_ADDED", account.id)
    ops_feed.publish(db, "LAB_COLLECTOR_ADDED", "ACCOUNT", severity="ATTENTION",
                     summary="A laboratory added a sample collector account", actor_id=user["id"],
                     actor_role=user.get("role", ""), subject_id=account.id, provider_id=lab.id,
                     resource_type="account", resource_id=account.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account already exists for those contact details.")
    return _collector_payload(row, account)


class CollectorUpdate(StrictModel):
    active: bool


@router.patch("/work/lab-collectors/{collector_id}")
def update_lab_collector(collector_id: str, body: CollectorUpdate, user=Depends(require_staff),
                         db: Session = Depends(workflow_db)):
    """Retire a collector (they can no longer sign in or act) or bring them back."""
    row = db.get(M.LabCollector, collector_id)
    if row is None or row.lab_id not in {lab.id for lab in _my_labs(db, user)}:
        raise HTTPException(404, "No such collector of yours.")
    account = db.get(M.Account, row.account_id)
    row.active = body.active
    account.active = body.active
    _audit(db, user["id"], "LAB_COLLECTOR_ACTIVATED" if body.active else "LAB_COLLECTOR_RETIRED", account.id)
    db.commit()
    return _collector_payload(row, account)


# ── A collector's own pickups ────────────────────────────────────────────────

def require_collector(user=Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    """A signed-in LAB_COLLECTOR whose collector record is active. Fails closed."""
    if user["role"] != COLLECTOR_ROLE:
        raise HTTPException(403, "Only a lab collector can do this.")
    row = db.scalar(select(M.LabCollector).where(M.LabCollector.account_id == user["id"],
                                                 M.LabCollector.active.is_(True)))
    if row is None:
        raise HTTPException(403, "Your collector account is not active.")
    return {**user, "labId": row.lab_id}


def _pickup_payload(row: M.LabOrder, patient_name: str) -> dict:
    """What a collector needs at the door. Never the indication, a report, a flag or a review."""
    return {"id": row.id, "status": row.status, "patientName": patient_name, "testPanel": row.test_panel or [],
            "slotStart": row.slot_start, "fastingRequired": row.fasting_required,
            "collectionMode": row.collection_mode, "collectionAddress": row.collection_address or None,
            "sampleId": row.sample_id, "tubeCount": row.tube_count or 0,
            "collectedAt": row.collected_at or None, "handedOverAt": row.handed_over_at or None,
            "nextActions": {"ASSIGNED": ["COLLECTED"], "SAMPLE_COLLECTED": ["HANDED_TO_LAB"]}.get(row.status, [])}


def _my_pickup(db: Session, collector: dict, order_id: str) -> M.LabOrder:
    """This collector's own assigned order at their lab; anything else is a 404."""
    row = db.get(M.LabOrder, order_id)
    if (row is None or row.collector_id != collector["id"] or row.lab_id != collector["labId"]
            or not C.lab_may_see(db, row)):
        raise HTTPException(404, "Pickup not found.")
    return row


@router.get("/collector/pickups")
def my_pickups(collector=Depends(require_collector), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.LabOrder).where(
        M.LabOrder.collector_id == collector["id"], M.LabOrder.lab_id == collector["labId"],
        M.LabOrder.status.in_(ACTIVE_PICKUP_STATES), C.lab_may_see_clause(),
    ).order_by(M.LabOrder.slot_start, M.LabOrder.created_at)).all()
    names = dict(db.execute(select(M.Account.id, M.Account.full_name).where(
        M.Account.id.in_({r.patient_id for r in rows}))).all()) if rows else {}
    return {"items": [_pickup_payload(r, names.get(r.patient_id, "")) for r in rows], "total": len(rows)}


class CollectedInput(StrictModel):
    sampleId: str = Field(min_length=1, max_length=40)
    tubeCount: int = Field(ge=1, le=MAX_TUBES)


def _move(db: Session, collector: dict, row: M.LabOrder, target: str) -> None:
    try:
        F.assert_transition(F.LAB_TRANSITIONS, row.status, target, "lab order")
    except F.TransitionError as exc:
        raise HTTPException(409, str(exc)) from exc
    row.status = target
    row.updated_at = _now()
    ops_feed.publish(db, f"LAB_{target}", "LAB", summary=f"Lab order moved to {target.replace('_', ' ').lower()} by its collector",
                     actor_id=collector["id"], actor_role=COLLECTOR_ROLE, subject_id=row.patient_id,
                     provider_id=row.lab_id, resource_type="lab_order", resource_id=row.id)
    _audit(db, collector["id"], f"LAB_{target}", row.id)


@router.post("/collector/pickups/{order_id}/collected")
def mark_collected(order_id: str, body: CollectedInput, collector=Depends(require_collector),
                   db: Session = Depends(workflow_db)):
    """Assigned -> collected, with the sample identifier, how many tubes and when (server time)."""
    row = _my_pickup(db, collector, order_id)
    if row.status != "ASSIGNED":
        raise HTTPException(409, "Only an assigned pickup can be marked collected.")
    _move(db, collector, row, "SAMPLE_COLLECTED")
    row.sample_id = body.sampleId.strip()
    row.tube_count = body.tubeCount
    row.collected_at = row.updated_at
    C.sync_hostel_visit(db, row)
    ops_feed.notify(db, row.patient_id, "LAB_SAMPLE_COLLECTED", dedupe_key=f"lab:{row.id}:SAMPLE_COLLECTED",
                    summary="Your sample has been collected.", resource_type="lab_order", resource_id=row.id)
    db.commit()
    return _pickup_payload(row, "")


@router.post("/collector/pickups/{order_id}/handed-to-lab")
def mark_handed_to_lab(order_id: str, collector=Depends(require_collector), db: Session = Depends(workflow_db)):
    """Collected -> in transit: the collector has handed the sample over. The lab confirms receipt itself."""
    row = _my_pickup(db, collector, order_id)
    if row.status != "SAMPLE_COLLECTED":
        raise HTTPException(409, "Only a collected sample can be handed to the lab.")
    if not row.sample_id:
        raise HTTPException(409, "The chain of custody is broken: no sample identifier was recorded.")
    _move(db, collector, row, "IN_TRANSIT")
    row.handed_over_at = row.updated_at
    db.commit()
    return _pickup_payload(row, "")


@router.get("/collector/pickups/history")
def my_pickup_history(limit: int = Query(30, ge=1, le=100), collector=Depends(require_collector),
                      db: Session = Depends(workflow_db)):
    """Pickups this collector already handed over, newest first. Times and tubes only, never what came of them."""
    rows = db.scalars(select(M.LabOrder).where(
        M.LabOrder.collector_id == collector["id"], M.LabOrder.lab_id == collector["labId"],
        M.LabOrder.handed_over_at > 0).order_by(M.LabOrder.handed_over_at.desc()).limit(limit)).all()
    return {"items": [{"id": r.id, "tubeCount": r.tube_count or 0,
                       "collectedAt": r.collected_at or None, "handedOverAt": r.handed_over_at or None}
                      for r in rows], "total": len(rows)}
