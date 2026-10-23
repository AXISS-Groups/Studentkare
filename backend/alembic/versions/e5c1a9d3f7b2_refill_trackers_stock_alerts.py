"""Refill reminders and back-in-stock alerts.

* ``care_refill_trackers``: a medicine the student counts down to a refill
  reminder, from their own pack size and dose schedule. Clinical plane.
* ``care_stock_alerts``: "tell me when this item is back", an account id and a
  catalogue item id only. Commerce plane.

Revision ID: e5c1a9d3f7b2
Revises: e7c3a9d5b241
Create Date: 2026-10-23
"""
import sqlalchemy as sa

from alembic import op

revision = "e5c1a9d3f7b2"
down_revision = "e7c3a9d5b241"
branch_labels = None
depends_on = None

TRACKERS = "care_refill_trackers"
ALERTS = "care_stock_alerts"


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if TRACKERS not in tables:
        op.create_table(
            "care_refill_trackers",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("source", sa.String(8), nullable=False),
            sa.Column("plan_id", sa.String(), sa.ForeignKey("care_medication_plans.id"), nullable=True),
            sa.Column("order_id", sa.String(), nullable=True),
            sa.Column("item_id", sa.String(), nullable=True),
            sa.Column("label", sa.String(160), nullable=False),
            sa.Column("pack_size", sa.Integer(), nullable=False),
            sa.Column("packs", sa.Integer(), nullable=False),
            sa.Column("units_per_dose", sa.Integer(), nullable=False),
            sa.Column("doses_per_day", sa.Integer(), nullable=False),
            sa.Column("units_on_hand", sa.Integer(), nullable=False),
            sa.Column("anchor_on", sa.String(10), nullable=False),
            sa.Column("remind_days_before", sa.Integer(), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False),
            sa.Column("snoozed_until", sa.Float(), nullable=False, server_default="0"),
            sa.Column("runs_out_on", sa.String(10), nullable=False, server_default=""),
            sa.Column("remind_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("reminded_for", sa.String(10), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
            sa.CheckConstraint("source IN ('ORDER', 'PLAN')", name="ck_care_refill_trackers_source"),
            sa.CheckConstraint("pack_size > 0 AND packs > 0 AND units_per_dose > 0 AND doses_per_day > 0",
                               name="ck_care_refill_trackers_counts"),
            sa.CheckConstraint("units_on_hand >= 0", name="ck_care_refill_trackers_on_hand"),
        )
        for column in ("account_id", "plan_id", "remind_at"):
            op.create_index(f"ix_care_refill_trackers_{column}", TRACKERS, [column])
    if ALERTS not in tables:
        op.create_table(
            "care_stock_alerts",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("item_id", sa.String(), sa.ForeignKey("care_catalog.id"), nullable=False),
            sa.Column("status", sa.String(12), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("notified_at", sa.Float(), nullable=False, server_default="0"),
            sa.UniqueConstraint("account_id", "item_id"),
            sa.CheckConstraint("status IN ('WAITING', 'NOTIFIED', 'CANCELLED')", name="ck_care_stock_alerts_status"),
        )
        for column in ("account_id", "item_id", "status"):
            op.create_index(f"ix_care_stock_alerts_{column}", ALERTS, [column])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if ALERTS in tables:
        op.drop_table(ALERTS)
    if TRACKERS in tables:
        op.drop_table(TRACKERS)
