"""Add SOS alerts, their per-recipient deliveries, and campus security contacts."""
import sqlalchemy as sa

from alembic import op

revision = "b5f1d3e72a48"
down_revision = "a4e9c2d61f37"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_sos_alerts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("campus", sa.String(160), nullable=False, server_default=""),
        sa.Column("location_note", sa.String(300), nullable=False, server_default=""),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("acknowledged_by", sa.String(), nullable=False, server_default=""),
        sa.Column("acknowledged_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("resolved_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("resolution_note", sa.String(1000), nullable=False, server_default=""),
        sa.Column("cancelled_at", sa.Float(), nullable=False, server_default="0"),
    )
    for column in ("account_id", "campus", "status", "created_at"):
        op.create_index(f"ix_care_sos_alerts_{column}", "care_sos_alerts", [column])
    op.create_table(
        "care_sos_deliveries",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("alert_id", sa.String(), sa.ForeignKey("care_sos_alerts.id"), nullable=False),
        sa.Column("recipient_kind", sa.String(20), nullable=False),
        sa.Column("channel", sa.String(12), nullable=False),
        sa.Column("recipient_label", sa.String(160), nullable=False, server_default=""),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("detail", sa.String(200), nullable=False, server_default=""),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_sos_deliveries_alert_id", "care_sos_deliveries", ["alert_id"])
    op.create_table(
        "care_campus_security_contacts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("campus", sa.String(160), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_campus_security_contacts_campus", "care_campus_security_contacts", ["campus"])


def downgrade() -> None:
    op.drop_table("care_sos_deliveries")
    op.drop_table("care_sos_alerts")
    op.drop_table("care_campus_security_contacts")
