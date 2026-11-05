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

## Status: approved 2026-11-05 by Krishna Chintakayala, as scoped below

- Verified, signed-up users only — no document processing before signup/OTP + 18+ confirmation (not the
  "process first, ask to sign up after" flow originally floated; consent has to come before processing, not
  after).
- Phase 1 = prescriptions + labs with their existing models; consult notes/vaccination records as raw-text-
  plus-classification until a follow-on plan gives them schemas.
- An uploaded image of a medicine/strip is read the same way `M2MedicineInfo`'s photo flow already works:
  printed text extracted and matched against the database, confirmed by the student. Never identified by
  appearance, never a dose inferred from the photo.
- Rule 8's scope boundary (no AI-generated diet/exercise/dose/treatment output; no X-ray/imaging diagnosis)
  stays exactly as written — explicitly reconfirmed in the 2026-11-05 chat request, not reopened.
- Off-topic queries (anything that isn't about the student's own health records) get a plain refusal, not an
  attempted answer — same pattern Agent Ayush's grounding/support check already enforces (`vector_store.py`):
  no match clears the floor, nothing is returned.

## Addition 1 — Ayush answers from the student's own records (personal-RAG retrieval, already in scope)

"What's my medical history", "what did the doctor prescribe last time", "what medications am I on" are
restatement/retrieval over the student's own `PersonalDocumentChunk` index — rule 8 already covers this, no
new rule needed. Answers are grounded the same way Ayush's existing help-content answers are (support/overlap
check against the retrieved passages), so an answer that isn't actually backed by the student's own documents
doesn't get stated as fact.

## Addition 2 — Super admin & doctor dashboards: aggregate analytics, not RAG, and not individual drill-down

**Correction to how this was described:** "how many students, what diseases are most common, how many
consultations" is a set of **counts over structured fields** (diagnosis category, consultation topic, document
kind), not a text-retrieval problem — RAG is the wrong tool for it, and using it would make an auditable count
into an ungrounded AI guess. This is a straightforward aggregation query/dashboard, optionally with a
natural-language front end *that calls a defined, auditable count query* rather than free-floating retrieval.
A super admin or campus dashboard with that kind of free-text access to individual patient narratives would
also be the same "campus holds records like an employer" question already declined on 2026-11-04 — this
addition is **aggregate counts only**, never an individual student's record, text, or document.

**Open item needing a number before this ships:** a minimum cohort size below which a count is suppressed
(standard public-health practice, e.g. "fewer than 5" shown as "<5" rather than an exact small number), so a
rare condition in a small cohort can't be used to indirectly identify one student. *Recommendation: 5,
matching common public-health small-cell suppression practice — confirm or set your own number.*

A doctor's own dashboard (their own consultation count, topics, outcomes) is different: it's the doctor's own
professional activity record, about patients they already have a real clinical relationship with through an
actual consultation — not a third party gaining new visibility into someone else's data. No suppression
threshold needed there; same account-scoping rule (rule 6) applies — a doctor's dashboard only ever queries
that doctor's own consultations.

## Addition 3 — Doctor's real prescription routes to the existing dispense flow (not new AI-generated content)

Worth being precise about what this is, because it's a different and much safer thing than AI suggesting a
medication: after a **real consultation with a licensed doctor**, the doctor's own prescription (a clinical
decision made by a human clinician, same as any teleconsult today) should land in the student's record
automatically, instead of needing to be re-typed or re-uploaded — then follow the **existing** prescription
flow (`PrescriptionUpload` / dispense flow, referenced in `M2MedicineInfo`'s brief as "Send your prescription
to a pharmacy") to route to a nearby/associated pharmacy. A student can independently send their own existing
prescription into that same flow either way. **No new AI-generated medication content is introduced by this —
it's wiring a real doctor's real output into a pathway that already exists**, which is squarely in scope and
doesn't touch the Phase-8/SaMD line at all.

## Implementation note (2026-11-05) — reconciled with the pre-existing document pipeline

While starting on rule 4, found that `care_documents` (`Document`), `care_document_intake`
(`DocumentIntake`), and `care_intake_review_items` (`IntakeReviewItem`) already exist and are already
`CLINICAL` in `core/rule_l.py` — a full, shipped upload/classify/extract/review-gate pipeline
(`services/workflow_api.py`'s `/health/documents` + `/intake/*`, `services/document_intake.py`'s
`extract_fields`). This is exactly the "existing models" rule 3 says to reuse, so an earlier draft of
this implementation that added a second, parallel `PersonalDocument` table was a mistake and has been
removed before any migration was written. The design now is:

- `Document`/`DocumentIntake`/`IntakeReviewItem` are unchanged and keep doing what they already do
  (storage, category, heuristic field extraction, human review).
- `PersonalDocumentChunk` (rule 4) is the only new table. Its `document_id` FKs to `care_documents.id`,
  not a new table — one upload, one record of itself. `account_id` stays denormalised on the chunk for
  erasure/retrieval scoping, as already specified.
- Rule 1 ("the document reader becomes real") now means improving `document_intake.py::extract_fields`'s
  `_decode()` — currently plain UTF-8/Latin-1 byte decoding, so it silently produces garbage/empty text
  for an actual image or binary PDF — to call `services/medicine_ocr.py`'s Tesseract reader for image
  mime types and a real PDF-text extractor for PDFs, rather than building a second extractor.
- Rule 2's 5-way classification reuses `Document.category`'s existing allowed set (`LAB`, `PRESCRIPTION`,
  `VACCINE`, `CAMP_REPORT`, `DISCHARGE_SUMMARY`, `OTHER`) plus one addition, `CONSULT_NOTE`, since no
  existing category covers a doctor's consult note. No second classification vocabulary is introduced.

## What ships once approved

- Migration: `PersonalDocumentChunk` table (FK to `care_documents.id`) + pgvector extension/column (prod),
  JSON fallback (sqlite tests).
- Migration: `KnowledgeChunk.vector` → pgvector column type (same extension, no behavior change to Ayush).
- `DOCUMENT_AI_ANALYSIS` consent purpose wired into `consent_ledger.py`.
- Real OCR/extraction pipeline behind document upload, replacing `M2ReportUpload`'s unwired mock.
- Classifier + extractor into `lab_results`/medicine matching for prescriptions and labs.
- Retrieval endpoint, account-scoped, feeding restatement/analytics only — no new generation surface for
  dose/diet/exercise advice.
