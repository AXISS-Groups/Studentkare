"""Automation hook delivery log.

``care_automation_deliveries`` records which ops-feed events were handed to the
self-hosted automation tool (services/automation_hook.py): the event id, its kind and
when. No account and no payload. Platform plane; additive.

Revision ID: d2b7c5e8f104
Revises: c9d4e7a1b3f6
Create Date: 2026-11-14
"""
import sqlalchemy as sa

from alembic import op

revision = "d2b7c5e8f104"
down_revision = "c9d4e7a1b3f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_automation_deliveries",
        sa.Column("event_id", sa.String(), primary_key=True),
        sa.Column("kind", sa.String(48), nullable=False),
        sa.Column("sent_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_automation_deliveries_sent_at", "care_automation_deliveries", ["sent_at"])


def downgrade() -> None:
    op.drop_index("ix_care_automation_deliveries_sent_at", table_name="care_automation_deliveries")
    op.drop_table("care_automation_deliveries")
