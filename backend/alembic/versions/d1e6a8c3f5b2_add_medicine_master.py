"""Medicine master: composition (salts + strengths), dosage form, schedule.

Adds:

- care_medicines: one row per medicine (name, dosage form, pack, manufacturer,
  Indian drug schedule OTC | H | H1 | X, requires_prescription derived from the
  schedule, active flag, a normalised composition key for same-composition
  matching);
- care_medicine_ingredients: the salts and strengths of each medicine;
- care_catalog.medicine_id: the master record a shop listing sells.

Both tables are commerce plane (core/rule_l.py): reference data about a
product, never about a person. They ship with their grants. No rows are
written here; demo medicines exist only in the development seed.

The never-applied backend/migrations/cdci_medication_schema.sql (a
t1_operational schema that does not exist) is superseded by this.

Revision ID: d1e6a8c3f5b2
Revises: b8d3e6f1a2c9
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "d1e6a8c3f5b2"
down_revision = "b8d3e6f1a2c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "care_medicines" not in existing:
        op.create_table(
            "care_medicines",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("name", sa.String(160), nullable=False),
            sa.Column("composition_key", sa.String(600), nullable=False),
            sa.Column("dosage_form", sa.String(24), nullable=False),
            sa.Column("pack", sa.String(120), nullable=False),
            sa.Column("manufacturer", sa.String(120), nullable=False),
            sa.Column("schedule", sa.String(4), nullable=False),
            sa.Column("requires_prescription", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("source", sa.String(16), nullable=False, server_default="ADMIN"),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
            sa.CheckConstraint("schedule IN ('OTC', 'H', 'H1', 'X')", name="ck_care_medicines_schedule"),
            # Derived, and the database holds it to that: only OTC may be sold without a prescription.
            sa.CheckConstraint("requires_prescription OR schedule = 'OTC'", name="ck_care_medicines_rx_schedule"),
        )
        op.create_index("ix_care_medicines_name", "care_medicines", ["name"])
        op.create_index("ix_care_medicines_composition_key", "care_medicines", ["composition_key"])
        op.create_index("ix_care_medicines_dosage_form", "care_medicines", ["dosage_form"])

    if "care_medicine_ingredients" not in existing:
        op.create_table(
            "care_medicine_ingredients",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("medicine_id", sa.String(), sa.ForeignKey("care_medicines.id"), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("salt", sa.String(80), nullable=False),
            sa.Column("salt_key", sa.String(80), nullable=False),
            sa.Column("strength_value", sa.Float(), nullable=False),
            sa.Column("strength_unit", sa.String(12), nullable=False),
            sa.UniqueConstraint("medicine_id", "salt_key"),
            sa.CheckConstraint("strength_value > 0", name="ck_care_medicine_ingredients_strength"),
        )
        op.create_index("ix_care_medicine_ingredients_medicine_id", "care_medicine_ingredients", ["medicine_id"])
        op.create_index("ix_care_medicine_ingredients_salt_key", "care_medicine_ingredients", ["salt_key"])

    catalog_columns = {c["name"] for c in sa.inspect(bind).get_columns("care_catalog")}
    if "medicine_id" not in catalog_columns:
        op.add_column("care_catalog", sa.Column("medicine_id", sa.String(), nullable=True))
        op.create_foreign_key("fk_care_catalog_medicine_id", "care_catalog", "care_medicines",
                              ["medicine_id"], ["id"])
        op.create_index("ix_care_catalog_medicine_id", "care_catalog", ["medicine_id"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_index("ix_care_catalog_medicine_id", table_name="care_catalog")
    op.drop_constraint("fk_care_catalog_medicine_id", "care_catalog", type_="foreignkey")
    op.drop_column("care_catalog", "medicine_id")
    op.drop_table("care_medicine_ingredients")
    op.drop_table("care_medicines")
