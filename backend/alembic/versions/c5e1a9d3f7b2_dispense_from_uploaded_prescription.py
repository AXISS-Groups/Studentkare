"""A dispense can fill an uploaded paper prescription instead of an in-app one.

- care_dispenses.prescription_id becomes nullable.
- care_dispenses.uploaded_document_id: nullable FK to care_documents (the
  student's own OUTSIDE_PRESCRIPTION upload).
- ck_care_dispenses_one_source: exactly one of the two is set.

Both tables are already clinical plane (core/rule_l.py); no new table, no new grant.

Revision ID: c5e1a9d3f7b2
Revises: b8d3e6f1a2c9
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "c5e1a9d3f7b2"
down_revision = "b8d3e6f1a2c9"
branch_labels = None
depends_on = None

CHECK = "ck_care_dispenses_one_source"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"]: c for c in inspector.get_columns("care_dispenses")}

    if not columns["prescription_id"]["nullable"]:
        op.alter_column("care_dispenses", "prescription_id", existing_type=sa.String(), nullable=True)
    if "uploaded_document_id" not in columns:
        op.add_column("care_dispenses", sa.Column("uploaded_document_id", sa.String(), nullable=True))
        op.create_foreign_key("fk_care_dispenses_uploaded_document_id", "care_dispenses", "care_documents",
                              ["uploaded_document_id"], ["id"])
        op.create_index("ix_care_dispenses_uploaded_document_id", "care_dispenses", ["uploaded_document_id"])
    checks = {c["name"] for c in inspector.get_check_constraints("care_dispenses")}
    if CHECK not in checks:
        op.create_check_constraint(CHECK, "care_dispenses",
                                   "(prescription_id IS NULL) <> (uploaded_document_id IS NULL)")


def downgrade() -> None:
    bind = op.get_bind()
    uploaded = bind.execute(sa.text(
        "SELECT count(*) FROM care_dispenses WHERE uploaded_document_id IS NOT NULL")).scalar()
    if uploaded:
        # Never delete clinical rows to make a downgrade fit.
        raise RuntimeError(f"{uploaded} dispense(s) fill an uploaded prescription; "
                           "they cannot be represented before this revision.")
    op.drop_constraint(CHECK, "care_dispenses", type_="check")
    op.drop_index("ix_care_dispenses_uploaded_document_id", table_name="care_dispenses")
    op.drop_constraint("fk_care_dispenses_uploaded_document_id", "care_dispenses", type_="foreignkey")
    op.drop_column("care_dispenses", "uploaded_document_id")
    op.alter_column("care_dispenses", "prescription_id", existing_type=sa.String(), nullable=False)
