# Tier 1 plan: Ayush works out of the box (no-source next steps, admin health card)

**Status:** built on the founder's request of 2026-10-22 ("Ayush AI is not working"), in PR `feat/ayush-fix`.
**Approved by:** _(Krishna Chintakayala to confirm in PR review, with date)_
**Boards touched:** WebAyush, AyushWidget, M2AskAyush (Ayush answer), AdminKnowledge.

## What changes on screen

1. **When nothing matches** (`NO_SOURCE`), every student Ayush surface says "I couldn't find this in
   StudentKare's help yet." with a line on where to go, and links: **Open Help** (`/support`, the help
   centre) and **Book a consult** (`/care`). On Expo only **Book a consult** (`Consults`): there is no
   Help screen in the app yet, so no link is drawn to one. Previously the phone had no next step and
   the web offered only "Message support".
2. **Super admin › Knowledge** gets an **Ayush health** card: sources published and indexed, help
   articles live, retrieval mode (keyword / semantic / degraded), answer mode (quotes / rephrased by
   the on-prem model), model server reachability, last answers by generator, last runtime error.
   Data from `GET /api/ops/agents/ayush/health`; tokens and existing Gov components only; icons
   already on the page (`alert-triangle`).

## What does not change

Crisis gate first; refusal of diagnosis, prescribing and doses; the vault boundary (Ayush never
reads records, D-M2-13 still waits for the AI-constitution owner); citations on every answer; the
crisis line on every Ayush surface. The server's answer text for `NO_SOURCE` changed wording only.

## Not built (needs its own review)

Edit / unpublish / restore buttons on AdminKnowledge (the API exists: `PATCH /api/ops/knowledge/{id}`,
`POST …/unpublish`, `POST …/restore`); a retrieval preview ("Test a question").
