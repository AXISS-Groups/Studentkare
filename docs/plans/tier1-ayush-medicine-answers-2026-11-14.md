# Medicine questions in Ayush (Tier 1): plan for approval

**Status:** plan only. No code is written until the named reviewer approves and answers the decisions below.
**Named reviewer:** Krishna Chintakayala (founder). Decisions D-AM-3 and D-AM-4 also need the clinical lead.
**Asked for:** 2026-11-14, as one of the RAG pipelines for Ayush ("what is this medicine for").
**Builds on:** `tier1-medicine-info-2026-10-22.md`, `tier1-mobile2-health-2026-10-21.md` (D-M2-1),
`tier1-ayush-container-2026-10-20.md`, `tier1-ayush-fix-2026-10-22.md`.
**Code read for this plan:** `backend/services/medicine_info.py`, `agent_ayush.py`, `vector_store.py`,
`help_pack.py`, `core/rule_l.py`, `backend/content/ayush_help/medicine-info.md`, `backend/tests/test_agent_ayush.py`.

## What happens today

A student who asks Ayush "what is Dolo 650 for?" gets either no answer or the general help article that says
Medicine info exists. Ayush refuses, before retrieval, "which medicine should I take" and any dose question.
Medicine info itself already holds pharmacist-reviewed uses, side effects, warnings and storage for each medicine.

## Rules already approved that this must not break

1. Medicine information is **reviewed only** and **never written by an AI** (medicine-info rule 1; D-M2-1).
2. **No dose**, anywhere. Under-12 and pregnancy go to a doctor or pharmacist.
3. The "take only as prescribed" note is always visible beside medicine information.
4. Medicine reference data sits on the **commerce plane**; Ayush's index sits on the platform plane (Rule L).
5. Ayush never prescribes, never names a medicine for a symptom, and answers only from approved sources.
6. Crisis words go to the crisis gate first.

A plain "index the monographs into Ayush's RAG and let the model rephrase" breaks rules 1, 3 and 4. It is not proposed.

## Options

| | What Ayush does | Keeps the rules? |
|---|---|---|
| **A. Hand-off (recommended)** | Recognises a published medicine's name in the question and replies with one fixed sentence and a link that opens that medicine in Medicine info. Quotes nothing. | Yes, all six. No medicine text enters Ayush's index and no model touches it. |
| **B. Quote, word for word** | As A, plus the reviewed "what it is for" lines exactly as the pharmacist approved them, with the pharmacist's name and review date, and the "take only as prescribed" note. Never rephrased, even when a model is configured. | Rules 1, 2, 5, 6 yes. Rule 3 only if the note is fixed into the answer. Rule 4 needs a read through the commerce session per answer, never a copy into the index. |
| C. Index and rephrase | Monographs become Ayush sources; a model may reword them. | No. Not proposed. |

Recommendation: build **A** now. It answers the student's real need (get me to the right page) with no new
clinical surface. Consider **B** after the clinical lead has seen A in use.

## Design of option A

- **Name match.** After the crisis gate and the scope guard, and before retrieval, the question is matched against
  published medicines using the same matcher Medicine info search uses (`medicine_info._matches`, text search, not
  the photo reader). Only a medicine that is published (reviewed fields exist) can match.
- **Answer.** Outcome `MEDICINE_HANDOFF`: "I can't tell you about medicines myself. Medicine info has the
  pharmacist-reviewed page for {brand}." plus up to three links when several medicines match. Copy in en, te, hi.
- **What Ayush reads.** The medicine's id and brand name only, through the commerce session. No uses, warnings or
  composition are read, stored, indexed or logged.
- **Unchanged refusals.** Dose, "which medicine should I take", interactions and pregnancy or child questions keep
  their current refusal, and the hand-off link may follow the refusal.
- **Nothing remembered.** The match is not written to Ayush history beyond the outcome name; the medicine a student
  asked about is not recorded against their account.
- **Switch.** A settings-registry key, off by default, so it can be turned off without a deploy.
- **Screens.** No new screen. The Ayush thread gains a link row; it needs a small brief addition and an icon from
  the manifest (the Medicine info icon already used on that screen).

## Tests that will be written

- A published medicine's name hands off; an unpublished or unknown name does not.
- Dose and "which medicine" questions are still refused, with and without a medicine name in them.
- A crisis phrase containing a medicine name goes to the crisis gate, never to the hand-off.
- The answer contains no word from the medicine's uses, side effects, warnings or composition.
- No model is called on this path, with a model configured.
- Nothing about the medicine is written to Ayush history or logs.
- The switch off restores today's behaviour exactly.

## Decisions needed

| # | Question | Recommended |
|---|---|---|
| D-AM-1 | Option A, B or neither? | A |
| D-AM-2 | May Ayush history record that a hand-off happened (outcome only, no medicine)? | Yes, outcome only |
| D-AM-3 | For prescription-only medicines, hand off like any other, or only say "ask your pharmacist"? (clinical lead) | Hand off; the page already carries the prescription note |
| D-AM-4 | If B is ever built: which fields may be quoted? (clinical lead) | "What it is for" only |
| D-AM-5 | Who switches it on in production? | Founder, after the clinical lead has tried it on the dev site |

## Out of scope

Lab catalogue answers (vendor-written text; separate decision), report explanations, diet or suggestion reports
(need a named clinical reviewer), and anything that reads a student's own records.
