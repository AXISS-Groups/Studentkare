"""Sign-up holds the second contact, proven with its own code.

- ``care_signup_grants.second_channel``, ``second_identifier``,
  ``second_verified_at``: the other contact (email or WhatsApp) a student verifies
  during sign-up, saved as a verified contact when the account is created.

Plan tier1-auth-password-2026-10-22 (section B), approved by the founder 2026-10-22.

Revision ID: e3a9c1d75b28
Revises: d8b2f4c61e09
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "e3a9c1d75b28"
down_revision = "d8b2f4c61e09"
branch_labels = None
depends_on = None

COLUMNS = (
    ("second_channel", sa.String(16), ""),
    ("second_identifier", sa.String(254), ""),
    ("second_verified_at", sa.Float(), "0"),
)


def upgrade() -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("care_signup_grants")}
    for name, kind, default in COLUMNS:
        if name not in existing:
            op.add_column("care_signup_grants", sa.Column(name, kind, nullable=False, server_default=default))


def downgrade() -> None:
    for name, _kind, _default in reversed(COLUMNS):
        op.drop_column("care_signup_grants", name)
