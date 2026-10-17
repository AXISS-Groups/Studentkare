"""Add care_catalog.image_id / image_mime, which no migration created.

The model declares both columns and every catalogue query selects them, but
they were only ever added by the ad-hoc ALTER in services.db_sql.create_all_tables,
which production never calls (it applies migrations only). On a database built
from migrations, GET /api/catalog failed with "column care_catalog.image_id does
not exist". Found while proving the Rule L commerce paths against Postgres.

IF NOT EXISTS keeps it safe on development databases where create_all_tables
already added them.

Revision ID: e9b4d2a7c1f3
Revises: e5a7b3c90d14
Create Date: 2026-10-17
"""
import sqlalchemy as sa

from alembic import op

revision = "e9b4d2a7c1f3"
down_revision = "e5a7b3c90d14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE care_catalog ADD COLUMN IF NOT EXISTS image_id VARCHAR(80)")
        op.execute("ALTER TABLE care_catalog ADD COLUMN IF NOT EXISTS image_mime VARCHAR(40)")
        return
    columns = {c["name"] for c in sa.inspect(bind).get_columns("care_catalog")}
    if "image_id" not in columns:
        op.add_column("care_catalog", sa.Column("image_id", sa.String(80), nullable=True))
    if "image_mime" not in columns:
        op.add_column("care_catalog", sa.Column("image_mime", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("care_catalog", "image_mime")
    op.drop_column("care_catalog", "image_id")
