"""
services.vector_store — chunk, embed, index and search approved knowledge.

The retrieval half of the RAG pipeline. Three things it does deliberately:

**It indexes only approved sources.** A chunk is created solely from a
``KnowledgeSource`` that is active, reviewed and unexpired. The filter lives at index
time as well as query time, so an unapproved source cannot reach a student even if a
later query forgets to filter.

**It chunks on sentence boundaries.** A passage cut mid-sentence retrieves badly and
reads worse when quoted back with a citation.

**It re-ranks, it does not only rank.** Pure vector similarity on a morphological
embedder over-rewards long chunks that share common substrings, so the score is
blended with exact-term overlap. Both components are returned, so a low-confidence
answer can be recognised as one.
"""
from __future__ import annotations

import re
import time
import uuid

from sqlalchemy import delete, select

from core import workflow_models as M
from services import embeddings

# Long enough to carry a complete answer, short enough that a citation quotes
# something a person can read in one breath.
TARGET_CHUNK_CHARS = 700
MIN_CHUNK_CHARS = 120
# Sentences repeated from the previous chunk, so an answer spanning a boundary
# survives in at least one chunk whole.
OVERLAP_SENTENCES = 1

# Below this a match is not worth showing.
RELEVANCE_FLOOR = 0.25

# A query whose words appear nowhere in the chunk is not a match, whatever the
# character similarity says. This gate is what the local embedder makes necessary:
# hashed n-grams over English share enough common substrings ("tion", "the", "ing")
# that unrelated text still scores 0.3-0.5 cosine. Term overlap is the trustworthy
# signal here and similarity re-ranks within what it admits. A real semantic model
# would justify lowering this, which is one of the things swapping one in buys.
MIN_TERM_OVERLAP = 0.2

_SENTENCE = re.compile(r"(?<=[.!?])\s+")
_WORD = re.compile(r"[a-z0-9]{3,}")

# Function words carry no subject, and counting them wrecks the overlap gate: "the
# chemical composition of granite" shares "the" with almost every chunk in any index,
# which was enough to clear the floor and answer a geology question from a campus
# verification page.
_STOPWORDS = frozenset("""
and any are but can did does for from had has have how into its
not out should some such than that the their them then there these they this
those was were what when where which who why will with would you your yours
about after also been before being does doing during each here more most other
over same too very own just now get got use used using please tell know need
""".split())


def split_into_chunks(text: str) -> list[str]:
    """Group sentences up to the target size, overlapping by one."""
    body = (text or "").strip()
    if not body:
        return []
    sentences = [s.strip() for s in _SENTENCE.split(body) if s.strip()]
    if not sentences:
        return []

    chunks: list[str] = []
    current: list[str] = []
    length = 0
    for sentence in sentences:
        if current and length + len(sentence) > TARGET_CHUNK_CHARS:
            chunks.append(" ".join(current))
            current = current[-OVERLAP_SENTENCES:] if OVERLAP_SENTENCES else []
            length = sum(len(s) for s in current)
        current.append(sentence)
        length += len(sentence)
    if current:
        chunks.append(" ".join(current))

    # A trailing fragment is folded back rather than indexed as its own weak chunk.
    if len(chunks) > 1 and len(chunks[-1]) < MIN_CHUNK_CHARS:
        chunks[-2] = f"{chunks[-2]} {chunks[-1]}"
        chunks.pop()
    return [chunk[:2000] for chunk in chunks]


def _approved_sources(db) -> list[M.KnowledgeSource]:
    now = time.time()
    rows = db.scalars(select(M.KnowledgeSource).where(
        M.KnowledgeSource.active.is_(True), M.KnowledgeSource.reviewed.is_(True))).all()
    return [row for row in rows if not row.expires_at or row.expires_at > now]


def index_source(db, source: M.KnowledgeSource) -> int:
    """Re-chunk and re-embed one source. Replaces any chunks it already had."""
    embedder = embeddings.active_embedder()
    db.execute(delete(M.KnowledgeChunk).where(M.KnowledgeChunk.source_id == source.id))

    chunks = split_into_chunks(f"{source.title}. {source.content}")
    now = time.time()
    for ordinal, chunk in enumerate(chunks):
        db.add(M.KnowledgeChunk(
            id=uuid.uuid4().hex, source_id=source.id, ordinal=ordinal, content=chunk,
            source_version=source.version, embedder=embedder.name,
            vector=embedder.embed(chunk), created_at=now,
        ))
    return len(chunks)


def reindex_all(db) -> dict:
    """Rebuild the whole index. Safe to run repeatedly; it is the recovery path."""
    embedder = embeddings.active_embedder()
    sources = _approved_sources(db)
    approved_ids = {source.id for source in sources}

    # Sources that were approved when indexed and no longer are must leave the index.
    stale = [row.source_id for row in db.scalars(select(M.KnowledgeChunk)).all()
             if row.source_id not in approved_ids]
    if stale:
        db.execute(delete(M.KnowledgeChunk).where(M.KnowledgeChunk.source_id.in_(set(stale))))

    chunk_count = sum(index_source(db, source) for source in sources)
    db.commit()
    return {
        "sources": len(sources),
        "chunks": chunk_count,
        "embedder": embedder.name,
        "semantic": embeddings.is_semantic(),
        "removed": len(set(stale)),
    }


def content_terms(text: str) -> set[str]:
    """Subject-bearing words only — function words are dropped."""
    return {word for word in _WORD.findall((text or "").lower()) if word not in _STOPWORDS}


def _term_overlap(query: str, chunk: str) -> float:
    """Proportion of the query's subject terms present in the chunk."""
    query_terms = content_terms(query)
    if not query_terms:
        return 0.0
    return len(query_terms & content_terms(chunk)) / len(query_terms)


def search(db, query: str, *, limit: int = 4, floor: float = RELEVANCE_FLOOR) -> list[dict]:
    """Retrieve the best approved passages for a query, best first.

    Returns an empty list rather than a weak best guess when nothing clears the floor —
    the agent's refusal depends on that being an honest signal.
    """
    text = (query or "").strip()
    if not text:
        return []

    # A query with no subject words ("what is this?") cannot be matched honestly.
    if not content_terms(text):
        return []

    embedder = embeddings.active_embedder()
    query_vector = embedder.embed(text)

    sources = {source.id: source for source in _approved_sources(db)}
    if not sources:
        return []

    chunks = db.scalars(select(M.KnowledgeChunk).where(
        M.KnowledgeChunk.source_id.in_(sources.keys()))).all()

    scored = []
    for chunk in chunks:
        # A chunk embedded by a different model is not comparable; skip rather than
        # score it wrongly. A reindex brings it back.
        if chunk.embedder != embedder.name:
            continue
        overlap = _term_overlap(text, chunk.content)
        if overlap < MIN_TERM_OVERLAP:
            continue
        similarity = embeddings.cosine(query_vector, list(chunk.vector or []))
        # Term overlap establishes the subject; similarity orders what survives.
        score = 0.6 * similarity + 0.4 * overlap
        if score < floor:
            continue
        source = sources[chunk.source_id]
        scored.append({
            "chunkId": chunk.id, "sourceId": source.id, "title": source.title,
            "category": source.category, "version": source.version,
            "content": chunk.content, "score": round(score, 4),
            "similarity": round(similarity, 4), "termOverlap": round(overlap, 4),
            "stale": chunk.source_version != source.version,
        })

    scored.sort(key=lambda row: row["score"], reverse=True)

    # One passage per source: three chunks of the same document is not three sources,
    # and presenting it as such overstates how well-supported an answer is.
    seen: set[str] = set()
    best = []
    for row in scored:
        if row["sourceId"] in seen:
            continue
        seen.add(row["sourceId"])
        best.append(row)
        if len(best) >= limit:
            break
    return best


def index_status(db) -> dict:
    """What the index currently holds, and whether it matches the approved set."""
    embedder = embeddings.active_embedder()
    sources = _approved_sources(db)
    chunks = db.scalars(select(M.KnowledgeChunk)).all()
    indexed_ids = {chunk.source_id for chunk in chunks}
    return {
        "approvedSources": len(sources),
        "indexedSources": len(indexed_ids),
        "chunks": len(chunks),
        "embedder": embedder.name,
        "semantic": embeddings.is_semantic(),
        "missing": sorted({source.id for source in sources} - indexed_ids),
        "mismatchedEmbedder": sum(1 for chunk in chunks if chunk.embedder != embedder.name),
    }
