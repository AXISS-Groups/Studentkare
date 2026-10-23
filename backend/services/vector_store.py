"""
services.vector_store — chunk, embed, index and search approved knowledge.

The retrieval half of the RAG pipeline. Three things it does deliberately:

**It indexes only approved sources.** A chunk is created solely from a
``KnowledgeSource`` that is active, reviewed and unexpired. The filter lives at index
time as well as query time, so an unapproved source cannot reach a student even if a
later query forgets to filter.

**It chunks on paragraphs, then sentences.** A paragraph of an article is one topic,
so it is the passage quoted back: "how do I cancel" quotes the cancelling paragraph,
not the opening one. A paragraph longer than the target is split on sentence
boundaries; a passage cut mid-sentence retrieves badly and reads worse when quoted.

**It re-ranks, it does not only rank.** Pure vector similarity on a morphological
embedder over-rewards long chunks that share common substrings, so the score is
blended with exact-term overlap. Both components are returned, so a low-confidence
answer can be recognised as one.
"""
from __future__ import annotations

import difflib
import re
import time
import unicodedata
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
# signal here and similarity re-ranks within what it admits. The share required is
# the ``ayush.min_term_overlap`` setting (default 0.5, core/settings_registry.py).

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


_PARAGRAPH = re.compile(r"\n\s*\n")


def split_into_chunks(text: str) -> list[str]:
    """One passage per paragraph; long paragraphs grouped by sentence, short ones joined."""
    body = (text or "").strip()
    if not body:
        return []
    pieces: list[str] = []
    for paragraph in _PARAGRAPH.split(body):
        pieces.extend(_sentence_chunks(" ".join(paragraph.split())))
    # A short paragraph ("Not available yet.") is folded into its neighbour rather
    # than indexed as its own weak passage.
    chunks: list[str] = []
    for piece in pieces:
        if chunks and (len(piece) < MIN_CHUNK_CHARS or len(chunks[-1]) < MIN_CHUNK_CHARS) \
                and len(chunks[-1]) + len(piece) <= TARGET_CHUNK_CHARS + MIN_CHUNK_CHARS:
            chunks[-1] = f"{chunks[-1]} {piece}"
        else:
            chunks.append(piece)
    return [chunk[:2000] for chunk in chunks]


def _sentence_chunks(text: str) -> list[str]:
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
    return chunks


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


def _chunked_as_today(source: M.KnowledgeSource, chunks: list[M.KnowledgeChunk]) -> bool:
    """Whether the stored passages are what the current chunker makes of the source,
    so a change to chunking re-indexes at the next sync like a change of model."""
    return [chunk.content for chunk in chunks] == split_into_chunks(f"{source.title}. {source.content}")


def sync_index(db, *, commit: bool = True) -> dict:
    """Bring the index in line with the approved set, touching only what is out of date.

    Removes passages of sources no longer approved (unpublished, unreviewed, expired),
    and (re)indexes every approved source that is missing, was edited since it was
    indexed, was embedded by a different model than the active one — which is how
    a change of ``EMBEDDING_PROVIDER`` or ``EMBEDDING_MODEL`` re-embeds everything —
    or was chunked differently from how the current chunker would.
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
        chunks = sorted(by_source.get(source.id, []), key=lambda chunk: chunk.ordinal)
        if chunks and all(chunk.source_version == source.version and chunk.embedder == active
                          for chunk in chunks) and _chunked_as_today(source, chunks):
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
    # A plain plural of a short word ("sees", "labs", "tabs"), but not "class" or "status".
    if word.endswith("s") and not word.endswith(("ss", "us", "is")) and len(word) == MIN_STEM_CHARS:
        return word[:-1]
    for suffix in _SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= MIN_STEM_CHARS:
            word = word[: -len(suffix)]
            break
    return word[:-1] if word.endswith("e") and len(word) > MIN_STEM_CHARS else word


def _stems(text: str) -> set[str]:
    return {_stem(word) for word in content_terms(text)}


# Words that carry no subject in the questions students type, in Hinglish and
# Tenglish as well as English. Retrieval only: grounding (``support``) is unchanged.
_RETRIEVAL_STOPWORDS = frozenset("""
want wants like able okay today tomorrow yesterday tonight cant dont wont didnt
until while since still yet already
kaise kaisa kare karu karna karen karein karo kya hai hain kab kahan kaha kitne kitna
kitni milega milegi mujhe mera meri mere hum aap apna apni kaun kaunsa kaunsi nahi aur
bhi ela enti emi cheyali cheyyali ekkada eppudu naku
""".split())

# A question word not found anywhere in the index is matched to the closest indexed
# word at or above this similarity ("bok" -> "book", "pasword" -> "password"), and
# counts for less than an exact match. Strict on purpose: "score" must not become "store".
FUZZY_CUTOFF = 0.85
FUZZY_WEIGHT = 0.8
# A question word that appears nowhere in the index, even allowing for a typo
# ("cricket", "granite", "capital"), says the question is about something the help
# does not cover, so it counts double against the overlap.
UNKNOWN_WEIGHT = 2.0
MIN_COVERED_TERMS = 2

# A passage whose source title names what the question asks about ranks above one
# that only mentions it ("Deleting your account" over a privacy page that links to it).
TITLE_WEIGHT = 0.15
# Among the passages of one article, the one whose own words answer the question is
# the one quoted ("how do I cancel" quotes the cancelling paragraph).
PASSAGE_WEIGHT = 0.2
# A help-pack keyword phrase found whole in the question ("where is my order") is the
# strongest sign of which article is meant.
PHRASE_WEIGHT = 0.2


# Devanagari and Telugu words, for retrieval only: a question typed in Hindi or Telugu
# (including the Ask Ayush starter chips in those languages) can match an article's
# Hindi or Telugu keywords. Not stemmed; joiners removed and the text NFC-normalised.
_INDIC_WORD = re.compile(r"[\u0900-\u097F\u0C00-\u0C7F]{2,}")
_JOINERS = dict.fromkeys(map(ord, "\u200c\u200d"))
_INDIC_STOPWORDS = frozenset("""
कैसे कैसा करें करूँ करूं करना करे करो होता होती है हैं का की के को से में पर मैं मेरा मेरी मेरे
क्या कब कहाँ कहां किसी कोई एक और भी नहीं चाहिए चाहता चाहती साथ लिए
ఎలా చేయాలి చేయాలో చేస్తారు నా నాకు నేను ఏమిటి ఎక్కడ ఎప్పుడు ఒక ఒక్క మరియు కూడా లేదు జరుగుతుంది
పనిచేస్తుంది
""".split())


def _stems_of(words) -> set[str]:
    return {_stem(word) for word in words}


def _indic_terms(text: str) -> set[str]:
    normal = unicodedata.normalize("NFC", (text or "").translate(_JOINERS))
    return {word for word in _INDIC_WORD.findall(normal) if word not in _INDIC_STOPWORDS}


def _retrieval_terms(text: str) -> set[str]:
    return (_stems_of(word for word in content_terms(text) if word not in _RETRIEVAL_STOPWORDS)
            | _indic_terms(text))


def _term_overlap(query: str, chunk: str) -> float:
    """Proportion of the query's subject terms present in the chunk (light stemming)."""
    terms = _retrieval_terms(query)
    if not terms:
        return 0.0
    return len(terms & _stems(chunk)) / len(terms)


def _phrase_text(text: str) -> str:
    return f" {' '.join(re.findall(r'[a-z0-9]+', (text or '').lower()))} "


def _source_keywords() -> dict[str, tuple[str, ...]]:
    """Help-pack keywords per source id (services.help_pack). Retrieval only."""
    try:
        from services import help_pack
        return help_pack.retrieval_keywords()
    except Exception:  # noqa: BLE001 — without keywords, retrieval still works on the text
        return {}


class _Query:
    """A question's subject terms, typo-corrected against the words in the index."""

    def __init__(self, text: str, vocabulary: set[str]):
        self.terms = _retrieval_terms(text)
        self.phrase_text = _phrase_text(text)
        self.fuzzy: dict[str, str] = {}
        unknown = 0
        for term in self.terms - vocabulary:
            close = difflib.get_close_matches(term, vocabulary, n=1, cutoff=FUZZY_CUTOFF)
            if close:
                self.fuzzy[term] = close[0]
            else:
                unknown += 1
        self.weight = len(self.terms) + (UNKNOWN_WEIGHT - 1) * unknown
        self.known = len(self.terms) - unknown

    def overlap(self, words: set[str]) -> float:
        """Share of the question's terms found in ``words``; corrected typos count less,
        words the index has never seen count double against it."""
        if not self.terms:
            return 0.0
        hits = sum(1.0 if term in words else FUZZY_WEIGHT if self.fuzzy.get(term) in words else 0.0
                   for term in self.terms)
        return hits / self.weight

    def covers_known(self, words: set[str]) -> bool:
        """Every word of the question the index knows is in ``words``, and there are at
        least two: "this assignment is killing me, how do I book a consult" is about
        booking even though "assignment" and "killing" are in no article. One known
        word among unknown ones ("cricket score") is not enough."""
        matched = sum(1 for term in self.terms if term in words or self.fuzzy.get(term) in words)
        return matched >= MIN_COVERED_TERMS and matched == self.known

    def phrase_bonus(self, phrases) -> float:
        whole = any(" " in phrase and _phrase_text(phrase) in self.phrase_text for phrase in phrases)
        return PHRASE_WEIGHT if whole else 0.0


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


def _min_term_overlap(db) -> float:
    from core.settings_registry import setting
    return float(setting("ayush.min_term_overlap", db))


def search(db, query: str, *, limit: int = 4, floor: float = RELEVANCE_FLOOR) -> list[dict]:
    """Retrieve the best approved passages for a query, best first.

    Returns an empty list rather than a weak best guess when nothing clears the floor —
    the agent's refusal depends on that being an honest signal.

    Term overlap establishes the subject and similarity orders what survives. A
    passage's terms are its own words, its article's title and, for help-pack
    articles, the article's keywords; a misspelt question word is matched to the
    closest indexed word. A passage must hold the ``ayush.min_term_overlap`` share of
    the question's subject words. With a semantic model, a passage that shares no word
    with the question (a Hindi or Telugu question, a synonym) is admitted only when its
    similarity reaches the ``ayush.semantic_admit_similarity`` setting.
    """
    text = (query or "").strip()
    if not text:
        return []

    semantic_on = embeddings.is_semantic()
    # A query with no subject words ("what is this?") cannot be matched honestly on
    # words; only a semantic model may still try, and only on a non-trivial question.
    if not _retrieval_terms(text) and not (semantic_on and len(text.replace(" ", "")) >= MIN_SEMANTIC_QUERY_CHARS):
        return []

    sources = {source.id: source for source in _approved_sources(db)}
    if not sources:
        return []

    chunks = db.scalars(select(M.KnowledgeChunk).where(
        M.KnowledgeChunk.source_id.in_(sources.keys()))).all()
    keywords = _source_keywords()
    title_terms = {source_id: _stems(source.title) for source_id, source in sources.items()}
    keyword_terms = {source_id: set().union(*(_retrieval_terms(phrase) for phrase in keywords.get(source_id, ())))
                     for source_id in sources}
    # A passage's own words, without the title the first passage opens with: the title
    # already counts for every passage of its article.
    chunk_terms = {chunk.id: _stems(chunk.content.removeprefix(f"{sources[chunk.source_id].title}. "))
                   for chunk in chunks}
    vocabulary = set().union(*chunk_terms.values(), *title_terms.values(), *keyword_terms.values())
    question = _Query(text, vocabulary)

    vectors = _query_vectors(text, {chunk.embedder for chunk in chunks})
    admit = _semantic_admit_similarity(db) if semantic_on else None
    min_overlap = _min_term_overlap(db)

    scored = []
    for chunk in chunks:
        source = sources[chunk.source_id]
        own = chunk_terms[chunk.id]
        words = own | title_terms[source.id] | keyword_terms[source.id]
        overlap = question.overlap(words)
        on_subject = overlap >= min_overlap or question.covers_known(words)
        query_vector = vectors.get(chunk.embedder)
        if query_vector is None:
            # No usable vector for this passage's embedder: words alone.
            if not on_subject:
                continue
            similarity, score = 0.0, overlap
        else:
            similarity = embeddings.cosine(query_vector, list(chunk.vector or []))
            semantic_match = (admit is not None and embeddings.is_semantic_name(chunk.embedder)
                              and similarity >= admit)
            if not on_subject and not semantic_match:
                continue
            score = 0.6 * similarity + 0.4 * overlap
        if score < floor:
            continue
        score += (TITLE_WEIGHT * question.overlap(title_terms[source.id])
                  + PASSAGE_WEIGHT * question.overlap(own)
                  + question.phrase_bonus(keywords.get(source.id, ())))
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
