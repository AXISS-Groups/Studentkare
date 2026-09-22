"""Add the cross-dashboard activity feed, partial dispensing and substitution approval.

Also extends lab orders with critical-value acknowledgement and a sample-rejection
reason, so a flagged result has to be read by someone and a rejected sample can be
recollected instead of the booking being lost.
"""
import sqlalchemy as sa

from alembic import op

revision = "e7c1b4d92a35"
down_revision = "d4a2c6e91f07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_ops_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("kind", sa.String(48), nullable=False),
        sa.Column("domain", sa.String(16), nullable=False),
        sa.Column("severity", sa.String(10), nullable=False, server_default="INFO"),
        sa.Column("actor_id", sa.String(), nullable=False, server_default=""),
        sa.Column("actor_role", sa.String(24), nullable=False, server_default=""),
        sa.Column("subject_id", sa.String(), nullable=False, server_default=""),
        sa.Column("provider_id", sa.String(), nullable=False, server_default=""),
        sa.Column("resource_type", sa.String(32), nullable=False, server_default=""),
        sa.Column("resource_id", sa.String(), nullable=False, server_default=""),
        sa.Column("summary", sa.String(300), nullable=False, server_default=""),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("acknowledged_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("acknowledged_by", sa.String(), nullable=False, server_default=""),
    )
    for column in ("kind", "domain", "severity", "actor_id", "subject_id", "provider_id",
                   "resource_id", "created_at"):
        op.create_index(f"ix_care_ops_events_{column}", "care_ops_events", [column])

    op.create_table(
        "care_dispense_items",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("dispense_id", sa.String(), sa.ForeignKey("care_dispenses.id"), nullable=False),
        sa.Column("prescription_item_id", sa.String(), sa.ForeignKey("care_prescription_items.id"), nullable=False),
        sa.Column("quantity_requested", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quantity_dispensed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(24), nullable=False, server_default="PENDING"),
        sa.Column("note", sa.String(300), nullable=False, server_default=""),
    )
    op.create_index("ix_care_dispense_items_dispense_id", "care_dispense_items", ["dispense_id"])
    op.create_index("ix_care_dispense_items_prescription_item_id", "care_dispense_items", ["prescription_item_id"])

    op.create_table(
        "care_substitution_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("dispense_id", sa.String(), sa.ForeignKey("care_dispenses.id"), nullable=False),
        sa.Column("prescription_item_id", sa.String(), sa.ForeignKey("care_prescription_items.id"), nullable=False),
        sa.Column("proposed_by", sa.String(), nullable=False, server_default=""),
        sa.Column("proposed_generic", sa.String(160), nullable=False, server_default=""),
        sa.Column("proposed_brand", sa.String(160), nullable=False, server_default=""),
        sa.Column("reason", sa.String(300), nullable=False, server_default=""),
        sa.Column("status", sa.String(16), nullable=False, server_default="PENDING"),
        sa.Column("decided_by", sa.String(), nullable=False, server_default=""),
        sa.Column("decided_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("decision_note", sa.String(300), nullable=False, server_default=""),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_substitution_requests_dispense_id", "care_substitution_requests", ["dispense_id"])
    op.create_index("ix_care_substitution_requests_status", "care_substitution_requests", ["status"])
    op.create_index("ix_care_substitution_requests_created_at", "care_substitution_requests", ["created_at"])

    op.add_column("care_lab_orders", sa.Column("critical_acknowledged_at", sa.Float(), nullable=False, server_default="0"))
    op.add_column("care_lab_orders", sa.Column("critical_acknowledged_by", sa.String(), nullable=False, server_default=""))
    op.add_column("care_lab_orders", sa.Column("rejection_reason", sa.String(300), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("care_lab_orders", "rejection_reason")
    op.drop_column("care_lab_orders", "critical_acknowledged_by")
    op.drop_column("care_lab_orders", "critical_acknowledged_at")
    op.drop_table("care_substitution_requests")
    op.drop_table("care_dispense_items")
    op.drop_table("care_ops_events")
