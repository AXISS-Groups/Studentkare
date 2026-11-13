"""Auto-filing of uploaded health records.

Plan: docs/plans/tier1-document-autofile-2026-11-13.md (approved 2026-11-13 by Krishna
Chintakayala).

``care_documents`` gains a content checksum (so the same bytes uploaded twice are one
record), the subfolder ``doc_kind`` and where it came from. ``category`` is untouched: it
is the student's own pick. Existing rows keep ``doc_kind = ""`` (never filed) and are
picked up by the reclassify backfill, which is dry-run by default.

Two new clinical-plane tables: ``care_document_label_corrections`` (the student moved a
record; the next upload with that file name follows them) and ``care_ocr_jobs`` (one row
per attempt to read a document: engine, duration, an error code; never text). Both carry
a foreign key to ``care_accounts``, so ``services/erasure.py`` finds and erases them like
every other personal table.

The checksum of each existing document is computed here by Postgres, in one statement.
The migration runs in one transaction, so ``care_documents`` is locked until it finishes:
on a large table run it in a quiet window.

Revision ID: c9d4e7a1b3f6
Revises: a6d2f9b4c810
Create Date: 2026-11-13
"""
import sqlalchemy as sa

from alembic import op

revision = "c9d4e7a1b3f6"
down_revision = "a6d2f9b4c810"
branch_labels = None
depends_on = None

def _backfill_checksums() -> None:
    # Hashed by Postgres itself (sha256(bytea), Postgres 11+): one statement, and no
    # document's bytes are pulled into this process.
    op.execute("UPDATE care_documents SET checksum_sha256 = encode(sha256(content), 'hex') "
               "WHERE checksum_sha256 = ''")


def upgrade() -> None:
    bind = op.get_bind()
    op.add_column("care_documents", sa.Column("checksum_sha256", sa.String(64), nullable=False, server_default=""))
    op.add_column("care_documents", sa.Column("doc_kind", sa.String(40), nullable=False, server_default=""))
    op.add_column("care_documents", sa.Column("classification_source", sa.String(16), nullable=False,
                                              server_default=""))
    op.add_column("care_documents", sa.Column("classification_confidence", sa.Float(), nullable=False,
                                              server_default="0"))
    op.add_column("care_documents", sa.Column("ocr_engine", sa.String(40), nullable=False, server_default=""))
    op.add_column("care_documents", sa.Column("ocr_text_len", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("care_documents", sa.Column("kind_verified", sa.Boolean(), nullable=False,
                                              server_default=sa.false()))
    _backfill_checksums()
    op.create_index("ix_care_documents_account_checksum", "care_documents", ["account_id", "checksum_sha256"])

    op.create_table(
        "care_document_label_corrections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("file_name_norm", sa.String(200), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("corrected_kind", sa.String(40), nullable=False),
        sa.Column("rule_said_kind", sa.String(40), nullable=False),
        sa.Column("rule_said_source", sa.String(16), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.UniqueConstraint("account_id", "file_name_norm", "category", name="uq_document_label_correction"),
    )
    op.create_index("ix_care_document_label_corrections_account_id", "care_document_label_corrections",
                    ["account_id"])

    op.create_table(
        "care_ocr_jobs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("engine", sa.String(40), nullable=False),
        sa.Column("ok", sa.Boolean(), nullable=False),
        sa.Column("pages", sa.Integer(), nullable=False),
        sa.Column("ms", sa.Integer(), nullable=False),
        sa.Column("rotation", sa.Integer(), nullable=False),
        sa.Column("error_code", sa.String(24), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_care_ocr_jobs_account_id", "care_ocr_jobs", ["account_id"])
    op.create_index("ix_care_ocr_jobs_document_id", "care_ocr_jobs", ["document_id"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_index("ix_care_ocr_jobs_document_id", table_name="care_ocr_jobs")
    op.drop_index("ix_care_ocr_jobs_account_id", table_name="care_ocr_jobs")
    op.drop_table("care_ocr_jobs")
    op.drop_index("ix_care_document_label_corrections_account_id", table_name="care_document_label_corrections")
    op.drop_table("care_document_label_corrections")
    op.drop_index("ix_care_documents_account_checksum", table_name="care_documents")
    for column in ("kind_verified", "ocr_text_len", "ocr_engine", "classification_confidence",
                   "classification_source", "doc_kind", "checksum_sha256"):
        op.drop_column("care_documents", column)
