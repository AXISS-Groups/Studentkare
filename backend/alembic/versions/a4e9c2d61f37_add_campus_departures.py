"""Add campus departures (a student graduating, transferring or taking a break)."""
import sqlalchemy as sa

from alembic import op

revision = "a4e9c2d61f37"
down_revision = "7c5d1e2a4b90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_campus_departures",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("university", sa.String(160), nullable=False, server_default=""),
        sa.Column("reason", sa.String(16), nullable=False),
        sa.Column("destination", sa.String(160), nullable=False, server_default=""),
        sa.Column("effective_on", sa.String(10), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="SCHEDULED"),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("completed_at", sa.Float(), nullable=False, server_default="0"),
    )
    for column in ("account_id", "effective_on", "status"):
        op.create_index(f"ix_care_campus_departures_{column}", "care_campus_departures", [column])


def downgrade() -> None:
    op.drop_table("care_campus_departures")
