"""
services.seed — idempotent seed of default operational data.

Populates the persistence layer with the demo tenants, departments and the
initial audit entry on first boot. Safe to run repeatedly.
"""
from __future__ import annotations

from core import models_sql as M
from services.db_sql import SessionLocal, is_persistent
from services import stores

DEFAULT_TENANTS = [
    {"id": "inst_osmania_01", "name": "Osmania University", "code": "OU-HYD", "tier": "ENTERPRISE_CAMPUS",
     "activeSeats": 24500, "maxSeats": 30000, "abdmFacilityId": "IN3610002491", "status": "ACTIVE", "joinedAt": "2025-08-15"},
    {"id": "inst_iith_02", "name": "IIT Hyderabad", "code": "IITH-KANDI", "tier": "PREMIUM_TIER",
     "activeSeats": 8200, "maxSeats": 10000, "abdmFacilityId": "IN3610002890", "status": "ACTIVE", "joinedAt": "2025-10-01"},
]

DEFAULT_DEPARTMENTS = [
    ("D1", "Service Desk Operations"), ("D2", "Partner & Supply Ops"), ("D3", "Compliance & Audit"),
    ("D4", "Finance & Revenue"), ("D5", "Claims Operations"), ("D6", "Institution Success"),
    ("D7", "Content & Localization"), ("D8", "Engineering & Reliability"), ("D9", "Clinical Governance"),
]


def seed_defaults() -> None:
    if not is_persistent():
        return
    with SessionLocal() as s:
        for t in DEFAULT_TENANTS:
            if not s.query(M.Tenant).filter(M.Tenant.id == t["id"]).first():
                s.add(M.Tenant(**t))
        for dept_id, name in DEFAULT_DEPARTMENTS:
            if not s.query(M.DepartmentState).filter(M.DepartmentState.id == dept_id).first():
                s.add(M.DepartmentState(id=dept_id, name=name, plane="OPERATIONAL", status="ACTIVE", rules=[]))
        s.commit()
