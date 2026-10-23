"""Add opt-in remembered devices for the sign-in screen."""
import sqlalchemy as sa

from alembic import op

revision = "a3f9c2d7e815"
down_revision = "d7b3f5a94c6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_remembered_devices",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("last_route", sa.String(60), nullable=False, server_default=""),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_remembered_devices_account_id", "care_remembered_devices", ["account_id"])
    op.create_index("ix_care_remembered_devices_expires_at", "care_remembered_devices", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_care_remembered_devices_expires_at", table_name="care_remembered_devices")
    op.drop_index("ix_care_remembered_devices_account_id", table_name="care_remembered_devices")
    op.drop_table("care_remembered_devices")
