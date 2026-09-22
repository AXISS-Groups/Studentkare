"""Persistent account, clinical-self-service, and operational workflow tables."""
from sqlalchemy import (
    JSON,
    Boolean,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    UniqueConstraint,
)
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
    image_id: Mapped[str] = mapped_column(String(80), nullable=True, default=None)
    image_mime: Mapped[str] = mapped_column(String(40), nullable=True, default=None)


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
    payment_status: Mapped[str] = mapped_column(String(24), default="UNPAID")
    created_at: Mapped[float] = mapped_column(Float, index=True)


class Payment(Base):
    __tablename__ = "care_payments"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("care_orders.id"), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), default="CREATED")
    provider: Mapped[str] = mapped_column(String(40), default="")
    provider_ref: Mapped[str] = mapped_column(String(120), default="")
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    settled_at: Mapped[float] = mapped_column(Float, default=0.0)


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


class ScheduledJob(Base):
    """A recurring or one-off background job. Durable so it survives restarts."""
    __tablename__ = "care_scheduled_jobs"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    interval_seconds: Mapped[int] = mapped_column(Integer, default=7200)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[float] = mapped_column(Float, default=0.0)
    next_run_at: Mapped[float] = mapped_column(Float, default=0.0)
    last_status: Mapped[str] = mapped_column(String(20), default="NEVER_RUN")
    last_error: Mapped[str] = mapped_column(String(1000), default="")


class AgentRun(Base):
    """One durable execution of a background/agent job."""
    __tablename__ = "care_agent_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_key: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(24), default="QUEUED")
    started_at: Mapped[float] = mapped_column(Float, default=0.0)
    finished_at: Mapped[float] = mapped_column(Float, default=0.0)
    error: Mapped[str] = mapped_column(String(1000), default="")
    summary: Mapped[dict] = mapped_column(JSON, default=dict)


class OutboxEvent(Base):
    """Durable intent to deliver a notification/message; prevents duplicate side effects."""
    __tablename__ = "care_outbox_events"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(60))
    account_id: Mapped[str] = mapped_column(String, index=True, default="")
    dedupe_key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    sent_at: Mapped[float] = mapped_column(Float, default=0.0)
    read_at: Mapped[float] = mapped_column(Float, default=0.0)
    last_error: Mapped[str] = mapped_column(String(1000), default="")


class MedicationPlan(Base):
    """An account-owned medication plan with explicit instructions and dates."""
    __tablename__ = "care_medication_plans"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    dosage: Mapped[str] = mapped_column(String(120), default="")
    frequency: Mapped[str] = mapped_column(String(120), default="")
    source: Mapped[str] = mapped_column(String(30), default="USER")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class MedicationDose(Base):
    """A logged dose occurrence. Unique per plan so duplicate logs cannot double-count."""
    __tablename__ = "care_medication_doses"
    __table_args__ = (UniqueConstraint("plan_id", "dose_date", "dose_time"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("care_medication_plans.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    dose_date: Mapped[str] = mapped_column(String(10))
    dose_time: Mapped[str] = mapped_column(String(8), default="")
    taken_at: Mapped[float] = mapped_column(Float, default=0.0)


class AvailabilitySlot(Base):
    """A bookable time slot for a provider/service. Capacity is reserved on booking."""
    __tablename__ = "care_availability_slots"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    catalog_item_id: Mapped[str] = mapped_column(ForeignKey("care_catalog.id"), index=True)
    slot_start: Mapped[str] = mapped_column(String(40))
    slot_end: Mapped[str] = mapped_column(String(40))
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    booked: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Appointment(Base):
    """A persisted, capacity-reserved appointment with an explicit state machine."""
    __tablename__ = "care_appointments"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    catalog_item_id: Mapped[str] = mapped_column(ForeignKey("care_catalog.id"), index=True)
    slot_id: Mapped[str] = mapped_column(ForeignKey("care_availability_slots.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="REQUESTED")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class NotificationPreference(Base):
    """User notification preferences: channels, timezone, and quiet hours."""
    __tablename__ = "care_notification_preferences"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    timezone: Mapped[str] = mapped_column(String(40), default="Asia/Kolkata")
    quiet_start: Mapped[str] = mapped_column(String(5), default="22:00")
    quiet_end: Mapped[str] = mapped_column(String(5), default="08:00")


class ClaimRequest(Base):
    """A user-submitted claim request. Explicitly not an insurer submission."""
    __tablename__ = "care_claim_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    policy_id: Mapped[str] = mapped_column(ForeignKey("care_policies.id"), index=True)
    provider_name: Mapped[str] = mapped_column(String(160), default="")
    service: Mapped[str] = mapped_column(String(160), default="")
    amount_paise: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="DRAFT")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class ReviewedBenefit(Base):
    """A reviewed insurance benefit entry (non-clinical coverage summary)."""
    __tablename__ = "care_reviewed_benefits"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    category: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(1000), default="")
    reviewed: Mapped[bool] = mapped_column(Boolean, default=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class RecordShare(Base):
    """A time-limited consent grant for a clinician to view a user's record."""
    __tablename__ = "care_record_shares"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    clinician_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("care_documents.id"), index=True)
    granted_at: Mapped[float] = mapped_column(Float, default=0.0)
    expires_at: Mapped[float] = mapped_column(Float, default=0.0)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_viewed_at: Mapped[float] = mapped_column(Float, default=0.0)


class DeletionRequest(Base):
    """A user-requested account/data deletion. Explicit, not immediate."""
    __tablename__ = "care_deletion_requests"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    requested_at: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    processed_at: Mapped[float] = mapped_column(Float, default=0.0)


class CampusVerification(Base):
    """A record of campus affiliation verification for a student account."""
    __tablename__ = "care_campus_verifications"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    university: Mapped[str] = mapped_column(String(160), default="")
    roll_number: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    verified_by: Mapped[str] = mapped_column(String, default="")
    verified_at: Mapped[float] = mapped_column(Float, default=0.0)


class HealthCamp(Base):
    """A health camp with a fixed station sequence."""
    __tablename__ = "care_health_camps"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    date: Mapped[str] = mapped_column(String(10))
    location: Mapped[str] = mapped_column(String(160), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class HealthCampStation(Base):
    """A station within a health camp."""
    __tablename__ = "care_health_camp_stations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    camp_id: Mapped[str] = mapped_column(ForeignKey("care_health_camps.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    sort: Mapped[int] = mapped_column(Integer, default=0)


class CampAttendance(Base):
    """A student's registration and per-station progress at a camp."""
    __tablename__ = "care_camp_attendances"
    __table_args__ = (UniqueConstraint("camp_id", "account_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    camp_id: Mapped[str] = mapped_column(ForeignKey("care_health_camps.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    checked_in: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_stations: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class ConsultationSession(Base):
    """A teleconsult session for a confirmed appointment. Tracks an honest state."""
    __tablename__ = "care_consultation_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("care_appointments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="WAITING")
    student_joined_at: Mapped[float] = mapped_column(Float, default=0.0)
    provider_joined_at: Mapped[float] = mapped_column(Float, default=0.0)
    ended_at: Mapped[float] = mapped_column(Float, default=0.0)
    signal_payload: Mapped[dict] = mapped_column(JSON, default=dict)


class KnowledgeSource(Base):
    """An approved, versioned knowledge entry with ownership and expiry."""
    __tablename__ = "care_knowledge_sources"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(60), default="GENERAL")
    content: Mapped[str] = mapped_column(String(4000), default="")
    author: Mapped[str] = mapped_column(String(120), default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    expires_at: Mapped[float] = mapped_column(Float, default=0.0)


class FollowUpTask(Base):
    """A staff follow-up task created from overdue care requests."""
    __tablename__ = "care_followup_tasks"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(String, index=True, default="")
    account_id: Mapped[str] = mapped_column(String, index=True, default="")
    note: Mapped[str] = mapped_column(String(400), default="")
    status: Mapped[str] = mapped_column(String(24), default="OPEN")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    resolved_at: Mapped[float] = mapped_column(Float, default=0.0)


class DocumentIntake(Base):
    """A document queued for extraction, with an explicit processing state."""
    __tablename__ = "care_document_intake"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("care_documents.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="QUEUED")
    extractor: Mapped[str] = mapped_column(String(40), default="")
    draft: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    processed_at: Mapped[float] = mapped_column(Float, default=0.0)


class IntakeReviewItem(Base):
    """A field extracted from a document that needs human review before use."""
    __tablename__ = "care_intake_review_items"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    intake_id: Mapped[str] = mapped_column(ForeignKey("care_document_intake.id"), index=True)
    field: Mapped[str] = mapped_column(String(60))
    value: Mapped[str] = mapped_column(String(500), default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    reviewed_by: Mapped[str] = mapped_column(String, default="")
    reviewed_at: Mapped[float] = mapped_column(Float, default=0.0)


class EncounterNote(Base):
    """A clinician-authored encounter note draft linked to a patient."""
    __tablename__ = "care_encounter_notes"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    appointment_id: Mapped[str] = mapped_column(String, index=True, default="")
    subjective: Mapped[str] = mapped_column(String(2000), default="")
    objective: Mapped[str] = mapped_column(String(2000), default="")
    assessment: Mapped[str] = mapped_column(String(2000), default="")
    plan: Mapped[str] = mapped_column(String(2000), default="")
    status: Mapped[str] = mapped_column(String(24), default="DRAFT")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class BloodDonor(Base):
    """A consent-registered student blood donor with contact info and availability."""
    __tablename__ = "care_blood_donors"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    blood_group: Mapped[str] = mapped_column(String(5), index=True)
    hostel_block: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(20))
    last_donated: Mapped[str] = mapped_column(String(40), default="")
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    visible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class BloodSOSRequest(Base):
    """An emergency blood request with matched donor count and delivery status."""
    __tablename__ = "care_blood_sos_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    patient_name: Mapped[str] = mapped_column(String(120))
    required_group: Mapped[str] = mapped_column(String(5))
    units_needed: Mapped[int] = mapped_column(Integer, default=1)
    hospital_location: Mapped[str] = mapped_column(String(200))
    urgency: Mapped[str] = mapped_column(String(20), default="CRITICAL")
    matching_donors_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="QUEUED")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
