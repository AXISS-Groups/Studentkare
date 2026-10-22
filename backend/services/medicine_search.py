"""Matching typed or printed text to medicines in the master. Pure functions, no database.

Two directions, one scorer:

* **Typed search** ("Dolo", "dollo 650", "paracetmol"): every word the person
  typed must match a word of the medicine's brand or salts closely enough
  (typos tolerated by a similarity ratio), and a typed number that equals one
  of its strengths ranks it higher.
* **Printed text** (from a photo of a strip or box): the medicine's brand or all
  of its salts must be found among the printed words; strengths found add to the
  score. Printed text carries a lot of noise ("tablets IP", batch numbers), so
  here the medicine's words are looked for in the text, not the other way round.

Nothing here decides anything: the caller shows candidates and the person
confirms one (plan tier1-medicine-info-2026-10-22, D-MI-11).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher

WORD = re.compile(r"[a-z]+|\d+(?:\.\d+)?")
# Words printed on nearly every strip, or that name a form or unit: they say nothing about which medicine it is.
NOISE = frozenset({
    "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "cap", "caps", "syrup", "suspension", "oral", "drops",
    "cream", "gel", "ointment", "injection", "ip", "bp", "usp", "mg", "mcg", "ml", "g", "iu", "each", "contains",
    "uncoated", "film", "coated", "film-coated", "mfd", "mfg", "by", "batch", "no", "exp", "date", "price", "mrp",
    "rs", "incl", "of", "all", "taxes", "for", "use", "only", "the", "and", "store", "below", "keep", "out", "reach",
    "children", "dosage", "as", "directed", "physician", "schedule", "drug", "prescription", "rx", "warning",
    "strip", "x", "w", "v",
})
MIN_WORD = 3
PREFIX_MATCH_MIN = 4


def words(text: str) -> list[str]:
    return WORD.findall((text or "").lower())


def name_words(text: str) -> list[str]:
    return [w for w in words(text) if w.isalpha() and len(w) >= MIN_WORD and w not in NOISE]


def numbers(text: str) -> set[float]:
    out = set()
    for w in words(text):
        if not w.isalpha():
            try:
                out.add(float(w))
            except ValueError:
                continue
    return out


def similarity(a: str, b: str) -> float:
    if a == b:
        return 1.0
    # A typed prefix of a long word ("parace" for paracetamol) counts as a match.
    if len(a) >= PREFIX_MATCH_MIN and b.startswith(a):
        return 0.95
    return SequenceMatcher(None, a, b).ratio()


def best(word: str, pool: list[str]) -> float:
    return max((similarity(word, other) for other in pool), default=0.0)


@dataclass
class Candidate:
    """What the scorer needs to know about one medicine."""
    id: str
    brand: str
    salts: list[str]
    strengths: list[float]
    matched_on: list[str] = field(default_factory=list)
    score: float = 0.0


def score_typed(query: str, candidate: Candidate, threshold: float) -> float:
    query_words = name_words(query)
    query_numbers = numbers(query)
    if not query_words and not query_numbers:
        return 0.0
    brand_words = name_words(candidate.brand)
    salt_words = [w for salt in candidate.salts for w in name_words(salt)]
    pool = brand_words + salt_words
    total = 0.0
    matched: set[str] = set()
    for word in query_words:
        on_brand = best(word, brand_words)
        on_salt = best(word, salt_words)
        top = max(on_brand, on_salt)
        if top < threshold:
            return 0.0
        total += top
        matched.add("brand" if on_brand >= on_salt else "composition")
    if not query_words and not pool:
        return 0.0
    score = total / max(1, len(query_words))
    strengths = set(candidate.strengths) | numbers(candidate.brand)
    if query_numbers:
        if query_numbers & strengths:
            score += 0.5
            matched.add("strength")
        elif not query_words:
            return 0.0
    candidate.matched_on = sorted(matched)
    return score


def score_printed(text: str, candidate: Candidate, threshold: float) -> float:
    printed = name_words(text)
    printed_numbers = numbers(text)
    if not printed:
        return 0.0
    brand_words = name_words(candidate.brand)
    matched: set[str] = set()
    score = 0.0
    if brand_words:
        brand_score = sum(best(w, printed) for w in brand_words) / len(brand_words)
        if brand_score >= threshold:
            score += brand_score
            matched.add("brand")
    salt_scores = [sum(best(w, printed) for w in name_words(salt)) / max(1, len(name_words(salt)))
                   for salt in candidate.salts if name_words(salt)]
    if salt_scores and min(salt_scores) >= threshold:
        score += sum(salt_scores) / len(salt_scores)
        matched.add("composition")
    if not matched:
        return 0.0
    if candidate.strengths and set(candidate.strengths) <= printed_numbers:
        score += 0.5
        matched.add("strength")
    candidate.matched_on = sorted(matched)
    return score


def rank(candidates: list[Candidate], text: str, *, printed: bool, threshold: float, limit: int) -> list[Candidate]:
    scorer = score_printed if printed else score_typed
    kept = []
    for candidate in candidates:
        candidate.score = scorer(text, candidate, threshold)
        if candidate.score > 0:
            kept.append(candidate)
    kept.sort(key=lambda c: (-c.score, c.brand.lower(), c.id))
    return kept[:limit]


def prefilter_terms(text: str, *, printed: bool) -> list[str]:
    """Short prefixes for a broad SQL pre-filter (typos after the first letters still match)."""
    terms = name_words(text)
    if printed:
        terms = [w for w in terms if len(w) >= MIN_WORD + 1]
    return sorted({w[:2] if not printed else w[:3] for w in terms})
