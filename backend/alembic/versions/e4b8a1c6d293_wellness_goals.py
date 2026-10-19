"""Setup answers: a student's primary goal and activity level.

- care_wellness_goals (clinical plane): one row per account, both answers
  optional ("" = not answered). A goal such as "Manage stress" says something
  about a person's health, so the table is clinical and the commerce role has
  no grant on it. No weight, BMI or body target is stored.

Revision ID: e4b8a1c6d293
Revises: c5f2a9d4e7b1
Create Date: 2026-10-20
"""
import sqlalchemy as sa

from alembic import op

revision = "e4b8a1c6d293"
down_revision = "c5f2a9d4e7b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "care_wellness_goals" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "care_wellness_goals",
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
            sa.Column("primary_goal", sa.String(32), nullable=False, server_default=""),
            sa.Column("activity_level", sa.String(32), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_wellness_goals")
