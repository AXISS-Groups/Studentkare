"""Add preventive directory, consent and reviewed report follow-up (no seeded data)."""
import sqlalchemy as sa

from alembic import op

revision = "8b741c9d2e10"
down_revision = "fe83ff8b6dc6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_preventive_providers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("source_url", sa.String(2000), nullable=False),
        sa.Column("booking_url", sa.String(2000), nullable=True),
        sa.Column("last_verified_at", sa.Float(), nullable=True),
        sa.Column("expires_at", sa.Float(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_preventive_providers_name", "care_preventive_providers", ["name"])
    op.create_table(
        "care_preventive_vaccines",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("provider_id", sa.String(), sa.ForeignKey("care_preventive_providers.id"), nullable=False),
        sa.Column("vaccine_name", sa.String(160), nullable=False),
        sa.Column("pincode", sa.String(6), nullable=False),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column("source_url", sa.String(2000), nullable=False),
        sa.Column("last_verified_at", sa.Float(), nullable=True),
        sa.Column("expires_at", sa.Float(), nullable=True),
        sa.Column("price_paise", sa.Integer(), nullable=True),
        sa.Column("availability", sa.String(20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.CheckConstraint("price_paise IS NULL OR price_paise >= 0", name="ck_preventive_vaccine_price"),
        sa.CheckConstraint("availability IN ('UNKNOWN', 'CONFIRMED')", name="ck_preventive_availability"),
    )
    for column in ("provider_id", "vaccine_name", "pincode"):
        op.create_index(f"ix_care_preventive_vaccines_{column}", "care_preventive_vaccines", [column])
    op.create_table(
        "care_preventive_preferences",
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
        sa.Column("seasonal_education_enabled", sa.Boolean(), nullable=False),
        sa.Column("promotions_enabled", sa.Boolean(), nullable=False),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column("topics", sa.JSON(), nullable=False),
        sa.Column("consent_version", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )
    op.create_table(
        "care_preventive_report_reviews",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("document_id", sa.String(), sa.ForeignKey("care_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("assigned_clinician_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("document_hash", sa.String(64), nullable=False),
        sa.Column("guidance", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=True),
        sa.Column("reviewed_by", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=True),
        sa.Column("reviewed_at", sa.Float(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.UniqueConstraint("document_id"),
        sa.CheckConstraint("status IN ('REQUESTED', 'ASSIGNED', 'APPROVED', 'REJECTED', 'WITHDRAWN')", name="ck_preventive_review_status"),
    )
    for column in ("account_id", "assigned_clinician_id"):
        op.create_index(f"ix_care_preventive_report_reviews_{column}", "care_preventive_report_reviews", [column])


def downgrade() -> None:
    op.drop_table("care_preventive_report_reviews")
    op.drop_table("care_preventive_preferences")
    op.drop_table("care_preventive_vaccines")
    op.drop_table("care_preventive_providers")
