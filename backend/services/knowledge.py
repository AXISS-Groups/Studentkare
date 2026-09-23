"""
services.knowledge — Approved knowledge retrieval for the read-only care navigator.

Retrieves from approved, versioned KnowledgeSource records and returns answers with
source citations. Retrieval is deterministic keyword matching (no fabricated
accuracy); if no approved source matches, it returns an honest "I don't have
authorized information" answer rather than inventing one.
"""
from __future__ import annotations

import re
from typing import List

from sqlalchemy import select

from core import workflow_models as M
from services import crisis_gate

from core.ai_security_guardrails import AISecurityGuardrail

import logging
logger = logging.getLogger(__name__)

# Domains the navigator may answer from approved sources. Anything outside is refused.
ALLOWED_DOMAINS = {"appointments", "records", "insurance", "medications", "support", "services", "general"}


def _tokenize(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2]


def _domain_of(query: str) -> str:
    q = query.lower()
    for word in ("appointment", "book", "consult", "schedule"):
        if word in q:
            return "appointments"
    for word in ("record", "document", "upload", "report", "vault"):
        if word in q:
            return "records"
    for word in ("insurance", "policy", "claim", "cover"):
        if word in q:
            return "insurance"
    for word in ("medication", "medicine", "dose", "refill", "pill"):
        if word in q:
            return "medications"
    for word in ("support", "help", "ticket", "contact"):
        if word in q:
            return "support"
    for word in ("service", "catalog", "product", "lab", "shop"):
        if word in q:
            return "services"
    return "general"


def search_sources(db, query: str, limit: int = 3) -> List[dict]:
    """Return matching approved, active, non-expired sources with a relevance score."""
    import time
    rows = db.scalars(
        select(M.KnowledgeSource).where(M.KnowledgeSource.active.is_(True), M.KnowledgeSource.reviewed.is_(True))
    ).all()
    now = time.time()
    q_tokens = set(_tokenize(query))
    scored = []
    for row in rows:
        if row.expires_at and row.expires_at < now:
            continue
        tokens = set(_tokenize(f"{row.title} {row.content}"))
        overlap = len(q_tokens & tokens)
        if overlap == 0:
            continue
        scored.append({
            "id": row.id, "title": row.title, "category": row.category, "content": row.content,
            "version": row.version, "score": overlap, "author": row.author,
        })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]



def answer(db, query: str) -> dict:
    """Answer a question from approved sources with citations, or refuse honestly."""
    safe, sanitized_query, metrics = AISecurityGuardrail.validate_prompt(query)
    if not safe:
        return {"answer": "I couldn't process that question. Please rephrase it.", "citations": [], "confident": False, "domain": None}
    query = sanitized_query

def _record_crisis(db, account_id: str, gate: dict) -> None:
    """Record the activation, best-effort.

    Ordering matters: the student sees their support contacts whether or not this
    succeeds. A follow-up record is valuable, but it is never worth withholding a
    helpline number over, so a failure here is swallowed deliberately.
    """
    try:
        from services.clinical_api import record_crisis_event
        record_crisis_event(db, account_id, gate["kind"], language=gate.get("language", ""),
                             surface="care_navigator", detected_by="SERVER")
        db.commit()
    except Exception:  # noqa: BLE001 — never block the support response
        try:
            db.rollback()
        except Exception:  # noqa: BLE001
            pass


def answer(db, query: str, account_id: str = "") -> dict:
    """Answer a question from approved sources with citations, or refuse honestly.

    The crisis gate runs before domain routing and before any retrieval. A query that
    trips it never reaches the knowledge base: retrieval would otherwise be free to
    return medication content for an overdose query, which is the one answer that must
    never be given.

    Pass `account_id` to record the activation for counsellor follow-up. The
    evaluation harness omits it, so measuring the gate never creates a care event.
    """
    safe, sanitized_query, metrics = AISecurityGuardrail.validate_prompt(query)
    if not safe:
        return {"answer": "I couldn't process that question. Please rephrase it.", "citations": [], "confident": False, "domain": None}
    query = sanitized_query

    gate = crisis_gate.evaluate(query)
    if gate["isCrisis"]:
        if account_id:
            _record_crisis(db, account_id, gate)
        return {
            "answer": gate["message"],
            "citations": [],
            "confident": False,
            "domain": "crisis",
            "crisis": {"kind": gate["kind"], "resources": gate["resources"]},
        }

    domain = _domain_of(query)
    if domain not in ALLOWED_DOMAINS:
        return {"answer": "I don't have authorized information on that.", "citations": [], "confident": False, "domain": domain}
    sources = search_sources(db, query)
    if not sources:
        logger.warning("Unanswered query in domain '%s' — no matching source found.", domain)
        return {"answer": "I don't have an approved source for that yet. Please contact support.", "citations": [], "confident": False, "domain": domain}
    citations = [{"sourceId": s["id"], "title": s["title"], "snippet": s["content"][:220], "version": s["version"]} for s in sources]
    answer_text = "Based on approved sources: " + " ".join(s["content"] for s in sources[:2])
    return {"answer": answer_text, "citations": citations, "confident": True, "domain": domain}

