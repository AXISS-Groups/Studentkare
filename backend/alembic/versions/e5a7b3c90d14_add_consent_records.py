"""Record DPDP consent given at signup.

Revision ID: e5a7b3c90d14
Revises: c8d2f4a61e93
Create Date: 2026-10-16
"""
import sqlalchemy as sa

from alembic import op

revision = "e5a7b3c90d14"
down_revision = "c8d2f4a61e93"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_consent_records",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("version", sa.String(40), nullable=False),
        sa.Column("purposes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("language", sa.String(5), nullable=False, server_default="en"),
        sa.Column("recorded_at", sa.Float(), nullable=False),
        sa.Column("withdrawn_at", sa.Float(), nullable=False, server_default="0"),
    )
    for column in ("account_id", "version", "recorded_at"):
        op.create_index(f"ix_care_consent_records_{column}", "care_consent_records", [column])


def downgrade() -> None:
    op.drop_table("care_consent_records")
