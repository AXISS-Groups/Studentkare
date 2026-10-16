"""Add the partner type a super admin assigns to a VENDOR account.

Also the merge point for the two heads that both branched from d83c5a1e07b4
(e84d2b91c01f dpdp tables, 7c5d1e2a4b90 health camp slots): with two heads,
`alembic upgrade head` refuses to run, which is what production startup calls.
"""

import sqlalchemy as sa

from alembic import op


revision = "a4e9c1f7b2d6"
down_revision = ("e84d2b91c01f", "7c5d1e2a4b90")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing partners start with no type; their dashboard shows nothing
    # type-specific until a super admin assigns one.
    op.add_column(
        "care_accounts",
        sa.Column("partner_kind", sa.String(12), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("care_accounts", "partner_kind")
