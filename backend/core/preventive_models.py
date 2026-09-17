"""Preventive care persistence; shares the existing care model metadata."""
from sqlalchemy import JSON, Boolean, CheckConstraint, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.workflow_models import Base


class PreventiveProvider(Base):
    __tablename__ = "care_preventive_providers"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    source_url: Mapped[str] = mapped_column(String(2000))
    booking_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    last_verified_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    expires_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[float] = mapped_column(Float)


class VaccineOffering(Base):
    __tablename__ = "care_preventive_vaccines"
    __table_args__ = (
        CheckConstraint("price_paise IS NULL OR price_paise >= 0", name="ck_preventive_vaccine_price"),
        CheckConstraint("availability IN ('UNKNOWN', 'CONFIRMED')", name="ck_preventive_availability"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_preventive_providers.id"), index=True)
    vaccine_name: Mapped[str] = mapped_column(String(160), index=True)
    pincode: Mapped[str] = mapped_column(String(6), index=True)
    region: Mapped[str] = mapped_column(String(100), default="")
    source_url: Mapped[str] = mapped_column(String(2000))
    last_verified_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    expires_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    availability: Mapped[str] = mapped_column(String(20), default="UNKNOWN")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[float] = mapped_column(Float)


class PreventivePreference(Base):
    __tablename__ = "care_preventive_preferences"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    seasonal_education_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    promotions_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    region: Mapped[str] = mapped_column(String(100), default="")
    topics: Mapped[list] = mapped_column(JSON, default=list)
    consent_version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[float] = mapped_column(Float)


class ReportReview(Base):
    __tablename__ = "care_preventive_report_reviews"
    __table_args__ = (
        CheckConstraint("status IN ('REQUESTED', 'ASSIGNED', 'APPROVED', 'REJECTED', 'WITHDRAWN')",
                        name="ck_preventive_review_status"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("care_documents.id", ondelete="CASCADE"), unique=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    assigned_clinician_id: Mapped[str | None] = mapped_column(ForeignKey("care_accounts.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="REQUESTED")
    version: Mapped[int] = mapped_column(Integer, default=1)
    document_hash: Mapped[str] = mapped_column(String(64))
    guidance: Mapped[dict] = mapped_column(JSON, default=dict)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("care_accounts.id"), nullable=True)
    reviewed_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)
