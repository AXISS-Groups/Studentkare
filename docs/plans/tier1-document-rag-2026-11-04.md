# Document intake, classification & personal-record RAG (Tier 1): plan for approval 2026-11-04

**Status:** DRAFT — not yet approved. Per `AGENTS.md`, Tier 1 (identity/clinical) work needs a plan and the named
reviewer's sign-off before code. Written after a chat request to build "drop all your documents, AI classifies
them, gives analytics and suggestions (diet/exercise/medication dose)" with RAG storage on pgvector.
**Needs approval from:** Krishna Chintakayala (founder, named Tier 1 reviewer).
**Builds on:** `tier1-mobile2-health-2026-10-21.md` (D-M2-12: `M2ReportUpload` deliberately shipped with no real
reader); `tier1-medicine-info-2026-10-22.md` (medicine matching rules — composition/brand matching only, never a
dose); `services/erasure.py` (FK-traversal erasure sweep); `services/consent_ledger.py` (`OPTIONAL_PURPOSES`
pattern, esp. `AYUSH_HISTORY`'s "withdrawing also clears the words already kept"); `core/rule_l.py`.
**Code read for this plan:** `services/vector_store.py`, `services/embeddings.py`, `services/llm_gateway.py`,
`services/consent_ledger.py`, `services/erasure.py`, `services/medicine_info.py`, `services/lab_results.py`,
`core/workflow_models.py` (`KnowledgeSource`, `KnowledgeChunk`, `MedicineInfoField`, `Account`).

## What already exists and gets reused, not rebuilt

A RAG pipeline already runs in this codebase for Agent Ayush's help content: `services/vector_store.py`
(chunking, indexing, scored retrieval) and `services/embeddings.py` (a dependency-free local embedder, or a
real on-prem model via Ollama through `llm_gateway`, which already masks PII before any text leaves the
process — Rule-C). That pipeline indexes only `KnowledgeChunk` rows derived from **approved, reviewed**
`KnowledgeSource` content. **This plan does not touch that index or its table.** Personal health documents are
a different kind of data (one person's own records, never reviewed/approved content), so they get a parallel,
separate table and a separate retrieval path — mixing them would break the existing "only approved sources are
ever indexed" guarantee that Agent Ayush's answers depend on.

`KnowledgeChunk.vector` is currently stored as JSON on purpose (the docstring says so) "so the same code runs
on SQLite in tests and Postgres in production; moving to pgvector later changes this column and nothing else."
This plan is that later: both `KnowledgeChunk.vector` and the new personal-document chunk table's vector column
move to a real `pgvector` column type (https://github.com/pgvector/pgvector) in production, with the JSON
fallback kept for the SQLite test harness (the existing test suite runs against sqlite).

## Rules

1. **The document reader becomes real.** This is what `M2ReportUpload` left deliberately unwired (D-M2-12).
   OCR/text-extraction only — it reads what's printed, it does not interpret or diagnose. Confidence is
   recorded per field; nothing here claims pharmacist-grade accuracy.
2. **Classification into 5 kinds:** prescription, consult note, lab/blood report, vaccination record, discharge
   summary — reusing the same kind set already built in `M2ReportUpload`'s canvas concept.
3. **Structured extraction reuses existing models where they exist, never invents a second source of truth:**
   - Lab values → the existing `lab_results` model.
   - A medicine named on a prescription → matched against `medicine_info`'s `Medicine`/composition matching
     (same matching rules as `M2MedicineInfo`: brand/composition/strength match, confirmed by the student,
     never a dose inferred from the document).
   - Consult notes and vaccination records have no backend model yet — **open item, below**.
   - Everything extracted is tagged as the student's own self-reported/AI-extracted data, never written into
     `MedicineInfoField` or any pharmacist-reviewed table — that stays reserved for catalog data reviewed by a
     pharmacist (per the existing Tier-1 rule: no AI writes reviewed clinical content).
4. **RAG storage: a new, separate `PersonalDocumentChunk` table**, FK'd to `care_accounts`, so
   `services/erasure.py`'s FK-traversal sweep discovers and erases it automatically on account deletion with
   zero new erasure code. An external vector DB is explicitly rejected for this reason — it would sit outside
   that sweep and create a DPDP gap.
5. **A new optional consent purpose**, e.g. `DOCUMENT_AI_ANALYSIS`, added to `consent_ledger.OPTIONAL_PURPOSES`,
   mirroring `AYUSH_HISTORY`: the flag gates whether a dropped document is ever read/chunked/embedded, and
   withdrawing it clears the chunks already stored — not just turns off future use. This consent is asked for
   separately from "store my documents," because feeding full document text as LLM context is more exposure
   than showing the student their own structured values back.
6. **Retrieval is always scoped to the authenticated account's own id.** No query against
   `PersonalDocumentChunk` is ever allowed without an `account_id` filter — enforced in the query function
   itself, not left to the caller to remember.
7. **Rule L unchanged.** This is clinical-plane data about one person. Never joined to commerce, never visible
   to a paying party (campus/parent/insurer) per the decision already made earlier this session.
8. **Scope boundary — unchanged by this plan:** the AI may restate, summarize, explain, and show analytics/
   trends over the student's own extracted data (the bucket `learnings-and-principles.md` already calls safe
   to ship early). It may **not** generate diet, exercise or medication-dose/composition suggestions — that
   stays exactly where `learnings-and-principles.md` already puts it: **deferred to Phase 8, licensed SaMD
   path.** This plan does not move that line; RAG is a better retrieval mechanism feeding the same generation
   step, and the regulatory classification of the output doesn't change because the retrieval improved.
9. **Any model call still goes through `llm_gateway`** (Rule-C constitution + PII masking), same as every other
   AI path in this codebase — no new direct-to-model code path.

## Open items for the reviewer (need a decision before code)

- **Consult notes & vaccination records:** build full Tier-1 schemas for both now, or ship Phase 1 with
  prescriptions + lab reports only (both already have a home model) and raw-text-plus-classification for the
  other two kinds until their schemas are designed? *Recommendation: Phase 1 = prescriptions + labs; raw text
  stored and chunked for RAG either way, so nothing is lost — structured extraction for the other two kinds
  catches up in a follow-on plan.*
- **Consent purpose name/copy** — exact wording the student sees when asked to turn this on.
- **Confirm:** rule 8's scope boundary (no AI-generated diet/exercise/dose output) stays as-is, unchanged from
  the earlier chat decision this session.

## What ships once approved

- Migration: `PersonalDocumentChunk` table + pgvector extension/column (prod), JSON fallback (sqlite tests).
- Migration: `KnowledgeChunk.vector` → pgvector column type (same extension, no behavior change to Ayush).
- `DOCUMENT_AI_ANALYSIS` consent purpose wired into `consent_ledger.py`.
- Real OCR/extraction pipeline behind document upload, replacing `M2ReportUpload`'s unwired mock.
- Classifier + extractor into `lab_results`/medicine matching for prescriptions and labs.
- Retrieval endpoint, account-scoped, feeding restatement/analytics only — no new generation surface for
  dose/diet/exercise advice.
