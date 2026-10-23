"""The privacy notice, the terms and the grievance officer, as versioned documents (audit H2).

Nothing here writes legal text. A super admin pastes the text legal supplies into a
draft (Super admin → Legal documents), and publishing it makes it the live version
without a deploy. A published version is frozen: a change is a new version, so a
sign-up record that names a version always points at the words that were shown.

When no version of a kind is published, the public answer says so and the apps say
"not published yet"; sign-up still works and records ``UNPUBLISHED``.
"""
from __future__ import annotations

import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services import ops_feed
from services.workflow_auth import StrictModel, require_super_admin, workflow_db

router = APIRouter(prefix="/api", tags=["Legal documents"])

LegalKind = Literal["PRIVACY_NOTICE", "TERMS", "GRIEVANCE_OFFICER"]
# What a sign-up record holds when no version of a kind was published at the time.
UNPUBLISHED = "unpublished"
# Input bounds (a privacy notice runs to a few thousand words).
TITLE_MAX = 200
VERSION_MAX = 40
BODY_MAX = 200_000
VERSION_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9._-]*$"


def current(db: DBSession, kind: str) -> M.LegalDocument | None:
    """The published version of a kind, or None."""
    return db.scalar(select(M.LegalDocument).where(M.LegalDocument.kind == kind, M.LegalDocument.status == "PUBLISHED")
                     .order_by(M.LegalDocument.published_at.desc()))


def current_version(db: DBSession, kind: str) -> str:
    """The published version string of a kind, or ``UNPUBLISHED``. Fails closed to UNPUBLISHED."""
    try:
        row = current(db, kind)
    except Exception:  # noqa: BLE001 — an unreadable table means nothing is known to be published
        return UNPUBLISHED
    return row.version if row is not None else UNPUBLISHED


def public_payload(kind: str, row: M.LegalDocument | None) -> dict:
    if row is None:
        return {"kind": kind, "published": False, "version": None, "title": None, "body": None, "publishedAt": None}
    return {"kind": kind, "published": True, "version": row.version, "title": row.title, "body": row.body,
            "publishedAt": row.published_at}


def admin_payload(row: M.LegalDocument) -> dict:
    return {"id": row.id, "kind": row.kind, "version": row.version, "title": row.title, "body": row.body,
            "status": row.status, "createdAt": row.created_at, "updatedAt": row.updated_at,
            "publishedAt": row.published_at or None}


def _audit(db: DBSession, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=actor_id, action=action, resource_id=resource_id,
                           created_at=time.time()))


# --- public ---------------------------------------------------------------------


@router.get("/legal")
def legal_versions(response: Response, db: DBSession = Depends(workflow_db)):
    """The published version of each kind (or null), for the sign-up consent screen."""
    response.headers["Cache-Control"] = "no-store"
    out = {}
    for kind in M.LEGAL_DOCUMENT_KINDS:
        row = current(db, kind)
        out[kind] = {"version": row.version, "publishedAt": row.published_at} if row else None
    return out


@router.get("/legal/{kind}")
def legal_document(kind: LegalKind, response: Response, db: DBSession = Depends(workflow_db)):
    """The published privacy notice, terms or grievance officer details, or ``published: false``."""
    response.headers["Cache-Control"] = "no-store"
    return public_payload(kind, current(db, kind))


# --- super admin ------------------------------------------------------------------


class LegalDraftInput(StrictModel):
    kind: LegalKind
    version: str = Field(min_length=1, max_length=VERSION_MAX, pattern=VERSION_PATTERN)
    title: str = Field(min_length=2, max_length=TITLE_MAX)
    body: str = Field(min_length=1, max_length=BODY_MAX)

    @field_validator("version")
    @classmethod
    def not_reserved(cls, value: str) -> str:
        if value.lower() == UNPUBLISHED:
            raise ValueError("That version name is reserved. Use the version legal gave the text.")
        return value


class LegalDraftEdit(StrictModel):
    title: str = Field(min_length=2, max_length=TITLE_MAX)
    body: str = Field(min_length=1, max_length=BODY_MAX)


@router.get("/ops/legal-documents")
def list_documents(response: Response, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    rows = db.scalars(select(M.LegalDocument).order_by(M.LegalDocument.kind, M.LegalDocument.created_at.desc())).all()
    return {"items": [admin_payload(row) for row in rows]}


@router.post("/ops/legal-documents", status_code=201)
def create_draft(body: LegalDraftInput, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    now = time.time()
    row = M.LegalDocument(id=uuid.uuid4().hex, kind=body.kind, version=body.version.strip(), title=body.title.strip(),
                          body=body.body, status="DRAFT", created_by=user["id"], created_at=now, updated_at=now)
    db.add(row)
    _audit(db, user["id"], f"LEGAL_DRAFT_CREATED_{body.kind}", row.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "That version already exists for this document. Use a new version.")
    return admin_payload(row)


def _draft(db: DBSession, document_id: str) -> M.LegalDocument:
    row = db.get(M.LegalDocument, document_id)
    if row is None:
        raise HTTPException(404, "No such document.")
    if row.status != "DRAFT":
        raise HTTPException(409, "A published version can't change. Create a new version instead.")
    return row


@router.patch("/ops/legal-documents/{document_id}")
def edit_draft(document_id: str, body: LegalDraftEdit, user=Depends(require_super_admin),
               db: DBSession = Depends(workflow_db)):
    row = _draft(db, document_id)
    row.title, row.body, row.updated_at = body.title.strip(), body.body, time.time()
    _audit(db, user["id"], f"LEGAL_DRAFT_EDITED_{row.kind}", row.id)
    db.commit()
    return admin_payload(row)


@router.post("/ops/legal-documents/{document_id}/publish")
def publish(document_id: str, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    """Makes a draft the live version; the version it replaces is retired, never deleted."""
    row = _draft(db, document_id)
    now = time.time()
    for previous in db.scalars(select(M.LegalDocument).where(M.LegalDocument.kind == row.kind,
                                                             M.LegalDocument.status == "PUBLISHED")).all():
        previous.status, previous.updated_at = "RETIRED", now
    row.status, row.published_by, row.published_at, row.updated_at = "PUBLISHED", user["id"], now, now
    _audit(db, user["id"], f"LEGAL_PUBLISHED_{row.kind}", row.id)
    ops_feed.publish(db, "LEGAL_DOCUMENT_PUBLISHED", "ACCOUNT", severity="ATTENTION",
                     summary=f"{row.kind.replace('_', ' ').title()} version {row.version} published",
                     actor_id=user["id"], actor_role=user.get("role", ""),
                     resource_type="legal_document", resource_id=row.id)
    db.commit()
    return admin_payload(row)
