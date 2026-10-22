"""One payment per checkout attempt: an idempotency key on payment intents (live-run audit #9).

The checkout and lab-booking Pay step could POST /payment twice at once (React
StrictMode runs the effect twice); both requests passed the "is a payment
already open?" check before either was saved, and two provider orders were
opened. The client now sends one Idempotency-Key per Pay step, stored here and
unique per payable, so a racing second request gets the first one back.

``care_payment_intents.idempotency_key``: nullable (no key sent, and every row
before this); NULLs never collide in the unique constraint. Commerce plane, as
the table already is (core/rule_l.py); the table's grants cover the column.

Revision ID: c5f9d3e7a024
Revises: a4e8c2d6f013
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "c5f9d3e7a024"
down_revision = "a4e8c2d6f013"
branch_labels = None
depends_on = None

TABLE = "care_payment_intents"
CONSTRAINT = "uq_care_payment_intents_payable_key"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if TABLE not in set(inspector.get_table_names()):
        return
    if "idempotency_key" not in {c["name"] for c in inspector.get_columns(TABLE)}:
        op.add_column(TABLE, sa.Column("idempotency_key", sa.String(80), nullable=True))
    if CONSTRAINT not in {c["name"] for c in sa.inspect(bind).get_unique_constraints(TABLE)}:
        with op.batch_alter_table(TABLE) as batch:
            batch.create_unique_constraint(CONSTRAINT, ["payable_kind", "payable_id", "idempotency_key"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if TABLE not in set(inspector.get_table_names()):
        return
    with op.batch_alter_table(TABLE) as batch:
        if CONSTRAINT in {c["name"] for c in inspector.get_unique_constraints(TABLE)}:
            batch.drop_constraint(CONSTRAINT, type_="unique")
        if "idempotency_key" in {c["name"] for c in inspector.get_columns(TABLE)}:
            batch.drop_column("idempotency_key")
