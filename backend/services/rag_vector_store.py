"""
services.rag_vector_store — Real vector-store RAG engine.

Indexes documents with deterministic embeddings (hash-based fallback, or real
embeddings via a configured Ollama `/api/embeddings` endpoint) and supports
cosine-similarity retrieval.  Wired into `/api/rag/query`.
"""
from __future__ import annotations

import os
import hashlib
import math
import re
from typing import Dict, List, Optional

import httpx

EMBED_DIM = 64
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")


class RAGDocumentChunk:
    def __init__(self, title: str, content: str, category: str = "GUIDELINE") -> None:
        self.title = title
        self.content = content
        self.category = category
        self.id = hashlib.sha256(f"{title}::{content}".encode()).hexdigest()[:12]
        self.embedding = _embed(content)


def _hash_embed(text: str) -> List[float]:
    """Deterministic bag-of-words hashing embedding (fallback when no model)."""
    vec = [0.0] * EMBED_DIM
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        idx = int(hashlib.sha256(token.encode()).hexdigest(), 16) % EMBED_DIM
        vec[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _real_embed(text: str) -> Optional[List[float]]:
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(f"{OLLAMA_URL}/api/embeddings", json={"model": EMBED_MODEL, "prompt": text})
            resp.raise_for_status()
            data = resp.json()
            return data.get("embedding")
    except Exception:
        return None


def _embed(text: str) -> List[float]:
    if os.environ.get("OLLAMA_URL"):
        real = _real_embed(text)
        if real:
            return real
    return _hash_embed(text)


def _cosine(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


class RAGVectorStore:
    def __init__(self) -> None:
        self._chunks: List[RAGDocumentChunk] = []

    def seed_default(self) -> None:
        self._chunks = [
            RAGDocumentChunk(
                "NMC Clinical Guideline: Monsoon Pyrexia Protocol",
                "Patients presenting with acute fever (>100.4°F) require CBC platelet counts. Paracetamol 650mg is first-line antipyretic.",
                "GUIDELINE",
            ),
            RAGDocumentChunk(
                "StudentKare Hostel Medical Express Policy",
                "Express hostel deliveries guaranteed within 45 minutes across Indian university campuses.",
                "POLICY",
            ),
            RAGDocumentChunk(
                "CDSCO Drug Recall Bulletin",
                "Ranitidine and certain batches carry recalled impurity markers. Flagged for removal from formulary.",
                "PHARMA",
            ),
            RAGDocumentChunk(
                "ABDM Consent & Health Record Linkage",
                "Health records are linked via ABHA address with patient consent and instant gateway revocation.",
                "ABDM",
            ),
            RAGDocumentChunk(
                "Rule-K1 Two-Plane Isolation",
                "AI agents operate solely on the Operational Plane and are barred from identified clinical data.",
                "POLICY",
            ),
        ]

    def index(self, title: str, content: str, category: str = "GUIDELINE") -> None:
        self._chunks.append(RAGDocumentChunk(title, content, category))

    def search(self, query: str, top_k: int = 2) -> List[Dict]:
        qv = _embed(query)
        scored = []
        for c in self._chunks:
            score = _cosine(qv, c.embedding)
            scored.append({"title": c.title, "content": c.content, "category": c.category, "score": round(score, 4)})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def count(self) -> int:
        return len(self._chunks)


rag_vector_store = RAGVectorStore()
rag_vector_store.seed_default()
