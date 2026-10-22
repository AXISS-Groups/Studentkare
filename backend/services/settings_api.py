"""services.settings_api — reading and editing the settings registry.

  GET   /api/ops/settings           every declaration with its default, override and effective value
  PATCH /api/ops/settings/{key}     set or clear one override (SUPER_ADMIN, reason required, audited)

The declarations live in core/settings_registry.py. An override is checked
against its declaration here before it is saved, and again on every read, so a
value the declaration does not allow can never take effect.

The public settings reach the app through the existing unauthenticated
``GET /api/config/public`` (services/integrations.py), under ``settings``: the
app needs values such as ``appearance.boot_wait_ms`` before anyone has signed
in. Only settings declared ``public`` go there — business numbers safe to show
anyone — never an anti-abuse limit or a server-only value.
"""
from __future__ import annotations

import time
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import settings_registry as R
from core import workflow_models as M
from services import ops_feed
from services.clinical_api import audit
from services.workflow_auth import StrictModel, require_super_admin, workflow_db

router = APIRouter(prefix="/api", tags=["Settings"])

REASON_MAX_LENGTH = 500
AUDIT_SET = "SETTING_OVERRIDDEN"
AUDIT_CLEAR = "SETTING_OVERRIDE_CLEARED"
OPS_KIND = "SETTING_CHANGED"


class SettingPatch(StrictModel):
    # Any JSON value; null clears the override so the default is in force again.
    value: Any = None
    reason: str

    @field_validator("reason")
    @classmethod
    def _reason(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A reason is required.")
        if len(value) > REASON_MAX_LENGTH:
            raise ValueError(f"The reason must be at most {REASON_MAX_LENGTH} characters.")
        return value


def _view(decl: R.Setting, row: M.SettingOverride | None) -> dict:
    stored_valid = None
    effective = decl.default
    if row is not None:
        try:
            effective = R.validate(decl, row.value)
            stored_valid = True
        except R.InvalidSettingValue:
            stored_valid = False
    return {
        **decl.as_dict(),
        "override": None if row is None else {
            "value": row.value, "valid": stored_valid, "updatedBy": row.updated_by, "updatedAt": row.updated_at,
        },
        "effective": effective,
    }


@router.get("/ops/settings")
def list_settings(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    rows = {row.key: row for row in db.scalars(select(M.SettingOverride)).all()}
    return {"items": [_view(decl, rows.get(key)) for key, decl in sorted(R.REGISTRY.items())]}


@router.patch("/ops/settings/{key}")
def patch_setting(key: str, body: SettingPatch, user=Depends(require_super_admin),
                  db: Session = Depends(workflow_db)):
    try:
        decl = R.get_declaration(key)
    except R.UnknownSetting:
        raise HTTPException(404, "No such setting.")
    return _view(decl, write_override(db, user, key, body.value, body.reason))


def write_override(db: Session, user: dict, key: str, value: Any, reason: str) -> M.SettingOverride | None:
    """Set (or, with None, clear) one override: validated, audited, history kept, committed.

    The one write path, used by PATCH /ops/settings/{key} and by actions that are
    a setting underneath (the AI kill switch). The caller has checked the role.
    """
    decl = R.get_declaration(key)
    new_value = None
    if value is not None:
        try:
            new_value = R.validate(decl, value)
        except R.InvalidSettingValue as exc:
            raise HTTPException(422, str(exc))

    rows = {row.key: row for row in db.scalars(select(M.SettingOverride)).all()}
    row = rows.get(key)
    old_value = None if row is None else row.value

    # The effective values once this change lands, checked against the pairs that
    # must stay ordered (e.g. water goal min <= default <= max).
    after: dict[str, Any] = {}
    for other_key, other in R.REGISTRY.items():
        stored = rows.get(other_key)
        try:
            after[other_key] = R.validate(other, stored.value) if stored is not None else other.default
        except R.InvalidSettingValue:
            after[other_key] = other.default
    after[key] = decl.default if new_value is None else new_value
    problems = R.check_ordered_pairs(after)
    if problems:
        raise HTTPException(422, "; ".join(problems))

    now = time.time()
    if new_value is None:
        if row is not None:
            db.delete(row)
    elif row is None:
        db.add(M.SettingOverride(key=key, value=new_value, updated_by=user["id"], updated_at=now))
    else:
        row.value = new_value
        row.updated_by = user["id"]
        row.updated_at = now
    db.add(M.SettingOverrideHistory(id=uuid.uuid4().hex, key=key, old_value=old_value, new_value=new_value,
                                    reason=reason, changed_by=user["id"], changed_at=now))
    audit(db, user["id"], AUDIT_CLEAR if new_value is None else AUDIT_SET, key)
    ops_feed.publish(db, OPS_KIND, "ACCOUNT", severity="INFO", actor_id=user["id"], actor_role=user["role"],
                     summary=f"Setting {key} {'reset to its default' if new_value is None else 'changed'}.",
                     resource_type=R.OPS_RESOURCE_TYPE, resource_id=key)
    db.commit()
    R.reset_cache()
    return db.get(M.SettingOverride, key)


@router.get("/ops/settings/{key}/history")
def setting_history(key: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    try:
        R.get_declaration(key)
    except R.UnknownSetting:
        raise HTTPException(404, "No such setting.")
    rows = db.scalars(select(M.SettingOverrideHistory).where(M.SettingOverrideHistory.key == key)
                      .order_by(M.SettingOverrideHistory.changed_at.desc())).all()
    return {"items": [{"oldValue": r.old_value, "newValue": r.new_value, "reason": r.reason,
                       "changedBy": r.changed_by, "changedAt": r.changed_at} for r in rows]}
