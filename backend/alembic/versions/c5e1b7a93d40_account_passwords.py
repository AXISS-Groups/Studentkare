"""Account passwords: a sign-in password beside the PIN or code.

- ``care_account_passwords`` (platform plane, core/rule_l.py): one row per account
  that set a password, holding a salted, peppered scrypt hash (never the
  password), the failed-attempt counter, the lockout end and timestamps. Neither
  group role (sk_commerce, sk_clinical) has any grant on it.

Team accounts first; students follow. Founder decision 2026-10-22 (plan
tier1-auth-password-2026-10-22).

Revision ID: c5e1b7a93d40
Revises: a7c4e2f9d813
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "c5e1b7a93d40"
down_revision = "a7c4e2f9d813"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "care_account_passwords" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "care_account_passwords",
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("last_sign_in_at", sa.Float(), nullable=False, server_default="0"),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_account_passwords")
