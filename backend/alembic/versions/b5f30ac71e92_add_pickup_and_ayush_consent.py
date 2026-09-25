"""Two consents the Permissions screen offers but nothing could store.

Both default to false. A consent that defaults to granted is not a consent,
and DPDP asks for each purpose separately — so dorm pickup location and Ayush
chat retention are off until the student turns them on.

Hostel block and room live on the account profile JSON, not here, so they need
no migration.
"""
import sqlalchemy as sa

from alembic import op

revision = "b5f30ac71e92"
down_revision = "a9e4c21f83d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "care_notification_preferences",
        sa.Column("pickup_location_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "care_notification_preferences",
        sa.Column("ayush_history_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("care_notification_preferences", "ayush_history_enabled")
    op.drop_column("care_notification_preferences", "pickup_location_enabled")
