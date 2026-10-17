"""Link a lab order to its catalogue test and its chosen collection slot.

Both nullable: rows created before this have neither, and the API falls back
to matching by test name / slot start time for them.

Revision ID: f3a8d61c2b57
Revises: a1c7e93f5d20
Create Date: 2026-10-17
"""
import sqlalchemy as sa

from alembic import op

revision = "f3a8d61c2b57"
down_revision = "a1c7e93f5d20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("care_lab_orders", sa.Column("catalog_item_id", sa.String(), nullable=True))
    op.add_column("care_lab_orders", sa.Column("slot_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("care_lab_orders", "slot_id")
    op.drop_column("care_lab_orders", "catalog_item_id")
