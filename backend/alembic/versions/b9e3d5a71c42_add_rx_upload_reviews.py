"""Add care_rx_upload_reviews: a student's uploaded prescription sent for a pharmacist's check.

The file itself stays in care_documents (category PRESCRIPTION); this table only
links it to one pharmacy's review and records the outcome. CLINICAL in
core/rule_l.py, so the grants are re-applied here (P23).

Revision ID: b9e3d5a71c42
Revises: d9e2a7c41b58
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "b9e3d5a71c42"
down_revision = "d9e2a7c41b58"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_rx_upload_reviews",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("patient_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("pharmacy_id", sa.String(), sa.ForeignKey("care_service_providers.id"), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="PENDING"),
        sa.Column("verified_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("verified_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reviewer_account_id", sa.String(), nullable=False, server_default=""),
        sa.Column("checks", sa.JSON(), nullable=False),
        sa.Column("rejection_reason", sa.String(300), nullable=False, server_default=""),
        sa.Column("link_token_hash", sa.String(64), nullable=False, server_default=""),
        sa.Column("link_issued_to", sa.String(), nullable=False, server_default=""),
        sa.Column("link_expires_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_viewed_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    for column in ("document_id", "patient_id", "pharmacy_id", "status", "created_at"):
        op.create_index(f"ix_care_rx_upload_reviews_{column}", "care_rx_upload_reviews", [column])

    from core.rule_l import apply_grants

    apply_grants(op.get_bind())


def downgrade() -> None:
    for column in ("created_at", "status", "pharmacy_id", "patient_id", "document_id"):
        op.drop_index(f"ix_care_rx_upload_reviews_{column}", table_name="care_rx_upload_reviews")
    op.drop_table("care_rx_upload_reviews")
