"""DPDP account erasure: delete everything from the live system, keep a sealed copy.

Design page 2/3 DeleteAccount, page 7 DpdpQueue (Tier 1 — approved by the
repository owner as named reviewer). Decision recorded with the owner: the
student's data is removed from every live table; a Fernet-encrypted archive of
those rows is kept for DPDP_ARCHIVE_RETENTION_DAYS, readable only by a super
admin who records a reason, then destroyed. The student is told exactly this,
including the number of days — a deletion that silently kept a full copy would
be a false statement to them.

Flow:
1. POST /records/deletion-request: scheduled for 7 days later; cancellable.
2. The `account_erasure` job processes requests whose 7 days have passed:
   every row reachable from the account through foreign keys (50+ columns
   across the schema, discovered from the metadata so a new table cannot be
   missed), plus notifications and sign-in challenges keyed by the account's
   id or identifier, is sealed into an archive and then deleted, the account
   row last. The audit log and ops feed keep pseudonymous ids (never names) as
   the record that actions happened.
3. The same job destroys archives whose retention has ended.

Fails closed: without a valid DPDP_ARCHIVE_KEY and DPDP_ARCHIVE_RETENTION_DAYS
nothing is erased (the request waits, and the super-admin queue says why).
"""
from __future__ import annotations

import base64
import json
import os
import time
import uuid
from collections import defaultdict
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import Table, delete, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import ops_feed
from services.workflow_auth import StrictModel, authenticated_user, require_super_admin, workflow_db

router = APIRouter(prefix="/api", tags=["Erasure"])

GRACE_SECONDS = 7 * 86400
MAX_RETENTION_DAYS = 3650


def _id() -> str:
    return uuid.uuid4().hex


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=time.time()))


# --- configuration (fail closed) ---------------------------------------------------------

def retention_days() -> int | None:
    raw = os.getenv("DPDP_ARCHIVE_RETENTION_DAYS", "").strip()
    if not raw.isdigit():
        return None
    days = int(raw)
    return days if 1 <= days <= MAX_RETENTION_DAYS else None


def _fernet() -> Fernet | None:
    key = os.getenv("DPDP_ARCHIVE_KEY", "").strip()
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except (ValueError, TypeError):
        return None


def erasure_blocker() -> str:
    """Why erasure can't run right now, or '' if it can."""
    if _fernet() is None:
        return "DPDP_ARCHIVE_KEY is not set to a valid Fernet key."
    if retention_days() is None:
        return f"DPDP_ARCHIVE_RETENTION_DAYS is not set to a whole number of days (1–{MAX_RETENTION_DAYS})."
    return ""


# --- the sweep ---------------------------------------------------------------------------

def _encode(value: Any) -> Any:
    if isinstance(value, (bytes, bytearray, memoryview)):
        return {"__b64__": base64.b64encode(bytes(value)).decode()}
    return value


def _collect(db: Session, account: M.Account) -> dict[str, list[dict]]:
    """Every row tied to the account, by following foreign keys to a fixed point."""
    metadata = M.Base.metadata
    accounts = metadata.tables["care_accounts"]
    found: dict[str, dict[tuple, dict]] = defaultdict(dict)

    def add(table: Table, rows) -> list[dict]:
        new = []
        pk = list(table.primary_key.columns)
        for row in rows:
            data = dict(row._mapping)
            key = tuple(data[c.name] for c in pk)
            if key not in found[table.name]:
                found[table.name][key] = data
                new.append(data)
        return new

    frontier: list[tuple[Table, list[dict]]] = [(accounts, add(accounts, db.execute(select(accounts).where(accounts.c.id == account.id))))]
    while frontier:
        parent, parent_rows = frontier.pop()
        for table in metadata.sorted_tables:
            for column in table.columns:
                for fk in column.foreign_keys:
                    if fk.column.table is not parent:
                        continue
                    values = {r[fk.column.name] for r in parent_rows if r.get(fk.column.name) is not None}
                    if not values:
                        continue
                    new = add(table, db.execute(select(table).where(column.in_(values))))
                    if new:
                        frontier.append((table, new))

    # Personal rows with no foreign key: messages to the student and sign-in records.
    loose = (("care_outbox_events", "account_id", account.id),
             ("care_otp_challenges", "identifier", account.identifier),
             ("care_signup_grants", "identifier", account.identifier))
    for name, column_name, value in loose:
        table = metadata.tables.get(name)
        if table is not None and column_name in table.c:
            add(table, db.execute(select(table).where(table.c[column_name] == value)))

    return {name: list(rows.values()) for name, rows in found.items() if rows}


def erase_account(db: Session, account: M.Account) -> M.ErasureArchive:
    """Seal, then delete. Never commits; the caller commits archive and deletion together."""
    fernet, days = _fernet(), retention_days()
    if fernet is None or days is None:
        raise RuntimeError(erasure_blocker())
    rows = _collect(db, account)
    payload = json.dumps({"accountId": account.id, "erasedAt": time.time(),
                          "tables": {t: [{k: _encode(v) for k, v in r.items()} for r in rs] for t, rs in rows.items()}},
                         default=str).encode()
    now = time.time()
    archive = M.ErasureArchive(id=_id(), former_account_id=account.id, sealed=fernet.encrypt(payload),
                               row_count=sum(len(r) for r in rows.values()), archived_at=now,
                               destroy_after=now + days * 86400)
    db.add(archive)
    # Children before parents: reverse topological order; the account row goes last.
    for table in reversed(M.Base.metadata.sorted_tables):
        for row in rows.get(table.name, []):
            pk = list(table.primary_key.columns)
            db.execute(delete(table).where(*[c == row[c.name] for c in pk]))
    db.flush()
    return archive


def process_due_erasures(db: Session, *, now: float | None = None, limit: int = 20) -> dict:
    """Scheduler entry point. Never commits (the runner does)."""
    at = now if now is not None else time.time()
    blocker = erasure_blocker()
    destroyed = 0
    for archive in db.scalars(select(M.ErasureArchive).where(M.ErasureArchive.destroyed_at == 0,
                                                             M.ErasureArchive.destroy_after <= at)).all():
        archive.sealed = b""
        archive.destroyed_at = at
        destroyed += 1
    if blocker:
        return {"summary": {"erased": 0, "archivesDestroyed": destroyed, "blocked": blocker}}
    due = db.scalars(select(M.DeletionRequest).where(M.DeletionRequest.status == "PENDING",
                                                     M.DeletionRequest.requested_at <= at - GRACE_SECONDS).limit(limit)).all()
    erased = 0
    for request in due:
        account = db.get(M.Account, request.account_id)
        if account is None:
            continue
        former_id = account.id
        archive = erase_account(db, account)  # also deletes the request row (FK to the account)
        _audit(db, "system", "ACCOUNT_ERASED", former_id)
        ops_feed.publish(db, "ACCOUNT_ERASED", "ACCOUNT", severity="ATTENTION",
                         summary=f"Account erased; {archive.row_count} rows sealed for {retention_days()} days",
                         resource_type="erasure_archive", resource_id=archive.id)
        erased += 1
    db.flush()
    return {"summary": {"erased": erased, "archivesDestroyed": destroyed, "blocked": ""}}


# --- student ----------------------------------------------------------------------------

def _request_payload(request: M.DeletionRequest | None) -> dict:
    days = retention_days()
    return {
        "status": request.status if request else "NONE",
        "requestedAt": request.requested_at if request else None,
        "scheduledFor": (request.requested_at + GRACE_SECONDS) if request else None,
        "archiveRetentionDays": days,
    }


@router.get("/records/deletion-request")
def deletion_status(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return _request_payload(db.get(M.DeletionRequest, user["id"]))


@router.post("/records/deletion-request")
def request_deletion(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    existing = db.get(M.DeletionRequest, user["id"])
    if existing and existing.status == "PENDING":
        return _request_payload(existing)
    if existing:
        existing.status, existing.requested_at = "PENDING", time.time()
        request = existing
    else:
        request = M.DeletionRequest(account_id=user["id"], requested_at=time.time(), status="PENDING")
        db.add(request)
    _audit(db, user["id"], "DELETION_REQUESTED", user["id"])
    ops_feed.publish(db, "DELETION_REQUESTED", "ACCOUNT", severity="CRITICAL",
                     summary="Erasure request received — scheduled in 7 days unless cancelled",
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
                     resource_type="deletion_request", resource_id=user["id"])
    db.commit()
    return _request_payload(request)


@router.delete("/records/deletion-request")
def cancel_deletion(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    request = db.get(M.DeletionRequest, user["id"])
    if request is None or request.status != "PENDING":
        raise HTTPException(409, "There's no scheduled deletion to cancel.")
    request.status = "CANCELLED"
    _audit(db, user["id"], "DELETION_CANCELLED", user["id"])
    ops_feed.publish(db, "DELETION_CANCELLED", "ACCOUNT", summary="Erasure request cancelled by the student",
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
                     resource_type="deletion_request", resource_id=user["id"])
    db.commit()
    return _request_payload(request)


# --- super admin -------------------------------------------------------------------------

@router.get("/ops/erasure")
def erasure_queue(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    pending = db.scalars(select(M.DeletionRequest).where(M.DeletionRequest.status == "PENDING")
                         .order_by(M.DeletionRequest.requested_at)).all()
    archives = db.scalars(select(M.ErasureArchive).order_by(M.ErasureArchive.archived_at.desc()).limit(100)).all()
    return {
        "blocked": erasure_blocker() or None,
        "retentionDays": retention_days(),
        "pending": [{"accountId": r.account_id, "requestedAt": r.requested_at, "scheduledFor": r.requested_at + GRACE_SECONDS}
                    for r in pending],
        "archives": [{"id": a.id, "formerAccountId": a.former_account_id, "rowCount": a.row_count,
                      "archivedAt": a.archived_at, "destroyAfter": a.destroy_after, "destroyed": bool(a.destroyed_at)}
                     for a in archives],
    }


class OpenArchiveInput(StrictModel):
    reason: str = Field(min_length=10, max_length=500)


@router.post("/ops/erasure/archives/{archive_id}/open")
def open_archive(archive_id: str, body: OpenArchiveInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    archive = db.get(M.ErasureArchive, archive_id)
    if archive is None:
        raise HTTPException(404, "Archive not found.")
    if archive.destroyed_at:
        raise HTTPException(410, "This archive has been destroyed.")
    fernet = _fernet()
    if fernet is None:
        raise HTTPException(503, erasure_blocker())
    try:
        data = json.loads(fernet.decrypt(archive.sealed))
    except InvalidToken as exc:
        raise HTTPException(503, "The archive can't be opened with the configured key.") from exc
    _audit(db, user["id"], "ERASURE_ARCHIVE_OPENED", archive.id)
    ops_feed.publish(db, "ERASURE_ARCHIVE_OPENED", "ACCOUNT", severity="CRITICAL",
                     summary=f"Sealed erasure archive opened. Reason: {body.reason.strip()}"[:300],
                     actor_id=user["id"], actor_role=user.get("role", ""), resource_type="erasure_archive", resource_id=archive.id)
    db.commit()
    return {"archive": data}
