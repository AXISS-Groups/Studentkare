"""Add care_catalog image columns and the substitution prescription-item index.

Closes the drift `alembic check` reported against the models:

- care_catalog.image_id / image_mime: the catalogue model selects both, but no
  migration added them. Both are nullable, so existing rows need no backfill.
  services.db_sql.create_all_tables() (run by the seed and provisioning
  scripts) may already have added them with a raw ALTER TABLE, so each column
  is added only when it is missing.
- ix_care_substitution_requests_prescription_item_id: declared on the model
  (index=True) but never created.

The care_programmes difference is closed on the model side instead: the model
now declares the (clinician_id, state) index migration c71d94b2e5a8 created,
which already serves lookups by clinician_id alone.

Revision ID: b6965aa39f06
Revises: e5a7b3c90d14
Create Date: 2026-10-17
"""
import sqlalchemy as sa

from alembic import op

revision = "b6965aa39f06"
down_revision = "e5a7b3c90d14"
branch_labels = None
depends_on = None

_SUBSTITUTION_INDEX = "ix_care_substitution_requests_prescription_item_id"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {c["name"] for c in inspector.get_columns("care_catalog")}
    if "image_id" not in columns:
        op.add_column("care_catalog", sa.Column("image_id", sa.String(80), nullable=True))
    if "image_mime" not in columns:
        op.add_column("care_catalog", sa.Column("image_mime", sa.String(40), nullable=True))

    indexes = {i["name"] for i in inspector.get_indexes("care_substitution_requests")}
    if _SUBSTITUTION_INDEX not in indexes:
        op.create_index(_SUBSTITUTION_INDEX, "care_substitution_requests", ["prescription_item_id"])


def downgrade() -> None:
    op.drop_index(_SUBSTITUTION_INDEX, table_name="care_substitution_requests")
    op.drop_column("care_catalog", "image_mime")
    op.drop_column("care_catalog", "image_id")
