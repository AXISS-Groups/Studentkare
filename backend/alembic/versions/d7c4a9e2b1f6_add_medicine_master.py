"""Medicine master: products, their salt composition, and the catalogue link.

- care_medicines: one row per marketed product (brand, manufacturer, form,
  pack, schedule class OTC/H/H1/X) with a canonical composition key.
- care_medicine_ingredients: one row per salt + strength in a product.
- care_catalog.medicine_id: nullable link from a listing to its master row.

Both tables are commerce plane (core/rule_l.py): reference data about
products, read by the catalogue and substitute endpoints under sk_commerce.
No rows are inserted: the master starts empty and is filled by an admin.

Revision ID: d7c4a9e2b1f6
Revises: b8d3e6f1a2c9
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "d7c4a9e2b1f6"
down_revision = "b8d3e6f1a2c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "care_medicines" not in existing:
        op.create_table(
            "care_medicines",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("brand_name", sa.String(160), nullable=False),
            sa.Column("manufacturer", sa.String(160), nullable=False),
            sa.Column("form", sa.String(24), nullable=False),
            sa.Column("pack", sa.String(160), nullable=False),
            sa.Column("schedule_class", sa.String(4), nullable=False),
            sa.Column("composition_key", sa.String(1000), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
        )
        op.create_index("ix_care_medicines_composition_form", "care_medicines", ["composition_key", "form"])

    if "care_medicine_ingredients" not in existing:
        op.create_table(
            "care_medicine_ingredients",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("medicine_id", sa.String(64), sa.ForeignKey("care_medicines.id"), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False),
            sa.Column("salt_name", sa.String(120), nullable=False),
            sa.Column("salt_key", sa.String(120), nullable=False),
            sa.Column("strength_value", sa.String(24), nullable=False),
            sa.Column("strength_unit", sa.String(16), nullable=False),
            sa.Column("canonical_value", sa.String(32), nullable=False),
            sa.Column("canonical_unit", sa.String(16), nullable=False),
            sa.UniqueConstraint("medicine_id", "salt_key"),
        )
        op.create_index("ix_care_medicine_ingredients_medicine_id", "care_medicine_ingredients", ["medicine_id"])

    catalog_columns = {c["name"] for c in sa.inspect(bind).get_columns("care_catalog")}
    if "medicine_id" not in catalog_columns:
        with op.batch_alter_table("care_catalog") as batch:
            batch.add_column(sa.Column("medicine_id", sa.String(64), nullable=True))
            batch.create_foreign_key("fk_care_catalog_medicine_id", "care_medicines", ["medicine_id"], ["id"])
        op.create_index("ix_care_catalog_medicine_id", "care_catalog", ["medicine_id"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_index("ix_care_catalog_medicine_id", table_name="care_catalog")
    with op.batch_alter_table("care_catalog") as batch:
        batch.drop_constraint("fk_care_catalog_medicine_id", type_="foreignkey")
        batch.drop_column("medicine_id")
    op.drop_index("ix_care_medicine_ingredients_medicine_id", table_name="care_medicine_ingredients")
    op.drop_table("care_medicine_ingredients")
    op.drop_index("ix_care_medicines_composition_form", table_name="care_medicines")
    op.drop_table("care_medicines")
