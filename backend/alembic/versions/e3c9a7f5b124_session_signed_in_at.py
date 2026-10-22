"""When a session's sign-in happened, for the absolute session lifetime (audit L1).

``care_sessions.signed_in_at``: set at sign-in and carried across /auth/refresh,
so a session can't be renewed past ``auth.session_absolute_hours``. Existing
sessions keep 0 and get the current time at their next refresh.

Revision ID: e3c9a7f5b124
Revises: d2b8f6e4a013
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "e3c9a7f5b124"
down_revision = "d2b8f6e4a013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("care_sessions")}
    if "signed_in_at" not in columns:
        op.add_column("care_sessions", sa.Column("signed_in_at", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("care_sessions", "signed_in_at")
