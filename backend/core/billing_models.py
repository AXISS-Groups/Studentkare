"""Persistent billing, subscription, benefit-quota, and institutional contract tables.

Commercial entitlements are stored here and enforced server-side. No code path
grants a benefit based on a client-supplied plan selection alone.
"""
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from services.db_sql import Base


class BillingSubscription(Base):
    """One account's relationship to a recurring paid plan."""
    __tablename__ = "care_billing_subscriptions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    plan_id: Mapped[str] = mapped_column(String(30))
    provider: Mapped[str] = mapped_column(String(30), default="RAZORPAY")
    provider_subscription_id: Mapped[str] = mapped_column(String(120), default="", index=True)
    status: Mapped[str] = mapped_column(String(24), default="CREATED")
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    current_start: Mapped[float] = mapped_column(Float, default=0.0)
    current_end: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class BillingReceipt(Base):
    """A verified paid invoice for a subscription."""
    __tablename__ = "care_billing_receipts"
    __table_args__ = (UniqueConstraint("provider", "provider_invoice_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    subscription_id: Mapped[str] = mapped_column(ForeignKey("care_billing_subscriptions.id"), index=True)
    provider: Mapped[str] = mapped_column(String(30), default="RAZORPAY")
    provider_invoice_id: Mapped[str] = mapped_column(String(120), default="")
    provider_payment_id: Mapped[str] = mapped_column(String(120), default="")
    amount_paise: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    billing_start: Mapped[float] = mapped_column(Float, default=0.0)
    billing_end: Mapped[float] = mapped_column(Float, default=0.0)
    paid_at: Mapped[float] = mapped_column(Float, default=0.0)
    refunded_paise: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class BenefitRequest(Base):
    """A consumed Student Plus benefit; idempotent per (account, plan period)."""
    __tablename__ = "care_benefit_requests"
    __table_args__ = (UniqueConstraint("account_id", "request_key"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    request_key: Mapped[str] = mapped_column(String(80))
    message: Mapped[str] = mapped_column(String(2000), default="")
    status: Mapped[str] = mapped_column(String(24), default="OPEN")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class EnterpriseInquiry(Base):
    """A submitted institutional inquiry from the public landing page."""
    __tablename__ = "care_enterprise_inquiries"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization: Mapped[str] = mapped_column(String(160))
    contact_name: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(254), index=True)
    seats: Mapped[int] = mapped_column(Integer, default=0)
    plan_id: Mapped[str] = mapped_column(String(30), default="ENTERPRISE")
    message: Mapped[str] = mapped_column(String(4000), default="")
    consent: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(24), default="NEW")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class EnterpriseContract(Base):
    """A signed institutional agreement with recorded payment and seat limits."""
    __tablename__ = "care_enterprise_contracts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization: Mapped[str] = mapped_column(String(160))
    manager_account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    plan_id: Mapped[str] = mapped_column(String(30), default="CAMPUS")
    seats: Mapped[int] = mapped_column(Integer, default=0)
    annual_amount_paise: Mapped[int] = mapped_column(Integer, default=0)
    signed_reference: Mapped[str] = mapped_column(String(160), default="")
    status: Mapped[str] = mapped_column(String(24), default="DRAFT")
    payment_reference: Mapped[str] = mapped_column(String(160), default="")
    amount_paid_paise: Mapped[int] = mapped_column(Integer, default=0)
    period_start: Mapped[float] = mapped_column(Float, default=0.0)
    period_end: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class ContractSeat(Base):
    """A seat granted under an institutional contract."""
    __tablename__ = "care_contract_seats"
    __table_args__ = (UniqueConstraint("contract_id", "account_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    contract_id: Mapped[str] = mapped_column(ForeignKey("care_enterprise_contracts.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
