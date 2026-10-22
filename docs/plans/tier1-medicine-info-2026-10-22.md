# Medicine information (Tier 1): plan approved 2026-10-22

**Approved by:** Krishna Chintakayala (founder, named Tier 1 reviewer), 2026-10-22, in the feature request that
specifies the eight rules below (reviewed information only, never written by an AI; photo text matched and
confirmed, never a pill identified by its look; the age question shows only label forms and strengths, never a
dose; under-12 and pregnancy go to a doctor or pharmacist; the "take only as prescribed" note always visible; buy
only what we sell, OTC directly and prescription medicines through the prescription flow; crisis words go to the
existing crisis gate). The recommended answers in §Decisions are taken with that approval. The parts this plan
routes to the clinical lead, the AI-constitution owner or the DPO stay off until they sign.
_(clinical lead, date: the [CL copy] lines)_ · _(AI-constitution owner and DPO, date: D-MI-10, turning the photo reader on)_

**Status:** built in `feat/med-info` (one PR with this plan).
**Boards:** none on the canvas. Designed in code in the Mobile 2.0 language (canvas page 9), like M2FindCare:
briefs `design/screens/briefs/M2MedicineInfo.md` (phone; the same view reflows on the public page and the web
shell) and `AdminMedicineInfo.md` (console review screen).
**Builds on:** `tier1-mobile2-health-2026-10-21.md` (decision 1, D-M2-1: medicine information stays hidden until
pharmacist-reviewed fields exist and is never filled by an AI lookup; D-M2-2: prescription medicines; Gap 5),
`tier1-care-directory-2026-10-21.md` (public page + in-app + Expo + admin pattern, honest "not configured"
connector).
**Code read for this plan:** `backend/services/medicine_master.py`, `core/medicine_composition.py`,
`core/workflow_models.py` (`Medicine`, `MedicineIngredient`, `CatalogEntry`), `core/rule_l.py`,
`services/commerce_session.py`, `services/crisis_gate.py`, `src/ai/core/crisisGate.ts`,
`src/design-system/CrisisLinks.tsx`, `src/features/shopPhone/*` (M2Product, its view model and links),
`src/features/discover/*` (Home search), `src/native/M2HealthScreens.tsx` (camera),
`src/screens/vault/MedicationInfoScreen.tsx` (legacy, unrouted, mock data: not reused).

## Rules every part of this feature keeps

1. **Only reviewed information is shown.** Every monograph field carries its source, `reviewed_by` (a
   pharmacist's account) and `reviewed_on`. A field shows to users only while it is REVIEWED **and** the value
   still equals the value the pharmacist approved (a hash is kept with the review; any later edit, import or
   master change voids it). No field, no fallback text: the screen says "We don't have reviewed information for
   this medicine yet — ask a pharmacist or doctor."
2. **No AI writes monograph text.** Nothing here calls a model. `/ai/medication-lookup` never fills a field.
   Imported text is stored verbatim from the licensed dataset and still needs a pharmacist's review.
3. **The photo is read, never interpreted.** Printed text is extracted and matched against the database by
   brand, composition and strength; the person confirms the match. No pill is ever identified by its shape,
   colour or imprint; one match still needs a tap; no match says so.
4. **No personal dose.** The age question shows which forms and strengths the reviewed label lists for that age
   band. Never a dose, frequency, duration, mg/kg calculation or "how many". The age band is chosen on the
   device and never sent to the server.
5. **Always visible:** "Take medicines only as prescribed by a doctor or as advised by a pharmacist. Consult a
   doctor before taking any medicine." with **Book a consult**; for prescription schedules also "Needs a
   prescription" and **Send your prescription to a pharmacy** (as M2Product).
6. **Rule L.** Medicine information is product reference data: commerce plane, no person in it, never joined to
   a health record. The lookup reads nothing about the viewer (it works signed out) and stores nothing about
   them; the search text, the photo and the age band are not kept.
7. **Crisis first.** Text typed in the search box (or corrected from a photo) goes through the crisis gate on
   the device before any request; the server gate runs again (fail closed). A crisis outcome shows the existing
   crisis help (112, Tele-MANAS 14416, crisis support) and no results.
8. **Help one tap away.** The crisis lines are reachable from the screen in every state.

## What is built

### Data (Alembic from the single head `f6c4a2e81d37`; commerce plane)

| Table | Plane | What it holds |
|---|---|---|
| `care_medicine_info_fields` | COMMERCE | One row per medicine per field: `field`, `value` (JSON, monograph fields only), `source_title`, `source_url`, `state` (UNREVIEWED · REVIEWED), `reviewed_by`, `reviewed_on`, `reviewed_at`, `reviewed_hash`, `updated_by`, `updated_at`, `import_id`. Unique (medicine, field). |
| `care_medicine_info_events` | COMMERCE (SELECT, INSERT only: append-only) | The audit trail the review screen shows: medicine, field, action (IMPORTED · EDITED · REVIEWED · REVIEW_WITHDRAWN), actor id and role, value hash, time. Each event is also written to `care_workflow_audit`. Ids and hashes only, no text. |
| `care_medicine_info_imports` | COMMERCE | One row per CSV import: file name, dataset name, licence reference, source link, counts, row errors (row number + reason), who, when. |

Fields: **identity** — `brand`, `composition` (salts + strength per unit), `form`, `pack`, `manufacturer`,
`schedule` (OTC · H · H1 · X), read from the medicine master (`care_medicines` + ingredients) and reviewed
against its current value; **monograph** — `uses` (label indications), `side_effects` (common), `warnings`
(key), `storage`, each a list of short lines; `age_availability`, a list of `{band, form, strength}` from the
approved label.

### API (`backend/services/medicine_info.py`, runs as `sk_commerce`)

- Public: `GET /api/medicine-info/search?q=` (brand or composition, typo tolerant, crisis-gated) ·
  `GET /api/medicine-info/medicines/{id}` (identity, reviewed fields only, same-salt label forms, OTC
  same-composition alternatives, buy state) · `GET /api/medicine-info/photo/status` ·
  `POST /api/medicine-info/photo` (the photo in memory → printed text → candidates; rate limited; never stored).
- Pharmacist (pharmacy partner) and super admin: `GET /api/work/medicine-info`,
  `GET /api/work/medicine-info/{id}` (fields, current values, history), `PUT …/fields/{field}` (edit; resets to
  UNREVIEWED). **Pharmacist only:** `POST …/fields/{field}/review` with the hash of what they read (409 if it
  changed). Withdraw: `POST …/fields/{field}/withdraw`.
- Super admin: `POST /api/ops/medicine-info/import` (CSV, lands UNREVIEWED) · `GET /api/ops/medicine-info/imports`.
- `lookup_medicine` (`/ai/medication-lookup`) and the lookup never return an imported medicine whose identity a
  pharmacist has not reviewed.

### Screens

- **M2MedicineInfo** (Mobile 2.0; `/medicine-info` public page, the student phone frame, the web shell, Expo
  `MedicineInfo`): search · photo · results · the medicine · "Who is it for?" · always-visible note.
  Reached from Home search (entry row and results), the shop home (M2Medicines) and M2Product.
- **AdminMedicineInfo** (console; super admin `admin/medicine-info`, pharmacy partner `medicine-info-review`):
  queue with filters, field editor with source, Approve (pharmacists), history, CSV import (super admin).

## Decisions (each with the recommended answer, taken)

1. **D-MI-1 Plane.** Commerce (beside `care_medicines`, as Gap 5 planned): the lookup also reads the catalogue to
   say whether we sell it, and `sk_commerce` cannot read clinical tables. **Taken.**
2. **D-MI-2 Who approves.** A pharmacist (a VENDOR account whose partner kind is PHARMACY) only. A super admin can
   edit, import and withdraw but never approve; doctors are not reviewers here (the request names pharmacists).
   **Taken.** Residual: the reviewer is an account, not a registered person; capture the pharmacist's State
   Pharmacy Council registration number on the account before launch (not built).
3. **D-MI-3 Per-field review against a hash.** Each field is approved on its own; identity fields are approved
   against the master's current value, so a later master edit voids that approval without anyone remembering
   to. **Taken.**
4. **D-MI-4 Composition before review.** The request says "still show composition if known". Shown for an active
   master medicine that is not an unreviewed import (the shop already shows it on M2Product), labelled "From our
   medicine list. Not yet reviewed by a pharmacist." An imported medicine stays out of the lookup until its six
   identity fields are reviewed. **Taken.**
5. **D-MI-5 Import.** Our CSV columns (documented in the review screen and the brief): `brand, composition,
   form, pack, manufacturer, schedule, uses, side_effects, warnings, storage, age_availability, source_title,
   source_url`. The dataset name and licence reference are required. A row matching an existing medicine (same
   name, composition and form) attaches fields to it and never changes the master; a new one is created with
   source IMPORT. Every field lands UNREVIEWED; a row that fails validation is reported with its row number and
   nothing from it is saved. Row cap from `medicine_info.import_max_rows`. **Taken.**
6. **D-MI-6 Age bands.** Bands: under-2, child, teen, adult, older adult, and "pregnant or breastfeeding"; the
   boundaries (2, 12, 18, 65 years) and the "ask a doctor first" threshold (12) are settings
   (`medicine_info.*`, public). The band chosen stays on the device. **Taken.**
7. **D-MI-7 Under-12 and pregnancy.** The request: show "Ask a doctor or pharmacist before giving this" and the
   consult / pharmacy actions instead of strengths when the label does not list the band. **Recommended and
   taken (stricter):** the line and actions show for those bands every time; label strengths appear under them
   only when the reviewed label lists the band. Other bands not on the label: "The reviewed label doesn't list a
   form for this age group" and the same actions.
8. **D-MI-8 What the age answer lists.** Forms and strengths from the reviewed label of this medicine and of
   reviewed medicines with the same salts (another strength or form), each with its brand and, if we sell it,
   the buy path below. Validation refuses dose words (per day, times, tablets, mg/kg, every …) in a strength.
   **Taken.**
9. **D-MI-9 Alternatives.** Same salts, strengths and form, reviewed identity, OTC only, cheapest listing first
   when sold. A prescription medicine shows "Only your prescriber can change a prescription medicine to another
   brand" and no list (D-M2-2 carries). **Taken.**
10. **D-MI-10 Reading the photo.** No well-maintained on-device OCR library fits both Expo SDK 52 and the web
    (ML Kit text recognition needs native modules and does not run on the web; tesseract.js is web-only and
    fetches its models from a CDN). **Taken:** a server reader behind the `medicine_ocr` integration — Tesseract
    on our own server, no third party — **off by default**; the screen says honestly "Reading photos isn't
    switched on yet" (NOT_CONFIGURED) or "isn't available on the server" (UNAVAILABLE) and offers "Type what's
    printed on the strip", which runs the same matching. The photo is read in memory and never stored or
    logged; the screen says so. Turning it on (env `MEDICINE_OCR_ENABLED=true` and `tesseract-ocr` in the
    backend image) needs the AI-constitution owner and the DPO (D-M2-12 precedent): not done here.
11. **D-MI-11 Confirming a photo match.** Candidates show what matched (brand · composition · strength); none is
    pre-selected; the person taps the one printed on their strip or "None of these". **Taken.**
12. **D-MI-12 Buy.** OTC, sold and in stock → "Buy" opens the product page (the existing cart flow). Prescription
    schedule → "Needs a prescription" + "Send your prescription to a pharmacy" (`/prescriptions`, Expo: add a
    prescription) and, if we sell it, the product page, which itself only offers the prescription flow. Not sold
    → no buy control. Nothing about the person crosses to the shop. **Taken.**
13. **D-MI-13 Crisis.** On-device `evaluateCrisisGate` first (the text is not sent), server `crisis_gate` as a
    backstop on search; the existing `CrisisLinks` (112, Tele-MANAS) and a link to crisis support. Overdose words
    ("overdose", "how many … to die", "how much is too much") are in the shared phrase table. **Taken.**
14. **D-MI-14 Fixed copy.** The always-visible note and the under-12 / pregnancy line are the founder's words,
    verbatim **[CL copy]** (clinical lead to confirm). No other line on the screen interprets a medicine.
15. **D-MI-15 Legacy screen.** `src/screens/vault/MedicationInfoScreen.tsx` (unrouted, mock monograph, lucide
    icons) is not reused or routed. **Recommended:** delete it in its own PR.

## Tests

Backend `tests/test_medicine_info.py`: reviewed-only display (unreviewed and changed-after-review hidden);
unreviewed import hidden from the lookup and `/ai/medication-lookup`; import validation and audit; pharmacist
approves, super admin and other roles cannot; stale hash → 409; edit voids review; age-availability validation
refuses dose words; photo NOT_CONFIGURED / UNAVAILABLE / candidates (reader faked) and nothing stored; search typo
tolerance; crisis words → CRISIS with no results; Rx vs OTC buy state and alternatives; Rule L planes and the
append-only events grant; settings declared.
Frontend: view model (crisis gate before any request, OCR confirm flow, no-match, not configured, age bands from
settings, under-12 and pregnancy path, band never sent, Rx vs OTC buy links), the view and the review screen
(audit history, Approve only for pharmacists, import), axe on each.

## Not built (and why)

- On-device OCR (D-MI-10); identifying a loose pill; personal dosing; interaction checks against the person's
  own medicines (that would join clinical data to a commerce page; it belongs to the pharmacist / dispense flow).
- Pharmacist registration number on the account (D-MI-2 residual).
- Licensed dataset itself: no dataset is bundled; the import path is ready for one the founder licenses.
