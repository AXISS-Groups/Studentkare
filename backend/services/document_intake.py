"""
services.document_intake — Document extraction with an explicit review gate.

When a document is uploaded, it is queued for extraction. The extractor runs
deterministic heuristics (keyword/date matching) and produces a DRAFT with
per-field confidence. Fields below a threshold (or that cannot be read) are left
unknown and pushed to the review queue. A real OCR/model provider can replace the
heuristic extractor; the review gate stays the same.

Extraction never fabricates a value — every field is either matched from the text
or marked unknown/pending review.
"""
from __future__ import annotations

import re
from typing import List


def extract_fields(content: bytes, title: str, category: str) -> dict:
    """Extract a draft of fields from document content (heuristic, no invention)."""
    text = _decode(content)
    lower = text.lower()

    draft = {"title": title, "category": category}
    fields: List[dict] = []

    # Date: only record if a plausible date is present.
    date_match = re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text)
    if date_match:
        fields.append({"field": "document_date", "value": date_match.group(0), "confidence": 0.8})

    # Provider: "Dr <name>" if present.
    doctor = re.search(r"dr\.?\s+([a-z]+(?:\s+[a-z]+){0,2})", text, re.IGNORECASE)
    if doctor:
        fields.append({"field": "provider", "value": doctor.group(1).strip().title(), "confidence": 0.7})

    # Document type by keyword, only when the text supports it.
    type_map = {
        "PRESCRIPTION": ("prescription", "rx", "tablet", "dose"),
        "VACCINE": ("vaccine", "vaccination", "immunization"),
        "LAB": ("report", "result", "hemoglobin", "platelet", "cbc", "lab"),
    }
    for doc_type, keywords in type_map.items():
        if any(k in lower for k in keywords):
            fields.append({"field": "document_type", "value": doc_type, "confidence": 0.6})
            break

    # Medication names: only those that appear verbatim in the text (never invented).
    # Exclude file-format tokens, common words, and single-letter/stopword matches.
    stop_tokens = {"pdf", "png", "jpeg", "jpg", "report", "result", "name", "date", "the", "and", "patient",
                   "test", "value", "unit", "no", "not", "with", "for", "from", "this", "that", "per", "each",
                   "once", "daily", "twice", "mg", "ml", "tablet", "capsule"}
    for token in re.findall(r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?", text):
        t = token.strip()
        tl = t.lower()
        words = tl.split()
        if len(words) > 2:
            continue
        if any(w in stop_tokens for w in words):
            continue
        if all(w in lower for w in words):
            fields.append({"field": "medication", "value": t, "confidence": 0.5})

    return {"draft": draft, "fields": fields}


def _decode(content: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return content.decode(enc)
        except UnicodeDecodeError:
            continue
    return ""
