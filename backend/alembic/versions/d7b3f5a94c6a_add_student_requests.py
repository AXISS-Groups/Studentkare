"""Add return, hostel-visit and refill requests."""
import sqlalchemy as sa

from alembic import op

revision = "d7b3f5a94c6a"
down_revision = "c6a2e4f83b59"
branch_labels = None
depends_on = None

ACC = "care_accounts.id"


def upgrade() -> None:
    op.create_table(
        "care_return_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey(ACC), nullable=False),
        sa.Column("order_line_id", sa.String(), sa.ForeignKey("care_order_lines.id"), nullable=False),
        sa.Column("provider_id", sa.String(), sa.ForeignKey(ACC), nullable=False),
        sa.Column("reason", sa.String(20), nullable=False),
        sa.Column("note", sa.String(500), nullable=False, server_default=""),
        sa.Column("photo", sa.LargeBinary(), nullable=True),
        sa.Column("photo_mime", sa.String(40), nullable=False, server_default=""),
        sa.Column("status", sa.String(16), nullable=False, server_default="REQUESTED"),
        sa.Column("refund_paise", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("decision_note", sa.String(500), nullable=False, server_default=""),
        sa.Column("decided_by", sa.String(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    for c in ("account_id", "order_line_id", "provider_id", "status", "created_at"):
        op.create_index(f"ix_care_return_requests_{c}", "care_return_requests", [c])
    op.create_table(
        "care_hostel_visit_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey(ACC), nullable=False),
        sa.Column("service", sa.String(16), nullable=False),
        sa.Column("hostel_block", sa.String(80), nullable=False),
        sa.Column("room", sa.String(40), nullable=False),
        sa.Column("window_start", sa.Float(), nullable=False),
        sa.Column("window_end", sa.Float(), nullable=False),
        sa.Column("note", sa.String(500), nullable=False, server_default=""),
        sa.Column("status", sa.String(16), nullable=False, server_default="REQUESTED"),
        sa.Column("assigned_provider_id", sa.String(), sa.ForeignKey(ACC), nullable=True),
        sa.Column("decision_note", sa.String(500), nullable=False, server_default=""),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    for c in ("account_id", "status", "assigned_provider_id", "created_at"):
        op.create_index(f"ix_care_hostel_visit_requests_{c}", "care_hostel_visit_requests", [c])
    op.create_table(
        "care_refill_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey(ACC), nullable=False),
        sa.Column("plan_id", sa.String(), sa.ForeignKey("care_medication_plans.id"), nullable=False),
        sa.Column("provider_id", sa.String(), sa.ForeignKey(ACC), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(500), nullable=False, server_default=""),
        sa.Column("status", sa.String(16), nullable=False, server_default="REQUESTED"),
        sa.Column("decision_note", sa.String(500), nullable=False, server_default=""),
        sa.Column("linked_order_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    for c in ("account_id", "plan_id", "provider_id", "status", "created_at"):
        op.create_index(f"ix_care_refill_requests_{c}", "care_refill_requests", [c])


def downgrade() -> None:
    op.drop_table("care_refill_requests")
    op.drop_table("care_hostel_visit_requests")
    op.drop_table("care_return_requests")
