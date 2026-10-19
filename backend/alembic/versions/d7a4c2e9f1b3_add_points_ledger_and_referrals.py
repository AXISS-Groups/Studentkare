"""Points ledger, invite codes and referrals (commerce plane).

- care_referral_codes: one invite code per student, issued once, never changed.
- care_referrals: one row per account that joined with a code (unique on the
  referred account), with its status (PENDING / REWARDED / CAPPED / INELIGIBLE).
- care_points_ledger: append-only entries; a balance is their sum. The reason
  is limited by a CHECK constraint to REFERRAL_VERIFIED and REVERSAL, so no
  health-related reason can be written; the idempotency key is unique.

All three hold account ids, codes and amounts only, nothing about health, and
sit on the commerce plane (core/rule_l.py, P56). Points have no cash value and
nothing can redeem them.

Revision ID: d7a4c2e9f1b3
Revises: c5f2a9d4e7b1
Create Date: 2026-10-20
"""
import sqlalchemy as sa

from alembic import op

revision = "d7a4c2e9f1b3"
down_revision = "c5f2a9d4e7b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "care_referral_codes" not in existing:
        op.create_table(
            "care_referral_codes",
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
            sa.Column("code", sa.String(16), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.UniqueConstraint("code"),
        )

    if "care_referrals" not in existing:
        op.create_table(
            "care_referrals",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("referred_account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("inviter_account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("code", sa.String(16), nullable=False),
            sa.Column("status", sa.String(16), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("verified_at", sa.Float(), nullable=False),
            sa.UniqueConstraint("referred_account_id"),
        )
        op.create_index("ix_care_referrals_inviter_account_id", "care_referrals", ["inviter_account_id"])
        op.create_index("ix_care_referrals_status", "care_referrals", ["status"])

    if "care_points_ledger" not in existing:
        op.create_table(
            "care_points_ledger",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("reason", sa.String(32), nullable=False),
            sa.Column("idempotency_key", sa.String(120), nullable=False),
            sa.Column("reference_id", sa.String(64), nullable=False),
            sa.Column("reverses_entry_id", sa.String(64), nullable=False),
            sa.Column("created_by", sa.String(64), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.UniqueConstraint("idempotency_key"),
            sa.CheckConstraint("reason IN ('REFERRAL_VERIFIED', 'REVERSAL')", name="ck_care_points_ledger_reason"),
            sa.CheckConstraint("amount <> 0", name="ck_care_points_ledger_amount"),
        )
        op.create_index("ix_care_points_ledger_account_id", "care_points_ledger", ["account_id"])
        op.create_index("ix_care_points_ledger_created_at", "care_points_ledger", ["created_at"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_points_ledger")
    op.drop_table("care_referrals")
    op.drop_table("care_referral_codes")
