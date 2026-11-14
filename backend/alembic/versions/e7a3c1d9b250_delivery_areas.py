"""Area-wise delivery.

``care_pincode_areas``: the areas (post-office localities) inside each pincode, loaded
from the All India Pincode Directory by ``backend/scripts/load_pincode_directory.py``.
Public reference data about places; platform plane.

``care_service_providers.serviceable_areas``: for each pincode a provider serves, the
areas it delivers to. Empty for existing providers, which means every pincode they
list is served in full, exactly as before this migration.

Additive.

Revision ID: e7a3c1d9b250
Revises: d2b7c5e8f104
Create Date: 2026-11-14
"""
import sqlalchemy as sa

from alembic import op

revision = "e7a3c1d9b250"
down_revision = "d2b7c5e8f104"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_pincode_areas",
        sa.Column("pincode", sa.String(6), primary_key=True),
        sa.Column("area", sa.String(120), primary_key=True),
        sa.Column("district", sa.String(80), nullable=False),
        sa.Column("state", sa.String(60), nullable=False),
        sa.Column("source", sa.String(160), nullable=False),
    )
    op.add_column("care_service_providers",
                  sa.Column("serviceable_areas", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
    from core.rule_l import apply_grants

    apply_grants(op.get_bind())   # P23: the new column ships with its grant (sk_commerce reads it at checkout)


def downgrade() -> None:
    op.drop_column("care_service_providers", "serviceable_areas")
    op.drop_table("care_pincode_areas")
