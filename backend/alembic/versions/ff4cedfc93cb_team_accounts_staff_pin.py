"""Team accounts: a shared account per role, signed in with a PIN.

- ``care_accounts.is_team_account`` (identity plane, same table, same grants):
  false for every existing row. Set only by ``python -m scripts.team_accounts``.
- ``care_staff_pin_credentials`` (platform plane, core/rule_l.py): one row per
  team account holding a salted scrypt hash of its PIN (never the PIN), the
  failed-attempt counter, the lockout end and the last sign-in time. Neither
  group role (sk_commerce, sk_clinical) has any grant on it.

Founder decision 2026-10-22; replaced later by individual logins.

Revision ID: ff4cedfc93cb
Revises: c8f2d5a1e9b3
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "ff4cedfc93cb"
down_revision = "c8f2d5a1e9b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "is_team_account" not in {c["name"] for c in inspector.get_columns("care_accounts")}:
        op.add_column("care_accounts", sa.Column("is_team_account", sa.Boolean(), nullable=False,
                                                 server_default=sa.false()))
    if "care_staff_pin_credentials" not in set(inspector.get_table_names()):
        op.create_table(
            "care_staff_pin_credentials",
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
            sa.Column("pin_hash", sa.String(255), nullable=False),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("rotated_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("last_sign_in_at", sa.Float(), nullable=False, server_default="0"),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_staff_pin_credentials")
    op.drop_column("care_accounts", "is_team_account")
