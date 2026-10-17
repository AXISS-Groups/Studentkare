"""Add the partner type a super admin assigns to a VENDOR account.

Chained after f3a8d61c2b57 (main already merged the e84d2b91c01f / 7c5d1e2a4b90
heads this migration used to join), so the history keeps a single head:
`alembic upgrade head` refuses to run with two, and production startup calls it.
"""

import sqlalchemy as sa

from alembic import op

revision = "a4e9c1f7b2d6"
down_revision = "f3a8d61c2b57"
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
