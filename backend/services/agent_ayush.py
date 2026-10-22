"""
services.agent_ayush — Agent Ayush, the student-facing care assistant.

A retrieval-augmented agent over approved knowledge. The pipeline, in order, and the
order is the design:

    1. Crisis gate      fails closed; a distressed student never reaches retrieval
    2. Scope guard      refuses diagnosis, prescribing and dosage outright
    3. Retrieval        vector + term search over approved, reviewed, unexpired sources
    4. Grounding check  no passage clears the floor, no answer — never an invention
    5. Generation       extractive by default; a model may only rephrase what was retrieved
    6. Output guard     re-checks the composed answer before it is returned
    7. Record           the turn is kept so the agent can be evaluated

Steps 1, 2, 4 and 6 are refusals. An assistant in a health product is defined by what
it declines to say, and each of those is a separate reason to decline, checked
independently so a failure in one cannot be covered by another passing.

**Generation is constrained, not free.** When no model is configured the agent answers
extractively — it quotes the retrieved passage. When one is configured (``OLLAMA_URL``)
it is asked, through the AI constitution in ``services.llm_gateway`` (Rule-A), to
rephrase only the passages already retrieved. The output guard then re-checks the
rephrasing and verifies it is grounded: every sentence must be supported by the
retrieved text, every number must appear in it, a negation must be in the source, and
it must cite passages that exist. Any failure — no model, timeout, guardrail block,
ungrounded or unsafe text — falls back to the extractive answer, never to an unguarded
model answer. There is no path where the agent answers from model weights alone, which
is what makes every answer citable. Which path produced each answer is recorded.

The prompt carries the question and the approved passages only — never the student's
name, account or record — and neither the prompt nor the answer is logged.

**It never reads the student's clinical record.** Ayush answers from the approved
knowledge base only. Questions about a student's own results belong with the clinician
review queue, and the agent says so rather than guessing.
"""
from __future__ import annotations

import re
import time
import uuid

from core import workflow_models as M
from services import crisis_gate, llm_gateway, vector_store

AGENT_NAME = "ayush"
AGENT_LABEL = "Agent Ayush"

# Rule A of the AI constitution. Asserted here so the refusal and the rule it enforces
# sit in the same place as the code that returns it.
RULE_NO_DIAGNOSIS = "Rule-A"

MAX_QUESTION_CHARS = 1000

# Phrasings that ask the agent to practise medicine. Refused before retrieval: there
# is no approved source that would make "what do I have" a safe question to answer.
_OUT_OF_SCOPE = [
    (re.compile(r"\b(what|which)\s+(disease|illness|condition|infection)\s+(do|have)\s+i\b", re.IGNORECASE), "diagnosis"),
    (re.compile(r"\bdiagnos(e|is)\s+(me|my)\b", re.IGNORECASE), "diagnosis"),
    (re.compile(r"\bdo\s+i\s+have\s+(cancer|tb|hiv|diabetes|covid|dengue|typhoid)\b", re.IGNORECASE), "diagnosis"),
    (re.compile(r"\bam\s+i\s+(dying|pregnant)\b", re.IGNORECASE), "diagnosis"),
    (re.compile(r"\bprescribe\b", re.IGNORECASE), "prescribing"),
    (re.compile(r"\bwhat\s+(medicine|tablet|antibiotic|drug)\s+should\s+i\s+(take|use)\b", re.IGNORECASE), "prescribing"),
    (re.compile(r"\bhow\s+(much|many)\s+\w+\s+should\s+i\s+take\b", re.IGNORECASE), "dosage"),
    (re.compile(r"\b(dose|dosage)\s+(of|for)\b", re.IGNORECASE), "dosage"),
    (re.compile(r"\bis\s+it\s+safe\s+to\s+(take|mix|combine)\b", re.IGNORECASE), "dosage"),
    # Added 2026-10-23 from the gold set (tests/data/ayush_eval_set.json): a guard may
    # only ever refuse more, never less.
    (re.compile(r"\bwhat(['’]?s|\s+is)\s+wrong\s+with\s+me\b", re.IGNORECASE), "diagnosis"),
    (re.compile(r"\b(which|what)\s+(medicine|medication|tablet|pill|antibiotic|drug|syrup)s?\s+(is|are|works?)\s+"
                r"(best|good|better|right)\b", re.IGNORECASE), "prescribing"),
    # Hinglish "which medicine": kaunsi / konsi dawai, goli, tablet.
    (re.compile(r"\b(kaun\s*s[aei]|kon\s*s[aei]|kaunsi|konsi)\s+(dawai|dawa|dava|medicine|tablet|goli)\b",
                re.IGNORECASE), "prescribing"),
    (re.compile(r"\bshould\s+i\s+(take|start|stop)\b", re.IGNORECASE), "prescribing"),
    (re.compile(r"\bmy\s+(rash|pain|fever|cough|cold|headache|symptoms?|lump|swelling|infection|wound|injury|"
                r"acne|spots?|bleeding|periods?)\b[\w\s]{0,20}\b(serious|normal|bad|dangerous|worrying|okay|ok)\b",
                re.IGNORECASE), "diagnosis"),
    (re.compile(r"\bcan\s+i\s+take\s+(\d|two|three|four|five|another|more|extra|double)\b", re.IGNORECASE), "dosage"),
    (re.compile(r"\b(\d+|two|three|four|five|double)\s+[\w-]+\s+(at\s+once|together|in\s+a\s+day|a\s+day|per\s+day)\b",
                re.IGNORECASE), "dosage"),
    (re.compile(r"\bhow\s+(much|many)\b[\w\s-]{0,40}\b(can|should|do|may|must)\s+i\s+(take|give|swallow)\b",
                re.IGNORECASE), "dosage"),
]

# Phrases that would mean the composed answer had drifted into advice. Checked on the
# output as well as the input, because a retrieved passage can contain them too.
_UNSAFE_OUTPUT = [
    re.compile(r"\byou\s+(probably|likely|definitely)\s+have\b", re.IGNORECASE),
    re.compile(r"\bi\s+(diagnose|prescribe)\b", re.IGNORECASE),
    re.compile(r"\btake\s+\d+\s*(mg|ml|tablets?|capsules?)\b", re.IGNORECASE),
    re.compile(r"\byour\s+diagnosis\s+is\b", re.IGNORECASE),
]

SCOPE_REFUSALS = {
    "diagnosis": (
        "I can't tell you what condition you have — only a clinician who has examined "
        "you can. I can help you book a consultation, or explain how the process works."
    ),
    "prescribing": (
        "I can't recommend or prescribe medicines. A registered clinician prescribes, "
        "and a pharmacist verifies it before anything is dispensed."
    ),
    "dosage": (
        "I won't give dosage information. Follow exactly what is written on your "
        "prescription, and ask your clinician or pharmacist if it isn't clear."
    ),
}

NO_SOURCE_ANSWER = (
    "I couldn't find this in StudentKare's help yet, and I won't guess. Help can "
    "answer questions about the app, and a doctor can answer anything about your health."
)

PERSONAL_RECORD_ANSWER = (
    "I can't read your health records or interpret your results — that's deliberate. "
    "Ask for a clinician review of a report and a registered doctor will look at it."
)

# "my blood test results", "these scan reports", "my x-ray" — the possessive and the
# artefact are rarely adjacent, so allow words between them.
_PERSONAL_RECORD = re.compile(
    r"\b(my|these|this)\b[\w\s]{0,30}?\b"
    r"(results?|reports?|readings?|tests?|scans?|x-?rays?|blood\s*work|vitals?)\b", re.IGNORECASE)

# Asks about the student's own values or what their own document says: "is my
# hemoglobin normal", "is my sugar high", "what did the doctor write in my prescription".
_PERSONAL_VALUE = re.compile(
    r"\b(is|are|was|were)\s+my\b[\w\s-]{0,30}?\b(normal|high|low|ok|okay|fine|bad|good|dangerous|serious|"
    r"worrying|too\s+(high|low))\b", re.IGNORECASE)
_PERSONAL_DOCUMENT = re.compile(
    r"\b(what|which)\b[\w\s'-]{0,40}\b(write|wrote|written|say|says|said|mean|means|meant)\b[\w\s-]{0,20}?"
    r"\b(in|on|by|about)?\s*my\s+(prescriptions?|records?|documents?|notes?|reports?|results?)\b", re.IGNORECASE)


def asks_about_own_record(question: str) -> bool:
    """Whether a question asks about the student's own record, which Ayush cannot read."""
    return any(pattern.search(question) for pattern in (_PERSONAL_RECORD, _PERSONAL_VALUE, _PERSONAL_DOCUMENT))


def _outcome(kind: str, answer: str, *, citations=None, score: float = 0.0,
             generator: str = "guard", extra: dict | None = None) -> dict:
    payload = {
        "agent": AGENT_LABEL,
        "outcome": kind,
        "answer": answer,
        "citations": citations or [],
        "topScore": score,
        "generator": generator,
        "answered": kind == "ANSWERED",
    }
    if extra:
        payload.update(extra)
    return payload


def check_scope(question: str) -> tuple[str, str] | None:
    """Return (kind, refusal) when the question asks the agent to practise medicine."""
    for pattern, kind in _OUT_OF_SCOPE:
        if pattern.search(question):
            return kind, SCOPE_REFUSALS[kind]
    return None


def output_is_safe(answer: str) -> bool:
    """Last gate. Runs on whatever is about to be returned, whoever composed it."""
    return not any(pattern.search(answer) for pattern in _UNSAFE_OUTPUT)


def compose_extractive(question: str, passages: list[dict]) -> str:
    """Answer by quoting what was retrieved.

    Deliberately not a summary. Without a model, any attempt to summarise is really an
    attempt to paraphrase without understanding, which is where invented facts come
    from. Quoting is less fluent and cannot be wrong about the source.
    """
    lead = passages[0]
    body = lead["content"].strip()
    # The first chunk opens with the title (it helps retrieval); the quote names it already.
    heading = f"{lead['title'].strip()}. "
    if body.startswith(heading) and len(body) > len(heading):
        body = body[len(heading):]
    if len(body) > 900:
        body = body[:900].rsplit(" ", 1)[0] + "…"
    answer = f"From {lead['title']}:\n\n{body}"
    if len(passages) > 1:
        others = ", ".join(passage["title"] for passage in passages[1:])
        answer += f"\n\nRelated approved sources: {others}."
    return answer


# ── Constrained generation ────────────────────────────────────────────────────

# Every sentence of a rephrasing must have at least this share of its subject terms in
# the retrieved passages. The same measure retrieval uses (vector_store.support).
REPHRASE_MIN_SUPPORT = 0.75
REPHRASE_MAX_CHARS = 1200
MODEL_DECLINED = "NO_ANSWER"

GENERATOR_EXTRACTIVE = "extractive"
GENERATOR_REPHRASED = "rephrased"
GENERATOR_FALLBACK = "fallback"  # recorded as "fallback:<reason>"

REPHRASE_INSTRUCTIONS = (
    "TASK: Rewrite the numbered approved passages into a short, plain answer to the "
    "student's question.\n"
    "- Use ONLY facts stated in the passages. Do not add any fact, number, name, "
    "advice, diagnosis, medicine or dose, and do not use your own knowledge.\n"
    "- Keep the passages' meaning exactly, including every 'not' or 'never'.\n"
    "- End every sentence with the number of the passage it came from, like [1].\n"
    "- At most five sentences. No greeting, no preamble.\n"
    f"- If the passages do not answer the question, reply exactly {MODEL_DECLINED}."
)

_CITATION = re.compile(r"\[(\d{1,2})\]")
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
_NEGATION = re.compile(r"\b(not|no|never|cannot|without|nor)\b|n't\b", re.IGNORECASE)
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def build_rephrase_prompt(question: str, passages: list[dict]) -> str:
    """The question and approved passages — nothing about the student."""
    numbered = "\n\n".join(
        f"[{index}] {passage['title']}\n{passage['content'].strip()}"
        for index, passage in enumerate(passages, start=1))
    return f"Student question:\n{question}\n\nApproved passages:\n{numbered}"


def _sentences(text: str) -> list[str]:
    return [part.strip() for part in _SENTENCE_SPLIT.split(text) if part.strip()]


def rephrasing_is_grounded(answer: str, passages: list[dict]) -> bool:
    """Whether a model's rephrasing says only what the passages say.

    Fails closed: anything that cannot be shown to come from the passages rejects the
    whole answer, and the caller falls back to quoting.
    """
    if not answer or len(answer) > REPHRASE_MAX_CHARS:
        return False
    cited = {int(number) for number in _CITATION.findall(answer)}
    if not cited or not cited <= set(range(1, len(passages) + 1)):
        return False

    evidence = "\n".join(f"{passage['title']}. {passage['content']}" for passage in passages)
    evidence_numbers = set(_NUMBER.findall(evidence))
    evidence_sentences = _sentences(evidence)

    sentences = _sentences(_CITATION.sub(" ", answer))
    if not sentences:
        return False
    for sentence in sentences:
        # A new number is a new fact, and the commonest kind of invented one.
        if not set(_NUMBER.findall(sentence)) <= evidence_numbers:
            return False
        # Every sentence carries subject words, and they come from the passages.
        if vector_store.support(sentence, evidence) < REPHRASE_MIN_SUPPORT:
            return False
        # Term overlap cannot see "you can cancel" turn into "you cannot cancel", nor
        # "do not take X" turn into "take X". The source sentence(s) this sentence is
        # most about must agree with it on negation, in both directions.
        if not _negation_agrees(sentence, evidence_sentences):
            return False
    return True


def _negation_agrees(sentence: str, evidence_sentences: list[str]) -> bool:
    """Whether the best-supporting source sentences carry the same negation as the answer.

    Fails closed: no source sentence clearly about the same thing, or a tie between
    sources that disagree, rejects.
    """
    scored = [(vector_store.support(sentence, source), source) for source in evidence_sentences]
    best = max((score for score, _ in scored), default=0.0)
    if best < REPHRASE_MIN_SUPPORT / 2:
        return False
    negated = bool(_NEGATION.search(sentence))
    return all(bool(_NEGATION.search(source)) == negated
               for score, source in scored if score == best)


def _fallback_reason(exc: Exception) -> str:
    if isinstance(exc, llm_gateway.PromptBlocked):
        return "blocked"
    if isinstance(exc, (llm_gateway.ConstitutionError, ValueError)):
        return "constitution"
    if isinstance(exc, llm_gateway.ModelUnavailable):
        return "timeout" if "timeout" in str(exc).lower() else "unavailable"
    return "error"


def generate(question: str, passages: list[dict], extractive: str) -> tuple[str, str]:
    """Stage 5. Return (answer, generator): the extractive answer unless a model's
    rephrasing passes every check. Never raises."""
    if not llm_gateway.is_configured():
        return extractive, GENERATOR_EXTRACTIVE
    try:
        # The constitution module, at the call site: Rule-A asserted, prompt guarded,
        # output sanitised, fail-closed on any error.
        candidate = llm_gateway.invoke(
            build_rephrase_prompt(question, passages),
            rule_id=RULE_NO_DIAGNOSIS, instructions=REPHRASE_INSTRUCTIONS)
    except Exception as exc:  # noqa: BLE001 — every failure quotes instead
        return extractive, f"{GENERATOR_FALLBACK}:{_fallback_reason(exc)}"
    if candidate.strip() == MODEL_DECLINED:
        return extractive, f"{GENERATOR_FALLBACK}:declined"
    # Stage 6 for the model's text: the guard every answer passes, then grounding.
    if not output_is_safe(candidate):
        return extractive, f"{GENERATOR_FALLBACK}:unsafe"
    if not rephrasing_is_grounded(candidate, passages):
        return extractive, f"{GENERATOR_FALLBACK}:ungrounded"
    return candidate, GENERATOR_REPHRASED


def ask(db, question: str, *, account_id: str = "", conversation_id: str = "",
        student_name: str = "Student") -> dict:
    """Run one turn through the pipeline. Never raises; a failure refuses."""
    started = time.perf_counter()
    text = (question or "").strip()[:MAX_QUESTION_CHARS]

    if not text:
        return _outcome("EMPTY", "Ask me something about your care and I'll find an approved answer.")

    # 1. Crisis gate. Before everything, including the scope guard: a student in
    #    distress asking a question that also looks out of scope must get help, not a
    #    policy refusal.
    gate = crisis_gate.evaluate(text, student_name)
    if gate["isCrisis"]:
        if account_id:
            _record_crisis(db, account_id, gate)
        return _outcome("CRISIS", gate["message"], extra={
            "crisis": {"kind": gate["kind"], "resources": gate["resources"]},
        })

    # 2. Scope guard — diagnosis, prescribing, dosage.
    scope = check_scope(text)
    if scope:
        kind, refusal = scope
        result = _outcome("REFUSED_SCOPE", refusal, extra={"refusedFor": kind, "rule": RULE_NO_DIAGNOSIS})
        _record_turn(db, account_id, conversation_id, text, result, started)
        return result

    # 3. The agent has no access to the clinical vault, by design.
    if asks_about_own_record(text):
        result = _outcome("REFUSED_PERSONAL", PERSONAL_RECORD_ANSWER, extra={"rule": RULE_NO_DIAGNOSIS})
        _record_turn(db, account_id, conversation_id, text, result, started)
        return result

    # 4. Retrieval over approved sources only.
    try:
        passages = vector_store.search(db, text, limit=3)
    except Exception:  # noqa: BLE001 — a retrieval failure refuses, never invents
        passages = []

    # 5. Grounding check. No passage, no answer.
    if not passages:
        result = _outcome("NO_SOURCE", NO_SOURCE_ANSWER)
        _record_turn(db, account_id, conversation_id, text, result, started)
        return result

    # 6. Generation, constrained to what was retrieved. The extractive answer is
    #    composed and guarded first: it is the fallback for every model failure, so a
    #    passage that carries advice refuses before any model sees it.
    extractive = compose_extractive(text, passages)

    # 7. Output guard on the composed answer — a retrieved passage can carry advice too.
    if not output_is_safe(extractive):
        result = _outcome("REFUSED_OUTPUT", SCOPE_REFUSALS["diagnosis"], extra={"rule": RULE_NO_DIAGNOSIS})
        _record_turn(db, account_id, conversation_id, text, result, started)
        return result

    # A model may rephrase; its text passes the output guard and a grounding check
    # inside generate(), and anything short of that is the extractive answer.
    answer, generator = generate(text, passages, extractive)

    result = _outcome(
        "ANSWERED", answer, generator=generator, score=passages[0]["score"],
        citations=[{
            "sourceId": passage["sourceId"], "title": passage["title"],
            "category": passage["category"], "version": passage["version"],
            "snippet": passage["content"][:240], "score": passage["score"],
            "stale": passage["stale"],
        } for passage in passages],
    )
    _record_turn(db, account_id, conversation_id, text, result, started)
    return result


def _record_crisis(db, account_id: str, gate: dict) -> None:
    """Route a crisis into the same follow-up queue as every other surface."""
    try:
        from services.clinical_api import record_crisis_event
        record_crisis_event(db, account_id, gate["kind"], language=gate.get("language", ""),
                            surface="agent_ayush", detected_by="SERVER")
        db.commit()
    except Exception:  # noqa: BLE001 — never withhold a helpline over a write
        try:
            db.rollback()
        except Exception:  # noqa: BLE001, S110
            pass


def history_kept(db, account_id: str) -> bool:
    """Whether the student has chosen to keep their Ayush chats.

    A consent, so it is withheld unless the student turned it on — no preference
    row, or a failed lookup, means the words are not kept.
    """
    try:
        prefs = db.get(M.NotificationPreference, account_id)
    except Exception:  # noqa: BLE001 — fail closed: an unreadable consent is not a consent
        return False
    return bool(prefs and prefs.ayush_history_enabled)


def _record_turn(db, account_id: str, conversation_id: str, question: str,
                 result: dict, started: float) -> None:
    """Keep the turn so the agent can be evaluated. Best-effort.

    A refusal that should have been an answer is invisible without this — which is the
    failure mode a grounded agent is most prone to. The outcome, citations, score and
    latency are always kept for that; the student's words and the answer only when
    they have turned chat history on.
    """
    if not account_id:
        return
    keep_words = history_kept(db, account_id)
    if not keep_words:
        question, result = "", {**result, "answer": ""}
    try:
        db.add(M.AgentTurn(
            id=uuid.uuid4().hex,
            conversation_id=conversation_id or uuid.uuid4().hex,
            account_id=account_id, agent=AGENT_NAME,
            question=question[:1000], answer=result["answer"][:4000],
            outcome=result["outcome"],
            citation_ids=[citation["sourceId"] for citation in result["citations"]],
            top_score=result["topScore"], generator=result["generator"],
            latency_ms=round((time.perf_counter() - started) * 1000, 1),
            created_at=time.time(),
        ))
        db.commit()
    except Exception:  # noqa: BLE001 — evaluation data is not worth a failed answer
        try:
            db.rollback()
        except Exception:  # noqa: BLE001, S110
            pass


# ── Evaluation ────────────────────────────────────────────────────────────────

def quality(db, *, limit: int = 500) -> dict:
    """How the agent is actually behaving, from recorded turns.

    Grounded rate is the headline: the proportion of answers that carried a citation.
    An agent whose grounded rate falls is answering from somewhere it should not be.
    """
    from sqlalchemy import select
    rows = db.scalars(select(M.AgentTurn).where(M.AgentTurn.agent == AGENT_NAME)
                      .order_by(M.AgentTurn.created_at.desc()).limit(limit)).all()
    total = len(rows) or 1
    answered = [row for row in rows if row.outcome == "ANSWERED"]
    return {
        "turns": len(rows),
        "groundedRate": round(sum(1 for row in answered if row.citation_ids) / max(len(answered), 1), 2),
        "answerRate": round(len(answered) / total, 2),
        "refusalBreakdown": {
            outcome: sum(1 for row in rows if row.outcome == outcome)
            for outcome in ("ANSWERED", "NO_SOURCE", "REFUSED_SCOPE", "REFUSED_PERSONAL",
                            "REFUSED_OUTPUT", "CRISIS")
        },
        "avgLatencyMs": round(sum(row.latency_ms for row in rows) / total, 1),
        "avgTopScore": round(sum(row.top_score for row in answered) / max(len(answered), 1), 3),
        # Which generation path produced each answer: quoted with no model configured,
        # rephrased by the model and accepted, or a model attempt that fell back.
        "generationBreakdown": {
            path: sum(1 for row in answered if (row.generator or "").split(":")[0] == path)
            for path in (GENERATOR_EXTRACTIVE, GENERATOR_REPHRASED, GENERATOR_FALLBACK)
        },
        "fallbackReasons": _count(
            row.generator.split(":", 1)[1] for row in answered
            if (row.generator or "").startswith(GENERATOR_FALLBACK + ":")),
    }


def _count(values) -> dict:
    counts: dict = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return counts
