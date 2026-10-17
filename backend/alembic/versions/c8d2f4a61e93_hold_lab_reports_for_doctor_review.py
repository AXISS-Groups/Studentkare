"""Hold lab reports for doctor review before release.

Revision ID: c8d2f4a61e93
Revises: b4e1c9d27f30
Create Date: 2026-10-16
"""
import sqlalchemy as sa

from alembic import op

revision = "c8d2f4a61e93"
down_revision = "b4e1c9d27f30"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("care_lab_orders", sa.Column("report_content", sa.LargeBinary(), nullable=True))
    op.add_column("care_lab_orders", sa.Column("report_mime", sa.String(100), nullable=False, server_default=""))
    op.add_column("care_lab_orders", sa.Column("report_filename", sa.String(200), nullable=False, server_default=""))
    op.add_column("care_lab_orders", sa.Column("reviewer_id", sa.String(), nullable=False, server_default=""))
    op.add_column("care_lab_orders", sa.Column("reviewed_at", sa.Float(), nullable=False, server_default="0"))
    op.add_column("care_lab_orders", sa.Column("review_note", sa.String(1000), nullable=False, server_default=""))
    op.create_index("ix_care_lab_orders_reviewer_id", "care_lab_orders", ["reviewer_id"])


def downgrade() -> None:
    op.drop_index("ix_care_lab_orders_reviewer_id", table_name="care_lab_orders")
    for column in ("review_note", "reviewed_at", "reviewer_id", "report_filename", "report_mime", "report_content"):
        op.drop_column("care_lab_orders", column)
