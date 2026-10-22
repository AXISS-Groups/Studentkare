"""B2B invites: a partner college creates a student's account and invites them.

- ``care_student_invites`` (platform plane, core/rule_l.py): one row per invite,
  holding only hashes of the one-time link token and the temporary password, the
  channel the link went by, the campus, who created it, when it expires, when it
  was claimed, and the wrong-password counter and lock.

Plan tier1-auth-password-2026-10-22, amendment (b), approved by the founder 2026-10-22.

Revision ID: f6c4a2e81d37
Revises: e3a9c1d75b28
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "f6c4a2e81d37"
down_revision = "e3a9c1d75b28"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "care_student_invites" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "care_student_invites",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("temp_password_hash", sa.String(255), nullable=False),
            sa.Column("link_channel", sa.String(16), nullable=False),
            sa.Column("university", sa.String(160), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("expires_at", sa.Float(), nullable=False),
            sa.Column("sent_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("claimed_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_student_invites_account_id", "care_student_invites", ["account_id"])
        op.create_index("ix_care_student_invites_token_hash", "care_student_invites", ["token_hash"], unique=True)

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_index("ix_care_student_invites_token_hash", table_name="care_student_invites")
    op.drop_index("ix_care_student_invites_account_id", table_name="care_student_invites")
    op.drop_table("care_student_invites")
