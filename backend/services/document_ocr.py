"""Reading the printed text of an uploaded health record (prescription, consult note,
lab report, vaccination record, discharge summary).

Plan tier1-document-rag-2026-11-04, rule 1 — this is what ``M2ReportUpload`` left
deliberately unwired (tier1-mobile2-health-2026-10-21.md, D-M2-12): until now,
``services/document_intake.py`` only decoded raw bytes as UTF-8/Latin-1 text, so an
actual photo or scanned PDF silently produced garbage or nothing. This module is the
real reader behind that extractor, and it is honest about what it is:

* for an image (PNG/JPEG) — Tesseract on our own server, no third party, same approach
  and the same ``image → stdin/stdout`` call as ``services/medicine_ocr.py``. Deliberately
  a *separate* switch (``document_ocr``, not ``medicine_ocr``): a medicine strip's name is
  a few words; a whole health record is far more text and far more sensitive, so it gets
  its own AI-constitution-owner/DPO sign-off rather than inheriting medicine_ocr's.
* for a PDF — ``pypdf`` extracts the text already embedded in the file (pure Python, no
  system binary, no OCR fallback for a scanned/image-only PDF: that stays an explicit
  ``ReadFailed``, never a guess).

Either way: text-extraction only. Nothing here interprets, classifies, or diagnoses — that
stays in services/document_intake.py's heuristics and, downstream, a human review gate. The
page content is never written to disk, stored, or logged by this module; only the caller
decides what happens to the text it returns.

States, same shape as medicine_ocr.py:

* ``NOT_CONFIGURED`` — the integration is off;
* ``UNAVAILABLE`` — it is on, but the Tesseract program is not installed here;
* ``READY`` — images can be read. (A PDF never depends on this: pypdf has no external
  binary, so PDF text extraction works whenever the module is enabled, even if Tesseract
  itself is unavailable — only image reading needs Tesseract.)
"""
from __future__ import annotations

import io
import shutil
import subprocess

from services.integration_config import INTEGRATIONS_DB

PROVIDER = "document_ocr"
NOT_CONFIGURED = "NOT_CONFIGURED"
UNAVAILABLE = "UNAVAILABLE"
READY = "READY"

IMAGE_MIME_TYPES = frozenset({"image/png", "image/jpeg", "image/jpg"})
PDF_MIME_TYPE = "application/pdf"


class ReaderUnavailable(Exception):
    def __init__(self, state: str):
        super().__init__(state)
        self.state = state


class ReadFailed(Exception):
    """The reader ran but could not read this document. Carries no document content."""


def _binary() -> str | None:
    cfg = INTEGRATIONS_DB.get(PROVIDER, {})
    return shutil.which(str(cfg.get("binary") or "tesseract"))


def status() -> dict:
    cfg = INTEGRATIONS_DB.get(PROVIDER, {})
    if not cfg.get("enabled"):
        return {"provider": PROVIDER, "state": NOT_CONFIGURED}
    if _binary() is None:
        return {"provider": PROVIDER, "state": UNAVAILABLE}
    return {"provider": PROVIDER, "state": READY}


def _run_tesseract(binary: str, image: bytes, timeout: int) -> str:
    try:
        done = subprocess.run([binary, "stdin", "stdout", "--psm", "11"], input=image, capture_output=True,  # noqa: S603
                              timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ReadFailed("reader did not finish") from exc
    if done.returncode != 0:
        raise ReadFailed("reader refused the image")
    return done.stdout.decode("utf-8", errors="ignore")


def _read_image(image: bytes, timeout: int) -> str:
    current = status()["state"]
    if current != READY:
        raise ReaderUnavailable(current)
    binary = _binary()
    if binary is None:
        raise ReaderUnavailable(UNAVAILABLE)
    return _run_tesseract(binary, image, timeout)


def _read_pdf(content: bytes) -> str:
    cfg = INTEGRATIONS_DB.get(PROVIDER, {})
    if not cfg.get("enabled"):
        raise ReaderUnavailable(NOT_CONFIGURED)
    try:
        from pypdf import PdfReader
        from pypdf.errors import PdfReadError
    except ImportError as exc:
        raise ReaderUnavailable(UNAVAILABLE) from exc
    try:
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
    except (PdfReadError, ValueError, KeyError) as exc:
        raise ReadFailed("reader could not parse this PDF") from exc
    text = "\n".join(pages).strip()
    if not text:
        # A scanned/image-only PDF has no embedded text to extract; this module does
        # not OCR a PDF's rendered pages — that would need a second, heavier pipeline,
        # and a silent empty result is safer than guessing.
        raise ReadFailed("PDF has no extractable text (likely a scan)")
    return text


def read_text(content: bytes, mime_type: str, timeout: int = 20) -> str:
    """The printed text of the document. Raises ReaderUnavailable or ReadFailed.

    ``mime_type`` picks the strategy: an image goes through Tesseract (gated on the
    ``document_ocr`` switch), a PDF through pypdf's embedded-text extraction (works
    whenever this module is enabled, even if Tesseract itself is UNAVAILABLE — a PDF
    never calls Tesseract). Anything else raises ReadFailed rather than guessing.
    """
    mime = (mime_type or "").lower()
    if mime in IMAGE_MIME_TYPES:
        return _read_image(content, timeout)
    if mime == PDF_MIME_TYPE:
        return _read_pdf(content)
    raise ReadFailed(f"unsupported document type: {mime_type!r}")
