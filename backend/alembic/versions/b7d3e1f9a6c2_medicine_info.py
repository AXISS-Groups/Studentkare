"""Medicine information: reviewed label fields, their audit trail and dataset imports (commerce plane).

- ``care_medicine_info_fields``: one row per medicine per field (identity fields
  reviewed against the master's current value; monograph fields hold their
  value), each with its source, reviewer, review date and the hash of what was
  approved. Nothing reaches users unless reviewed.
- ``care_medicine_info_events``: append-only trail (ids and hashes, no text);
  the commerce role gets SELECT and INSERT only.
- ``care_medicine_info_imports``: licensed-dataset CSV imports (counts, row errors).

Product reference data, no person: commerce plane beside care_medicines (core/rule_l.py).
Plan tier1-medicine-info-2026-10-22, approved by the founder 2026-10-22.

Revision ID: b7d3e1f9a6c2
Revises: f6c4a2e81d37
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "b7d3e1f9a6c2"
down_revision = "f6c4a2e81d37"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())
    if "care_medicine_info_fields" not in existing:
        op.create_table(
            "care_medicine_info_fields",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("medicine_id", sa.String(), sa.ForeignKey("care_medicines.id"), nullable=False),
            sa.Column("field", sa.String(24), nullable=False),
            sa.Column("value", sa.JSON(), nullable=True),
            sa.Column("source_title", sa.String(200), nullable=False, server_default=""),
            sa.Column("source_url", sa.String(2000), nullable=False, server_default=""),
            sa.Column("state", sa.String(12), nullable=False, server_default="UNREVIEWED"),
            sa.Column("reviewed_by", sa.String(), nullable=True),
            sa.Column("reviewed_on", sa.Date(), nullable=True),
            sa.Column("reviewed_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("reviewed_hash", sa.String(64), nullable=False, server_default=""),
            sa.Column("import_id", sa.String(), nullable=True),
            sa.Column("updated_by", sa.String(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
            sa.UniqueConstraint("medicine_id", "field"),
            sa.CheckConstraint("state IN ('UNREVIEWED', 'REVIEWED')", name="ck_care_medicine_info_fields_state"),
        )
        op.create_index("ix_care_medicine_info_fields_medicine_id", "care_medicine_info_fields", ["medicine_id"])
        op.create_index("ix_care_medicine_info_fields_state", "care_medicine_info_fields", ["state"])
    if "care_medicine_info_events" not in existing:
        op.create_table(
            "care_medicine_info_events",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("medicine_id", sa.String(), sa.ForeignKey("care_medicines.id"), nullable=False),
            sa.Column("field", sa.String(24), nullable=False, server_default=""),
            sa.Column("action", sa.String(24), nullable=False),
            sa.Column("actor_id", sa.String(), nullable=False, server_default=""),
            sa.Column("actor_role", sa.String(24), nullable=False, server_default=""),
            sa.Column("value_hash", sa.String(64), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False),
        )
        op.create_index("ix_care_medicine_info_events_medicine_id", "care_medicine_info_events", ["medicine_id"])
        op.create_index("ix_care_medicine_info_events_created_at", "care_medicine_info_events", ["created_at"])
    if "care_medicine_info_imports" not in existing:
        op.create_table(
            "care_medicine_info_imports",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("filename", sa.String(200), nullable=False, server_default=""),
            sa.Column("dataset", sa.String(200), nullable=False),
            sa.Column("licence", sa.String(300), nullable=False),
            sa.Column("source_url", sa.String(2000), nullable=False, server_default=""),
            sa.Column("rows_total", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("rows_created", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("rows_matched", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("rows_rejected", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("errors", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("created_by", sa.String(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_medicine_info_imports")
    op.drop_index("ix_care_medicine_info_events_created_at", table_name="care_medicine_info_events")
    op.drop_index("ix_care_medicine_info_events_medicine_id", table_name="care_medicine_info_events")
    op.drop_table("care_medicine_info_events")
    op.drop_index("ix_care_medicine_info_fields_state", table_name="care_medicine_info_fields")
    op.drop_index("ix_care_medicine_info_fields_medicine_id", table_name="care_medicine_info_fields")
    op.drop_table("care_medicine_info_fields")
