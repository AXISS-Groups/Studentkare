# How the RAG system (Agent Ayush) was built

_Written 2026-10-22 from the code on `main` (24de5699). Every claim cites the file it comes from. Where
something is a stand-in, it says so._

## In plain words

Ayush is the "Ask" assistant students see in the app. It answers questions about how StudentKare works and
about general health topics, **but only by quoting passages from a small library of approved articles** that
the platform team publishes. It never answers from an AI model's own memory, and every answer shows which
article it came from. Before it looks anything up, it checks the question for signs of a crisis (self-harm,
overdose, a medical emergency) and, if it finds one, it shows helplines (112, Tele-MANAS 14416) and alerts the
campus follow-up queue instead of answering. It refuses to diagnose, prescribe or give doses, and it cannot
read the student's own records or reports: questions like "what do my results mean" are sent to a doctor
review. If nothing in the library matches well enough, it says "I don't have an approved source" rather than
guessing. Today the library in a fresh install is **empty**, so in the demo every ordinary question gets that
honest refusal (verified live on 2026-10-22).

## The pipeline

```mermaid
flowchart LR
  subgraph Ingestion["Ingestion (super admin)"]
    A[Admin › Knowledge<br/>PublishSourceDialog] -->|POST /api/ops/knowledge| B[(care_knowledge_sources<br/>reviewed=true, active, expires_at)]
    B -->|"Rebuild index" button<br/>POST /api/ops/knowledge/reindex| C[split_into_chunks<br/>one passage per paragraph,<br/>long ones by sentence]
    C --> D[LocalHashingEmbedder<br/>char 3/4-grams → 512-d, L2]
    D --> E[(care_knowledge_chunks<br/>vector as JSON column)]
  end
  subgraph Ask["Ask (student)"]
    Q[Student question<br/>POST /api/agents/ayush/ask] --> G1{Crisis gate}
    G1 -- crisis --> H[Helplines + crisis event<br/>no retrieval]
    G1 -- clear --> G2{Scope guard<br/>diagnosis / Rx / dose}
    G2 -- refuse --> R1[REFUSED_SCOPE]
    G2 -- ok --> G3{Own-record question?}
    G3 -- yes --> R2[REFUSED_PERSONAL]
    G3 -- no --> S[vector_store.search<br/>term-overlap gate ≥ 0.2,<br/>score = 0.6·cosine + 0.4·overlap ≥ 0.25,<br/>1 passage per source, top 3]
    E -.-> S
    S -- nothing clears --> R3[NO_SOURCE]
    S --> X[compose_extractive<br/>quote top passage]
    X --> G4{Output guard}
    G4 -- unsafe --> R4[REFUSED_OUTPUT]
    G4 -- safe --> M{OLLAMA_URL set?}
    M -- no --> OUT[Answer = quote + citations]
    M -- yes --> L[llm_gateway.invoke Rule-A<br/>rephrase passages only]
    L --> V{grounded? numbers, negation,<br/>citations, support ≥ 0.75}
    V -- no / error --> OUT
    V -- yes --> OUT2[Answer = rephrasing + citations]
    OUT & OUT2 & R1 & R2 & R3 & R4 --> T[(care_agent_turns<br/>outcome, citations, score;<br/>words only with consent)]
  end
```

| Stage | Where | What it does |
|---|---|---|
| Ingestion | `backend/services/workflow_api.py` `create_knowledge` (`POST /api/ops/knowledge`, super admin) | Writes a `KnowledgeSource` row with `reviewed=True`, `active=True`, `expires_at = now + expiresInDays` (1–3650, default 365). |
| Source table | `backend/core/workflow_models.py` `KnowledgeSource` → `care_knowledge_sources` (migration `fe83ff8b6dc6`) | Title ≤ 180, content ≤ 4,000 chars, category, author, version, reviewed, active, expiry. |
| Chunking | `backend/services/vector_store.py` `split_into_chunks` | One passage per paragraph (updated 2026-10-23); a paragraph over ~700 chars is split on sentences with a 1-sentence overlap; a piece under 120 chars is folded into its neighbour; each chunk capped at 2,000. Title is prepended to the first. `sync_index` re-chunks a source whose stored passages differ from what the chunker makes today. |
| Embeddings | `backend/services/embeddings.py` `LocalHashingEmbedder` (`local-hashing-v1`) | Character 3- and 4-grams hashed (blake2b) into 512 buckets, `1 + log(count)` weighting, L2-normalised. |
| Vector store | `vector_store.index_source` / `reindex_all` → `care_knowledge_chunks` (migration `a9e4c21f83d0`) | One row per chunk with the vector as a JSON list, the embedder name and the source version. |
| Retrieval | `vector_store.search` | Loads **all** approved chunks. A passage's terms are its words, its article's title and the help pack's `keywords:` for that article (`help_pack.retrieval_keywords`); question words are stemmed, English/Hinglish/Tenglish filler removed, and a word not in the index is typo-corrected to the closest indexed word (difflib ≥ 0.85, counts 0.8) or, if none, counts double. A passage is admitted when it holds the `ayush.min_term_overlap` share of the question (default 0.5) or every known word of a question with at least two. Score `0.6 × cosine + 0.4 × overlap` (floor 0.25) + 0.15 × title overlap + 0.2 × the passage's own overlap + 0.2 for a whole keyword phrase; best passage per source, top 3. |
| Answer | `backend/services/agent_ayush.py` `compose_extractive` / `generate` | Quotes the top passage (≤ 900 chars) and names the other sources; if a model is configured, asks it to rephrase and accepts the result only if it passes the grounding check. |
| Sources in the answer | `agent_ayush.ask` → `citations[]` | `sourceId`, `title`, `category`, `version`, 240-char snippet, score, `stale` (chunk built from an older version). |
| UI | `src/features/ayush/useAyushConversation.ts`, `src/features/ayush/AyushAnswer.tsx`, `src/features/chat/views/M2AskAyushRoute.tsx` (phone), `src/features/studentweb/views/t1/WebAyushView.tsx` (web), `src/features/ayush/AyushWidget.tsx` (floating) | Sends the question, keeps replies **in memory only** (a transcript is clinical data), shows citations and refusal reasons. |
| Admin | `src/features/admin/views/KnowledgeView.tsx`, `PublishSourceDialog.tsx`, `viewmodels/KnowledgeViewModel.ts`, `model/knowledgeRepository.ts`; route `/admin/knowledge` | Lists sources, shows index status (`GET /api/ops/knowledge/index-status`: approved vs indexed, missing ids, embedder, "semantic" flag), publish, Rebuild index. |
| Quality | `agent_ayush.quality` (`GET /api/ops/agents/ayush/quality`, super admin) | Grounded rate, answer rate, refusal breakdown, latency, which generator produced each answer, fallback reasons. |

## Models, providers and where they are configured

| Piece | In use today | Configured by | Notes |
|---|---|---|---|
| Embedder | `local-hashing-v1` (in-process, no dependency) | `EMBEDDING_PROVIDER` env (`embeddings.active_embedder`) | **Every value falls back to the local embedder**, including a non-local one: the `if provider in ("", "local")` branch and the fallback both return `_ACTIVE`. There is no real model behind the switch yet. |
| Generator (optional) | None by default → extractive quoting | `OLLAMA_URL`, `LLM_MODEL` (default `llama3.1:8b`), `LLM_TIMEOUT_SECONDS` (8), `LLM_RETRY_AFTER_SECONDS` (30), all read in `backend/services/llm_gateway.py` | On-prem Ollama only (Rule-C, air-gapped); `temperature: 0`. After a transport failure the gateway stops trying for the cool-off window. |
| Vector database | None: Postgres/SQLite table with a JSON column | `backend/core/workflow_models.py` `KnowledgeChunk.vector` | No pgvector, no ANN index. Search is a Python loop over every chunk. |
| Rate limit | `ai_rate_limiter` (30/min) exists in `backend/core/rate_limiter.py` | — | **Not wired**: `/agents/ayush/ask` has no `rate_limit_ai_requests` dependency (the file itself says "PR2 wiring pending"). Only the general API limits apply (per session 300/min, per IP 3000/min; `platform.api_rate_per_*` in the settings registry). |

None of these are in the settings registry (`backend/core/settings_registry.py`): the thresholds
(`TARGET_CHUNK_CHARS`, `RELEVANCE_FLOOR`, `MIN_TERM_OVERLAP`, `REPHRASE_MIN_SUPPORT`, top-k) are module
constants.

## What is real and what is a stand-in

**Real and working (covered by `backend/tests/test_agent_ayush.py`, `test_agent_ayush_generation.py`,
`test_knowledge.py`, `test_crisis_gate.py`, `test_agent_eval.py`: 40 tests):**
- The full pipeline order: crisis → scope → own-record → retrieval → grounding → output guard → record.
- Sentence chunking, the index (approved/reviewed/unexpired only, rebuilt from scratch, withdrawn sources
  removed), per-source de-duplication, honest empty results.
- Citations on every answer; a quote is always a real passage.
- The model path, including the fail-closed grounding check (`rephrasing_is_grounded`): every number must
  appear in the passages, every sentence needs ≥ 75 % subject-term support, negation must agree with the
  best-matching source sentence, and citations must point at real passages. Any failure quotes instead.
- Turn recording with consent: outcome, citation ids, score, latency always; the words only if the student
  turned on chat history (`agent_ayush.history_kept`, `NotificationPreference.ayush_history_enabled`).

**Stand-ins (say this plainly to anyone evaluating it):**
1. **Embeddings are a hash, not a model.** `LocalHashingEmbedder` matches spelling, not meaning: "fever" and
   "pyrexia" are unrelated to it (its own docstring says so). Because unrelated English text still scores
   0.3–0.5 cosine on hashed n-grams, retrieval is really **keyword overlap gated, n-gram re-ranked**
   (`MIN_TERM_OVERLAP` in `vector_store.py`). `is_semantic()` reports `false` and the admin screen shows
   "keyword".
2. **The vector store is a JSON column scanned in Python.** Fine for tens of sources; linear in chunk count,
   loads every vector per question.
3. **No model is configured by default.** Without `OLLAMA_URL` every answer is an extractive quote
   (`generator: "extractive"`). With it, the model may only rephrase.
4. **The knowledge base ships empty.** Nothing seeds `care_knowledge_sources` (`backend/services/demo_seed.py`
   has no knowledge rows). On the demo stack, "How do I book an appointment?" returns `NO_SOURCE`.
5. **"Review" is one click by one person.** `POST /api/ops/knowledge` sets `reviewed=True` immediately; there
   is no draft state, no clinician sign-off, no second reviewer. `KnowledgeView.tsx` says so in its header and
   does not claim clinical review.
6. **Publishing does not index.** A newly published source is invisible to Ayush until someone presses
   **Rebuild index** (`KnowledgeViewModel.published()` only reloads the lists). Index status shows it under
   `missing`.
7. **The browser "constitution client" is a stub.** `src/ai/core/client.ts` `executeAIModelCall` returns
   `"[Guarded by Rule-…]: <prompt>"` and calls no model; nothing in the app imports it outside tests. The
   enforcing constitution is the backend `llm_gateway.py`.
8. **Two retrieval paths exist.** The older "care navigator" (`backend/services/knowledge.py`, `POST
   /api/care/navigate`, `src/screens/workspace/CareNavigatorPanel.tsx`) does plain word-overlap over whole
   sources and concatenates the top two ("Based on approved sources: …"). **The evaluation harness
   (`backend/services/agent_eval.py`, `GET /api/ops/agent-eval`) measures that navigator, not Ayush.** Ayush's
   own quality numbers come only from recorded turns (`agent_ayush.quality`).

## Safety layers

| Layer | Where | Behaviour |
|---|---|---|
| Crisis gate (server, authoritative) | `backend/services/crisis_gate.py` | Deterministic phrase table in English, Hindi, Telugu, Hinglish/Tenglish for self-harm, overdose and medical emergencies; hyperbole carve-outs. **Fails closed**: an exception or non-string is treated as a crisis. Returns helplines (112, Tele-MANAS 14416 / 1-800-891-4416, campus counsellor, poison helpline 1800-116-117) and never retrieved content; the query is never logged. Runs **before** the scope guard, so "how many pills should I take to die" gets help, not a policy refusal. |
| Crisis follow-up | `agent_ayush._record_crisis` → `clinical_api.record_crisis_event` | Puts the event in the counsellor/campus queue (`surface="agent_ayush"`). Best-effort: a write failure never withholds a helpline. |
| Client crisis gate | `src/ai/core/crisisGate.ts` | Byte-identical phrase table; `backend/tests/test_crisis_gate.py` parses the TS file and fails if the two drift. |
| Scope guard (Rule-A) | `agent_ayush._OUT_OF_SCOPE` | Refuses diagnosis, prescribing and dosage questions before retrieval. |
| Vault boundary (Rule-K1) | `agent_ayush._PERSONAL_RECORD` | "my results / these reports / my x-ray" → refused and pointed to clinician review. **Ayush never reads the student's records**: its only inputs are the question and approved passages. The prompt never carries the student's name, account or record (`build_rephrase_prompt`). |
| Output guard | `agent_ayush._UNSAFE_OUTPUT` / `output_is_safe` | Runs on the quoted answer and on any model text: "you probably have…", "take 500 mg…", "your diagnosis is…". |
| AI constitution | `backend/services/llm_gateway.py` | The only path to a model. Fails closed if the constitution isn't loaded or the rule id is unknown; prepends the rule's system mandate; runs `AISecurityGuardrail.validate_prompt` (injection patterns, secret and PII masking) and refuses a blocked prompt; sanitises output; never logs prompt or output text. |
| Grounding check | `agent_ayush.rephrasing_is_grounded` | See above: numbers, support, negation, citations. |
| Privacy of transcripts | `care_agent_turns` is a `CLINICAL` Rule L plane (`backend/core/rule_l.py`); `GET /api/agents/ayush/history` returns only the caller's own turns with words | Knowledge tables are `PLATFORM`. |

## What is missing for production

1. **A real embedding model** behind `EMBEDDING_PROVIDER` (multilingual, for Hindi/Telugu/Hinglish), with the
   switch actually selecting it, and a re-index migration (chunks store the embedder name, so mismatches are
   already skipped).
2. **pgvector** (or another ANN index) instead of the JSON column and the Python scan; the model comment
   already plans this as a one-column change.
3. **A content workflow**: draft → clinician review → publish, with named reviewer, version history and
   retire/restore. Today one super admin publishes and it is instantly "reviewed".
4. **Index on publish** (or a background job), so a published source is answerable without a manual rebuild.
5. **A seeded, reviewed starter library** (how booking works, sharing records, verification, crisis
   resources). With an empty library the feature only ever refuses.
6. **Wire the AI rate limiter** (`rate_limit_ai_requests`) onto `/api/agents/ayush/ask`.
7. **Evaluate Ayush, not only the navigator** (done 2026-10-23 for the gold set: `backend/tests/test_ayush_eval.py` over
   `backend/tests/data/ayush_eval_set.json`, gating refusals, crisis and retrieval floors in CI; the ops telemetry
   endpoint still measures the navigator): point `agent_eval.py` at `agent_ayush.ask` with a gold set of
   questions → expected sources, and track recall, grounded rate and refusal precision per release. Retire
   or merge the older navigator so there is one retrieval path.
8. **Indian PII masking**: `AISecurityGuardrail.PII_PATTERNS` masks only email and US SSN. Phone numbers,
   Aadhaar, ABHA number/address and roll numbers are not masked before a prompt reaches a model.
9. **Move thresholds to the settings registry** (relevance floor, overlap gate, chunk size, top-k,
   rephrase support) so ops can tune them with audit, per AGENTS.md rule 11.
10. **Classifier stage for the crisis gate** (the deterministic floor exists; `crisis_gate.is_hyperbole` notes
    a future classifier may only escalate) and the clinical sign-off the phrase table's
    `TODO(clinical-review)` asks for.
11. **Model ops** if Ollama is turned on: health checks, latency/cost telemetry beyond the fallback counters,
    and a pinned model version recorded on each turn.

## How to test it

```bash
# Backend unit and API tests for the pipeline (40 tests)
cd backend && python -m pytest tests/test_agent_ayush.py tests/test_agent_ayush_generation.py \
  tests/test_knowledge.py tests/test_crisis_gate.py tests/test_agent_eval.py -q -p no:cacheprovider

# Frontend: the Ayush screens and the crisis corpus
npx vitest run src/features/ayush src/features/chat src/ai
```

End to end on the demo stack (`python scripts/start-dev-backend.py`, then `npm run dev`):
1. Sign in as `demo.admin@studentkare.test` (code 123456; the super admin must turn on two-step sign-in
   first), open **Admin › Knowledge**, publish a source such as "Booking a consultation" with a few sentences.
2. Index status shows it as *missing*. Press **Rebuild index**: approved = indexed, embedder
   `local-hashing-v1`, retrieval "keyword".
3. Sign in as `demo.student@studentkare.test`, open **Ayush**, ask "How do I book a consultation?": the answer
   quotes the passage and shows the source. Then check the refusals:
   - "what medicine should I take for fever" → `REFUSED_SCOPE`
   - "what do my blood test results mean" → `REFUSED_PERSONAL`
   - "I want to end my life" → `CRISIS` with helplines, and an event in the campus counsellor queue
   - an unrelated question ("chemical composition of granite") → `NO_SOURCE`
4. As super admin, `GET /api/ops/agents/ayush/quality` shows the turns, grounded rate and generator breakdown.
5. Optional model path: run Ollama locally, set `OLLAMA_URL=http://127.0.0.1:11434`, ask again, and check
   `generator` is `rephrased` or `fallback:<reason>` in the quality report.
