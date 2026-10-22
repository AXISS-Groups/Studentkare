"""
services.ayush_health — is Agent Ayush able to answer, and if not, why.

``health(db)`` is what Super admin → Knowledge shows: how many sources are
published and indexed, whether retrieval is keyword or semantic, whether answers
are quotes or rephrased by the on-prem model, and the last model-runtime error.
``startup_sync`` runs once when the API starts: publish the help pack, then index
anything approved but missing.

Nothing here reads a student's words or records.
"""
from __future__ import annotations

import logging

from services import embeddings, help_pack, llm_gateway, vector_store

logger = logging.getLogger("services.ayush_health")

# Recent turns looked at for the "answers" line (how many fell back to quoting).
RECENT_TURNS = 50

STATUS_OK = "ok"
STATUS_ATTENTION = "attention"
STATUS_DOWN = "down"


def startup_sync(session_factory) -> dict:
    """Publish the help pack and sync the index. Best-effort; never raises."""
    result: dict = {}
    try:
        with session_factory() as db:
            if help_pack.autoload_enabled():
                result["helpPack"] = help_pack.publish_help_pack(db)
            result["sync"] = vector_store.sync_index(db)
        print(f"[AYUSH] help pack and index ready: {result}", flush=True)
    except Exception as exc:  # noqa: BLE001 — reported on the admin screen; the periodic job retries
        llm_gateway.record_error("startup", type(exc).__name__)
        print(f"[AYUSH] startup index sync failed: {type(exc).__name__}", flush=True)
    return result


def _retrieval(status: dict) -> dict:
    requested = embeddings.requested_provider()
    active = status["embedder"]
    semantic = embeddings.is_semantic_name(active)
    if not semantic:
        mode = "keyword"
    elif status["mismatchedEmbedder"]:
        # A semantic model is on, but some passages were indexed by the local fallback
        # (the model was unreachable): those answer on keywords until re-embedded.
        mode = "degraded"
    else:
        mode = "semantic"
    unsupported = requested not in (embeddings.PROVIDER_LOCAL, embeddings.PROVIDER_OLLAMA)
    missing_url = requested == embeddings.PROVIDER_OLLAMA and not llm_gateway.embedding_url()
    return {
        "mode": mode, "embedder": active, "requestedProvider": requested,
        "model": llm_gateway.embedding_model() if semantic else "",
        "misconfigured": "unsupported-provider" if unsupported else "missing-url" if missing_url else "",
        "fallbackPassages": status["mismatchedEmbedder"] if semantic else 0,
    }


def _answers(db, *, probe: bool) -> dict:
    from sqlalchemy import select

    from core import workflow_models as M
    from services import agent_ayush
    configured = llm_gateway.is_configured()
    rows = db.scalars(select(M.AgentTurn.generator).where(
        M.AgentTurn.agent == agent_ayush.AGENT_NAME, M.AgentTurn.outcome == "ANSWERED")
        .order_by(M.AgentTurn.created_at.desc()).limit(RECENT_TURNS)).all()
    recent = {"rephrased": 0, "quoted": 0, "fellBack": 0}
    for generator in rows:
        kind = (generator or "").split(":")[0]
        if kind == agent_ayush.GENERATOR_REPHRASED:
            recent["rephrased"] += 1
        elif kind == agent_ayush.GENERATOR_FALLBACK:
            recent["fellBack"] += 1
        else:
            recent["quoted"] += 1
    runtime = llm_gateway.runtime_status(llm_gateway.ollama_url()) if (configured and probe) else \
        {"reachable": None, "models": [], "error": ""}
    model = llm_gateway.model_name() if configured else ""
    return {
        "mode": "rephrased" if configured else "quotes",
        "model": model,
        "reachable": runtime["reachable"],
        # Ollama names a model "llama3.1:8b"; a model asked for without a tag is ":latest".
        "modelPulled": (model in runtime["models"] or f"{model}:latest" in runtime["models"]) if runtime["reachable"] else None,
        "recent": recent,
    }


def health(db, *, probe: bool = True) -> dict:
    """Ayush's state in plain terms. ``probe`` asks the model runtime if it answers."""
    status = vector_store.index_status(db)
    retrieval = _retrieval(status)
    if probe and retrieval["mode"] != "keyword":
        embed_runtime = llm_gateway.runtime_status(llm_gateway.embedding_url())
        model = llm_gateway.embedding_model()
        retrieval["reachable"] = embed_runtime["reachable"]
        retrieval["modelPulled"] = (model in embed_runtime["models"] or f"{model}:latest" in embed_runtime["models"]) \
            if embed_runtime["reachable"] else None
    answers = _answers(db, probe=probe)
    published, indexed = status["approvedSources"], status["indexedSources"]

    if published == 0 or indexed == 0:
        overall = STATUS_DOWN  # every question would get "I couldn't find this"
    elif status["missing"] or status["staleSources"] or retrieval["mode"] == "degraded" \
            or retrieval["misconfigured"] or answers["reachable"] is False or retrieval.get("reachable") is False:
        overall = STATUS_ATTENTION
    else:
        overall = STATUS_OK
    return {
        "status": overall,
        "published": published,
        "indexed": indexed,
        "missing": len(status["missing"]),
        "stale": status["staleSources"],
        "chunks": status["chunks"],
        "helpPack": help_pack.pack_status(db),
        "retrieval": retrieval,
        "answers": answers,
        "lastError": llm_gateway.last_error(),
    }
