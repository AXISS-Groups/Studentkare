"""
services.repository — persistence-aware repository layer.

Every read/write goes through here.  When `DATABASE_URL` is set (PostgreSQL)
the operations persist to SQLAlchemy tables; otherwise they transparently fall
back to the in-memory stores.  This is the single source of truth for the
auth / super-admin / telemetry data.
"""
from __future__ import annotations

import time
from typing import Dict, List, Optional

from core import models_sql as M
from services import stores
from services.db_sql import SessionLocal, is_persistent


# ─── Users ───────────────────────────────────────────────────────────────────
def get_user(identifier: str) -> Optional[Dict]:
    if is_persistent():
        with SessionLocal() as s:
            row = s.query(M.AppUser).filter(M.AppUser.phone == identifier).first()
            if row:
                return {
                    "id": row.id, "fullName": row.full_name, "phone": row.phone,
                    "email": row.email, "role": row.role, "pointsBalance": row.points_balance,
                    **(row.profile or {}),
                }
    return stores.USERS_DB.get(identifier)


def save_user(identifier: str, user: Dict) -> Dict:
    stores.USERS_DB[identifier] = user
    if is_persistent():
        with SessionLocal() as s:
            row = s.query(M.AppUser).filter(M.AppUser.phone == identifier).first()
            if row is None:
                row = M.AppUser(
                    id=user.get("id", f"std_{int(time.time())}"),
                    phone=identifier,
                    full_name=user.get("fullName", "Student User"),
                    email=user.get("email", ""),
                    role=user.get("role", "STUDENT"),
                    points_balance=user.get("pointsBalance", 0),
                    profile={k: v for k, v in user.items() if k not in ("id", "phone", "email", "role", "pointsBalance")},
                )
                s.add(row)
            else:
                row.full_name = user.get("fullName", row.full_name)
                row.email = user.get("email", row.email)
                row.role = user.get("role", row.role)
                row.points_balance = user.get("pointsBalance", row.points_balance)
                row.profile = {k: v for k, v in user.items() if k not in ("id", "phone", "email", "role", "pointsBalance")}
            s.commit()
    return user


# ─── OTP ─────────────────────────────────────────────────────────────────────
def set_otp(identifier: str, data: Dict) -> None:
    stores.OTP_STORE[identifier] = data


def get_otp(identifier: str) -> Optional[Dict]:
    return stores.OTP_STORE.get(identifier)


def pop_otp(identifier: str) -> None:
    stores.OTP_STORE.pop(identifier, None)


def check_rate_limit(identifier: str, max_requests: int = 5, window_seconds: int = 900) -> bool:
    """Return True if the caller may proceed, False if throttled."""
    now = time.time()
    history = [t for t in stores.RATE_LIMIT_STORE.get(identifier, []) if now - t < window_seconds]
    if len(history) >= max_requests:
        return False
    history.append(now)
    stores.RATE_LIMIT_STORE[identifier] = history
    return True


# ─── Audit logs ──────────────────────────────────────────────────────────────
def list_audit_logs(rule_id: Optional[str] = None, actor_type: Optional[str] = None) -> List[Dict]:
    if is_persistent():
        with SessionLocal() as s:
            q = s.query(M.AuditLog)
            if rule_id:
                q = q.filter(M.AuditLog.rule_id == rule_id)
            if actor_type:
                q = q.filter(M.AuditLog.actor_type == actor_type)
            rows = q.order_by(M.AuditLog.timestamp.desc()).all()
            return [
                {
                    "id": r.id, "timestamp": r.timestamp, "actorId": r.actor_id,
                    "actorName": r.actor_name, "actorType": r.actor_type, "action": r.action,
                    "ruleId": r.rule_id, "resourceType": r.resource_type, "resourceId": r.resource_id,
                    "details": r.details, "institutionId": r.institution_id,
                }
                for r in rows
            ]
    logs = stores.AUDIT_LOGS_DB
    if rule_id:
        logs = [l for l in logs if l.get("ruleId") == rule_id]
    if actor_type:
        logs = [l for l in logs if l.get("actorType") == actor_type]
    return logs


def create_audit_log(entry: Dict) -> Dict:
    stores.AUDIT_LOGS_DB.insert(0, entry)
    if is_persistent():
        with SessionLocal() as s:
            s.add(M.AuditLog(
                id=entry["id"], timestamp=entry["timestamp"], actor_id=entry["actorId"],
                actor_name=entry["actorName"], actor_type=entry["actorType"], action=entry["action"],
                rule_id=entry["ruleId"], resource_type=entry["resourceType"],
                resource_id=entry.get("resourceId", ""), details=entry["details"],
                institution_id=entry.get("institutionId", ""),
            ))
            s.commit()
    return entry


# ─── Tenants ─────────────────────────────────────────────────────────────────
def list_tenants() -> List[Dict]:
    if is_persistent():
        with SessionLocal() as s:
            rows = s.query(M.Tenant).all()
            return [
                {
                    "id": r.id, "name": r.name, "code": r.code, "tier": r.tier,
                    "activeSeats": r.active_seats, "maxSeats": r.max_seats,
                    "abdmFacilityId": r.abdm_facility_id, "status": r.status, "joinedAt": r.joined_at,
                }
                for r in rows
            ]
    return stores.TENANTS_DB


def create_tenant(tenant: Dict) -> Dict:
    stores.TENANTS_DB.append(tenant)
    if is_persistent():
        with SessionLocal() as s:
            s.add(M.Tenant(
                id=tenant["id"], name=tenant["name"], code=tenant["code"], tier=tenant["tier"],
                active_seats=tenant["activeSeats"], max_seats=tenant["maxSeats"],
                abdm_facility_id=tenant["abdmFacilityId"], status=tenant["status"], joined_at=tenant["joinedAt"],
            ))
            s.commit()
    return tenant


# ─── Break-glass ─────────────────────────────────────────────────────────────
def list_break_glass_sessions() -> List[Dict]:
    if is_persistent():
        with SessionLocal() as s:
            rows = s.query(M.BreakGlassSession).all()
            return [{
                "id": r.id, "studentId": r.student_id, "requestedByAdminId": r.requested_by_admin_id,
                "reasonCategory": r.reason_category, "reasonText": r.reason_text, "scope": r.scope or [],
                "dualApproverAdminId": r.dual_approver_admin_id, "sensitiveCategory": r.sensitive_category,
                "createdAt": r.created_at, "expiresAt": r.expires_at, "active": r.active,
            } for r in rows]
    return list(stores.BREAK_GLASS_SESSIONS_DB.values())


def create_break_glass_session(session: Dict) -> Dict:
    stores.BREAK_GLASS_SESSIONS_DB[session["id"]] = session
    if is_persistent():
        with SessionLocal() as s:
            s.add(M.BreakGlassSession(
                id=session["id"], student_id=session["studentId"],
                requested_by_admin_id=session["requestedByAdminId"],
                reason_category=session["reasonCategory"], reason_text=session["reasonText"],
                scope=session["scope"], dual_approver_admin_id=session["dualApproverAdminId"],
                sensitive_category=session["sensitiveCategory"], created_at=session["createdAt"],
                expires_at=session["expiresAt"], active=session["active"],
            ))
            s.commit()
    return session


def revoke_break_glass_session(session_id: str) -> Optional[Dict]:
    session = stores.BREAK_GLASS_SESSIONS_DB.get(session_id)
    if session:
        session["active"] = False
    if is_persistent():
        with SessionLocal() as s:
            row = s.query(M.BreakGlassSession).filter(M.BreakGlassSession.id == session_id).first()
            if row:
                row.active = False
                s.commit()
    return session


# ─── Departments ─────────────────────────────────────────────────────────────
def list_departments() -> List[Dict]:
    if is_persistent():
        with SessionLocal() as s:
            rows = s.query(M.DepartmentState).all()
            return [
                {"id": r.id, "name": r.name, "plane": r.plane, "status": r.status,
                 "killSwitchActive": r.kill_switch_active, "rules": r.rules or []}
                for r in rows
            ]
    return list(stores.DEPARTMENTS_DB.values())


def toggle_kill_switch(dept_id: str) -> Optional[Dict]:
    dept = stores.DEPARTMENTS_DB.get(dept_id)
    if not dept:
        return None
    dept["killSwitchActive"] = not dept["killSwitchActive"]
    dept["status"] = "HALTED" if dept["killSwitchActive"] else "ACTIVE"
    if is_persistent():
        with SessionLocal() as s:
            row = s.query(M.DepartmentState).filter(M.DepartmentState.id == dept_id).first()
            if row:
                row.kill_switch_active = dept["killSwitchActive"]
                row.status = dept["status"]
                s.commit()
    return dept


# ─── Wearable telemetry ──────────────────────────────────────────────────────
def append_telemetry(entry: Dict) -> Dict:
    stores.SENSOR_TELEMETRY_DB.append(entry)
    return entry


def list_telemetry(limit: int = 100) -> List[Dict]:
    return stores.SENSOR_TELEMETRY_DB[-limit:]
