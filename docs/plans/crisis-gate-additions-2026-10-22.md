# Crisis gate: proposed phrase additions (audit H4), for clinical review

Status: **PROPOSED. Not implemented.** Waiting for the clinical lead's sign-off.
Nothing in `backend/services/crisis_gate.py` or `src/ai/core/crisisGate.ts` has
changed. The two lists must stay in sync (`# SYNC:` comments), so each change
below goes into both files in the same PR, with tests in `tests/test_crisis_gate.py`
and the client crisis-gate tests.

Source: security audit 2026-10-22, finding H4 (`services/crisis_gate.py:28-78`).

## 1. Matching gaps in existing patterns

| Current pattern | Misses | Proposed pattern |
|---|---|---|
| `can(not\|'t)\s+breathe` (CRISIS_MEDICAL) | "cant breathe", "can not breathe", "can’t breathe" (curly apostrophe) | `can(?:not\|\s+not\|['’]?t)\s+breathe` |
| `मरना\s+चाहता` (HI, self-harm) | the female form "मरना चाहती" | `मरना\s+चाहत[ाी]` |

## 2. Proposed new self-harm phrases (CRISIS_SELF_HARM)

English:
- `hang\s+my\s*self`
- `jump\s+off\s+(the\s+|a\s+)?(building\|bridge\|roof\|terrace)`
- `don['’]?t\s+want\s+to\s+(live\|be\s+alive)`
- `no\s+reason\s+to\s+live`
- `better\s+off\s+(dead\|without\s+me)` (clinician to confirm)

Hindi / Hinglish (clinician and a native reviewer to confirm wording):
- `जीना\s+नहीं\s+चाहत[ाी]` (don't want to live)
- `fansi\s+laga` / `फाँसी\s+लगा` (hanging)
- `jeena\s+nahi\s+chahta` / `jeena\s+nahi\s+chahti`

Telugu / Tenglish (native reviewer to confirm):
- `బతకాలని\s+లేదు` (don't want to live)
- `uri\s+vesukuntanu` (hanging, Tenglish)

## 3. Overdose phrases (CRISIS_OVERDOSE)

Today overdose matches only the brand "crocin". Proposed:
- `how\s+many\s+(tablets\|pills\|dolo\|paracetamol\|crocin\|sleeping\s+pills)\s+(to\|will\|would)\s+(die\|kill)`
- `how\s+many\s+(tablets\|pills)\s+(can\s+)?kill`
- `(take\|took\|swallow(ed)?)\s+(all\|whole\s+strip\|whole\s+bottle)\s+(of\s+)?(my\s+)?(pills\|tablets\|medicines?)`
- `sleeping\s+pills\s+to\s+(die\|sleep\s+forever)`
- Hindi: `कितनी\s+गोलियाँ\s+.*\s+मर` (how many tablets … die), `ज़हर\s+खा` (eat poison)
- Telugu: `ఎన్ని\s+మాత్రలు\s+.*\s+చనిపో` (how many tablets … die), `విషం\s+తాగ` (drink poison)

## 4. A false positive to remove or narrow

- `ji\s+sakta` fires on harmless text ("main ji sakta hoon", "ji sakta hai").
  Proposal: replace with `nahi\s+ji\s+sakta` / `(?:ab|aur)\s+nahi\s+ji\s+sakta` (cannot live any more).

## 5. A wrong label (not a phrase change, still for the clinical lead)

`DEFAULT_CAMPUS_COUNSELLOR = "1800-599-0019"` is the national KIRAN mental-health
helpline, but the card says "Campus Counsellor" (`crisis_gate.py:28,113`).
Proposal: label it "KIRAN mental health helpline", and show a campus counsellor
card only when the student's campus has one on record.

## What the reviewer is asked to decide

1. Approve, change or reject each pattern above (and its language tag).
2. Confirm the Hindi and Telugu wording with native speakers.
3. Approve the KIRAN relabel.

After sign-off, the change is one PR that updates both pattern lists together,
adds a positive test per new phrase and a negative test for the narrowed `ji sakta`.
