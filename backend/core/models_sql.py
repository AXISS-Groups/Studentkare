"""
core.models_sql — SQLAlchemy ORM models for the Studentkare persistence layer.

Represents the operational plane (users, tenants, audit, break-glass) and the
agent runtime (department states, code-health findings, agent runs).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    String, Integer, Float, Boolean, Text, DateTime, JSON, ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column

from services.db_sql import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)
    tier: Mapped[str] = mapped_column(String, default="PREMIUM_TIER")
    active_seats: Mapped[int] = mapped_column(Integer, default=0)
    max_seats: Mapped[int] = mapped_column(Integer, default=5000)
    abdm_facility_id: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    joined_at: Mapped[str] = mapped_column(String, default="")


class AppUser(Base):
    __tablename__ = "app_users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    phone: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, default="")
    role: Mapped[str] = mapped_column(String, default="STUDENT")
    points_balance: Mapped[int] = mapped_column(Integer, default=0)
    profile: Mapped[dict] = mapped_column(JSON, default=dict)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    timestamp: Mapped[str] = mapped_column(String, default="")
    actor_id: Mapped[str] = mapped_column(String, default="")
    actor_name: Mapped[str] = mapped_column(String, default="")
    actor_type: Mapped[str] = mapped_column(String, default="HUMAN_ADMIN")
    action: Mapped[str] = mapped_column(String, nullable=False)
    rule_id: Mapped[str] = mapped_column(String, default="")
    resource_type: Mapped[str] = mapped_column(String, default="")
    resource_id: Mapped[str] = mapped_column(String, default="")
    details: Mapped[str] = mapped_column(Text, default="")
    institution_id: Mapped[str] = mapped_column(String, default="")


class BreakGlassSession(Base):
    __tablename__ = "break_glass_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(String, default="")
    requested_by_admin_id: Mapped[str] = mapped_column(String, default="")
    reason_category: Mapped[str] = mapped_column(String, default="")
    reason_text: Mapped[str] = mapped_column(Text, default="")
    scope: Mapped[list] = mapped_column(JSON, default=list)
    dual_approver_admin_id: Mapped[str] = mapped_column(String, default="")
    sensitive_category: Mapped[str] = mapped_column(String, default="NONE")
    created_at: Mapped[str] = mapped_column(String, default="")
    expires_at: Mapped[str] = mapped_column(String, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class DepartmentState(Base):
    __tablename__ = "department_states"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="")
    plane: Mapped[str] = mapped_column(String, default="OPERATIONAL")
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    kill_switch_active: Mapped[bool] = mapped_column(Boolean, default=False)
    rules: Mapped[list] = mapped_column(JSON, default=list)


class CodeHealthFindingRow(Base):
    __tablename__ = "code_health_findings"
    fingerprint: Mapped[str] = mapped_column(String, primary_key=True)
    rule_id: Mapped[str] = mapped_column(String, default="")
    family: Mapped[str] = mapped_column(String, default="")
    severity: Mapped[str] = mapped_column(String, default="")
    tier: Mapped[str] = mapped_column(String, default="")
    autofixable: Mapped[bool] = mapped_column(Boolean, default=True)
    file: Mapped[str] = mapped_column(String, default="")
    line: Mapped[int] = mapped_column(Integer, default=0)
    symbol: Mapped[str] = mapped_column(String, default="")
    evidence: Mapped[str] = mapped_column(Text, default="")
    blast_radius: Mapped[str] = mapped_column(String, default="")
    proposed_fix: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[str] = mapped_column(String, default="")
    verification_method: Mapped[str] = mapped_column(String, default="")


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="success")
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String, default="")
