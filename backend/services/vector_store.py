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

# The shortest question (letters, without spaces) a semantic model may match when it
# carries no English subject word, e.g. a question typed in Devanagari or Telugu.
MIN_SEMANTIC_QUERY_CHARS = 6

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


def _embed_all(chunks: list[str]) -> tuple[str, list[list[float]]]:
    """Embed a source's chunks with the active embedder, or the local one if it fails.

    A whole source uses one embedder, so its passages are comparable with each other.
    A semantic model that cannot answer (down, cooling off, refused the text) does not
    stop a source from being indexed: it is indexed for keyword retrieval, the failure
    is recorded for the admin screen, and the next sync re-embeds it with the model.
    """
    embedder = embeddings.active_embedder()
    try:
        return embedder.name, [embedder.embed(chunk) for chunk in chunks]
    except Exception as exc:  # noqa: BLE001 — fall back to keyword, never leave it unindexed
        if embedder is embeddings.local_embedder():
            raise
        from services import llm_gateway
        llm_gateway.record_error("indexing", type(exc).__name__)
        local = embeddings.local_embedder()
        return local.name, [local.embed(chunk) for chunk in chunks]


def index_source(db, source: M.KnowledgeSource) -> int:
    """Re-chunk and re-embed one source. Replaces any chunks it already had.

    A source that is not approved (inactive, unreviewed or expired) is only removed.
    """
    remove_source(db, source.id)
    now = time.time()
    if not (source.active and source.reviewed and (not source.expires_at or source.expires_at > now)):
        return 0

    chunks = split_into_chunks(f"{source.title}. {source.content}")
    if not chunks:
        return 0
    embedder_name, vectors = _embed_all(chunks)
    for ordinal, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
        db.add(M.KnowledgeChunk(
            id=uuid.uuid4().hex, source_id=source.id, ordinal=ordinal, content=chunk,
            source_version=source.version, embedder=embedder_name,
            vector=vector, created_at=now,
        ))
    return len(chunks)


def remove_source(db, source_id: str) -> None:
    """Take one source's passages out of the index (unpublished, expired, replaced)."""
    db.execute(delete(M.KnowledgeChunk).where(M.KnowledgeChunk.source_id == source_id))


def reindex_one(db, source_id: str) -> bool:
    """Index (or un-index) one source right after it changed, and commit.

    Called in the publish / edit / unpublish request, after that change committed.
    Never raises: a failure leaves the source out of date in the index, which the
    admin screen shows and the next sync (startup or the periodic job) repairs.
    """
    try:
        source = db.get(M.KnowledgeSource, source_id)
        if source is None:
            remove_source(db, source_id)
        else:
            index_source(db, source)
        db.commit()
        return True
    except Exception as exc:  # noqa: BLE001 — the change is saved; the index catches up
        db.rollback()
        from services import llm_gateway
        llm_gateway.record_error("indexing", type(exc).__name__)
        return False


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


def sync_index(db, *, commit: bool = True) -> dict:
    """Bring the index in line with the approved set, touching only what is out of date.

    Removes passages of sources no longer approved (unpublished, unreviewed, expired),
    and (re)indexes every approved source that is missing, was edited since it was
    indexed, or was embedded by a different model than the active one — which is how
    a change of ``EMBEDDING_PROVIDER`` or ``EMBEDDING_MODEL`` re-embeds everything.
    Runs at startup, after every publish/edit/unpublish, and in the periodic
    knowledge job. ``commit=False`` flushes only (the scheduler commits).
    """
    active = embeddings.active_embedder().name
    sources = _approved_sources(db)
    approved = {source.id: source for source in sources}
    by_source: dict[str, list[M.KnowledgeChunk]] = {}
    for chunk in db.scalars(select(M.KnowledgeChunk)).all():
        by_source.setdefault(chunk.source_id, []).append(chunk)

    removed = [source_id for source_id in by_source if source_id not in approved]
    if removed:
        db.execute(delete(M.KnowledgeChunk).where(M.KnowledgeChunk.source_id.in_(removed)))

    indexed = 0
    for source in sources:
        chunks = by_source.get(source.id, [])
        if chunks and all(chunk.source_version == source.version and chunk.embedder == active
                          for chunk in chunks):
            continue
        index_source(db, source)
        indexed += 1
    if commit:
        db.commit()
    else:
        db.flush()
    return {"indexed": indexed, "removed": len(removed), "approved": len(sources), "embedder": active}


def content_terms(text: str) -> set[str]:
    """Subject-bearing words only — function words are dropped."""
    return {word for word in _WORD.findall((text or "").lower()) if word not in _STOPWORDS}


def support(claim: str, evidence: str) -> float:
    """Proportion of the claim's subject terms present in the evidence.

    The one grounding measure: retrieval uses it to decide a passage is about the
    question, and Agent Ayush's output guard uses it to decide a rephrased sentence is
    still about the passages it came from.
    """
    claim_terms = content_terms(claim)
    if not claim_terms:
        return 0.0
    return len(claim_terms & content_terms(evidence)) / len(claim_terms)


# Suffixes folded for retrieval matching only ("booking" finds "book", "deleting"
# finds "delete"). The grounding check (``support``) stays on exact words.
_SUFFIXES = ("ing", "ed", "es", "s")
MIN_STEM_CHARS = 4


def _stem(word: str) -> str:
    for suffix in _SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= MIN_STEM_CHARS:
            word = word[: -len(suffix)]
            break
    return word[:-1] if word.endswith("e") and len(word) > MIN_STEM_CHARS else word


def _stems(text: str) -> set[str]:
    return {_stem(word) for word in content_terms(text)}


def _term_overlap(query: str, chunk: str) -> float:
    """Proportion of the query's subject terms present in the chunk (light stemming)."""
    terms = _stems(query)
    if not terms:
        return 0.0
    return len(terms & _stems(chunk)) / len(terms)


# A passage whose source title names what the question asks about ranks above one
# that only mentions it ("Deleting your account" over a privacy page that links to it).
TITLE_WEIGHT = 0.15


def _query_vectors(text: str, names: set[str]) -> dict[str, list[float] | None]:
    """The query embedded once per embedder present in the index.

    ``None`` for an embedder that cannot be used now (a model that is off or not
    answering): those passages are scored on their words alone.
    """
    vectors: dict[str, list[float] | None] = {}
    for name in names:
        embedder = embeddings.embedder_named(name)
        if embedder is None:
            vectors[name] = None
            continue
        try:
            vectors[name] = embedder.embed(text)
        except Exception as exc:  # noqa: BLE001 — degrade to keyword scoring, never fail the question
            from services import llm_gateway
            llm_gateway.record_error("retrieval", type(exc).__name__)
            vectors[name] = None
    return vectors


def _semantic_admit_similarity(db) -> float:
    from core.settings_registry import setting
    return float(setting("ayush.semantic_admit_similarity", db))


def search(db, query: str, *, limit: int = 4, floor: float = RELEVANCE_FLOOR) -> list[dict]:
    """Retrieve the best approved passages for a query, best first.

    Returns an empty list rather than a weak best guess when nothing clears the floor —
    the agent's refusal depends on that being an honest signal.

    Term overlap establishes the subject and similarity orders what survives. With a
    semantic model, a passage that shares no word with the question (a Hindi or Telugu
    question, a synonym) is admitted only when its similarity reaches the
    ``ayush.semantic_admit_similarity`` setting.
    """
    text = (query or "").strip()
    if not text:
        return []

    semantic_on = embeddings.is_semantic()
    # A query with no subject words ("what is this?") cannot be matched honestly on
    # words; only a semantic model may still try, and only on a non-trivial question.
    if not content_terms(text) and not (semantic_on and len(text.replace(" ", "")) >= MIN_SEMANTIC_QUERY_CHARS):
        return []

    sources = {source.id: source for source in _approved_sources(db)}
    if not sources:
        return []

    chunks = db.scalars(select(M.KnowledgeChunk).where(
        M.KnowledgeChunk.source_id.in_(sources.keys()))).all()
    vectors = _query_vectors(text, {chunk.embedder for chunk in chunks})
    admit = _semantic_admit_similarity(db) if semantic_on else None

    scored = []
    for chunk in chunks:
        query_vector = vectors.get(chunk.embedder)
        overlap = _term_overlap(text, chunk.content)
        if query_vector is None:
            # No usable vector for this passage's embedder: words alone.
            if overlap < MIN_TERM_OVERLAP:
                continue
            similarity, score = 0.0, overlap
        else:
            similarity = embeddings.cosine(query_vector, list(chunk.vector or []))
            semantic_match = (admit is not None and embeddings.is_semantic_name(chunk.embedder)
                              and similarity >= admit)
            if overlap < MIN_TERM_OVERLAP and not semantic_match:
                continue
            score = 0.6 * similarity + 0.4 * overlap
        if score < floor:
            continue
        source = sources[chunk.source_id]
        score += TITLE_WEIGHT * _term_overlap(text, source.title)
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
    versions = {source.id: source.version for source in sources}
    chunks = db.scalars(select(M.KnowledgeChunk)).all()
    indexed_ids = {chunk.source_id for chunk in chunks if chunk.source_id in versions}
    return {
        "approvedSources": len(sources),
        "indexedSources": len(indexed_ids),
        "chunks": len(chunks),
        "embedder": embedder.name,
        "semantic": embeddings.is_semantic(),
        "missing": sorted(set(versions) - indexed_ids),
        "mismatchedEmbedder": sum(1 for chunk in chunks if chunk.embedder != embedder.name),
        "staleSources": len({chunk.source_id for chunk in chunks
                             if chunk.source_id in versions and chunk.source_version != versions[chunk.source_id]}),
        "embedders": sorted({chunk.embedder for chunk in chunks}),
    }
