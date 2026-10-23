"""Push notifications: devices, deliveries, announcements, per-category channels.

* ``care_push_devices``: an account's phones (Expo push tokens) and browsers
  (Web Push subscriptions). Identity plane.
* ``care_push_deliveries``: one push to one device for one notification or
  announcement; ids and states only. Clinical plane.
* ``care_announcements``: super-admin pushes to a campus or everyone, checked
  non-health text, counts only. Platform plane.
* ``care_notification_preferences``: per-category channels (JSON) and the
  separate offers opt-in, off by default.

Revision ID: c4f8a2d6e913
Revises: e7c3a9f1b204
Create Date: 2026-10-23
"""
import sqlalchemy as sa

from alembic import op

revision = "c4f8a2d6e913"
down_revision = "e7c3a9f1b204"
branch_labels = None
depends_on = None

PREFS = "care_notification_preferences"
DEVICES = "care_push_devices"
DELIVERIES = "care_push_deliveries"
ANNOUNCEMENTS = "care_announcements"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    columns = {column["name"] for column in inspector.get_columns(PREFS)} if PREFS in tables else set()
    if PREFS in tables:
        if "channels" not in columns:
            op.add_column(PREFS, sa.Column("channels", sa.JSON(), nullable=False, server_default="{}"))
        if "marketing_opt_in" not in columns:
            op.add_column(PREFS, sa.Column("marketing_opt_in", sa.Boolean(), nullable=False, server_default=sa.false()))
        if "marketing_opt_in_at" not in columns:
            op.add_column(PREFS, sa.Column("marketing_opt_in_at", sa.Float(), nullable=False, server_default="0"))
    if DEVICES not in tables:
        op.create_table(
            "care_push_devices",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("kind", sa.String(8), nullable=False),
            sa.Column("token", sa.String(1024), nullable=False, unique=True),
            sa.Column("p256dh", sa.String(128), nullable=False, server_default=""),
            sa.Column("auth", sa.String(64), nullable=False, server_default=""),
            sa.Column("platform", sa.String(12), nullable=False, server_default=""),
            sa.Column("locale", sa.String(8), nullable=False, server_default="en"),
            sa.Column("sign_in_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("last_seen_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("revoked_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("revoke_reason", sa.String(40), nullable=False, server_default=""),
            sa.CheckConstraint("kind IN ('EXPO', 'WEB')", name="ck_care_push_devices_kind"),
        )
        op.create_index("ix_care_push_devices_account_id", DEVICES, ["account_id"])
        op.create_index("ix_care_push_devices_revoked_at", DEVICES, ["revoked_at"])
    if DELIVERIES not in tables:
        op.create_table(
            "care_push_deliveries",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("source", sa.String(12), nullable=False),
            sa.Column("source_id", sa.String(), nullable=False),
            sa.Column("device_id", sa.String(), sa.ForeignKey("care_push_devices.id"), nullable=False),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("category", sa.String(16), nullable=False),
            sa.Column("urgent", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("status", sa.String(12), nullable=False, server_default="PENDING"),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("next_attempt_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("ticket_id", sa.String(80), nullable=False, server_default=""),
            sa.Column("last_error", sa.String(60), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("sent_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("receipt_checked_at", sa.Float(), nullable=False, server_default="0"),
            sa.UniqueConstraint("source", "source_id", "device_id", name="uq_care_push_deliveries_source_device"),
            sa.CheckConstraint("source IN ('OUTBOX', 'ANNOUNCEMENT')", name="ck_care_push_deliveries_source"),
        )
        op.create_index("ix_care_push_deliveries_source_id", DELIVERIES, ["source_id"])
        op.create_index("ix_care_push_deliveries_device_id", DELIVERIES, ["device_id"])
        op.create_index("ix_care_push_deliveries_status_next", DELIVERIES, ["status", "next_attempt_at"])
        op.create_index("ix_care_push_deliveries_account_sent", DELIVERIES, ["account_id", "sent_at"])
    if ANNOUNCEMENTS not in tables:
        op.create_table(
            "care_announcements",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("kind", sa.String(16), nullable=False),
            sa.Column("title", sa.String(120), nullable=False),
            sa.Column("body", sa.String(400), nullable=False),
            sa.Column("campus", sa.String(160), nullable=False, server_default=""),
            sa.Column("status", sa.String(12), nullable=False, server_default="SCHEDULED"),
            sa.Column("scheduled_at", sa.Float(), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("sent_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("recipients", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("cancelled_by", sa.String(), nullable=False, server_default=""),
            sa.Column("cancelled_at", sa.Float(), nullable=False, server_default="0"),
            sa.CheckConstraint("kind IN ('ANNOUNCEMENT', 'OFFER')", name="ck_care_announcements_kind"),
            sa.CheckConstraint("status IN ('SCHEDULED', 'SENDING', 'SENT', 'CANCELLED')",
                               name="ck_care_announcements_status"),
        )
        op.create_index("ix_care_announcements_status", ANNOUNCEMENTS, ["status"])
        op.create_index("ix_care_announcements_scheduled_at", ANNOUNCEMENTS, ["scheduled_at"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    for table in (DELIVERIES, DEVICES, ANNOUNCEMENTS):
        if table in tables:
            op.drop_table(table)
    if PREFS in tables:
        columns = {column["name"] for column in inspector.get_columns(PREFS)}
        for column in ("marketing_opt_in_at", "marketing_opt_in", "channels"):
            if column in columns:
                op.drop_column(PREFS, column)
