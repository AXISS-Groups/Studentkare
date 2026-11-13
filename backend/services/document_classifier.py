"""Which subfolder an uploaded health record belongs in (plan
docs/plans/tier1-document-autofile-2026-11-13.md, section 4).

The student picks the category at upload and that choice is never changed here. This
module only suggests a ``doc_kind`` (the subfolder inside a category) and says how it got
there, so a wrong filing can be traced.

Rules of the matcher, each of which exists because the obvious version files records wrongly:

* **Two separate passes, never one haystack.** Pass 1 reads the file name only: a person
  typed it to describe the upload. Pass 2 reads the document's text, and only when pass 1
  matched nothing. Joined together, a stray word in the body claims a record before its
  name is read.
* **Short tokens match on word boundaries.** As a substring, ``rx`` sits inside "pyrexia"
  and ``lab`` inside "available" and "label".
* **Ambiguous tokens are trusted from the file name only** (``filename_only``): body text
  mentions "lab", "bill" or an ABHA number on almost every record.
* **A stored correction wins over the table.** When the student moved a record, the next
  upload with that exact file name follows them (``learned``).

Pure functions, no database, no I/O, no logging: a file name is health data.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

# classification_source values.
SOURCE_FILENAME = "filename"
SOURCE_OCR = "ocr"
SOURCE_LEARNED = "learned"
SOURCE_MANUAL = "manual"
SOURCE_NONE = ""

UNFILED = "unfiled"

# The closed subfolder vocabulary. Adding a kind is a row here plus a rule below.
KINDS: dict[str, tuple[str, ...]] = {
    "LAB": ("blood", "urine", "xray", "mri", "ct_scan", "ultrasound", "cardiac", "report"),
    "PRESCRIPTION": ("prescription", "consult_note"),
    "VACCINE": ("certificate", "card"),
    "CAMP_REPORT": ("camp_report",),
    "DISCHARGE_SUMMARY": ("discharge_summary",),
    "OTHER": ("insurance", "bill", "id_proof"),
}

# How sure each route is. A name a person typed outranks words found in the body.
CONFIDENCE_LEARNED = 1.0
CONFIDENCE_FILENAME = 0.9
CONFIDENCE_OCR = 0.6
CONFIDENCE_NONE = 0.0

# Tokens up to this length match on word boundaries; longer ones may match inside a word
# (so "vaccin" catches "vaccination").
BOUNDARY_TOKEN_MAX_LENGTH = 4


@dataclass(frozen=True)
class Rule:
    tokens: tuple[str, ...]
    category: str
    kind: str
    filename_only: bool = False


# Ordered on purpose: the first rule that matches wins. Discharge summaries first (they
# quote prescriptions and lab values), then prescriptions, vaccination, specific lab work,
# camp reports (before the generic "report"), generic lab work, and last the paperwork that is not a clinical record.
RULES: tuple[Rule, ...] = (
    Rule(("discharge summary",), "DISCHARGE_SUMMARY", "discharge_summary"),
    Rule(("discharge",), "DISCHARGE_SUMMARY", "discharge_summary", filename_only=True),
    Rule(("prescription",), "PRESCRIPTION", "prescription"),
    Rule(("rx",), "PRESCRIPTION", "prescription", filename_only=True),
    Rule(("consultation", "consult note", "clinical note"), "PRESCRIPTION", "consult_note"),
    Rule(("consult", "opd"), "PRESCRIPTION", "consult_note", filename_only=True),
    Rule(("vaccination certificate", "vaccine certificate", "cowin"), "VACCINE", "certificate"),
    Rule(("vaccin", "immuniz", "immunis"), "VACCINE", "card"),
    Rule(("urinalysis", "urine"), "LAB", "urine"),
    Rule(("electrocardiogram", "echocardiogra", "treadmill test"), "LAB", "cardiac"),
    Rule(("ecg", "echo", "tmt"), "LAB", "cardiac", filename_only=True),
    # Each kind of imaging is its own subfolder (Krishna, 2026-11-13). Never the bare word
    # "scan": phone scanner apps name every file "Scan <date>".
    Rule(("x ray", "xray", "radiograph"), "LAB", "xray"),
    Rule(("mri scan", "magnetic resonance"), "LAB", "mri"),
    Rule(("mri",), "LAB", "mri", filename_only=True),
    Rule(("ct scan", "computed tomography"), "LAB", "ct_scan"),
    Rule(("ct",), "LAB", "ct_scan", filename_only=True),
    Rule(("ultrasound", "sonography"), "LAB", "ultrasound"),
    Rule(("usg",), "LAB", "ultrasound", filename_only=True),
    Rule(("hemoglobin", "haemoglobin", "complete blood count", "lipid profile", "hba1c", "thyroid profile",
          "blood test", "blood report", "platelet"), "LAB", "blood"),
    Rule(("cbc", "lft", "kft", "tsh", "blood"), "LAB", "blood", filename_only=True),
    Rule(("health camp", "camp report", "screening camp"), "CAMP_REPORT", "camp_report"),
    Rule(("camp",), "CAMP_REPORT", "camp_report", filename_only=True),
    Rule(("lab report", "laboratory", "pathology", "test report"), "LAB", "report"),
    Rule(("lab", "report"), "LAB", "report", filename_only=True),
    Rule(("insurance", "mediclaim", "policy schedule", "claim form"), "OTHER", "insurance"),
    Rule(("invoice", "receipt", "bill"), "OTHER", "bill", filename_only=True),
    Rule(("aadhaar", "aadhar", "abha", "pan card", "student id", "id card"), "OTHER", "id_proof", filename_only=True),
)


@dataclass(frozen=True)
class Classification:
    """What the classifier suggests. ``category`` is "" when nothing matched."""
    category: str
    kind: str
    source: str
    confidence: float

    @property
    def matched(self) -> bool:
        return bool(self.category)


NO_MATCH = Classification(category="", kind=UNFILED, source=SOURCE_NONE, confidence=CONFIDENCE_NONE)

_EXTENSION = re.compile(r"\.[A-Za-z0-9]{1,5}$")
_SEPARATORS = re.compile(r"[^a-z0-9]+")


def normalise(value: str) -> str:
    """Lowercase ASCII words separated by single spaces.

    Accents are folded, and every run of anything else becomes one space, so
    ``Rx-2026_Nov`` and ``rx 2026 nov`` are the same string.
    """
    folded = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    return _SEPARATORS.sub(" ", folded.lower()).strip()


def normalise_file_name(file_name: str) -> str:
    """``normalise`` without the file extension (``cbc_report.pdf`` → ``cbc report``)."""
    return normalise(_EXTENSION.sub("", (file_name or "").strip()))


def _token_matches(token: str, haystack: str) -> bool:
    if len(token) <= BOUNDARY_TOKEN_MAX_LENGTH:
        return re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", haystack) is not None
    return token in haystack


def _first_rule(haystack: str, *, from_file_name: bool) -> Rule | None:
    if not haystack:
        return None
    for rule in RULES:
        if rule.filename_only and not from_file_name:
            continue
        if any(_token_matches(token, haystack) for token in rule.tokens):
            return rule
    return None


def classify_file_name(file_name: str) -> Classification:
    rule = _first_rule(normalise_file_name(file_name), from_file_name=True)
    if rule is None:
        return NO_MATCH
    return Classification(rule.category, rule.kind, SOURCE_FILENAME, CONFIDENCE_FILENAME)


def classify_text(text: str) -> Classification:
    rule = _first_rule(normalise(text), from_file_name=False)
    if rule is None:
        return NO_MATCH
    return Classification(rule.category, rule.kind, SOURCE_OCR, CONFIDENCE_OCR)


def classify(file_name: str, text: str = "", learned: tuple[str, str] | None = None) -> Classification:
    """The suggestion for one document.

    ``learned`` is the student's stored correction for this exact file name, as
    ``(category, kind)``; it wins over every rule. Otherwise the file name is tried, and
    the document's text only if the name matched nothing.
    """
    if learned and is_valid_kind(learned[0], learned[1]):
        return Classification(learned[0], learned[1], SOURCE_LEARNED, CONFIDENCE_LEARNED)
    by_name = classify_file_name(file_name)
    if by_name.matched:
        return by_name
    return classify_text(text)


def is_valid_kind(category: str, kind: str) -> bool:
    return kind == UNFILED or kind in KINDS.get(category, ())


def kind_for(category: str, suggestion: Classification) -> str:
    """The subfolder to file under inside the category the student picked.

    The suggestion is used only when it agrees with that category; a suggestion for a
    different category never moves the record and leaves it ``unfiled``.
    """
    if suggestion.matched and suggestion.category == category and is_valid_kind(category, suggestion.kind):
        return suggestion.kind
    return UNFILED
