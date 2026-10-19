"""A student's lab booking: collection address, and the commerce order that pays for it.

care_lab_orders (clinical plane) gains the collection address — HOME address
lines + pincode, or HOSTEL block + room — and ``commerce_order_id``, the opaque
id of the care_orders row that pays for the booking. No price or payment state
is stored on the clinical row.

care_orders (commerce plane) gains ``purpose`` ("shop" | "lab_booking") so a
lab booking's line stays off the vendor request queue; the lab works it from
its own queue once it is paid.

No new tables, so the Rule L grant matrix (table-level) is unchanged.

Revision ID: d7c4a9e2b5f1
Revises: b8d3e6f1a2c9
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "d7c4a9e2b5f1"
down_revision = "b8d3e6f1a2c9"
branch_labels = None
depends_on = None

LAB_COLUMNS = (
    ("collection_address_line1", 200),
    ("collection_address_line2", 200),
    ("collection_pincode", 6),
    ("collection_hostel_block", 80),
    ("collection_hostel_room", 40),
)


def upgrade() -> None:
    bind = op.get_bind()
    lab_columns = {c["name"] for c in sa.inspect(bind).get_columns("care_lab_orders")}
    for name, length in LAB_COLUMNS:
        if name not in lab_columns:
            op.add_column("care_lab_orders", sa.Column(name, sa.String(length), nullable=False, server_default=""))
    if "commerce_order_id" not in lab_columns:
        op.add_column("care_lab_orders", sa.Column("commerce_order_id", sa.String(), nullable=True))
        op.create_index("ix_care_lab_orders_commerce_order_id", "care_lab_orders", ["commerce_order_id"])

    order_columns = {c["name"] for c in sa.inspect(bind).get_columns("care_orders")}
    if "purpose" not in order_columns:
        op.add_column("care_orders", sa.Column("purpose", sa.String(16), nullable=False, server_default="shop"))


def downgrade() -> None:
    op.drop_column("care_orders", "purpose")
    op.drop_index("ix_care_lab_orders_commerce_order_id", table_name="care_lab_orders")
    op.drop_column("care_lab_orders", "commerce_order_id")
    for name, _length in reversed(LAB_COLUMNS):
        op.drop_column("care_lab_orders", name)
