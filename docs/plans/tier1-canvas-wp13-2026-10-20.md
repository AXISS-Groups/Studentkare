# WP-13 · Doctor clinical screens: Tier 1 canvas plans

**Approved by:** _(name, date)_

**Status:** proposed. Plans only; no screen code has been written for this package.
**Rule:** `CLAUDE.md`, `DESIGN.md` §5–6, `AGENTS.md` (guardrails 1, 3, 4, 5, 9, 11). Every screen
here shows a clinical value. Each needs a named design reviewer **and** a clinical lead's
sign-off before its branch opens. One screen = one ticket, one branch, one PR.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` (§5 Doctor, WP-13). Boards under
`design/screens/source/06-doctor/`, pictures under `design/screens/screenshots/06-doctor/`.

## Summary

| # | Screen | Route / files today | check-icons | Data today | Real API that exists | Blocking decision |
|---|---|---|---|---|---|---|
| 1 | ClinicalReview | `/clinician/critical-results` · `features/clinician/critical-results/*` | 5/22 | sample in dev, unconnected in prod | `GET /work/critical-results`, `POST /lab-orders/{id}/acknowledge-critical` (used by legacy `ClinicalReviewPanel`) | Retire the legacy panel and wire the canvas screen to the same calls |
| 2 | EncounterNote | `/clinician/encounter-note` · `features/clinician/encounter-note/EncounterNoteScreen.tsx` | 5/21 | unconnected | `/encounters` CRUD + `/finalize` (legacy `EncounterNotesPanel`) | Timeline source ("outside the consent window is absent") |
| 3 | Prescribe | `/clinician/prescribe` · `features/clinician/prescribe/*` | 5/24 | sample in dev | `POST /prescriptions`; `features/clinician/viewmodel/PrescribeViewModel.ts` | Allergy check is name-match only — ship as is, labelled? |
| 4 | ReportReviews | `/clinician/report-reviews` · `features/clinician/report-reviews/ReportReviewsScreen.tsx` | 5/21 · text glyphs | unconnected | `/work/report-reviews`, `…/{id}/review` (legacy `PreventiveReviewScreen`) | "Read by student" stage has no source |
| 5 | ClinicianLabOrder | `/clinician/lab-orders` · `lab-orders/ClinicianLabOrdersScreen.tsx` | 5/21 | sample in dev | `GET/POST /work/doctor-lab-orders` (used by unrouted `screens/clinician/DoctorLabOrderDispatchScreen.tsx`) | Indication required server-side? |
| 6 | ClinicianReferral | `/clinician/referrals` · `referrals/ClinicianReferralsScreen.tsx` | 5/21 | sample in dev | **none** | Referral model; "Commission taken" tile |
| 7 | ClinicianRenewals | `/clinician/renewals` · `renewals/ClinicianRenewalsScreen.tsx` | 5/21 | sample in dev | `GET /work/refills`, `POST /work/refills/{id}` | Adherence and reliever-use pattern source |
| 8 | ClinicianChronic | `/chronic` · `chronic/ClinicianChronicConsoleScreen.tsx` | 5/21 | **real** `/work/chronic` | `/work/chronic` | Copy still literal (rule 11) |
| 9 | ClinicianAyush | `/clinician/ayush` · `ayush/ClinicianAyushScreen.tsx` | 5/21 | sample in dev | **none** | AYUSH desk rules (refusal) owner |
| 10 | ClinicianAi | `/clinician/decision-support` · `decision-support/ClinicianDecisionSupportScreen.tsx` | 5/21 | sample in dev | **none** (M18 is a separate service, guardrail 5) | Whether this screen ships before M18 exists |
| 11 | ClinicianConsultRoom | `/clinician/consult-room` · `consult-room/ConsultRoomScreen.tsx` | 10/31 | unconnected | `/consultation/{id}/join-provider`, `/state`, `/media-token`; `/encounters`; `/prescriptions` | Shared-records panel source; "Certificate" action |

The clinician shell already matches the board (audit). The gaps are: per-screen icons, copy
held as string literals in each screen's config (AGENTS rule 11 — none of these screens calls
`useT`), and three screens (1, 2, 4) whose **production** sidebar target is still a legacy panel
while the canvas screen at `/clinician/*` is a preview.

## Applies to every screen in this package

**Prerequisites.** S9 console table (`feat/canvas-s9`) for screens 5–10 (they already use
`features/clinician/shared/ConsoleTableScreen.tsx`, which S9 promotes); S7 drawers
(`feat/canvas-s78`) for Prescribe's "Add a drug" and the consult room's confirm dialog. S3 adds
any missing clinician nav icons.

**Will change (all eleven).**
- Copy: move every config/sample string into `src/i18n/areas/clinician.ts` (en, te, hi) and
  read with `t()`. Today the `ConsoleTableConfig` objects hold English literals.
- Icons: add the brief's per-screen icons with `<Icon>` / `<Icon3d>` exact names;
  `→` → `arrow-right`, `←` → `arrow-left`, `✓` → `check` where the brief says so.
- Remove `sampleInDevelopment(...)` sample rows from production paths only where a real source
  is wired; where none exists, keep dev samples behind `demoDataEnabled()` and show the
  configured `unconnected` state in production (current behaviour, kept).
- States: data, loading, empty, error (`Ref …`), not connected; offline shows the last loaded
  list read-only with its time, and disables every write (acknowledge, sign, prescribe, renew).

**Will NOT change (all eleven).** Clinical logic and thresholds (critical = HH/LL;
`bySeverity` ordering; allergy `blockReason`); consent windows and what a clinician may read;
acknowledgement and release semantics; audit records written by the existing endpoints; Rule L
(no price, commission or commerce figure on a clinical row); M18 isolation. Any change is a
listed decision.

**Accessibility baseline.** Tables with caption and `scope`; severity carried by text
("CRITICAL", "LOW") as well as colour; clinical values in IBM Plex Mono with unit; out-of-range
is `attention`, critical is `danger` text + icon (never colour alone); drawers `aria-modal` with
focus trap; ≥ 44 px targets; reduced motion stops row-rise animation.

**Tests baseline.** View tests for every state; a test that no sample patient renders when
`demoDataEnabled()` is false; viewmodel tests that a failed write leaves the row unchanged
(fail closed); `check-icons --screen <Screen>`; implementation-map entry moved to `screens`.

---

## 1. ClinicalReview — critical results

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: "Ranked by severity, not arrival"; tabs Unacknowledged / All results
/ Never collected; table patient · analyte · value/ref · released · action; a critical banner
("CRITICAL · POTASSIUM 6.8 mmol/L … released 11 minutes ago · not yet acknowledged") with
"Acknowledge & escalate" and "Open note"; footnote on turnaround per clinician. Today: layout and
tabs largely match (copy 39%); escalation options in `criticalModel.ESCALATIONS` (call / route
to clinic / follow-up); data is `criticalSample()` in dev and unconnected in prod; the live
sidebar item opens legacy `ClinicalReviewPanel`, which calls the real API.

**Will change.** Wire `CriticalSource` to `GET /work/critical-results` and `acknowledge` to
`POST /lab-orders/{id}/acknowledge-critical`; point the sidebar at this screen and retire
`ClinicalReviewPanel` from the console (it stays reachable only until this ships). Icons, copy.

**Will NOT change.** `bySeverity`; the acknowledgement endpoint and its audit; the rule that the
row changes only after the server confirms.

**Safety-critical.** The critical banner never waits for other rows to load. An unacknowledged
critical cannot be dismissed client-side. "Chase" (never collected) and escalations other than
acknowledge have no endpoint: shown disabled with reason, not faked.

**Data.** Real (above). "Median turnaround" and "In care this week" tiles: no server aggregate →
"—".

**Open decisions.** Escalation choice: the endpoint records acknowledgement only; does the chosen
escalation need its own field/audit before this ships? Retire legacy panel in the same PR?

---

## 2. EncounterNote — SOAP note

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: "Encounter note · draft", patient, consult meta, "Unsigned", SOAP
sections, "Sign & prescribe", "Save draft", "Signing writes to the student's vault and to the
ledger"; right column "One timeline, not four tabs" (readings, prescriptions, lab orders,
notes; "anything outside the consent window is absent, not greyed"). Today: layout present,
unconnected source; production sidebar opens legacy `EncounterNotesPanel` (real `/encounters`,
finalize, tested in `EncounterNotesSign.test.tsx`).

**Will change.** Wire to `/encounters` (create/patch/finalize) with the legacy panel's tested
behaviour; board layout; timeline panel not connected until a consent-scoped clinician timeline
endpoint exists.

**Will NOT change.** Finalize semantics (signed notes immutable), field limits (2,000 chars),
audit.

**Safety-critical.** "Sign & prescribe" only enabled when all four sections are non-empty and
online. The timeline must come from a server projection already filtered by consent; the client
never filters.

**Data.** Note: real. Timeline: not connected (no clinician-side endpoint found).

**Open decisions.** Timeline endpoint scope (which record types, how far back). Does "Sign &
prescribe" open Prescribe with the encounter linked (needs a link field)?

---

## 3. Prescribe — new prescription

**Approved by:** _(design reviewer, clinical lead, pharmacist adviser — date)_

**Board vs today.** Board: drug table (drug, dose, frequency, duration, schedule, substitution
permitted); allergy block banner "Amoxicillin blocked — penicillin allergy on file … This is a
**name match only** — cross-reactivity has not been checked"; "Add a drug" drawer with search,
blocked drugs kept visible with reason. Today: page matches (copy 37%, rendered), drawer state
not confirmed; `blockReason` blocks on allergy match and on unreadable allergy record (fail
closed); sample data in dev.

**Will change.** Drawer per board; "NAME MATCH ONLY" chip; wire to the existing
`features/clinician/viewmodel/PrescribeViewModel.ts` / `POST /prescriptions` path; icons
(`alert-triangle-4` for the block banner per brief).

**Will NOT change.** `blockReason` (null allergies → nothing can be added); substitution
permission semantics ("marks what you allow; a pharmacist still signs off every swap").

**Safety-critical.** The "name match only" disclosure is mandatory and never hidden. Blocked
drugs cannot be added by any keyboard path. Dose/frequency are structured, not free text.

**Data.** Prescriptions: real. Drug list: `GET /catalog` / medicine master (real); allergy list:
from the student's record via the consult (verify the clinician read path before build).

**Open decisions.** Ship with name-match allergy checking (clearly labelled), or wait for
class-level cross-reactivity? Who owns that rule set?

---

## 4. ReportReviews — student-requested report reviews

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: tabs Awaiting me / Reviewed / Unread by student; rows with the
student's own question in quotes, SLA left ("4h left", "40m left"), status NEW/URGENT/REVIEWED;
a 4-stage tracker Requested → assigned → reviewed → read by student. Today: layout present
(copy 32%), unconnected; text glyph arrows; production sidebar opens `PreventiveReviewScreen`.

**Will change.** Wire to `GET /work/report-reviews` and `POST /work/report-reviews/{id}/review`;
`→` → `arrow-right`; retire the legacy panel from the console.

**Will NOT change.** Assignment (`/ops/report-reviews/{id}/assign`), review payload, audit.

**Safety-critical.** "A clinician reads, not a model" — no AI draft in the review box. URGENT
ordering by SLA, not arrival.

**Data.** Requested/assigned/reviewed: real. "Read by student": no read receipt exists → stage
shown as unknown, not "unread".

**Open decisions.** Add a student read receipt (student-side event) or drop the fourth stage?

---

## 5. ClinicianLabOrder — lab orders

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board table matches today's config; footnote: an order without a typed
indication is refused ("Full body panel — student asked … Not ordered"). Today: `labOrdersSample`
in dev; production unconnected; the map previously pointed at unrouted
`screens/clinician/DoctorLabOrderDispatchScreen.tsx`, which does call `/work/doctor-lab-orders`.
The file comment calls it "Tier 2" — the brief says Tier 1.

**Will change.** Source from `GET /work/doctor-lab-orders`; "Order test" form posts to
`POST /work/doctor-lab-orders` with indication required; delete the unrouted screen once its
behaviour is carried over; fix the tier comment.

**Will NOT change.** NABL-only lab list; preparation rules from the lab catalogue.

**Safety-critical.** Indication required **on the server** (verify; add a 422 if missing).
Urgent rows first.

**Data.** Real.

**Open decisions.** Is the "Not ordered" row (a refused request) stored at all, or only shown
at entry time?

---

## 6. ClinicianReferral — referrals

**Approved by:** _(design reviewer, clinical lead, legal — date)_

**Board vs today.** Board: tiles open / awaiting acceptance / seen within 14 days / **commission
taken**; rows reason · to · sent · state; "Student choice — any listed" row; note "We take
nothing on a referral". Today: sample in dev, unconnected in prod.

**Will change.** Copy and icons; stays not connected.

**Will NOT change.** No preferred-provider steering.

**Safety-critical.** The commission tile is a Rule L/claims statement: it may only show a value
computed from a ledger (guardrail 6). Without one it is "—", never "₹0".

**Data.** Not connected (no referral model).

**Open decisions.** Build a referral model now? Keep the commission tile at all on a clinical
screen?

---

## 7. ClinicianRenewals — refill decisions

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: tiles waiting / blocked pending a test / escalating use /
auto-renewed (= 0); rows medicine & history, asked, adherence ("7 of 8 doses recorded", "Used 11
times in 30 days"), decision (Renew 8 weeks / Review before renewing / Needs a repeat Hb first /
Auto-eligible, you confirm); note "Nothing renews itself". Today: sample in dev.

**Will change.** Source from `GET /work/refills`, decide via `POST /work/refills/{id}`; copy,
icons.

**Will NOT change.** Every renewal is a clinician decision; no auto-renew path.

**Safety-critical.** Adherence and reliever-use counts come from the student's dose log
(`/meds/*`); show them only if the server returns them, labelled "as recorded by the student".

**Data.** Requests and decision: real. Adherence/usage pattern: not in the refill payload (verify)
→ not connected column.

**Open decisions.** The reliever-use flag threshold (11 in 30 days) as a clinical setting?

---

## 8. ClinicianChronic — chronic tracker

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: programme & target, last review, next due, state (Overdue by 12 days /
On track / Ended by student); note "Nobody is chased after they opt out, and leaving is never
flagged to their campus". Today: **real** `/work/chronic` (copy 38%), literal copy.

**Will change.** Copy to i18n, icons, "Chase" action only if an endpoint exists (else hidden).

**Will NOT change.** Data source; opt-out semantics.

**Safety-critical.** Rows for students who left a programme show no chase action.

**Data.** Real.

**Open decisions.** None beyond the shared ones.

---

## 9. ClinicianAyush — AYUSH desk

**Approved by:** _(design reviewer, clinical lead, AYUSH adviser — date)_

**Board vs today.** Board: tiles open / co-managed / refused / **replacing a prescription** (= 0);
rows presenting & system, practitioner (BAMS/BHMS), co-managed with, state; the refused row
("Asked to stop inhaler and use Ayurveda only — Refused, explained"). Today: sample in dev.

**Will change.** Copy, icons; not connected.

**Safety-critical.** "Alongside allopathic care, never instead of it" — the refusal rule is
policy that needs an owner and, when built, a server check, not a UI label.

**Data.** Not connected (no AYUSH consultation model).

**Open decisions.** Ship the desk before a model exists?

---

## 10. ClinicianAi — decision support

**Approved by:** _(design reviewer, clinical lead, AI governance owner — date)_

**Board vs today.** Board: "Isolated from the vault and from commerce · suggests, never acts";
tiles suggestions / declined to answer / actions taken (= 0) / sourced 100%; rows suggestion ·
based on · confidence ("Cites 3 sources", "Deterministic rule", "Declined to guess") · what it
cannot do. Today: sample in dev.

**Will change.** Copy, icons; not connected.

**Will NOT change.** Guardrail 5: M18 runs as a separate service with its own Postgres role; this
screen may only call that service's API. Guardrail 3: every model call goes through the
constitution module.

**Safety-critical.** "Flag: potassium 6.8 is a critical value — Not a suggestion, a rule" must
come from the deterministic critical-result rule, never from a model. No "actions taken" control.

**Data.** Not connected (no M18 service in this repo).

**Open decisions.** Hide the route until M18 exists, or keep it as an honest not-connected page?

---

## 11. ClinicianConsultRoom — live consult

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: header "Consult · Rohan Varma, 19", "✓ Verified at check-in · 09:58 ·
photo matched", LIVE, "Encrypted · not recorded", End; shared records panel ("Shared by Rohan
for this consult only. Access ends when you end the call"); allergy line; SOAP notes; prescription
lines; actions Add medicine / Order test / Refer / Certificate; "End and send summary?" confirm
(summary + prescription to vault; shared access closes; follow-up chat 72 h). Today: layout
present (copy 35%), unconnected; `←` and `✓` text glyphs.

**Will change.** Join/leave via `/consultation/{id}/join-provider` and `/state` (LiveKit);
notes via `/encounters`; prescription via Prescribe (§3) inside the room; glyphs → `arrow-left`,
`check`; confirm dialog (S7).

**Will NOT change.** Media handling (`services/livekit_media.py`), consent windows, "not
recorded".

**Safety-critical.** "Verified at check-in" only when the check-in verification for this
appointment is recorded server-side (no such link exists today → badge hidden). Shared records
disappear from the DOM when the call ends. "Sign and send" disabled until the note is complete
and the allergy check has run.

**Data.** Call, notes, prescription: real. Shared-records panel, check-in badge, certificate,
follow-up chat window: not connected.

**Open decisions.** Medical certificate: in scope (legal wording, who may issue)? The 72-hour
follow-up window as a setting?
