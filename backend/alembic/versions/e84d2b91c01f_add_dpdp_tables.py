"""Add DPDP tables for erasure requests and consent policy versions.

Revision ID: e84d2b91c01f
Revises: d83c5a1e07b4
Create Date: 2026-10-05
"""
import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision = "e84d2b91c01f"
# Ordered after 7c5d1e2a4b90: both branched from d83c5a1e07b4, leaving two heads,
# and the chain must stay linear (tests/test_migration_integrity.py).
down_revision = "7c5d1e2a4b90"
branch_labels = None
depends_on = None


def _has(table: str) -> bool:
    return table in set(inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if not _has("care_dpdp_erasure_requests"):
        op.create_table(
            "care_dpdp_erasure_requests",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("student_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("request_date", sa.Float(), nullable=False),
            sa.Column("scheduled_erasure_date", sa.Float(), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="PENDING"),
            sa.Column("legally_retained_items", sa.JSON(), nullable=False, server_default="[]"),
        )
        op.create_index("ix_care_dpdp_erasure_requests_student_id", "care_dpdp_erasure_requests", ["student_id"])
        op.create_index("ix_care_dpdp_erasure_requests_request_date", "care_dpdp_erasure_requests", ["request_date"])
        op.create_index(
            "ix_care_dpdp_erasure_requests_scheduled_erasure_date",
            "care_dpdp_erasure_requests",
            ["scheduled_erasure_date"],
        )

    if not _has("care_dpdp_consent_policy_versions"):
        op.create_table(
            "care_dpdp_consent_policy_versions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("version", sa.String(length=40), nullable=False, unique=True),
            sa.Column("title", sa.String(length=160), nullable=False),
            sa.Column("change_summary", sa.String(length=2000), nullable=False),
            sa.Column("effective_date", sa.Float(), nullable=False),
            sa.Column("force_reconsent", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    for table in ("care_dpdp_consent_policy_versions", "care_dpdp_erasure_requests"):
        if _has(table):
            op.drop_table(table)
