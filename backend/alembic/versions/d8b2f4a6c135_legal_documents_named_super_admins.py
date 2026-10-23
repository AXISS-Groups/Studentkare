"""Legal documents, the notice version on sign-up consent, named super admins (audit H2, H3).

* ``care_legal_documents``: versions of the privacy notice, the terms and the
  grievance officer details, written and published by a super admin from the text
  legal supplies, so it goes live without a deploy. Platform plane.
* ``care_consent_records.notice_version`` / ``terms_version``: which published
  versions the sign-up consent screen showed ("unpublished" when none). "" for
  every row before this and for optional-purpose rows.
* ``care_named_super_admins``: super admins who are one named person; their first
  sign-in through the authenticator step gates retiring the shared team super
  admin. Platform plane.

Revision ID: d8b2f4a6c135
Revises: d4e8b2a7c1f6
Create Date: 2026-10-23
"""
import sqlalchemy as sa

from alembic import op

revision = "d8b2f4a6c135"
down_revision = "d4e8b2a7c1f6"
branch_labels = None
depends_on = None

CONSENTS = "care_consent_records"
LEGAL = "care_legal_documents"
NAMED = "care_named_super_admins"


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if LEGAL not in tables:
        op.create_table(
            "care_legal_documents",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("kind", sa.String(24), nullable=False),
            sa.Column("version", sa.String(40), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("status", sa.String(12), nullable=False),
            sa.Column("created_by", sa.String(64), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
            sa.Column("published_by", sa.String(64), nullable=False, server_default=""),
            sa.Column("published_at", sa.Float(), nullable=False, server_default="0"),
            sa.UniqueConstraint("kind", "version", name="uq_care_legal_documents_kind_version"),
            sa.CheckConstraint("kind IN ('PRIVACY_NOTICE', 'TERMS', 'GRIEVANCE_OFFICER')", name="ck_care_legal_documents_kind"),
            sa.CheckConstraint("status IN ('DRAFT', 'PUBLISHED', 'RETIRED')", name="ck_care_legal_documents_status"),
        )
        op.create_index("ix_care_legal_documents_kind", LEGAL, ["kind"])
    if NAMED not in tables:
        op.create_table(
            "care_named_super_admins",
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
            sa.Column("created_by", sa.String(64), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
            sa.Column("totp_signed_in_at", sa.Float(), nullable=False, server_default="0"),
        )
    if CONSENTS in tables:
        columns = {c["name"] for c in sa.inspect(bind).get_columns(CONSENTS)}
        with op.batch_alter_table(CONSENTS) as batch:
            if "notice_version" not in columns:
                batch.add_column(sa.Column("notice_version", sa.String(40), nullable=False, server_default=""))
            if "terms_version" not in columns:
                batch.add_column(sa.Column("terms_version", sa.String(40), nullable=False, server_default=""))


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if CONSENTS in tables:
        columns = {c["name"] for c in sa.inspect(bind).get_columns(CONSENTS)}
        with op.batch_alter_table(CONSENTS) as batch:
            for name in ("terms_version", "notice_version"):
                if name in columns:
                    batch.drop_column(name)
    if NAMED in tables:
        op.drop_table(NAMED)
    if LEGAL in tables:
        op.drop_index("ix_care_legal_documents_kind", table_name=LEGAL)
        op.drop_table(LEGAL)
