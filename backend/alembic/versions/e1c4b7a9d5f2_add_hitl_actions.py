"""Held high-stakes AI actions awaiting clinician sign-off.

- care_hitl_actions (platform plane): the human-in-the-loop queue, persisted so
  it survives a restart and is shared across replicas. Each row names the student
  it is about and the campus it belongs to, and the clinician who must release it.
  No person's health lives in the row beyond the scoping ids, so neither group
  role is granted anything on it (platform, like the rest of the ops trail).

Revision ID: e1c4b7a9d5f2
Revises: a9e4c7d21b58
Create Date: 2026-10-30
"""
import sqlalchemy as sa

from alembic import op

revision = "e1c4b7a9d5f2"
down_revision = "a9e4c7d21b58"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "care_hitl_actions" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "care_hitl_actions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("action_type", sa.String(48), nullable=False, server_default=""),
            sa.Column("title", sa.String(300), nullable=False, server_default=""),
            sa.Column("patient_name", sa.String(120), nullable=False, server_default=""),
            sa.Column("requested_by", sa.String(64), nullable=False, server_default=""),
            sa.Column("summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("risk_level", sa.String(24), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="PENDING_DOCTOR_APPROVAL"),
            sa.Column("created_at", sa.String(40), nullable=False, server_default=""),
            sa.Column("patient_id", sa.String(), nullable=False, server_default=""),
            sa.Column("campus", sa.String(160), nullable=False, server_default=""),
            sa.Column("assigned_clinician", sa.String(120), nullable=False, server_default=""),
            sa.Index("ix_care_hitl_actions_status", "status"),
            sa.Index("ix_care_hitl_actions_patient_id", "patient_id"),
            sa.Index("ix_care_hitl_actions_campus", "campus"),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_hitl_actions")
