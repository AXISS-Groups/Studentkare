"""Add a run lease to scheduled jobs.

Lets several workers/replicas poll the same schedule while only one runs a job
at a time. A lease that is not released (a crashed worker) expires.
"""
import sqlalchemy as sa

from alembic import op

revision = "a1c7e93f5d20"
down_revision = "e5a7b3c90d14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("care_scheduled_jobs",
                  sa.Column("lease_owner", sa.String(80), nullable=False, server_default=""))
    op.add_column("care_scheduled_jobs",
                  sa.Column("lease_expires_at", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("care_scheduled_jobs", "lease_expires_at")
    op.drop_column("care_scheduled_jobs", "lease_owner")
