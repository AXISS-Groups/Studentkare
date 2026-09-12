"""Persistent account, clinical-self-service, and operational workflow tables."""
from sqlalchemy import String, Integer, Float, Boolean, JSON, LargeBinary, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from services.db_sql import Base


class Account(Base):
    __tablename__ = "care_accounts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    identifier: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    channel: Mapped[str] = mapped_column(String(16))
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(24), default="STUDENT")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    profile: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[float] = mapped_column(Float)


class Session(Base):
    __tablename__ = "care_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    csrf_token: Mapped[str] = mapped_column(String(100))
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class OtpChallenge(Base):
    __tablename__ = "care_otp_challenges"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    identifier: Mapped[str] = mapped_column(String(254), index=True)
    intent: Mapped[str] = mapped_column(String(12))
    channel: Mapped[str] = mapped_column(String(16))
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[float] = mapped_column(Float)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)


class SignupGrant(Base):
    __tablename__ = "care_signup_grants"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    identifier: Mapped[str] = mapped_column(String(254))
    channel: Mapped[str] = mapped_column(String(16))
    csrf_token: Mapped[str] = mapped_column(String(100))
    expires_at: Mapped[float] = mapped_column(Float)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)


class RateBucket(Base):
    __tablename__ = "care_rate_buckets"
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class Reading(Base):
    __tablename__ = "care_readings"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    metric: Mapped[str] = mapped_column(String(30), index=True)
    value: Mapped[float] = mapped_column(Float)
    recorded_at: Mapped[str] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(30), default="MANUAL")


class Document(Base):
    __tablename__ = "care_documents"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(30))
    filename: Mapped[str] = mapped_column(String(200))
    mime_type: Mapped[str] = mapped_column(String(100))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[float] = mapped_column(Float)


class Preference(Base):
    __tablename__ = "care_preferences"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    saved_exercises: Mapped[list] = mapped_column(JSON, default=list)
    completed_tasks: Mapped[list] = mapped_column(JSON, default=list)
    task_date: Mapped[str] = mapped_column(String(10), default="")


class ExerciseSession(Base):
    __tablename__ = "care_exercise_sessions"
    __table_args__ = (UniqueConstraint("account_id", "client_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    client_id: Mapped[str] = mapped_column(String(80))
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    summary: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[float] = mapped_column(Float)


class CatalogEntry(Base):
    __tablename__ = "care_catalog"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(160))
    brand: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(String(2000))
    pack: Mapped[str] = mapped_column(String(160))
    price_paise: Mapped[int] = mapped_column(Integer)
    mrp_paise: Mapped[int] = mapped_column(Integer, default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False)
    preparation: Mapped[str] = mapped_column(String(1000), default="")


class Order(Base):
    __tablename__ = "care_orders"
    __table_args__ = (UniqueConstraint("account_id", "idempotency_key"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    request_hash: Mapped[str] = mapped_column(String(64))
    total_paise: Mapped[int] = mapped_column(Integer)
    delivery: Mapped[dict] = mapped_column(JSON)
    requested_slot: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[float] = mapped_column(Float, index=True)


class OrderLine(Base):
    __tablename__ = "care_order_lines"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("care_orders.id"), index=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("care_catalog.id"))
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer)
    price_paise: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="REQUESTED")


class Policy(Base):
    __tablename__ = "care_policies"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    insurer: Mapped[str] = mapped_column(String(100))
    policy_number: Mapped[str] = mapped_column(String(100))
    sum_insured: Mapped[int] = mapped_column(Integer)
    valid_until: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[float] = mapped_column(Float)


class SupportRequest(Base):
    __tablename__ = "care_support_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    subject: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(String(2000))
    status: Mapped[str] = mapped_column(String(20), default="OPEN")
    created_at: Mapped[float] = mapped_column(Float)


class WorkflowAudit(Base):
    __tablename__ = "care_workflow_audit"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    actor_id: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[float] = mapped_column(Float, index=True)


class HomeContent(Base):
    """Landing-page marketing copy stored per section. Never auto-populated."""
    __tablename__ = "care_home_content"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(160), default="")
    eyebrow: Mapped[str] = mapped_column(String(80), default="")
    body: Mapped[str] = mapped_column(String(4000), default="")
    summary: Mapped[str] = mapped_column(String(400), default="")
    action: Mapped[str] = mapped_column(String(120), default="")
    target: Mapped[str] = mapped_column(String(40), default="")
    icon: Mapped[str] = mapped_column(String(40), default="")
    color: Mapped[str] = mapped_column(String(20), default="")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Article(Base):
    __tablename__ = "care_articles"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    tag: Mapped[str] = mapped_column(String(60), default="")
    title: Mapped[str] = mapped_column(String(180))
    read_time: Mapped[str] = mapped_column(String(20), default="")
    color: Mapped[str] = mapped_column(String(20), default="")
    body: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class SystemSetting(Base):
    """Persistent key-value store for runtime configuration (integrations, etc)."""
    __tablename__ = "care_system_settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)
