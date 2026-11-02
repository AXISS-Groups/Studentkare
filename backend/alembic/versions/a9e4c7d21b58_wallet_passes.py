"""The emergency card in the phone wallet (plan tier1-emergency-card-wallet-2026-10-24).

* ``care_wallet_passes``: one row per Apple or Google pass a student added: the fields
  they switched on, a random serial, status, a content hash (never the content), the
  push queue and the single-use download token hash. Clinical plane.
* ``care_wallet_registrations``: Apple devices registered for a pass's updates
  (PassKit web service) with Apple's push token. Clinical plane.

Grants are re-applied (P23) so neither group role gets anything it should not.

Revision ID: a9e4c7d21b58
Revises: f1a7c3e9b502
Create Date: 2026-10-24
"""
import sqlalchemy as sa

from alembic import op

revision = "a9e4c7d21b58"
down_revision = "f1a7c3e9b502"
branch_labels = None
depends_on = None

PASSES = "care_wallet_passes"
REGISTRATIONS = "care_wallet_registrations"


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if PASSES not in tables:
        op.create_table(
            "care_wallet_passes",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("platform", sa.String(10), nullable=False),
            sa.Column("serial", sa.String(64), nullable=False),
            sa.Column("fields", sa.JSON(), nullable=False),
            sa.Column("status", sa.String(10), nullable=False, server_default="ACTIVE"),
            sa.Column("content_hash", sa.String(64), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
            sa.Column("voided_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("void_reason", sa.String(24), nullable=False, server_default=""),
            sa.Column("push_pending", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("push_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("pushed_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("in_wallet", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("download_token_hash", sa.String(64), nullable=False, server_default=""),
            sa.Column("download_expires_at", sa.Float(), nullable=False, server_default="0"),
            sa.CheckConstraint("platform IN ('APPLE', 'GOOGLE')", name="ck_care_wallet_passes_platform"),
            sa.CheckConstraint("status IN ('ACTIVE', 'VOIDED')", name="ck_care_wallet_passes_status"),
        )
        op.create_index("ix_care_wallet_passes_account_id", PASSES, ["account_id"])
        op.create_index("ix_care_wallet_passes_serial", PASSES, ["serial"], unique=True)
        op.create_index("ix_care_wallet_passes_status", PASSES, ["status"])
        op.create_index("ix_care_wallet_passes_push_pending", PASSES, ["push_pending"])
    if REGISTRATIONS not in tables:
        op.create_table(
            "care_wallet_registrations",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("pass_id", sa.String(), sa.ForeignKey("care_wallet_passes.id"), nullable=False),
            sa.Column("device_library_id", sa.String(128), nullable=False),
            sa.Column("push_token", sa.String(256), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.UniqueConstraint("pass_id", "device_library_id", name="uq_care_wallet_registrations_pass_device"),
        )
        op.create_index("ix_care_wallet_registrations_pass_id", REGISTRATIONS, ["pass_id"])
        op.create_index("ix_care_wallet_registrations_device_library_id", REGISTRATIONS, ["device_library_id"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if REGISTRATIONS in tables:
        op.drop_table(REGISTRATIONS)
    if PASSES in tables:
        op.drop_table(PASSES)
