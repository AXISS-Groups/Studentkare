"""Priced dispenses: a pharmacy quotes a verified prescription and the student pays it.

- care_dispense_quotes (commerce plane): the quote's totals and payment state for
  one dispense, referenced by id only. No medicine names, quantities or anything
  about the patient's health (Rule L).
- care_dispense_items.unit_price_paise / quantity_quoted (clinical plane): the
  per-line prices, kept beside the medicines they price.
- care_payments needs nothing new: d9e2a7c41b58 (lab orders from the shop)
  already added payable_kind / payable_id and made order_id nullable. A
  dispense-quote payment uses payable_kind = 'dispense_quote'.
- care_service_providers.delivery_available / pickup_available: how a pharmacy
  hands medicines over. Existing providers get false for both (not recorded),
  never an assumed yes.

Revision ID: c5f2a9d4e7b1
Revises: b9e3d5a71c42
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "c5f2a9d4e7b1"
down_revision = "b9e3d5a71c42"
branch_labels = None
depends_on = None


def _columns(bind, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "care_dispense_quotes" not in existing:
        op.create_table(
            "care_dispense_quotes",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("dispense_id", sa.String(64), nullable=False),
            sa.Column("pharmacy_id", sa.String(64), nullable=False),
            sa.Column("account_id", sa.String(64), nullable=False),
            sa.Column("items_subtotal_paise", sa.Integer(), nullable=False),
            sa.Column("delivery_fee_paise", sa.Integer(), nullable=False),
            sa.Column("total_paise", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False),
            sa.Column("status", sa.String(16), nullable=False),
            sa.Column("quoted_by", sa.String(64), nullable=False),
            sa.Column("quoted_at", sa.Float(), nullable=False),
            sa.Column("payment_started_at", sa.Float(), nullable=False),
            sa.Column("paid_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
        )
        for column in ("dispense_id", "pharmacy_id", "account_id", "status"):
            op.create_index(f"ix_care_dispense_quotes_{column}", "care_dispense_quotes", [column])

    item_columns = _columns(bind, "care_dispense_items")
    if "unit_price_paise" not in item_columns:
        op.add_column("care_dispense_items",
                      sa.Column("unit_price_paise", sa.Integer(), nullable=False, server_default="0"))
    if "quantity_quoted" not in item_columns:
        op.add_column("care_dispense_items",
                      sa.Column("quantity_quoted", sa.Integer(), nullable=False, server_default="0"))

    provider_columns = _columns(bind, "care_service_providers")
    if "delivery_available" not in provider_columns:
        op.add_column("care_service_providers",
                      sa.Column("delivery_available", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "pickup_available" not in provider_columns:
        op.add_column("care_service_providers",
                      sa.Column("pickup_available", sa.Boolean(), nullable=False, server_default=sa.false()))

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_column("care_service_providers", "pickup_available")
    op.drop_column("care_service_providers", "delivery_available")
    # Dispense-quote payments outlive their quotes table; take a backup first.
    op.execute("DELETE FROM care_refunds WHERE payable_kind = 'dispense_quote'")
    op.execute("DELETE FROM care_payment_intents WHERE payable_kind = 'dispense_quote'")
    op.execute("DELETE FROM care_payments WHERE payable_kind = 'dispense_quote'")
    op.drop_column("care_dispense_items", "quantity_quoted")
    op.drop_column("care_dispense_items", "unit_price_paise")
    op.drop_table("care_dispense_quotes")
