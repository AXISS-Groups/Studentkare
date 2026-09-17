"""add billing subscription receipt benefit and contract tables

Revision ID: c3b7f1a9d8e4
Revises: 8b741c9d2e10
Create Date: 2026-09-14

"""
import sqlalchemy as sa

from alembic import op

revision = "c3b7f1a9d8e4"
down_revision = "8b741c9d2e10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_billing_subscriptions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("plan_id", sa.String(length=30), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("provider_subscription_id", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False),
        sa.Column("current_start", sa.Float(), nullable=False),
        sa.Column("current_end", sa.Float(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_care_billing_subscriptions_account_id", "care_billing_subscriptions", ["account_id"])
    op.create_index("ix_care_billing_subscriptions_provider_subscription_id",
                    "care_billing_subscriptions", ["provider_subscription_id"])
    op.create_table(
        "care_billing_receipts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("subscription_id", sa.String(), sa.ForeignKey("care_billing_subscriptions.id"), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("provider_invoice_id", sa.String(length=120), nullable=False),
        sa.Column("provider_payment_id", sa.String(length=120), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("billing_start", sa.Float(), nullable=False),
        sa.Column("billing_end", sa.Float(), nullable=False),
        sa.Column("paid_at", sa.Float(), nullable=False),
        sa.Column("refunded_paise", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_invoice_id"),
    )
    op.create_index("ix_care_billing_receipts_account_id", "care_billing_receipts", ["account_id"])
    op.create_index("ix_care_billing_receipts_subscription_id", "care_billing_receipts", ["subscription_id"])
    op.create_table(
        "care_benefit_requests",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("request_key", sa.String(length=80), nullable=False),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "request_key"),
    )
    op.create_index("ix_care_benefit_requests_account_id", "care_benefit_requests", ["account_id"])
    op.create_table(
        "care_enterprise_inquiries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("organization", sa.String(length=160), nullable=False),
        sa.Column("contact_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("seats", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.String(length=30), nullable=False),
        sa.Column("message", sa.String(length=4000), nullable=False),
        sa.Column("consent", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_care_enterprise_inquiries_email", "care_enterprise_inquiries", ["email"])
    op.create_table(
        "care_enterprise_contracts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("organization", sa.String(length=160), nullable=False),
        sa.Column("manager_account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("plan_id", sa.String(length=30), nullable=False),
        sa.Column("seats", sa.Integer(), nullable=False),
        sa.Column("annual_amount_paise", sa.Integer(), nullable=False),
        sa.Column("signed_reference", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("payment_reference", sa.String(length=160), nullable=False),
        sa.Column("amount_paid_paise", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.Float(), nullable=False),
        sa.Column("period_end", sa.Float(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_care_enterprise_contracts_manager_account_id",
                    "care_enterprise_contracts", ["manager_account_id"])
    op.create_table(
        "care_contract_seats",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("contract_id", sa.String(), sa.ForeignKey("care_enterprise_contracts.id"), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contract_id", "account_id"),
    )
    op.create_index("ix_care_contract_seats_contract_id", "care_contract_seats", ["contract_id"])
    op.create_index("ix_care_contract_seats_account_id", "care_contract_seats", ["account_id"])


def downgrade() -> None:
    op.drop_table("care_contract_seats")
    op.drop_table("care_enterprise_contracts")
    op.drop_table("care_enterprise_inquiries")
    op.drop_table("care_benefit_requests")
    op.drop_table("care_billing_receipts")
    op.drop_table("care_billing_subscriptions")
