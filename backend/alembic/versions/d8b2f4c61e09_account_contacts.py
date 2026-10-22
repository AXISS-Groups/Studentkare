"""Account contacts: an email and a WhatsApp number per account, each verified or not.

- ``care_account_contacts`` (platform plane, core/rule_l.py): at most one EMAIL and
  one WHATSAPP per account, each value on one account only, ``verified_at`` set
  when a one-time code sent to it was entered. Every existing account's sign-in
  ID is copied in as a verified contact (it was proven by the code it signed up
  with).
- ``care_otp_challenges.account_id``: for a VERIFY code, the signed-in account
  adding the contact.

Plan tier1-auth-password-2026-10-22 (section A), approved by the founder 2026-10-22.

Revision ID: d8b2f4c61e09
Revises: c5e1b7a93d40
Create Date: 2026-10-22
"""
import time
import uuid

import sqlalchemy as sa

from alembic import op

revision = "d8b2f4c61e09"
down_revision = "c5e1b7a93d40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "care_account_contacts" not in set(inspector.get_table_names()):
        op.create_table(
            "care_account_contacts",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("kind", sa.String(16), nullable=False),
            sa.Column("value", sa.String(254), nullable=False),
            sa.Column("verified_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.UniqueConstraint("account_id", "kind", name="uq_account_contact_kind"),
        )
        op.create_index("ix_care_account_contacts_account_id", "care_account_contacts", ["account_id"])
        op.create_index("ix_care_account_contacts_value", "care_account_contacts", ["value"], unique=True)
        accounts = sa.table("care_accounts", sa.column("id"), sa.column("identifier"), sa.column("channel"),
                            sa.column("created_at"))
        contacts = sa.table("care_account_contacts", sa.column("id"), sa.column("account_id"), sa.column("kind"),
                            sa.column("value"), sa.column("verified_at"), sa.column("created_at"))
        now = time.time()   # proven when it signed up; never 0, which would read as unverified
        rows = bind.execute(sa.select(accounts.c.id, accounts.c.identifier, accounts.c.channel,
                                      accounts.c.created_at)).all()
        op.bulk_insert(contacts, [
            {"id": uuid.uuid4().hex, "account_id": row.id, "kind": row.channel, "value": row.identifier,
             "verified_at": now, "created_at": row.created_at or now}
            for row in rows if row.channel in ("EMAIL", "WHATSAPP") and row.identifier
        ])
    if "account_id" not in {c["name"] for c in inspector.get_columns("care_otp_challenges")}:
        op.add_column("care_otp_challenges", sa.Column("account_id", sa.String(), nullable=False, server_default=""))

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_column("care_otp_challenges", "account_id")
    op.drop_index("ix_care_account_contacts_value", table_name="care_account_contacts")
    op.drop_index("ix_care_account_contacts_account_id", table_name="care_account_contacts")
    op.drop_table("care_account_contacts")
