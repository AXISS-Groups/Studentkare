"""Filing an uploaded health record: read it, pick its subfolder, remember why.

Plan docs/plans/tier1-document-autofile-2026-11-13.md. What this module may and may not do:

* The **category** of a record is the student's own pick at upload. Nothing here changes it.
* It fills ``doc_kind`` (the subfolder inside that category) from
  ``services/document_classifier.py`` and stores how it got there
  (``classification_source``, confidence, engine, text length).
* Once the student sets a subfolder themselves (``kind_verified``), no rule, reclassify or
  backfill touches it again, and the choice is remembered for the next upload with the same
  file name (``care_document_label_corrections``).
* Reading and filing are not safety gates, so a failure here must never cost the student
  their upload: ``read_and_file`` catches, records an event code, and leaves the record
  ``unfiled``. The virus scan, authentication and consent checks are gates; they live in
  the upload endpoint and stay fail-closed.
* Nothing here logs a file name, a title or document text (AGENTS.md guardrail 9).
"""
from __future__ import annotations

import hashlib
import logging
import re
import time
import uuid
from dataclasses import dataclass, field

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from core.settings_registry import setting
from services import document_classifier as classifier
from services import document_ocr

logger = logging.getLogger(__name__)

# draft["read"]["state"] values (the same strings services/document_intake.py reports).
READ_OK = "OK"
READ_FAILED = "FAILED"

CROSS_CHECK_DATE_MISMATCH = "DATE_MISMATCH"
# Review-queue field names this module adds.
FIELD_SUGGESTED_CATEGORY = "suggested_category"
FIELD_DATE_CONFLICT = "document_date_conflict"

SKIP_VERIFIED = "verified"
SKIP_NO_BETTER_MATCH = "no_better_match"
NEVER_FILED = "never_filed"

_DATE = re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b")


@dataclass
class Filed:
    """What reading and filing one document produced."""
    text: str = ""
    read: dict = field(default_factory=dict)
    suggestion: classifier.Classification = classifier.NO_MATCH


def checksum(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def find_duplicate(db: DBSession, account_id: str, digest: str, category: str) -> str | None:
    """The id of this account's document with exactly these bytes in this category, if any.

    Per category on purpose: flows such as sending a prescription to a pharmacist key on
    the category, so the same file filed again under another category is a new record.
    """
    if not digest:
        return None
    return db.scalar(select(M.Document.id).where(M.Document.account_id == account_id,
                                                 M.Document.checksum_sha256 == digest,
                                                 M.Document.category == category)
                     .order_by(M.Document.created_at).limit(1))


def _learned(db: DBSession, account_id: str, file_name: str, category: str) -> tuple[str, str] | None:
    norm = classifier.normalise_file_name(file_name)
    if not norm:
        return None
    kind = db.scalar(select(M.DocumentLabelCorrection.corrected_kind).where(
        M.DocumentLabelCorrection.account_id == account_id,
        M.DocumentLabelCorrection.file_name_norm == norm,
        M.DocumentLabelCorrection.category == category))
    return (category, kind) if kind else None


def _record_attempts(db: DBSession, row: M.Document, attempts: list[document_ocr.Attempt]) -> None:
    now = time.time()
    for attempt in attempts:
        db.add(M.OcrJob(id=uuid.uuid4().hex, account_id=row.account_id, document_id=row.id, engine=attempt.engine,
                        ok=attempt.ok, pages=attempt.pages, ms=attempt.ms, rotation=attempt.rotation,
                        error_code=attempt.error_code, created_at=now))


def _dates_disagree(first: str, second: str) -> bool:
    """Both readings name a date and they have none in common."""
    one, two = set(_DATE.findall(first)), set(_DATE.findall(second))
    return bool(one) and bool(two) and one.isdisjoint(two)


def _read(db: DBSession, row: M.Document) -> tuple[str, dict, list[document_ocr.Attempt]]:
    """The document's text, the read state for the intake draft, and every attempt made."""
    try:
        result = document_ocr.read_document(
            row.content, row.mime_type,
            min_chars=setting("documents.min_text_chars", db),
            timeout=setting("documents.ocr_timeout_seconds", db))
    except document_ocr.ReaderUnavailable as exc:
        return "", {"reader": "", "state": exc.state}, exc.attempts
    except document_ocr.ReadFailed as exc:
        return "", {"reader": "", "state": READ_FAILED}, exc.attempts
    read = {"reader": result.engine, "state": READ_OK}
    if result.embedded_text and _dates_disagree(result.embedded_text, result.text):
        read["cross_check"] = CROSS_CHECK_DATE_MISMATCH
    return result.text, read, result.attempts


def _file(db: DBSession, row: M.Document, text: str, engine: str) -> classifier.Classification:
    """Set ``doc_kind`` and its provenance. Leaves a subfolder the student chose alone."""
    row.ocr_engine = engine
    row.ocr_text_len = len(text)
    suggestion = classifier.classify(row.filename, text,
                                     learned=_learned(db, row.account_id, row.filename, row.category))
    if not row.kind_verified:
        row.doc_kind = classifier.kind_for(row.category, suggestion)
        row.classification_source = suggestion.source
        row.classification_confidence = suggestion.confidence
    return suggestion


def read_and_file(db: DBSession, row: M.Document) -> Filed:
    """Read a stored document, log the attempts, and file it. Never raises.

    On any failure the record is left ``unfiled`` and the upload carries on: a student
    must not lose a record because a reader or a classifier fell over.
    """
    filed = Filed(read={"reader": "", "state": READ_FAILED})
    try:
        with db.begin_nested():
            filed.text, filed.read, attempts = _read(db, row)
            _record_attempts(db, row, attempts)
            filed.suggestion = _file(db, row, filed.text, filed.read.get("reader", ""))
    except Exception as exc:  # noqa: BLE001 - filing is best-effort; the upload must survive it
        logger.warning("document filing failed: %s", type(exc).__name__)
        filed = Filed(read={"reader": "", "state": READ_FAILED})
        row.ocr_engine, row.ocr_text_len = "", 0
        if not row.kind_verified:
            row.doc_kind = classifier.UNFILED
            row.classification_source = classifier.SOURCE_NONE
            row.classification_confidence = classifier.CONFIDENCE_NONE
    return filed


def review_fields(row: M.Document, filed: Filed) -> list[dict]:
    """Extra items for the owner's review queue: things filing noticed but did not act on."""
    fields: list[dict] = []
    suggestion = filed.suggestion
    if suggestion.matched and suggestion.category != row.category:
        # The rules read this as a different category. The student's pick stands.
        fields.append({"field": FIELD_SUGGESTED_CATEGORY, "value": suggestion.category,
                       "confidence": suggestion.confidence})
    if filed.read.get("cross_check") == CROSS_CHECK_DATE_MISMATCH:
        # The file's own text and the scan reading disagree on the date: neither is trusted.
        fields.append({"field": FIELD_DATE_CONFLICT, "value": "", "confidence": classifier.CONFIDENCE_NONE})
    return fields


def set_kind(db: DBSession, row: M.Document, kind: str) -> None:
    """The student files a record themselves. Remembered for the same file name next time."""
    if kind == classifier.UNFILED or not classifier.is_valid_kind(row.category, kind):
        raise ValueError("unsupported subfolder for this category")
    norm = classifier.normalise_file_name(row.filename)
    if norm:
        by_rule = classifier.classify_file_name(row.filename)
        said_kind = classifier.kind_for(row.category, by_rule)
        existing = db.scalar(select(M.DocumentLabelCorrection).where(
            M.DocumentLabelCorrection.account_id == row.account_id,
            M.DocumentLabelCorrection.file_name_norm == norm,
            M.DocumentLabelCorrection.category == row.category))
        if existing:
            existing.corrected_kind = kind
            existing.rule_said_kind, existing.rule_said_source = said_kind, by_rule.source
            existing.created_at = time.time()
        else:
            db.add(M.DocumentLabelCorrection(
                id=uuid.uuid4().hex, account_id=row.account_id, file_name_norm=norm, category=row.category,
                corrected_kind=kind, rule_said_kind=said_kind, rule_said_source=by_rule.source,
                created_at=time.time()))
    row.doc_kind = kind
    row.classification_source = classifier.SOURCE_MANUAL
    row.classification_confidence = classifier.CONFIDENCE_LEARNED
    row.kind_verified = True


def _proposal(category: str, current_kind: str, verified: bool, suggestion: classifier.Classification) -> dict:
    """What a re-run would do to one document. Pure: the same answer dry or applied."""
    out = {"from": current_kind or NEVER_FILED, "to": current_kind or NEVER_FILED,
           "matchedVia": suggestion.source, "changed": False, "skipped": None}
    if verified:
        out["skipped"] = SKIP_VERIFIED
        return out
    new_kind = classifier.kind_for(category, suggestion)
    if new_kind == classifier.UNFILED and current_kind not in ("", classifier.UNFILED):
        # The rules find nothing now; an earlier filing (say, from the scan's text) stays.
        out["skipped"] = SKIP_NO_BETTER_MATCH
        return out
    out["to"] = new_kind
    out["changed"] = new_kind != current_kind
    return out


def reclassify(db: DBSession, row: M.Document, *, apply: bool) -> dict:
    """Re-run the rules on one document. Dry-run unless ``apply``; safe to run twice.

    Uses the file name, the student's stored corrections and, for a PDF while the reader
    is on, the text the file itself carries. It does not send the document to the OCR
    service again.
    """
    text = ""
    if (row.mime_type or "").lower() == document_ocr.PDF_MIME_TYPE and \
            document_ocr.status()["state"] != document_ocr.NOT_CONFIGURED:
        text, _attempt = document_ocr.embedded_pdf_text(row.content)
    suggestion = classifier.classify(row.filename, text,
                                     learned=_learned(db, row.account_id, row.filename, row.category))
    proposal = _proposal(row.category, row.doc_kind, row.kind_verified, suggestion)
    proposal["applied"] = False
    if apply and proposal["changed"]:
        row.doc_kind = proposal["to"]
        row.classification_source = suggestion.source
        row.classification_confidence = suggestion.confidence
        proposal["applied"] = True
    return proposal


def backfill(db: DBSession, *, apply: bool) -> dict:
    """Walk every stored document and re-file by file name and stored corrections.

    Reads no document bytes and no text. Returns counts only: this runs for a super
    admin, who may not see a student's document ids or file names.
    """
    page_size = setting("documents.backfill_page_size", db)
    examined = changed = skipped = 0
    transitions: dict[str, int] = {}
    last_id = ""
    while True:
        rows = db.execute(
            select(M.Document.id, M.Document.account_id, M.Document.category, M.Document.filename,
                   M.Document.doc_kind, M.Document.kind_verified)
            .where(M.Document.id > last_id).order_by(M.Document.id).limit(page_size)).all()
        if not rows:
            break
        last_id = rows[-1].id
        for row in rows:
            examined += 1
            suggestion = classifier.classify(row.filename, "",
                                             learned=_learned(db, row.account_id, row.filename, row.category))
            proposal = _proposal(row.category, row.doc_kind, row.kind_verified, suggestion)
            if proposal["skipped"]:
                skipped += 1
                continue
            if not proposal["changed"]:
                continue
            changed += 1
            key = f'{proposal["from"]}->{proposal["to"]}'
            transitions[key] = transitions.get(key, 0) + 1
            if apply:
                # An UPDATE, not a loaded row: loading would pull the document's bytes.
                db.execute(update(M.Document).where(M.Document.id == row.id, M.Document.kind_verified.is_(False))
                           .values(doc_kind=proposal["to"], classification_source=suggestion.source,
                                   classification_confidence=suggestion.confidence))
    return {"applied": apply, "examined": examined, "changed": changed, "skipped": skipped,
            "transitions": transitions}


def remove_document(db: DBSession, document_id: str) -> None:
    """A deleted record takes its read log with it."""
    db.execute(delete(M.OcrJob).where(M.OcrJob.document_id == document_id))
