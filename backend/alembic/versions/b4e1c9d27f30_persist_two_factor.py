"""Persist two-step sign-in (TOTP secret, pending second step).

Both lived in process memory, so a restart or a second instance forgot that an
account had 2FA on.

Revision ID: b4e1c9d27f30
Revises: a3f9c2d7e815
Create Date: 2026-10-16
"""
import sqlalchemy as sa

from alembic import op

revision = "b4e1c9d27f30"
down_revision = "a3f9c2d7e815"
branch_labels = None
depends_on = None

ACC = "care_accounts.id"


def upgrade() -> None:
    op.create_table(
        "care_two_factor",
        sa.Column("account_id", sa.String(), sa.ForeignKey(ACC), primary_key=True),
        sa.Column("secret_sealed", sa.String(400), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verified_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_step", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "care_two_factor_pending",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey(ACC), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_two_factor_pending_account_id", "care_two_factor_pending", ["account_id"])
    op.create_index("ix_care_two_factor_pending_expires_at", "care_two_factor_pending", ["expires_at"])


def downgrade() -> None:
    op.drop_table("care_two_factor_pending")
    op.drop_table("care_two_factor")
