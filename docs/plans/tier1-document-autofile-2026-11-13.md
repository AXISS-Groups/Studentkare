# Tier 1 plan: auto-classify and file uploaded health records

**Status:** approved by Krishna Chintakayala on 2026-11-13 and built (backend only). Section 12
lists where the build differs from the plan as first written.
**Asked by:** Krishna, 2026-11-13 — "I need a similar thing over SK", pointing at the WeHive
document-filing prompt and its OCR-service addendum.
**Scope:** backend only. No screen is changed here; a folder view needs a canvas brief first.

## 1. What exists today (read before writing)

| Piece | Where | State |
|---|---|---|
| Upload endpoint | `POST /health/documents` in `backend/services/workflow_api.py` | The student picks one of six categories (`LAB`, `PRESCRIPTION`, `VACCINE`, `CAMP_REPORT`, `DISCHARGE_SUMMARY`, `OTHER`). Bytes are stored in `care_documents.content`. Virus scan is fail-closed for prescriptions. |
| Text reader | `backend/services/document_ocr.py` | Tesseract in-process for PNG/JPEG, `pypdf` for PDFs with embedded text. A scanned PDF is an explicit `ReadFailed`. Off by default (`DOCUMENT_OCR_ENABLED`), with its own DPO sign-off. |
| Field draft | `backend/services/document_intake.py` | Heuristics over OCR text produce a draft; every field goes to `care_intake_review_items` as `PENDING`. |
| Queue check | `workflow_scheduler.py` | Reports `BLOCKED` when intakes are `QUEUED`/`FAILED`: "No document-intake queue adapter is implemented." |
| Search index | `personal_document_rag.index_document` | Indexes the text when the read succeeded. |

Three gaps the WeHive prompt describes are present here:

1. **Substring matching on OCR text.** `document_intake.type_map` matches `"rx"`, `"lab"`,
   `"report"`, `"dose"` anywhere in the text. `rx` sits inside "pyrexia"; `lab` inside
   "available" and "label"; `report` inside a prescription footer. The file name is never read.
2. **No content dedupe.** The same bytes uploaded twice make two documents.
3. **No memory of corrections.** Nothing records that the student moved a record.

Two references to `docs/plans/tier1-document-rag-2026-11-04.md` (in `document_ocr.py`,
`integration_config.py`, `agent_ayush.py`, `consent_ledger.py`) point at a file that is not in
the repo. Reported, not fixed here.

## 2. What changes from the WeHive version, and why

| WeHive prompt | Student Kare | Reason |
|---|---|---|
| Folders belong to a worker; staff file and correct | The record belongs to the student; **the student's choice is the human-verified label** | Student-owned records. No staff member re-files a student's record. |
| Folder / subfolder tables | Folder = the existing closed category set. Subfolder = a new closed `doc_kind` vocabulary per category (section 4) | Counts and "on file / missing" already key on `category`; a second tree would duplicate it. |
| Bytes under a storage key, `file_url` | Bytes stay in `care_documents.content`; add `checksum_sha256` | No object store here. Dedupe is `{account_id, checksum_sha256}`. |
| "Do not install any OCR dependency; call `axiss-ocr`" | Adopted (D1), gated on four conditions | Today's rule is "Tesseract on our own server, no third party", signed off on that basis. Sending health records to a shared multi-product service is a change to that sign-off. |
| "A failure never fails the upload" | True for OCR, classification and filing. **Not** for the virus scan, auth or consent, which stay fail-closed | AGENTS.md guardrail 1. Classification is not a safety gate; the scan is. |
| Cross-check expiry / ID number / DOB between engines | Cross-check **document date** and **patient name present**; lab values are never auto-accepted from either engine | Clinical values stay behind the existing per-field review gate. |
| `needs_review` on the document | Reuse `care_intake_review_items` (`PENDING`) | The review gate already exists. |

## 3. Data model (one Alembic migration, additive)

`care_documents` gains:

- `checksum_sha256` (String 64, indexed with `account_id`) — backfilled from `content`.
- `doc_kind` (String 40, default `""`) — the subfolder.
- `classification_source` — `filename` | `ocr` | `learned` | `manual`.
- `classification_confidence` (Float), `ocr_engine` (String 40), `ocr_text_len` (Integer).
- `label_verified` (Boolean) — true when the student chose or changed the label. Existing rows
  are backfilled `manual` + verified, because the student picked every category on file today.

New tables (clinical plane, Rule L grants as for `care_documents`):

- `care_document_label_corrections { account_id, file_name_norm, corrected_category,
  corrected_kind, rule_said_category, rule_said_kind, created_at }`, unique on
  `(account_id, file_name_norm)`.
- `care_ocr_jobs { id, account_id, document_id, engine, ok, pages, ms, error_code, created_at }`.
  `error_code` is an enum, never the engine's message and never document text (guardrail 9).

## 4. Classifier — `backend/services/document_classifier.py`

One ordered rules table, `(tokens, category, doc_kind, filename_only)`, matched in two passes.

- **Pass 1 — file name only**, normalised: NFKD, lowercase, `[^a-z0-9]+` → one space.
- **Pass 2 — OCR text**, only when pass 1 matched nothing. The two are never concatenated.
- Tokens of four characters or fewer match on word boundaries
  (`(?<![a-z0-9])TOKEN(?![a-z0-9])`); longer tokens may match as substrings.
- Filename-only tokens (too ambiguous in body text): `rx`, `lab`, `cbc`, `ecg`, `mri`, `ct`,
  `usg`, `opd`, `bill`.
- Order: discharge summary → prescription → vaccination → lab → imaging → camp report →
  insurance/bills → other.
- A stored correction for the exact normalised file name wins over the table and reports
  `learned`.

Proposed `doc_kind` vocabulary (closed; a new kind is a table row plus an i18n key):

| Category | Kinds |
|---|---|
| `LAB` | `blood`, `urine`, `imaging`, `cardiac`, `other_lab` |
| `PRESCRIPTION` | `prescription`, `consult_note` |
| `VACCINE` | `certificate`, `card` |
| `CAMP_REPORT` | `camp_report` |
| `DISCHARGE_SUMMARY` | `discharge_summary` |
| `OTHER` | `insurance`, `bill`, `id_proof`, `unfiled` |

The classifier **suggests**; it never overrides the student. On upload, the category the student
picked is stored as `manual` + verified, and the classifier fills only `doc_kind` (and flags a
disagreement as a review item, without moving the record). A future "let the app file it for me"
upload sends no category and takes the classifier's answer unverified.

## 5. Pipeline order on upload

1. Size, type and virus checks — unchanged, fail-closed.
2. `checksum_sha256`; if `{account_id, checksum}` exists, return that document (`200`, not `201`).
3. Store the row.
4. Read text: `pypdf` first for PDFs; only when shorter than `documents.min_text_chars` go to the
   OCR engine (D1), retrying 0/90/180/270 for images. One `care_ocr_jobs` row per attempt.
5. Classify (section 4), persist provenance.
6. Existing field draft, review items and search indexing — unchanged, but
   `document_intake.type_map` is replaced by the classifier's answer.

Steps 4–6 are wrapped so a failure logs an event code, leaves `doc_kind = "unfiled"`, and the
upload still returns. No PHI in the log line.

## 6. Reprocess and backfill

- `POST /health/documents/{id}/reclassify?apply=false` — owner only.
- `POST /ops/documents/reclassify-backfill?apply=false` — super admin; returns counts and
  `{document_id, from, to, matched_via}` only (ids, never file names or text, since an ops
  response is outside the clinical plane).
- Both are dry-run by default, idempotent, and skip every `label_verified` row.

## 7. Settings, config, copy (guardrail 11)

- Settings registry: `documents.min_text_chars`, `documents.ocr_timeout_seconds`,
  `documents.ocr_batch_concurrency`, `documents.backfill_page_size`.
- Environment (read in `integration_config.py` only): `DOCUMENT_OCR_URL`, `DOCUMENT_OCR_KEY`,
  `DOCUMENT_OCR_TEXT_LAYERS` — only if D1 picks the shared service.
- Kind labels: `src/i18n` in English, Telugu and Hindi.

## 8. Tests

1. `cbc_report.pdf` → `LAB/blood`, `matched_via: filename`.
2. OCR text containing "label" / "available" / "pyrexia" does not produce `LAB` or
   `PRESCRIPTION`.
3. File name `collaboration.pdf` does not match `lab`.
4. `Rx-2026_Nov.pdf` and `rx 2026 nov.pdf` normalise identically.
5. Same bytes twice → one document.
6. A page rotated 90° still yields text.
7. Engines disagreeing on the document date create a `PENDING` review item.
8. A student's correction changes the next upload of the same file name (`learned`).
9. Backfill dry run writes nothing and reports the diff the applied run performs.
10. A verified document survives `reclassify` unchanged.
11. OCR service down → upload returns `201`, `doc_kind = unfiled`, one failed `care_ocr_jobs` row.
12. Virus scanner down on a prescription → upload still refused.
13. Reachability: the new modules are imported by `workflow_api`.

## 9. Decisions (Krishna, 2026-11-13)

- **D1 — OCR engine: the shared `axiss-ocr` service only.** `document_ocr.py` keeps `pypdf` for
  PDFs that already carry text (no call is spent on them) and sends everything else to the
  service; the in-process Tesseract path is removed from the document reader
  (`medicine_ocr.py` is untouched). The integration stays **off by default** and must not be
  switched on in any environment until all four hold:
  1. Student Kare's backend is on the same private network as the service (no public URL).
  2. The service has a Student Kare-only key.
  3. It is confirmed the service stores and logs no document text.
  4. The DPO / AI-constitution owner signs off, replacing the "Tesseract on our own server, no
     third party" basis in `document_ocr.py` and `integration_config.py`.
  I could not verify 1–3 from this repo.
- **D2 — the student picks the category.** The upload screen does not change; the classifier
  fills the subfolder and raises a review item when it disagrees.
- **D3 — named reviewer: Krishna.** Approved 2026-11-13 ("okay done, build it").

## 10. Not in this plan

- Any screen change (folder view, "filed automatically" chip, correction sheet).
- Extracting lab values into `lab_results` from OCR — stays behind the existing review gate.
- A queue worker for bulk imports; Student Kare has no bulk import today.
- Restoring the missing `tier1-document-rag-2026-11-04.md`.

## 11. Residual risk

- The `doc_kind` vocabulary is a proposal from the six existing categories, not from a canvas.
- Until the four D1 conditions hold the reader stays off, and every record files by name only
  (the reader switch also covers reading a PDF's own text).
- Backfilling `checksum_sha256` reads every stored document once; run it off-peak.

## 12. As built — differences from sections 3 to 8

- **`kind_verified`, not `label_verified`.** The category is always the student's and is never
  written by a rule, so the only thing that can be "verified" is the subfolder. Existing rows are
  left with `doc_kind = ""` (never filed) and unverified, so the backfill can file them.
- **Corrections are subfolder-only.** `PATCH /health/documents/{id}/kind` lets the owner pick a
  subfolder; there is still no endpoint that changes a record's category. A correction is keyed by
  account, normalised file name and category.
- **`unfiled` is valid in every category**, not a kind of `OTHER`.
- **Cross-check is narrower than planned.** Two readings of one document exist only when a PDF
  carries a little text of its own *and* the service also read it. When both name a date and share
  none, a `document_date_conflict` review item is raised. "Patient name present" is not checked.
- **Reclassify and backfill never call the OCR service.** Reclassify uses the file name, stored
  corrections and (PDF, reader on) the file's own text; the backfill uses file name and corrections
  only and reads no document bytes. A filing the rules cannot better (for example one made from a
  scan's text) is kept.
- **The backfill returns counts, not a per-document diff**, with small cells suppressed, because
  a super admin may not see a student's document ids (`/ops/intake/review` has the same rule).
  The per-document diff is on the owner's own `reclassify` endpoint.
- **One time budget for the whole read** (`documents.ocr_timeout_seconds`, default 12, at most 15):
  the upload is still synchronous, so the four rotations share it rather than each getting a full
  timeout. It is kept under the app's own 20-second request timeout.
  `documents.ocr_batch_concurrency` was dropped — there is no batch path.
- **The file name is not sent to the OCR service** (it receives `document.pdf` / `.png` / `.jpg`).
- **A duplicate upload returns `200`** with the existing record and `"duplicate": true`, also when
  the second upload chose a different title. Dedupe is per category: the same file filed under
  another category is a new record, because flows such as sending a prescription to a pharmacist
  key on the category.
- **No i18n keys yet**: the kinds are not shown on any screen. They are needed with the folder view.

Endpoints: `POST /health/documents` (now dedupes and files), `GET /health/documents` (adds `kind`,
`matchedVia`, `kindVerified`), `PATCH /health/documents/{id}/kind`,
`POST /health/documents/{id}/reclassify?apply=false`,
`POST /ops/documents/reclassify-backfill?apply=false`.
- **Lab subfolders follow Krishna's list (2026-11-13):** `blood`, `urine`, `xray`, `mri`, `ct_scan`,
  `ultrasound`, `cardiac`, `report` — each kind of imaging is its own subfolder instead of one
  `imaging` folder, and `other_lab` is now `report`. Not built: folders for things the app itself
  writes (AI analyst report, suggestions, diet report). Those are not uploads; storing AI output as a
  health record is separate Tier 1 work (AI constitution at the call site, clinical sign-off).

## 13. Fresh-context review (2026-11-13) and what changed

Two reviewers with no knowledge of the conversation that produced this plan read it against the code
on the branch (the review step of Google's open-source Elephant-Goldfish Model, run by hand). Fixed
in the same PR:

- **An upload could still be lost.** The record was committed only after reading, filing and
  indexing. It is now committed first; a failure afterwards rolls back the analysis only.
- **No consent gate on the OCR send.** A document now goes to the service only when the student has
  switched on document analysis (`DOCUMENT_AI_ANALYSIS`, the consent that already gates indexing).
  No consent, or a consent that cannot be read, keeps the document in-process.
- **An admin form could switch the reader on, or point it elsewhere.** The address and key now come
  from the environment only, and the stored switch can only turn the reader off.
- **The server could wait longer than the app does.** Timeout default 30 → 12 seconds, cap 15.
- **A slow OCR service could exhaust the database pool.** The reader now runs with no transaction
  open.
- **The migration pulled every document into memory.** Checksums are now computed by Postgres in one
  statement.
- **Misfiled names and text.** Every token must start at a word boundary (`covid_card`, `direct
  scan`); bills are matched first; the bare word "blood" is gone; the text pass only looks inside
  the category the student picked, so a prescription that says "advised: blood test" raises no
  false "looks like a lab report" item.
- **Corrections over-generalised and outlived the record.** Nothing is remembered for a name that
  says nothing ("image.jpg"); deleting the last record with a name deletes its correction; the
  owner can choose `unfiled` to undo.
- An unfiled record no longer reports a `matchedVia`; a duplicate upload returns `kind` too; the
  backfill commits a page at a time.

Known and not fixed:

- **Double-tap race.** Dedupe is check-then-insert on a non-unique index, so two simultaneous
  uploads of one file can both be stored (as before this change). A unique index would fail on
  duplicates already in the table.
- **The migration still locks `care_documents`** for its duration and builds the index
  non-concurrently. Fine at today's size; run it in a quiet window on a large table.
- **The timeout is per network phase**, not a hard wall clock: connecting is capped at 3 seconds,
  then the read at the remaining budget.
- **The original image is sent with its EXIF data**; only the rotated retries are re-encoded.
- **Backfill totals (`examined`, `changed`, `skipped`) are not suppressed**, only the per-kind
  cells.
- **Non-Latin file names** are reduced to underscores by the existing `safe_filename` before the
  classifier sees them, so they file by text only.
- Whether sending a record to the OCR service belongs under `DOCUMENT_AI_ANALYSIS` or needs its own
  consent purpose is a DPO decision; the stricter reading is what is built.

## 14. Subfolders on the records screen (approved by Krishna, 2026-11-13)

Krishna approved adding subfolder chips to the existing Health vault screen (`RecordsVault`, Tier 1)
without waiting for a canvas board. Built with existing components only (`Chip`, `Sheet`, `M2Note`,
`Button`); no new icon.

- Picking a type chip (Lab reports, Prescriptions, …) shows a second row of chips: the folders that
  type's documents are filed in, with counts, and "Not sorted". The row is not drawn while nothing
  of that type is filed.
- Each row names its folder after its type ("Lab report · X-rays").
- "Move to a folder" (the row's actions sheet on a phone, a button in the desktop table) lets the
  student file a document themselves through `PATCH /health/documents/{id}/kind`. The choices come
  from the server (`GET /health/documents` now returns `kinds`); the row changes only after the
  server has saved, and a refusal is said in words. Disabled offline.
- Folder names are in `src/i18n/areas/studentwebT1.ts` in English, Telugu and Hindi. A folder the
  server adds before it has a name is listed under "Not sorted", never as a raw code.

**Differs from the picture:** the boards (T1Vault / T1VaultDesktop) have no folder row, no "Move to a
folder" action and no folder name in a row. Everything else on the screen is unchanged. The Telugu
and Hindi folder names were written here and have not been reviewed by a native speaker.
