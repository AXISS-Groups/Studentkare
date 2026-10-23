"""
services.embeddings — text to vectors, with an honest default.

The platform has no embedding model configured and no vector dependency in its
requirements. Rather than block the retrieval pipeline on that decision, this module
defines the interface and ships a deterministic local embedder that needs nothing:
hashed character n-grams with sub-linear term weighting, L2-normalised.

It is a real vector space — similar text lands near similar text, cosine similarity
is meaningful, and the retrieval pipeline built on it is the same pipeline a
transformer model would use. It is not a semantic model: it matches morphology, not
meaning, so "fever" and "pyrexia" are far apart. That limitation is stated in what
the agent returns rather than hidden, and swapping in a real model is a matter of
setting ``EMBEDDING_PROVIDER`` and implementing one method.

Character n-grams rather than words because Indian-English health queries are full of
misspellings, transliteration and code-mixing ("bukhar", "sardi"), where word-level
matching fails outright.
"""
from __future__ import annotations

import hashlib
import math
import re
from typing import Protocol

# Dimensionality of the local space. Large enough that hash collisions are rare at
# this corpus size, small enough to store as a compact float list.
LOCAL_DIMENSIONS = 512

# 3- and 4-grams together: 3 catches short roots, 4 keeps common words apart.
NGRAM_SIZES = (3, 4)

_WORD = re.compile(r"[a-z0-9]+")


class Embedder(Protocol):
    """Anything that turns text into a unit vector of a fixed width."""

    name: str
    dimensions: int

    def embed(self, text: str) -> list[float]: ...


def _normalise(text: str) -> str:
    """Lowercase, keep alphanumerics, pad words so n-grams respect boundaries."""
    words = _WORD.findall((text or "").lower())
    return " ".join(f" {word} " for word in words)


def _ngrams(text: str) -> list[str]:
    grams: list[str] = []
    for size in NGRAM_SIZES:
        for index in range(max(0, len(text) - size + 1)):
            gram = text[index:index + size]
            if gram.strip():
                grams.append(gram)
    return grams


def _bucket(gram: str, dimensions: int) -> int:
    digest = hashlib.blake2b(gram.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, "big") % dimensions


class LocalHashingEmbedder:
    """Dependency-free embedder. Deterministic: the same text always gives the same vector."""

    name = "local-hashing-v1"
    dimensions = LOCAL_DIMENSIONS

    def embed(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        grams = _ngrams(_normalise(text))
        if not grams:
            return vector

        counts: dict[int, float] = {}
        for gram in grams:
            index = _bucket(gram, self.dimensions)
            counts[index] = counts.get(index, 0.0) + 1.0

        # Sub-linear weighting so a word repeated twenty times does not drown the rest.
        for index, count in counts.items():
            vector[index] = 1.0 + math.log(count)

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            return vector
        return [value / magnitude for value in vector]


def cosine(left: list[float], right: list[float]) -> float:
    """Both vectors are already unit length, so the dot product is the cosine."""
    if not left or not right or len(left) != len(right):
        return 0.0
    return sum(a * b for a, b in zip(left, right, strict=False))


_ACTIVE: Embedder = LocalHashingEmbedder()


class OllamaEmbedder:
    """An on-prem semantic model served by Ollama (``EMBEDDING_PROVIDER=ollama``).

    Every call goes through ``llm_gateway.embed``: the AI constitution (Rule-C) and
    the prompt guardrail, which masks PII before the text leaves the process. The
    model's vector is L2-normalised so ``cosine`` stays a dot product. Raises
    ``llm_gateway.ModelUnavailable`` (or another gateway error) when the model
    cannot answer; callers fall back to the local embedder and say so.
    """

    dimensions = 0  # whatever the model returns

    def __init__(self, model: str):
        self.model = model
        # The chunk table keeps this name (40 characters) to tell vectors apart.
        self.name = f"ollama:{model}"[:40]

    def embed(self, text: str) -> list[float]:
        from services import llm_gateway
        return _unit(llm_gateway.embed(text))


def _unit(values: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(value * value for value in values))
    return [value / magnitude for value in values] if magnitude else list(values)


_OLLAMA: dict[str, OllamaEmbedder] = {}

PROVIDER_LOCAL = "local"
PROVIDER_OLLAMA = "ollama"


def requested_provider() -> str:
    """What ``EMBEDDING_PROVIDER`` asks for (``local`` when unset)."""
    from services import llm_gateway
    return llm_gateway.embedding_provider()


def active_embedder() -> Embedder:
    """The embedder in use.

    ``EMBEDDING_PROVIDER=ollama`` with ``EMBEDDING_OLLAMA_URL`` or ``OLLAMA_URL`` set
    selects the on-prem model named by ``EMBEDDING_MODEL``. Anything else — unset,
    ``local``, an unknown provider, or ollama without a URL — is the local hashing
    embedder, and the admin screen says retrieval is keyword-based.
    """
    from services import llm_gateway
    if llm_gateway.embeddings_configured():
        model = llm_gateway.embedding_model()
        if model not in _OLLAMA:
            _OLLAMA[model] = OllamaEmbedder(model)
        return _OLLAMA[model]
    return _ACTIVE


def local_embedder() -> Embedder:
    """The honest fallback: always available, keyword-like."""
    return _ACTIVE


def embedder_named(name: str) -> Embedder | None:
    """The embedder that produced vectors stored under ``name``, if it is usable now."""
    if name == _ACTIVE.name:
        return _ACTIVE
    active = active_embedder()
    return active if active.name == name else None


def is_semantic_name(name: str) -> bool:
    return bool(name) and name != LocalHashingEmbedder.name


def is_semantic() -> bool:
    """False while the local embedder is in use — the agent says so in its answers."""
    return is_semantic_name(active_embedder().name)
