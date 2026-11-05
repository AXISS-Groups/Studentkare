"""RAG storage for a student's own uploaded documents (docs/plans/tier1-document-rag-2026-11-04.md).

Chunks and embeds the text ``services/document_ocr.py`` actually read from one
document (never raw bytes, never an invented summary) into
``PersonalDocumentChunk``, gated by the ``DOCUMENT_AI_ANALYSIS`` optional consent
(``care_notification_preferences.document_ai_analysis_enabled`` — same flag
``services/consent_ledger.py``'s ``OPTIONAL_PURPOSES`` reads and writes).

Deliberately its own small module, not an addition to ``services/vector_store.py``:
that pipeline indexes only approved, reviewed ``KnowledgeSource`` content for Agent
Ayush, and mixing a person's private documents into it would break the "only
approved sources are ever indexed" guarantee its answers depend on. Chunking reuses
``vector_store.split_into_chunks`` (same target size / overlap), and embedding
mirrors ``vector_store``'s active-embedder-with-local-fallback, so a document's
passages are comparable with each other the same way a knowledge source's are.

Every function here takes ``account_id`` and never searches across accounts —
enforced in the query itself, not left to the caller to remember (rule 6).
"""
from __future__ import annotations

import time
import uuid

from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services import embeddings, vector_store


def consent_given(db: DBSession, account_id: str) -> bool:
    """Whether this account has switched on DOCUMENT_AI_ANALYSIS (consent_ledger.py)."""
    prefs = db.get(M.NotificationPreference, account_id)
    return bool(prefs and prefs.document_ai_analysis_enabled)


def _embed_all(chunks: list[str]) -> tuple[str, list[list[float]]]:
    """Same fallback shape as vector_store._embed_all: a semantic model that cannot
    answer never blocks indexing — it falls back to the local embedder and the
    failure is recorded for the admin screen."""
    embedder = embeddings.active_embedder()
    try:
        return embedder.name, [embedder.embed(chunk) for chunk in chunks]
    except Exception as exc:  # noqa: BLE001 — fall back to keyword, never leave it unindexed
        if embedder is embeddings.local_embedder():
            raise
        from services import llm_gateway
        llm_gateway.record_error("personal_document_indexing", type(exc).__name__)
        local = embeddings.local_embedder()
        return local.name, [local.embed(chunk) for chunk in chunks]


def remove_document(db: DBSession, document_id: str) -> None:
    """Take one document's passages out of the index (deleted, re-read, consent withdrawn)."""
    db.execute(delete(M.PersonalDocumentChunk).where(M.PersonalDocumentChunk.document_id == document_id))


def index_document(db: DBSession, document_id: str, account_id: str, text: str) -> int:
    """Chunk and embed one document's read text. Replaces any chunks it already had.

    A no-op (after clearing old chunks) when DOCUMENT_AI_ANALYSIS is off for this
    account, or when there is nothing to index — never raises for either case, since
    reading the document itself (structured field extraction) must still succeed
    whether or not the student opted into this.
    """
    remove_document(db, document_id)
    if not text or not consent_given(db, account_id):
        return 0
    chunks = vector_store.split_into_chunks(text)
    if not chunks:
        return 0
    embedder_name, vectors = _embed_all(chunks)
    now = time.time()
    for ordinal, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
        db.add(M.PersonalDocumentChunk(
            id=uuid.uuid4().hex, document_id=document_id, account_id=account_id, ordinal=ordinal,
            content=chunk, embedder=embedder_name, vector=vector, created_at=now,
        ))
    return len(chunks)


def search(db: DBSession, account_id: str, query: str, limit: int = 5) -> list[dict]:
    """The account's own passages, scored against ``query``. Never crosses accounts:
    filtered on account_id here, not left to the caller."""
    rows = db.scalars(
        select(M.PersonalDocumentChunk).where(M.PersonalDocumentChunk.account_id == account_id)
    ).all()
    if not rows or not (query or "").strip():
        return []
    embedder = embeddings.active_embedder()
    try:
        query_vector = embedder.embed(query)
        embedder_name = embedder.name
    except Exception:  # noqa: BLE001 — fall back to keyword scoring, never raise on a read
        embedder = embeddings.local_embedder()
        query_vector = embedder.embed(query)
        embedder_name = embedder.name
    scored = []
    for row in rows:
        if row.embedder != embedder_name:
            continue  # embedder changed since this chunk was indexed; skip rather than compare mismatched spaces
        score = embeddings.cosine(query_vector, row.vector)
        if score >= vector_store.RELEVANCE_FLOOR:
            scored.append((score, row))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [{"documentId": row.document_id, "content": row.content, "score": score}
            for score, row in scored[:limit]]
