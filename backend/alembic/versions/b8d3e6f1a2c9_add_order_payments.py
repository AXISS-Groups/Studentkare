"""Order payments: payment intents, refunds, the mock gateway ledger.

Adds the tables behind services/payments.py and services/payment_gateway.py:

- care_payment_intents: one row per attempt to collect a payable (kind + id +
  amount) through a provider; the provider's order id is unique.
- care_refunds: one row per refund Idempotency-Key.
- care_mock_gateway_payments: the mock provider's own ledger (dev/test only).

and three columns:

- care_orders.payment_due_at: when an unpaid order releases its stock (0 = never;
  orders placed before this migration keep 0).
- care_payments.intent_id / refunded_paise / failure_code.

All three tables are commerce plane (core/rule_l.py) and ship with their grants.

Revision ID: b8d3e6f1a2c9
Revises: a4e9c1f7b2d6
Create Date: 2026-10-19
"""
import sqlalchemy as sa

from alembic import op

revision = "b8d3e6f1a2c9"
down_revision = "a4e9c1f7b2d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    order_columns = {c["name"] for c in sa.inspect(bind).get_columns("care_orders")}
    if "payment_due_at" not in order_columns:
        op.add_column("care_orders", sa.Column("payment_due_at", sa.Float(), nullable=False, server_default="0"))
        op.create_index("ix_care_orders_payment_due_at", "care_orders", ["payment_due_at"])

    payment_columns = {c["name"] for c in sa.inspect(bind).get_columns("care_payments")}
    if "intent_id" not in payment_columns:
        op.add_column("care_payments", sa.Column("intent_id", sa.String(64), nullable=False, server_default=""))
    if "refunded_paise" not in payment_columns:
        op.add_column("care_payments", sa.Column("refunded_paise", sa.Integer(), nullable=False, server_default="0"))
    if "failure_code" not in payment_columns:
        op.add_column("care_payments", sa.Column("failure_code", sa.String(40), nullable=False, server_default=""))

    if "care_payment_intents" not in existing:
        op.create_table(
            "care_payment_intents",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("payable_kind", sa.String(24), nullable=False),
            sa.Column("payable_id", sa.String(64), nullable=False),
            sa.Column("account_id", sa.String(64), nullable=False),
            sa.Column("amount_paise", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
            sa.Column("provider", sa.String(24), nullable=False),
            sa.Column("provider_order_id", sa.String(120), nullable=False, unique=True),
            sa.Column("test_mode", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("status", sa.String(16), nullable=False, server_default="CREATED"),
            sa.Column("expires_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
        )
        op.create_index("ix_care_payment_intents_payable_id", "care_payment_intents", ["payable_id"])
        op.create_index("ix_care_payment_intents_account_id", "care_payment_intents", ["account_id"])
        op.create_index("ix_care_payment_intents_status", "care_payment_intents", ["status"])

    if "care_refunds" not in existing:
        op.create_table(
            "care_refunds",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("payment_id", sa.String(), sa.ForeignKey("care_payments.id"), nullable=False),
            sa.Column("payable_kind", sa.String(24), nullable=False),
            sa.Column("payable_id", sa.String(64), nullable=False),
            sa.Column("amount_paise", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(24), nullable=False),
            sa.Column("provider_refund_id", sa.String(120), nullable=False, server_default=""),
            sa.Column("status", sa.String(16), nullable=False, server_default="REQUESTED"),
            sa.Column("idempotency_key", sa.String(80), nullable=False, unique=True),
            sa.Column("reason", sa.String(300), nullable=False, server_default=""),
            sa.Column("requested_by", sa.String(64), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
        )
        op.create_index("ix_care_refunds_payment_id", "care_refunds", ["payment_id"])
        op.create_index("ix_care_refunds_payable_id", "care_refunds", ["payable_id"])

    if "care_mock_gateway_payments" not in existing:
        op.create_table(
            "care_mock_gateway_payments",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("provider_order_id", sa.String(120), nullable=False),
            sa.Column("amount_paise", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
            sa.Column("status", sa.String(16), nullable=False),
            sa.Column("error_code", sa.String(40), nullable=False, server_default=""),
            sa.Column("refunded_paise", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False),
        )
        op.create_index("ix_care_mock_gateway_payments_provider_order_id",
                        "care_mock_gateway_payments", ["provider_order_id"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_table("care_mock_gateway_payments")
    op.drop_table("care_refunds")
    op.drop_table("care_payment_intents")
    op.drop_column("care_payments", "failure_code")
    op.drop_column("care_payments", "refunded_paise")
    op.drop_column("care_payments", "intent_id")
    op.drop_index("ix_care_orders_payment_due_at", table_name="care_orders")
    op.drop_column("care_orders", "payment_due_at")
