"""Reading the printed text of an uploaded health record (prescription, consult note,
lab report, vaccination record, discharge summary).

Plan docs/plans/tier1-document-autofile-2026-11-13.md, decision D1 (Krishna, 2026-11-13):
scans are read by the shared AXISS OCR service, reached over the private network. This
module is the only place that talks to it, and it is honest about what it is:

* a PDF that already carries its text is read here with ``pypdf`` (pure Python). When that
  text is long enough the service is never called — nothing leaves this process;
* an image, or a PDF with too little embedded text (a scan), is sent to the service. An
  image that reads as almost empty is retried turned 90°, 180° and 270°, because phone
  photos of a page are routinely sideways;
* the file's own name is never sent (the service gets ``document.<ext>``), and neither
  the bytes nor the text are written to disk or logged here. Every attempt is reported
  back as an ``Attempt`` carrying an engine, a duration and an error *code* — never the
  service's message and never document text (AGENTS.md guardrail 9).

Text-extraction only. Nothing here interprets, classifies or diagnoses.

States:

* ``NOT_CONFIGURED`` — the integration is off (the default, until the plan's four
  conditions hold and the DPO has signed);
* ``UNAVAILABLE`` — it is on, but the service URL or the Student Kare key is missing.
  With no key nothing is sent: the service answers unauthenticated callers when it has no
  keys configured, and health records must not ride on that;
* ``READY`` — documents can be read.
"""
from __future__ import annotations

import io
import time
from dataclasses import dataclass, field

import httpx

from services.integration_config import INTEGRATIONS_DB

PROVIDER = "document_ocr"
NOT_CONFIGURED = "NOT_CONFIGURED"
UNAVAILABLE = "UNAVAILABLE"
READY = "READY"

ENGINE_PDF_TEXT = "pypdf"
ENGINE_SERVICE = "axiss-ocr"

IMAGE_MIME_TYPES = frozenset({"image/png", "image/jpeg", "image/jpg"})
PDF_MIME_TYPE = "application/pdf"

# Attempt.error_code values. Codes only: an engine's own message can quote the page.
ERROR_TIMEOUT = "TIMEOUT"
ERROR_UNREACHABLE = "UNREACHABLE"
ERROR_HTTP = "HTTP_ERROR"
ERROR_BAD_RESPONSE = "BAD_RESPONSE"
ERROR_PARSE = "PARSE_FAILED"
ERROR_NO_TEXT = "NO_TEXT"

# Used when a caller has no database session to read the settings registry from
# (documents.min_text_chars, documents.ocr_timeout_seconds declare the real values).
DEFAULT_MIN_TEXT_CHARS = 40
DEFAULT_TIMEOUT_SECONDS = 30

ROTATIONS = (90, 180, 270)
_GENERIC_NAMES = {"image/png": "document.png", "image/jpeg": "document.jpg", "image/jpg": "document.jpg",
                  PDF_MIME_TYPE: "document.pdf"}
_PIL_FORMATS = {"image/png": "PNG", "image/jpeg": "JPEG", "image/jpg": "JPEG"}


@dataclass(frozen=True)
class Attempt:
    engine: str
    ok: bool
    pages: int = 0
    ms: int = 0
    rotation: int = 0
    error_code: str = ""


@dataclass
class ReadResult:
    text: str = ""
    engine: str = ""
    attempts: list[Attempt] = field(default_factory=list)
    # The PDF's own embedded text when it was too short to use and the service was asked
    # as well; kept only so the caller can cross-check the two readings.
    embedded_text: str = ""


class ReaderUnavailable(Exception):
    def __init__(self, state: str, attempts: list[Attempt] | None = None):
        super().__init__(state)
        self.state = state
        self.attempts = list(attempts or [])


class ReadFailed(Exception):
    """The reader ran but could not read this document. Carries no document content."""

    def __init__(self, message: str, attempts: list[Attempt] | None = None):
        super().__init__(message)
        self.attempts = list(attempts or [])


def _config() -> dict:
    return INTEGRATIONS_DB.get(PROVIDER, {})


def status() -> dict:
    cfg = _config()
    if not cfg.get("enabled"):
        return {"provider": PROVIDER, "state": NOT_CONFIGURED}
    if not cfg.get("url") or not cfg.get("api_key"):
        return {"provider": PROVIDER, "state": UNAVAILABLE}
    return {"provider": PROVIDER, "state": READY}


def _elapsed_ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


def embedded_pdf_text(content: bytes) -> tuple[str, Attempt]:
    """The text a PDF already carries, read in-process with pypdf. Never raises."""
    started = time.monotonic()
    try:
        from pypdf import PdfReader
        from pypdf.errors import PdfReadError
    except ImportError:
        return "", Attempt(ENGINE_PDF_TEXT, ok=False, error_code=ERROR_PARSE)
    try:
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
    except (PdfReadError, ValueError, KeyError):
        return "", Attempt(ENGINE_PDF_TEXT, ok=False, ms=_elapsed_ms(started), error_code=ERROR_PARSE)
    text = "\n".join(pages).strip()
    return text, Attempt(ENGINE_PDF_TEXT, ok=bool(text), pages=len(pages), ms=_elapsed_ms(started),
                         error_code="" if text else ERROR_NO_TEXT)


def _call_service(content: bytes, mime: str, timeout: float, rotation: int = 0) -> tuple[str, Attempt]:
    """One request to the OCR service. Never raises; a failure is an Attempt with a code."""
    cfg = _config()
    started = time.monotonic()

    def failed(code: str) -> tuple[str, Attempt]:
        return "", Attempt(ENGINE_SERVICE, ok=False, ms=_elapsed_ms(started), rotation=rotation, error_code=code)

    try:
        response = httpx.post(
            str(cfg.get("url")),
            files={"file": (_GENERIC_NAMES.get(mime, "document"), content, mime)},
            data={"text_layers": str(cfg.get("text_layers") or "auto")},
            headers={"X-OCR-Key": str(cfg.get("api_key"))},
            timeout=timeout,
        )
    except httpx.TimeoutException:
        return failed(ERROR_TIMEOUT)
    except httpx.HTTPError:
        return failed(ERROR_UNREACHABLE)
    if response.status_code != httpx.codes.OK:
        return failed(ERROR_HTTP)
    try:
        body = response.json()
    except ValueError:
        return failed(ERROR_BAD_RESPONSE)
    text = body.get("text") if isinstance(body, dict) else None
    if not isinstance(text, str):
        return failed(ERROR_BAD_RESPONSE)
    pages = body.get("pages")
    text = text.strip()
    return text, Attempt(ENGINE_SERVICE, ok=bool(text), pages=pages if isinstance(pages, int) else 0,
                         ms=_elapsed_ms(started), rotation=rotation, error_code="" if text else ERROR_NO_TEXT)


def _rotated(content: bytes, mime: str, degrees: int) -> bytes | None:
    """The same image turned by ``degrees``, or None when it cannot be decoded."""
    try:
        from PIL import Image, UnidentifiedImageError
    except ImportError:
        return None
    try:
        with Image.open(io.BytesIO(content)) as image:
            turned = image.rotate(degrees, expand=True)
            out = io.BytesIO()
            turned.save(out, format=_PIL_FORMATS[mime])
            return out.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, KeyError):
        return None


def _read_with_service(content: bytes, mime: str, min_chars: int, timeout: float, result: ReadResult) -> None:
    """Fill ``result`` from the service, turning an image that reads as nearly empty.

    The whole ladder shares one time budget (``timeout``), so an upload never waits
    four full timeouts on a service that is slow.
    """
    deadline = time.monotonic() + timeout
    text, attempt = _call_service(content, mime, timeout)
    result.attempts.append(attempt)
    best = text
    if len(best) < min_chars and mime in IMAGE_MIME_TYPES and attempt.error_code in ("", ERROR_NO_TEXT):
        for degrees in ROTATIONS:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            turned = _rotated(content, mime, degrees)
            if turned is None:
                break
            text, attempt = _call_service(turned, mime, remaining, rotation=degrees)
            result.attempts.append(attempt)
            if len(text) > len(best):
                best = text
            if len(best) >= min_chars:
                break
    if best:
        result.text, result.engine = best, ENGINE_SERVICE


def read_document(content: bytes, mime_type: str, *, min_chars: int = DEFAULT_MIN_TEXT_CHARS,
                  timeout: float = DEFAULT_TIMEOUT_SECONDS) -> ReadResult:
    """The printed text of the document, with every attempt made to get it.

    Raises ``ReaderUnavailable`` (off, or on without a URL and key) or ``ReadFailed`` (it
    ran and found nothing; the exception carries the attempts). A PDF whose embedded text
    is at least ``min_chars`` long is returned without calling the service, even when the
    service itself is unavailable.
    """
    mime = (mime_type or "").lower()
    if mime not in IMAGE_MIME_TYPES and mime != PDF_MIME_TYPE:
        raise ReadFailed(f"unsupported document type: {mime_type!r}")
    current = status()["state"]
    if current == NOT_CONFIGURED:
        raise ReaderUnavailable(NOT_CONFIGURED)

    result = ReadResult()
    if mime == PDF_MIME_TYPE:
        embedded, attempt = embedded_pdf_text(content)
        result.attempts.append(attempt)
        if len(embedded) >= min_chars:
            result.text, result.engine = embedded, ENGINE_PDF_TEXT
            return result
        result.embedded_text = embedded

    if current != READY:
        if result.embedded_text:
            # Short, but real text from the file itself: better than nothing.
            result.text, result.engine = result.embedded_text, ENGINE_PDF_TEXT
            result.embedded_text = ""
            return result
        # A scan, and nothing to read it with yet: not the document's fault.
        raise ReaderUnavailable(current, result.attempts)

    _read_with_service(content, mime, min_chars, timeout, result)
    if not result.text and result.embedded_text:
        result.text, result.engine = result.embedded_text, ENGINE_PDF_TEXT
        result.embedded_text = ""
    if not result.text:
        raise ReadFailed("the document could not be read", result.attempts)
    return result


def read_text(content: bytes, mime_type: str, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> str:
    """Just the text. Raises ReaderUnavailable or ReadFailed (see ``read_document``)."""
    return read_document(content, mime_type, timeout=timeout).text
