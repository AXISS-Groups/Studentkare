"""Separate public brand assets from the clinical document repository.

No legacy document is copied: the broken uploader used a nonexistent model,
and a vault row's category/title cannot establish consent to publish its bytes.
"""
import sqlalchemy as sa

from alembic import op

revision = "a6d2f9b4c810"
down_revision = "b7f3e8c1a2d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_platform_assets",
        sa.Column("asset_type", sa.String(16), primary_key=True),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )
    from core.rule_l import apply_grants

    apply_grants(op.get_bind())


def downgrade() -> None:
    op.drop_table("care_platform_assets")
