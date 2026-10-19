"""Lab tests booked from the shop: paid lab orders, collection address, collector accounts.

- care_payments gets a payable reference (payable_kind + payable_id). Every
  existing row is a shop order, so it is backfilled as
  ('shop_order', order_id); order_id stays for shop orders and becomes
  nullable for other kinds. Existing shop payments read the same as before.
- care_lab_order_charges (commerce): the price and paid state of a lab test a
  student booked for themselves. The ``lab_order`` payable settles this row
  and nothing clinical.
- care_lab_collectors (platform): a laboratory's own collector accounts.
- care_lab_orders: collection_address, collector_id, tube_count, collected_at,
  handed_over_at.
- care_hostel_visit_requests.lab_order_id: the hostel pickup for a booked test.
- care_catalog: includes (a package's tests), fasting_hours, report_hours.

Revision ID: d9e2a7c41b58
Revises: b8d3e6f1a2c9
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "d9e2a7c41b58"
down_revision = "b8d3e6f1a2c9"
branch_labels = None
depends_on = None


def _columns(bind, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    payment_columns = _columns(bind, "care_payments")
    if "payable_kind" not in payment_columns:
        op.add_column("care_payments", sa.Column("payable_kind", sa.String(24), nullable=False,
                                                 server_default="shop_order"))
    if "payable_id" not in payment_columns:
        op.add_column("care_payments", sa.Column("payable_id", sa.String(64), nullable=False, server_default=""))
        op.create_index("ix_care_payments_payable_id", "care_payments", ["payable_id"])
    # Every payment so far is a shop order's.
    op.execute("UPDATE care_payments SET payable_kind = 'shop_order', payable_id = order_id "
               "WHERE payable_id = '' AND order_id IS NOT NULL")
    with op.batch_alter_table("care_payments") as batch:
        batch.alter_column("order_id", existing_type=sa.String(), nullable=True)

    if "care_lab_order_charges" not in existing:
        op.create_table(
            "care_lab_order_charges",
            sa.Column("lab_order_id", sa.String(64), primary_key=True),
            sa.Column("account_id", sa.String(64), nullable=False),
            sa.Column("catalog_item_id", sa.String(80), nullable=False),
            sa.Column("lab_id", sa.String(80), nullable=False),
            sa.Column("amount_paise", sa.Integer(), nullable=False),
            sa.Column("payment_status", sa.String(24), nullable=False, server_default="UNPAID"),
            sa.Column("payment_due_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("idempotency_key", sa.String(80), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
            sa.UniqueConstraint("account_id", "idempotency_key"),
        )
        op.create_index("ix_care_lab_order_charges_account_id", "care_lab_order_charges", ["account_id"])
        op.create_index("ix_care_lab_order_charges_lab_id", "care_lab_order_charges", ["lab_id"])
        op.create_index("ix_care_lab_order_charges_payment_status", "care_lab_order_charges", ["payment_status"])
        op.create_index("ix_care_lab_order_charges_payment_due_at", "care_lab_order_charges", ["payment_due_at"])

    if "care_lab_collectors" not in existing:
        op.create_table(
            "care_lab_collectors",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("lab_id", sa.String(), sa.ForeignKey("care_service_providers.id"), nullable=False),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_by", sa.String(64), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
        )
        op.create_index("ix_care_lab_collectors_lab_id", "care_lab_collectors", ["lab_id"])
        op.create_index("ix_care_lab_collectors_account_id", "care_lab_collectors", ["account_id"], unique=True)

    lab_columns = _columns(bind, "care_lab_orders")
    if "collector_id" not in lab_columns:
        op.add_column("care_lab_orders", sa.Column("collector_id", sa.String(64), nullable=False, server_default=""))
        op.create_index("ix_care_lab_orders_collector_id", "care_lab_orders", ["collector_id"])
    if "collection_address" not in lab_columns:
        op.add_column("care_lab_orders", sa.Column("collection_address", sa.JSON(), nullable=True))
    for name, column in (("tube_count", sa.Column("tube_count", sa.Integer(), nullable=False, server_default="0")),
                         ("collected_at", sa.Column("collected_at", sa.Float(), nullable=False, server_default="0")),
                         ("handed_over_at", sa.Column("handed_over_at", sa.Float(), nullable=False, server_default="0"))):
        if name not in lab_columns:
            op.add_column("care_lab_orders", column)

    if "lab_order_id" not in _columns(bind, "care_hostel_visit_requests"):
        op.add_column("care_hostel_visit_requests", sa.Column("lab_order_id", sa.String(64), nullable=True))
        op.create_index("ix_care_hostel_visit_requests_lab_order_id", "care_hostel_visit_requests", ["lab_order_id"])

    catalog_columns = _columns(bind, "care_catalog")
    if "includes" not in catalog_columns:
        op.add_column("care_catalog", sa.Column("includes", sa.JSON(), nullable=False, server_default="[]"))
    if "fasting_hours" not in catalog_columns:
        op.add_column("care_catalog", sa.Column("fasting_hours", sa.Integer(), nullable=False, server_default="0"))
    if "report_hours" not in catalog_columns:
        op.add_column("care_catalog", sa.Column("report_hours", sa.Integer(), nullable=False, server_default="0"))

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_column("care_catalog", "report_hours")
    op.drop_column("care_catalog", "fasting_hours")
    op.drop_column("care_catalog", "includes")
    op.drop_index("ix_care_hostel_visit_requests_lab_order_id", table_name="care_hostel_visit_requests")
    op.drop_column("care_hostel_visit_requests", "lab_order_id")
    for column in ("handed_over_at", "collected_at", "tube_count", "collection_address"):
        op.drop_column("care_lab_orders", column)
    op.drop_index("ix_care_lab_orders_collector_id", table_name="care_lab_orders")
    op.drop_column("care_lab_orders", "collector_id")
    op.drop_table("care_lab_collectors")
    op.drop_table("care_lab_order_charges")
    # Only shop-order payments fit the old shape (order_id NOT NULL). Lab
    # payments are dropped with their refunds; take a backup before downgrading.
    op.execute("DELETE FROM care_refunds WHERE payment_id IN (SELECT id FROM care_payments WHERE order_id IS NULL)")
    op.execute("DELETE FROM care_payments WHERE order_id IS NULL")
    with op.batch_alter_table("care_payments") as batch:
        batch.alter_column("order_id", existing_type=sa.String(), nullable=False)
    op.drop_index("ix_care_payments_payable_id", table_name="care_payments")
    op.drop_column("care_payments", "payable_id")
    op.drop_column("care_payments", "payable_kind")
