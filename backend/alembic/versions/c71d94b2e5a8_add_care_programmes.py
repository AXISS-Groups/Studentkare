"""Chronic care programme enrolments, for the clinician chronic tracker.

The enrolment is the consent: a clinician's chronic list is scoped to the
programmes students agreed to be on with them, not to a campus roster. Nothing
existing carried this — FollowUpTask is order-driven and has no programme,
target or review cadence.

`state` is ACTIVE or ENDED_BY_STUDENT, and it is indexed with clinician_id
because the tracker's only query is "this clinician's active programmes".
Leaving is the student's alone: it ends the follow-up, keeps the row, and is
never published to the campus feed.
"""
import sqlalchemy as sa

from alembic import op

revision = "c71d94b2e5a8"
down_revision = "b5f30ac71e92"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_programmes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("clinician_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("programme", sa.String(length=120), nullable=False),
        sa.Column("target", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("review_interval_days", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("last_review_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("state", sa.String(length=24), nullable=False, server_default="ACTIVE"),
        sa.Column("ended_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_care_programmes_account_id", "care_programmes", ["account_id"])
    # The tracker's only query, so it is the index that matters.
    op.create_index("ix_care_programmes_clinician_state", "care_programmes", ["clinician_id", "state"])


def downgrade() -> None:
    op.drop_index("ix_care_programmes_clinician_state", table_name="care_programmes")
    op.drop_index("ix_care_programmes_account_id", table_name="care_programmes")
    op.drop_table("care_programmes")
