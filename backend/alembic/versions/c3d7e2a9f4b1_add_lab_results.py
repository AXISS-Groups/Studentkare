"""Stored lab values (Mobile 2.0 plan, Gap 1 / D-M2-6) and the Trends bookmark (D-M2-10).

- care_lab_test_reference (platform plane): test code, name and body-system
  group. No person and no reference range. Created empty: rows are added only by
  a later, clinician-reviewed migration (the grouping is the clinical lead's).
- care_lab_results (clinical plane): one value per row with the range exactly
  as the lab printed it. DRAFT until the student confirms; range state is
  computed on read, never stored.
- care_preferences.pinned_lab_tests (clinical plane already): bookmarked tests.

Grants are re-applied (P23) so sk_commerce has nothing on care_lab_results.

Revision ID: c3d7e2a9f4b1
Revises: f1a9c3e5b7d2
Create Date: 2026-10-21
"""
import sqlalchemy as sa

from alembic import op

revision = "c3d7e2a9f4b1"
down_revision = "f1a9c3e5b7d2"
branch_labels = None
depends_on = None

BODY_SYSTEMS = ("HEART_BLOOD", "BLOOD_SUGAR", "VITAMINS", "THYROID", "KIDNEY", "LIVER", "BLOOD_COUNT", "OTHER")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ('" + "', '".join(values) + "')"


def upgrade() -> None:
    op.create_table(
        "care_lab_test_reference",
        sa.Column("code", sa.String(40), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("body_system", sa.String(20), nullable=False),
        sa.Column("default_unit", sa.String(40), nullable=False, server_default=""),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("reviewed_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("reviewed_at", sa.Float(), nullable=False, server_default="0"),
        sa.CheckConstraint(_in("body_system", BODY_SYSTEMS), name="ck_care_lab_test_reference_body_system"),
    )
    op.create_table(
        "care_lab_results",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("test_code", sa.String(40), sa.ForeignKey("care_lab_test_reference.code"), nullable=True),
        sa.Column("test_name_as_printed", sa.String(120), nullable=False),
        sa.Column("value_numeric", sa.Float(), nullable=True),
        sa.Column("value_text", sa.String(60), nullable=False, server_default=""),
        sa.Column("unit", sa.String(40), nullable=False, server_default=""),
        sa.Column("ref_low", sa.Float(), nullable=True),
        sa.Column("ref_high", sa.Float(), nullable=True),
        sa.Column("ref_text", sa.String(80), nullable=False, server_default=""),
        sa.Column("collected_on", sa.Date(), nullable=False),
        sa.Column("lab_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("document_id", sa.String(), sa.ForeignKey("care_documents.id", ondelete="CASCADE"), nullable=True),
        sa.Column("lab_order_id", sa.String(), sa.ForeignKey("care_lab_orders.id"), nullable=True),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("confirmed_at", sa.Float(), nullable=True),
        sa.CheckConstraint(_in("source", ("LAB_RELEASED", "STUDENT_CONFIRMED")), name="ck_care_lab_results_source"),
        sa.CheckConstraint(_in("status", ("DRAFT", "CONFIRMED")), name="ck_care_lab_results_status"),
    )
    for column in ("account_id", "test_code", "document_id", "lab_order_id"):
        op.create_index(f"ix_care_lab_results_{column}", "care_lab_results", [column])
    op.create_index("ix_care_lab_results_account_status", "care_lab_results", ["account_id", "status"])
    op.add_column("care_preferences", sa.Column("pinned_lab_tests", sa.JSON(), nullable=True))

    from core.rule_l import apply_grants

    apply_grants(op.get_bind())


def downgrade() -> None:
    op.drop_column("care_preferences", "pinned_lab_tests")
    op.drop_index("ix_care_lab_results_account_status", table_name="care_lab_results")
    for column in ("lab_order_id", "document_id", "test_code", "account_id"):
        op.drop_index(f"ix_care_lab_results_{column}", table_name="care_lab_results")
    op.drop_table("care_lab_results")
    op.drop_table("care_lab_test_reference")
