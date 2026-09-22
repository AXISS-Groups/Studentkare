"""Add the retrieval index and agent transcripts for Agent Ayush.

Vectors are stored as JSON rather than a native vector type so the same schema runs
on SQLite in tests and Postgres in production. Moving to pgvector changes this one
column and nothing above it.
"""
import sqlalchemy as sa

from alembic import op

revision = "a9e4c21f83d0"
down_revision = "f2d8a3c07b61"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_knowledge_chunks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("source_id", sa.String(), sa.ForeignKey("care_knowledge_sources.id"), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content", sa.String(2000), nullable=False, server_default=""),
        sa.Column("source_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("embedder", sa.String(40), nullable=False, server_default=""),
        sa.Column("vector", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_care_knowledge_chunks_source_id", "care_knowledge_chunks", ["source_id"])

    op.create_table(
        "care_agent_turns",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("conversation_id", sa.String(), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("agent", sa.String(40), nullable=False, server_default="ayush"),
        sa.Column("question", sa.String(1000), nullable=False, server_default=""),
        sa.Column("answer", sa.String(4000), nullable=False, server_default=""),
        sa.Column("outcome", sa.String(24), nullable=False, server_default="ANSWERED"),
        sa.Column("citation_ids", sa.JSON(), nullable=False),
        sa.Column("top_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("generator", sa.String(40), nullable=False, server_default="extractive"),
        sa.Column("latency_ms", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    for column in ("conversation_id", "account_id", "agent", "outcome", "created_at"):
        op.create_index(f"ix_care_agent_turns_{column}", "care_agent_turns", [column])


def downgrade() -> None:
    op.drop_table("care_agent_turns")
    op.drop_table("care_knowledge_chunks")
