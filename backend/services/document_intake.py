"""
services.document_intake — Document extraction with an explicit review gate.

When a document is uploaded, it is queued for extraction. ``extract_fields`` first
gets the document's actual printed text from ``services/document_ocr.py`` (pypdf for
a PDF that carries its text, the OCR service for a scan or an image — never a plain
byte-decode of binary content, which
only ever produced garbage or nothing for the image/PDF uploads this app actually
accepts), then runs deterministic heuristics (keyword/date matching) over that text
to produce a DRAFT with per-field confidence. Fields below a threshold (or that
cannot be read) are left unknown and pushed to the review queue.

Extraction never fabricates a value — every field is either matched from the text
or marked unknown/pending review. When the document's text cannot be read at all
(the reader is off, unavailable, or the PDF is a scan with no embedded text), no
fields are invented from garbage bytes either: the draft says plainly that reading
failed, via ``draft["read"]``, and the caller sets the intake's status accordingly
(``QUEUED`` — try again once the reader is configured — or ``FAILED``).
"""
from __future__ import annotations

import re
from typing import List

from services import document_classifier

# States extract_fields can report for the read step (draft["read"]["state"]).
READ_OK = "OK"
READ_NOT_CONFIGURED = "NOT_CONFIGURED"
READ_UNAVAILABLE = "UNAVAILABLE"
READ_FAILED = "FAILED"


def extract_fields(content: bytes, title: str, category: str, mime_type: str = "",
                   preread: tuple[str, dict] | None = None) -> dict:
    """Extract a draft of fields from document content (heuristic, no invention).

    ``preread`` is ``(text, read_state)`` from a caller that has already read the
    document (services/document_filing.py does, once, on upload); the document is then
    not read a second time.

    ``mime_type`` selects the real reader (services/document_ocr.py). Without one
    recognised, content is treated as already-plain text (the old behaviour) —
    which is correct for nothing this app's upload endpoint actually accepts today,
    since it only allows PDF/PNG/JPEG, but keeps this function honest for a caller
    that passes plain text directly (e.g. a future text-note intake).
    """
    text, read = preread if preread is not None else _read(content, mime_type)
    lower = text.lower()

    draft = {"title": title, "category": category, "read": read}
    fields: List[dict] = []

    if not text:
        return {"draft": draft, "fields": fields, "text": ""}

    # Date: only record if a plausible date is present.
    date_match = re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text)
    if date_match:
        fields.append({"field": "document_date", "value": date_match.group(0), "confidence": 0.8})

    # Provider: "Dr <name>" if present.
    doctor = re.search(r"dr\.?\s+([a-z]+(?:\s+[a-z]+){0,2})", text, re.IGNORECASE)
    if doctor:
        fields.append({"field": "provider", "value": doctor.group(1).strip().title(), "confidence": 0.7})

    # Document type, only when the text supports it. services/document_classifier.py
    # matches whole words and phrases; the old substring table found "rx" in "pyrexia"
    # and "lab" in "available".
    by_text = document_classifier.classify_text(text)
    if by_text.matched:
        fields.append({"field": "document_type", "value": by_text.category, "confidence": by_text.confidence})

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

    return {"draft": draft, "fields": fields, "text": text}


def intake_status_for(draft: dict) -> str:
    """The DocumentIntake.status that fits a draft's read outcome.

    OK → DRAFT (fields, if any, go to the usual per-field review). Reader not yet
    configured/available → QUEUED (nothing wrong with the document; try again once
    document_ocr is switched on). Reader ran but could not read this file (a scan
    with no embedded text, a corrupt PDF) → FAILED.
    """
    state = (draft.get("read") or {}).get("state", READ_OK)
    if state == READ_OK:
        return "DRAFT"
    if state == READ_FAILED:
        return "FAILED"
    return "QUEUED"


def _read(content: bytes, mime_type: str) -> tuple[str, dict]:
    from services import document_ocr

    mime = (mime_type or "").lower()
    if mime in document_ocr.IMAGE_MIME_TYPES or mime == document_ocr.PDF_MIME_TYPE:
        try:
            result = document_ocr.read_document(content, mime)
            return result.text, {"reader": result.engine, "state": READ_OK}
        except document_ocr.ReaderUnavailable as exc:
            return "", {"reader": "", "state": exc.state}
        except document_ocr.ReadFailed:
            return "", {"reader": "", "state": READ_FAILED}
    return _decode(content), {"reader": "decode", "state": READ_OK}


def _decode(content: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return content.decode(enc)
        except UnicodeDecodeError:
            continue
    return ""
