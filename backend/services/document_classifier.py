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
* **Every token starts at a word boundary, and short tokens end at one too.** As a
  substring, ``rx`` sits inside "pyrexia", ``lab`` inside "available", ``id card`` inside
  "covid card" and ``ct scan`` inside "direct scan".
* **The text pass only looks inside the category the student picked.** A prescription that
  says "advised: blood test" must not be read as a lab report; across categories only the
  file name is trusted enough to raise a "this looks like another category" review item.
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

# Every token must start at a word boundary. Tokens up to this length must end at one
# too; longer ones may run on (so "vaccin" catches "vaccination").
BOUNDARY_TOKEN_MAX_LENGTH = 4


@dataclass(frozen=True)
class Rule:
    tokens: tuple[str, ...]
    category: str
    kind: str
    filename_only: bool = False


# Ordered on purpose: the first rule that matches wins. Bills first (a "lab bill" or a
# "consultation fee receipt" is paperwork, not the record), then discharge summaries (they
# quote prescriptions and lab values), prescriptions, vaccination, specific lab work, camp
# reports (before the generic "report"), generic lab work, and last the other paperwork.
RULES: tuple[Rule, ...] = (
    Rule(("invoice", "receipt", "bill"), "OTHER", "bill", filename_only=True),
    Rule(("discharge summary",), "DISCHARGE_SUMMARY", "discharge_summary"),
    Rule(("discharge",), "DISCHARGE_SUMMARY", "discharge_summary", filename_only=True),
    Rule(("prescription",), "PRESCRIPTION", "prescription"),
    Rule(("rx",), "PRESCRIPTION", "prescription", filename_only=True),
    Rule(("consultation", "consult note", "clinical note"), "PRESCRIPTION", "consult_note"),
    Rule(("consult", "opd"), "PRESCRIPTION", "consult_note", filename_only=True),
    Rule(("vaccination certificate", "vaccine certificate", "cowin"), "VACCINE", "certificate"),
    Rule(("vaccin", "immuniz", "immunis"), "VACCINE", "card"),
    # Blood before urine: a combined panel is filed as blood work. Not the bare word
    # "blood": "blood pressure log" is not a lab report.
    Rule(("hemoglobin", "haemoglobin", "complete blood count", "lipid profile", "hba1c", "thyroid profile",
          "blood test", "blood report", "blood work", "platelet"), "LAB", "blood"),
    Rule(("cbc", "lft", "kft", "tsh"), "LAB", "blood", filename_only=True),
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
    Rule(("health camp", "camp report", "screening camp"), "CAMP_REPORT", "camp_report"),
    Rule(("camp",), "CAMP_REPORT", "camp_report", filename_only=True),
    Rule(("lab report", "laboratory", "pathology", "test report"), "LAB", "report"),
    Rule(("lab", "report"), "LAB", "report", filename_only=True),
    Rule(("insurance", "mediclaim", "policy schedule", "claim form"), "OTHER", "insurance"),
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
    end = r"(?![a-z0-9])" if len(token) <= BOUNDARY_TOKEN_MAX_LENGTH else ""
    return re.search(rf"(?<![a-z0-9]){re.escape(token)}{end}", haystack) is not None


def _first_rule(haystack: str, *, from_file_name: bool, category: str = "") -> Rule | None:
    if not haystack:
        return None
    for rule in RULES:
        if rule.filename_only and not from_file_name:
            continue
        if category and rule.category != category:
            continue
        if any(_token_matches(token, haystack) for token in rule.tokens):
            return rule
    return None


def classify_file_name(file_name: str) -> Classification:
    rule = _first_rule(normalise_file_name(file_name), from_file_name=True)
    if rule is None:
        return NO_MATCH
    return Classification(rule.category, rule.kind, SOURCE_FILENAME, CONFIDENCE_FILENAME)


def classify_text(text: str, category: str = "") -> Classification:
    """By the document's text. With ``category``, only that category's rules are tried."""
    rule = _first_rule(normalise(text), from_file_name=False, category=category)
    if rule is None:
        return NO_MATCH
    return Classification(rule.category, rule.kind, SOURCE_OCR, CONFIDENCE_OCR)


def classify(file_name: str, text: str = "", learned: tuple[str, str] | None = None,
             category: str = "") -> Classification:
    """The suggestion for one document.

    ``learned`` is the student's stored correction for this exact file name, as
    ``(category, kind)``; it wins over every rule. Otherwise the file name is tried, and
    the document's text only if the name matched nothing. ``category`` is the one the
    student picked: the text pass looks only at that category's rules.
    """
    if learned and is_valid_kind(learned[0], learned[1]):
        return Classification(learned[0], learned[1], SOURCE_LEARNED, CONFIDENCE_LEARNED)
    by_name = classify_file_name(file_name)
    if by_name.matched:
        return by_name
    return classify_text(text, category)


# File names that say nothing about the record: a correction is never remembered for them,
# or one fix to "image.jpg" would re-file every later "image.jpg".
_GENERIC_WORDS = frozenset({"image", "img", "photo", "pic", "picture", "scan", "scanned", "document", "doc", "file",
                            "record", "untitled", "new", "copy", "whatsapp", "screenshot", "camscanner", "pdf", "jpg",
                            "jpeg", "png", "download", "final"})
MIN_DISTINCTIVE_WORD_LENGTH = 3


def is_distinctive_name(norm: str) -> bool:
    """True when a normalised file name carries at least one real word of its own."""
    return any(word.isalpha() and len(word) >= MIN_DISTINCTIVE_WORD_LENGTH and word not in _GENERIC_WORDS
               for word in norm.split())


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
