"""The care directory's curated facility table (care_facilities, platform plane).

Hospitals, clinics, pharmacies, ambulance services and blood banks that a super
admin (any campus, or every campus) or a campus administrator (their own
campus) has checked. Each row says how it was checked (``source``) and when
(``verified_on``); the directory never shows a row without a recent check.
Places and phone numbers only: no person, no bed availability, no ratings.

Grants are re-applied (P23) so neither group role gets anything it should not.

Revision ID: c8f2d5a1e9b3
Revises: e4b8d2f6a913
Create Date: 2026-10-21
"""
import sqlalchemy as sa

from alembic import op

revision = "c8f2d5a1e9b3"
down_revision = "e4b8d2f6a913"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "care_facilities" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "care_facilities",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("kind", sa.String(16), nullable=False),
            sa.Column("name", sa.String(160), nullable=False),
            sa.Column("departments", sa.JSON(), nullable=False),
            sa.Column("address", sa.String(400), nullable=False, server_default=""),
            sa.Column("area", sa.String(120), nullable=False, server_default=""),
            sa.Column("pincode", sa.String(6), nullable=False, server_default=""),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("phone", sa.String(32), nullable=False, server_default=""),
            sa.Column("emergency_24x7", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("hours_text", sa.String(200), nullable=False, server_default=""),
            sa.Column("source", sa.String(200), nullable=False, server_default=""),
            sa.Column("source_url", sa.String(2000), nullable=False, server_default=""),
            sa.Column("verified_on", sa.Date(), nullable=True),
            sa.Column("campus", sa.String(160), nullable=False, server_default=""),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_by", sa.String(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("updated_by", sa.String(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_facilities_kind", "care_facilities", ["kind"])
        op.create_index("ix_care_facilities_name", "care_facilities", ["name"])
        op.create_index("ix_care_facilities_campus", "care_facilities", ["campus"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_index("ix_care_facilities_campus", table_name="care_facilities")
    op.drop_index("ix_care_facilities_name", table_name="care_facilities")
    op.drop_index("ix_care_facilities_kind", table_name="care_facilities")
    op.drop_table("care_facilities")
