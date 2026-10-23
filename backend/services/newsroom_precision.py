"""The precision gate: may an auto post go out without a person?

Every sentence the aggregator or the series scheduler writes (headline, summary,
paragraphs, list and key-fact lines) is checked against the text it was written
from, and the source itself is checked:

* **Traceable.** The sentence is in the source word for word, or at least
  ``content.precision_sentence_min_support`` percent of its content words are
  (services/vector_store.support, the grounding measure Ayush uses).
* **No new number, date or name.** Every number in the sentence is in the
  source, and so is every capitalised word that does not open it.
* **No medical advice.** No dosing, diagnosis or treatment language
  (``content.advice_phrases``), even when the source has it: such a post waits
  for a person.
* **No unverifiable claim.** "Studies show", "guaranteed", "the best" …
  (``content.unverifiable_phrases``) only when the source says it too.
* **Crisis words** (``content.crisis_phrases``: suicide, self-harm, overdose …)
  always fail the sentence, so such a post is read by a person first.
* **The source.** Allow-listed and switched on, and for a feed item recent
  (``autopilot.news_max_age_hours``) and dated. Approved knowledge and the
  series library are allow-listed by being approved.

The score is the percent of sentences that pass, and 0 when a source check
fails. At or above ``content.precision_threshold`` the post may be approved
without a person (health content still follows content.health_requires_clinician);
below it the post waits in Content, Review, with each failed sentence and why.
Pure functions over text: nothing here reads or writes anything about a person.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from core.settings_registry import setting
from services import vector_store

FEED, KNOWLEDGE, LIBRARY = "feed", "knowledge", "library"
# Sentence reasons, and the source's. The Review tab shows each in words (i18n content.reason.*).
NOT_IN_SOURCE, NEW_NUMBER, NEW_NAME, ADVICE, UNVERIFIABLE, CRISIS = (
    "NOT_IN_SOURCE", "NEW_NUMBER", "NEW_NAME", "ADVICE", "UNVERIFIABLE", "CRISIS")
SOURCE_NOT_ALLOWED, SOURCE_OLD, SOURCE_UNDATED, NOTHING_TO_CHECK = (
    "SOURCE_NOT_ALLOWED", "SOURCE_OLD", "SOURCE_UNDATED", "NOTHING_TO_CHECK")
HOUR = 3600
PERCENT = 100
SENTENCE = re.compile(r"(?<=[.!?])\s+")
SPACE = re.compile(r"\s+")
NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
CAPITALISED = re.compile(r"\b[A-Z][\w'-]*")
EDGE_PUNCTUATION = " .,;:!?\"'“”‘’()…"


@dataclass(frozen=True)
class Source:
    """What a post was written from: its text, whether it is allow-listed, its kind and date (0: none given)."""
    text: str
    allowed: bool
    kind: str = FEED
    published_at: float = 0.0


@dataclass
class Report:
    score: int
    threshold: int
    passed: bool
    sentences: list[dict] = field(default_factory=list)
    source: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"score": self.score, "threshold": self.threshold, "passed": self.passed,
                "sentences": self.sentences, "source": self.source}


def phrases(raw: str) -> list[str]:
    return [" ".join(part.casefold().split()) for part in (raw or "").split(",") if part.strip()]


def _norm(text: str) -> str:
    return SPACE.sub(" ", text).strip(EDGE_PUNCTUATION).casefold()


def _contains(text: str, phrase: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", text) is not None


def split_sentences(texts: list[str]) -> list[str]:
    out: list[str] = []
    for text in texts:
        out += [s.strip() for s in SENTENCE.split(SPACE.sub(" ", text or "").strip()) if s.strip()]
    return out


def new_names(sentence: str, evidence: str) -> list[str]:
    """Capitalised words (not opening the sentence) the evidence does not have."""
    folded = evidence.casefold()
    missing = []
    for index, match in enumerate(CAPITALISED.finditer(sentence)):
        if index == 0 and match.start() == 0:
            continue
        if match.group(0).casefold() not in folded:
            missing.append(match.group(0))
    return missing


def check_sentence(sentence: str, evidence: str, *, min_support: float, advice: list[str],
                   unverifiable: list[str], crisis: tuple[str, ...] | list[str] = ()) -> list[str]:
    """Why a sentence fails (empty when it passes)."""
    reasons: list[str] = []
    folded, source = sentence.casefold(), evidence.casefold()
    copied = _norm(sentence) in _norm(evidence)
    if not copied and vector_store.support(sentence, evidence) < min_support:
        reasons.append(NOT_IN_SOURCE)
    if not set(NUMBER.findall(sentence)) <= set(NUMBER.findall(evidence)):
        reasons.append(NEW_NUMBER)
    if new_names(sentence, evidence):
        reasons.append(NEW_NAME)
    if any(_contains(folded, p) for p in advice):
        reasons.append(ADVICE)
    if any(_contains(folded, p) and not _contains(source, p) for p in unverifiable):
        reasons.append(UNVERIFIABLE)
    if any(_contains(folded, p) for p in crisis):
        reasons.append(CRISIS)
    return reasons


def source_reasons(source: Source, now: float, max_age_hours: int) -> list[str]:
    reasons: list[str] = []
    if not source.allowed:
        reasons.append(SOURCE_NOT_ALLOWED)
    if source.kind == FEED:
        if not source.published_at:
            reasons.append(SOURCE_UNDATED)
        elif source.published_at < now - max_age_hours * HOUR:
            reasons.append(SOURCE_OLD)
    return reasons


def score(texts: list[str], source: Source, now: float, *, threshold: int, min_support: int, max_age_hours: int,
          advice: list[str], unverifiable: list[str], crisis: tuple[str, ...] | list[str] = ()) -> Report:
    """The gate itself, with every knob passed in (tests call it directly)."""
    lines = split_sentences(texts)
    checked = [{"text": s, "reasons": check_sentence(s, source.text, min_support=min_support / PERCENT, advice=advice,
                                                     unverifiable=unverifiable, crisis=crisis)} for s in lines]
    for line in checked:
        line["ok"] = not line["reasons"]
    from_source = source_reasons(source, now, max_age_hours)
    if not lines:
        from_source.append(NOTHING_TO_CHECK)
    value = 0 if from_source else round(PERCENT * sum(1 for c in checked if c["ok"]) / len(checked))
    return Report(score=value, threshold=threshold, passed=value >= threshold, sentences=checked, source=from_source)


def gate(db: Session, texts: list[str], source: Source, now: float) -> Report:
    """The gate with the knobs from the settings registry."""
    return score(texts, source, now, threshold=int(setting("content.precision_threshold", db)),
                 min_support=int(setting("content.precision_sentence_min_support", db)),
                 max_age_hours=int(setting("autopilot.news_max_age_hours", db)),
                 advice=phrases(str(setting("content.advice_phrases", db))),
                 unverifiable=phrases(str(setting("content.unverifiable_phrases", db))),
                 crisis=phrases(str(setting("content.crisis_phrases", db))))


def post_texts(title: str, summary: str, body: list[dict]) -> list[str]:
    """Every sentence a reader sees that the writer chose (template-fixed lines are not the writer's)."""
    texts = [title, summary]
    for block in body:
        kind = block.get("type")
        if kind in ("heading", "paragraph", "callout", "quote"):
            texts.append(block.get("text", ""))
        elif kind in ("list", "facts"):
            texts += list(block.get("items", []))
        elif kind == "mythfact":
            texts += [block.get("myth", ""), block.get("fact", "")]
        elif kind == "stat":
            texts.append(f"{block.get('value', '')} {block.get('label', '')}")
    return [t for t in texts if t and t.strip()]
