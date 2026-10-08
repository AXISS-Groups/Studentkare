"""Add sealed erasure archives (DPDP account deletion)."""
import sqlalchemy as sa

from alembic import op

revision = "c6a2e4f83b59"
down_revision = "b5f1d3e72a48"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_erasure_archives",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("former_account_id", sa.String(), nullable=False),
        sa.Column("sealed", sa.LargeBinary(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("archived_at", sa.Float(), nullable=False),
        sa.Column("destroy_after", sa.Float(), nullable=False),
        sa.Column("destroyed_at", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_care_erasure_archives_former_account_id", "care_erasure_archives", ["former_account_id"])
    op.create_index("ix_care_erasure_archives_destroy_after", "care_erasure_archives", ["destroy_after"])


def downgrade() -> None:
    op.drop_table("care_erasure_archives")
