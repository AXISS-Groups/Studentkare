"""Personal-record RAG storage + pgvector for the existing Ayush index.

Adds ``care_personal_document_chunks`` (docs/plans/tier1-document-rag-2026-11-04.md):
retrievable passages of a student's own uploaded document (``care_documents``), each with
an embedding, scoped to one account. Clinical plane (core/rule_l.py) — a private, personal
table, deliberately separate from ``care_knowledge_chunks`` (approved knowledge content
only). ``services/erasure.py`` discovers and erases this table automatically by following
its foreign key to ``care_accounts``, same as every other personal table — no new erasure
code needed.

Also adds ``care_notification_preferences.document_ai_analysis_enabled`` — the
``DOCUMENT_AI_ANALYSIS`` optional consent purpose (``services/consent_ledger.py``) that
gates document indexing, mirroring ``ayush_history_enabled``'s existing pattern.

Also moves ``care_knowledge_chunks.vector`` from JSON to a real pgvector column
(https://github.com/pgvector/pgvector), on Postgres only — the JSON column's own docstring
already said this would happen "later." On SQLite (the test harness) both tables keep a
plain JSON column; ``core/workflow_models.py``'s ``vector_column()`` picks the right type
per dialect, so the ORM model is unchanged either way.

pgvector columns are fixed-width (``services.embeddings.LOCAL_DIMENSIONS`` = 512), unlike
the JSON column they replace. Converting a JSON array to a fixed-width vector in place has
no safe generic SQL cast, so on Postgres the old ``care_knowledge_chunks.vector`` column is
dropped and re-added as ``vector(512)``, nullable (existing embeddings are not carried
over). Call ``services.vector_store.reindex_all(db)`` once after this migration runs in any
environment with real knowledge content — the same function already used whenever the
active embedder changes, so no new recovery path is needed.

Founder-approved plan: docs/plans/tier1-document-rag-2026-11-04.md (approved 2026-11-05 by
Krishna Chintakayala).

Revision ID: b7f3e8c1a2d4
Revises: e1c4b7a9d5f2
Create Date: 2026-11-05
"""
import sqlalchemy as sa

from alembic import op

revision = "b7f3e8c1a2d4"
down_revision = "e1c4b7a9d5f2"
branch_labels = None
depends_on = None

VECTOR_DIMENSIONS = 512  # services.embeddings.LOCAL_DIMENSIONS


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    vector_type = sa.JSON()
    if is_postgres:
        from pgvector.sqlalchemy import Vector
        vector_type = Vector(VECTOR_DIMENSIONS)

    notif_columns = {c["name"] for c in inspector.get_columns("care_notification_preferences")}
    if "document_ai_analysis_enabled" not in notif_columns:
        op.add_column("care_notification_preferences",
                       sa.Column("document_ai_analysis_enabled", sa.Boolean(), nullable=False,
                                 server_default=sa.false()))

    if "care_personal_document_chunks" not in set(inspector.get_table_names()):
        op.create_table(
            "care_personal_document_chunks",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("document_id", sa.String(), sa.ForeignKey("care_documents.id"), nullable=False),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("ordinal", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("content", sa.String(2000), nullable=False, server_default=""),
            sa.Column("embedder", sa.String(40), nullable=False, server_default=""),
            sa.Column("vector", vector_type, nullable=True),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_personal_document_chunks_document_id",
                         "care_personal_document_chunks", ["document_id"])
        op.create_index("ix_care_personal_document_chunks_account_id",
                         "care_personal_document_chunks", ["account_id"])

    if is_postgres:
        columns = {c["name"]: c for c in inspector.get_columns("care_knowledge_chunks")}
        current_type = str(columns.get("vector", {}).get("type", "")).lower()
        if "vector" not in current_type:
            # No safe generic cast from JSON array to a fixed-width vector; existing
            # embeddings are rebuilt by services.vector_store.reindex_all(db), the same
            # recovery path already used whenever the active embedder changes.
            op.drop_column("care_knowledge_chunks", "vector")
            op.add_column("care_knowledge_chunks", sa.Column("vector", vector_type, nullable=True))

    from core.rule_l import apply_grants

    apply_grants(bind)  # P23: new tables ship with their grants


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    op.drop_table("care_personal_document_chunks")
    op.drop_column("care_notification_preferences", "document_ai_analysis_enabled")

    if is_postgres:
        op.drop_column("care_knowledge_chunks", "vector")
        op.add_column("care_knowledge_chunks", sa.Column("vector", sa.JSON(), nullable=True))
