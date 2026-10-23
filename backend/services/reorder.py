"""One-tap reorder and back-in-stock alerts (commerce plane).

Every route here runs on ``commerce_db`` (sk_commerce when Rule L grants are in
force) and reads only commerce tables: an order, its lines, the catalogue and
``care_stock_alerts``. A reorder is asked for by order id; this module never
learns whether a refill reminder, a medication plan or anything else about the
student's health led there (core/rule_l.py, AGENTS.md guardrail 4).

* ``POST /api/orders/{order_id}/reorder-quote`` prices the order's product lines
  again from the live catalogue: today's price and MRP, today's stock, whether a
  prescription is needed, and the delivery the order used. Nothing is reserved
  and nothing is charged; the student then places the order through the normal
  ``POST /api/orders`` with ``expectedTotalPaise``, which is refused (409
  PRICE_CHANGED) if the total moved in between. A stale price is never charged.
* Prescription items are listed but never priced into the total: the shop does
  not sell them (POST /api/orders refuses them), the prescription path does.
* Out of stock: the line says so. There is no alternative and no substitution:
  the student can ask to be told when it is back, or ask a pharmacist.
"""
from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import ops_feed
from services.commerce_session import commerce_db
from services.workflow_auth import StrictModel, authenticated_user

router = APIRouter(prefix="/api", tags=["Reorder"])

REORDER_COMMERCE_PATHS = (
    "POST /api/orders/{order_id}/reorder-quote",
    "GET /api/stock-alerts",
    "POST /api/catalog/{item_id}/stock-alert",
    "DELETE /api/catalog/{item_id}/stock-alert",
)

# Why a line cannot be bought as it was. A closed set the client translates.
OK, PRESCRIPTION, OUT_OF_STOCK, LOW_STOCK, UNAVAILABLE = "OK", "PRESCRIPTION", "OUT_OF_STOCK", "LOW_STOCK", "UNAVAILABLE"
ALERT_BATCH = 200
STOCK_BACK_EVENT = "STOCK_BACK"


def _now() -> float:
    return time.time()


def _provider_active(db: Session, account_id: str) -> bool:
    # sk_commerce may read only id, role and active of care_accounts.
    row = db.execute(select(M.Account.active).where(M.Account.id == account_id)).first()
    return bool(row and row[0])


def _line_state(db: Session, item: M.CatalogEntry | None, quantity: int) -> str:
    if item is None or not item.active or item.kind != "product" or not _provider_active(db, item.provider_id):
        return UNAVAILABLE
    if item.requires_prescription:
        return PRESCRIPTION
    if item.stock <= 0:
        return OUT_OF_STOCK
    if item.stock < quantity:
        return LOW_STOCK
    return OK


class QuoteInput(StrictModel):
    # Limit the quote to these items of the order (the medicine a reminder was for); empty = every product line.
    itemIds: list[str] = Field(default_factory=list, max_length=30)


@router.post("/orders/{order_id}/reorder-quote")
def reorder_quote(order_id: str, body: QuoteInput, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    order = db.get(M.Order, order_id)
    if order is None or order.account_id != user["id"]:
        raise HTTPException(404, "Order not found.")
    lines = db.scalars(select(M.OrderLine).where(M.OrderLine.order_id == order_id, M.OrderLine.kind == "product")
                       .order_by(M.OrderLine.name, M.OrderLine.id)).all()
    if body.itemIds:
        wanted = set(body.itemIds)
        lines = [line for line in lines if line.item_id in wanted]
    line_max = setting("shop.cart_line_max", db)
    waiting = set(db.scalars(select(M.StockAlert.item_id).where(
        M.StockAlert.account_id == user["id"], M.StockAlert.status == "WAITING")).all())
    seen: set[str] = set()
    out = []
    for line in lines:
        if line.item_id in seen:
            continue
        seen.add(line.item_id)
        item = db.get(M.CatalogEntry, line.item_id)
        quantity = min(line.quantity, line_max)
        state = _line_state(db, item, quantity)
        # No shop price for a prescription item: the shop does not sell it, and the
        # pharmacy that dispenses it quotes its own price after checking the prescription.
        priced = item is not None and state not in (UNAVAILABLE, PRESCRIPTION)
        out.append({
            "itemId": line.item_id, "name": item.name if item else line.name, "pack": item.pack if item else "",
            "quantity": quantity, "state": state,
            # Today's price, never the price paid then. Unknown for an item that is gone.
            "pricePaise": item.price_paise if priced else None,
            "mrpPaise": item.mrp_paise if priced else None,
            "stock": item.stock if item and state in (OK, LOW_STOCK, OUT_OF_STOCK) else 0,
            "requiresPrescription": bool(item and item.requires_prescription),
            "stockAlert": line.item_id in waiting,
        })
    total = sum(line["pricePaise"] * line["quantity"] for line in out if line["state"] == OK)
    return {"orderId": order.id, "quotedAt": _now(), "delivery": order.delivery, "lines": out,
            "totalPaise": total, "ready": bool(out) and all(line["state"] == OK for line in out)}


@router.get("/stock-alerts")
def my_stock_alerts(user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    rows = db.scalars(select(M.StockAlert).where(M.StockAlert.account_id == user["id"],
                                                 M.StockAlert.status == "WAITING")).all()
    return {"items": [{"itemId": row.item_id, "createdAt": row.created_at} for row in rows]}


@router.post("/catalog/{item_id}/stock-alert", status_code=201)
def add_stock_alert(item_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    item = db.get(M.CatalogEntry, item_id)
    if item is None or not item.active or item.kind != "product":
        raise HTTPException(404, "Item not found.")
    row = db.scalar(select(M.StockAlert).where(M.StockAlert.account_id == user["id"], M.StockAlert.item_id == item_id))
    if row is None:
        row = M.StockAlert(id=uuid.uuid4().hex, account_id=user["id"], item_id=item_id, status="WAITING",
                           created_at=_now(), notified_at=0.0)
        db.add(row)
    else:
        row.status, row.created_at, row.notified_at = "WAITING", _now(), 0.0
    db.commit()
    return {"itemId": item_id, "status": row.status}


@router.delete("/catalog/{item_id}/stock-alert")
def remove_stock_alert(item_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    row = db.scalar(select(M.StockAlert).where(M.StockAlert.account_id == user["id"], M.StockAlert.item_id == item_id))
    if row is not None and row.status == "WAITING":
        row.status = "CANCELLED"
        db.commit()
    return {"itemId": item_id, "status": "CANCELLED"}


def notify_back_in_stock(db: Session) -> dict:
    """The ``stock_alerts`` job: tell each waiting student once that their item is back.

    The notice is in-app only and names no item (it may be a medicine, and a
    notification never names one: DESIGN.md §7); the item id lets the app open it.
    """
    rows = db.execute(select(M.StockAlert, M.CatalogEntry).join(M.CatalogEntry, M.CatalogEntry.id == M.StockAlert.item_id)
                      .where(M.StockAlert.status == "WAITING", M.CatalogEntry.active.is_(True),
                             M.CatalogEntry.stock > 0).limit(ALERT_BATCH)).all()
    for alert, item in rows:
        ops_feed.notify(db, alert.account_id, STOCK_BACK_EVENT, dedupe_key=f"stock-back:{alert.id}:{int(alert.created_at)}",
                        summary="An item you asked about is back in stock.", resource_type="catalog_item",
                        resource_id=item.id)
        alert.status, alert.notified_at = "NOTIFIED", _now()
    db.commit()
    return {"status": "SUCCESS", "summary": {"notified": len(rows)}}
