"""Appearance preference on the account: System / Dark / Light, on every device.

- care_appearance_preferences (platform plane): one row per account that has
  chosen. No row means never chosen. A display choice only, nothing about the
  person's health, so neither group role is granted anything on it.

Revision ID: a7d3e1c9b5f2
Revises: c5f2a9d4e7b1
Create Date: 2026-10-20
"""
import sqlalchemy as sa

from alembic import op

revision = "a7d3e1c9b5f2"
down_revision = "c5f2a9d4e7b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "care_appearance_preferences" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "care_appearance_preferences",
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
            sa.Column("appearance", sa.String(8), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
            sa.CheckConstraint("appearance IN ('SYSTEM', 'DARK', 'LIGHT')", name="ck_care_appearance_preferences_value"),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_appearance_preferences")
