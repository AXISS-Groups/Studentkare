"""Student passcode: an optional 4, 6 or 8 character secret for signing in.

- ``care_student_passcodes`` (platform plane, core/rule_l.py): one row per student
  who set one, holding a salted, peppered scrypt hash (never the passcode), its
  length, the failed-attempt counter, the lockout end and timestamps. Neither
  group role (sk_commerce, sk_clinical) has any grant on it.
- ``care_sessions.code_verified_at``: when the session's sign-in was proven with a
  one-time code (0 otherwise). "Forgot passcode" relies on it.
- ``care_two_factor_pending.first_factor``: which first factor passed (CODE,
  PASSCODE or PIN) before the authenticator step.

Founder decision 2026-10-22 (plan tier1-canvas-wp03, amendment "passcode").

Revision ID: a7c4e2f9d813
Revises: ff4cedfc93cb
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "a7c4e2f9d813"
down_revision = "ff4cedfc93cb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "care_student_passcodes" not in set(inspector.get_table_names()):
        op.create_table(
            "care_student_passcodes",
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
            sa.Column("passcode_hash", sa.String(255), nullable=False),
            sa.Column("length", sa.Integer(), nullable=False),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("last_sign_in_at", sa.Float(), nullable=False, server_default="0"),
        )
    if "code_verified_at" not in {c["name"] for c in inspector.get_columns("care_sessions")}:
        op.add_column("care_sessions", sa.Column("code_verified_at", sa.Float(), nullable=False, server_default="0"))
    if "first_factor" not in {c["name"] for c in inspector.get_columns("care_two_factor_pending")}:
        op.add_column("care_two_factor_pending",
                      sa.Column("first_factor", sa.String(12), nullable=False, server_default="CODE"))

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_column("care_two_factor_pending", "first_factor")
    op.drop_column("care_sessions", "code_verified_at")
    op.drop_table("care_student_passcodes")
