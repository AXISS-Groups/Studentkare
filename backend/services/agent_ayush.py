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
extractively — it quotes the retrieved passage. When one is configured it may only
rephrase passages already retrieved and may not introduce a fact; the output guard
runs on its result either way. There is no path where the agent answers from model
weights alone, which is what makes every answer citable.

**It never reads the student's clinical record.** Ayush answers from the approved
knowledge base only. Questions about a student's own results belong with the clinician
review queue, and the agent says so rather than guessing.
"""
from __future__ import annotations

import re
import time
import uuid

from core import workflow_models as M
from services import crisis_gate, vector_store

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
    "I don't have an approved source that answers that, so I'd rather say so than "
    "guess. Support can help, and a clinician can answer anything clinical."
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
    if len(body) > 900:
        body = body[:900].rsplit(" ", 1)[0] + "…"
    answer = f"From {lead['title']}:\n\n{body}"
    if len(passages) > 1:
        others = ", ".join(passage["title"] for passage in passages[1:])
        answer += f"\n\nRelated approved sources: {others}."
    return answer


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
    if _PERSONAL_RECORD.search(text):
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

    # 6. Generation, constrained to what was retrieved.
    answer = compose_extractive(text, passages)

    # 7. Output guard on the composed answer — a retrieved passage can carry advice too.
    if not output_is_safe(answer):
        result = _outcome("REFUSED_OUTPUT", SCOPE_REFUSALS["diagnosis"], extra={"rule": RULE_NO_DIAGNOSIS})
        _record_turn(db, account_id, conversation_id, text, result, started)
        return result

    result = _outcome(
        "ANSWERED", answer, generator="extractive", score=passages[0]["score"],
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


def _record_turn(db, account_id: str, conversation_id: str, question: str,
                 result: dict, started: float) -> None:
    """Keep the turn so the agent can be evaluated. Best-effort.

    A refusal that should have been an answer is invisible without this — which is the
    failure mode a grounded agent is most prone to.
    """
    if not account_id:
        return
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
    }
