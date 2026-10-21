# WP-09 Student web, signed in (Tier 1): canvas plan awaiting review

**Approved by:** _(name, date)_

**Status:** plan only. No screen code is written until a named design reviewer **and** the clinical
lead (vault, lab tests, report screens, Ayush, visit summary, emergency card, pass) or legal (legal,
leave campus, delete account) sign this file (`DESIGN.md` §5). One screen per ticket, branch and PR.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` lane 3b and lane 8 (AyushWidget), each board's
brief, screenshot and `design/screens/source/04-student-web-signed-in/<Screen>.html`, and the code below.
**Depends on (hard):** **S1 student web shell** — top nav (Shop · Lab tests · Doctors · Health vault ·
Ayush, My orders, cart, avatar) and the light grouped sidebar (My care / Services / Account). About 24
of each board's icons (`bar-chart`, `bell`, `calendar-x`, `credit-card`, `log-out`, …) belong to the
shell; they are delivered by S1 and checked with `check-icons --files` including the shell files. S7
dialogs. WebLegal and WebAyush use their own frames (no sidebar).

**Phone twins.** Most screens here share a view-model with a WP-06 / WP-07 screen. Behaviour, data and
decisions are decided once there; this plan covers the web layout and points to the twin's decision.

## Rules every screen in this package keeps

Same as WP-06 and WP-07: clinical logic, consent semantics, data access and crisis routing unchanged;
red only for SOS / 112 and clinical alerts (founder, 2026-10-20), outside-range values amber; no
invented numbers (every board shows a sample student, "VNR VJIET", sample doctors and values — none of
it ships); Rule L (no clinical value on the shop, cart or offers; the top nav's Shop and cart links are
navigation only); copy from `src/i18n`; crisis help reachable from every screen; works at 1440 px and
reflows to 390 px without horizontal scroll.

## Summary

| Screen | Today | Board vs today (biggest gaps) | Data today | Not connected | Twin / key decision |
|---|---|---|---|---|---|
| WebVault | drifted, 1/37 | stat tiles, type filter chips, document table with source and shared, first-time, offline | `/health/documents`, `/records/shares` | ABDM link line | RecordsVault · D9-1 |
| WebMyLabTests | partial (prescriptions list), 1/44 | released / awaiting / outside tabs, report cards, app promo, trust strip | `/lab-orders` | parameter counts | MyReports · D7-6 |
| WebReportInsights | missing | clinician summary, body-system table with counts, history | review note + doc | structured results | ReportInsights · D7-6 |
| WebReportAssistant | missing | report-scoped Ayush with values | none | report-scoped Ayush | D9-4 |
| WebAyush | drifted, 0/6 | own frame, sources line, index status, "what Ayush will not do", transcript card | `/agents/ayush/*` | index status for students | AyushChat · D9-5 |
| AyushWidget | partial (full page only), 0/5 | floating launcher + 420×680 panel | `/agents/ayush/ask` | — | D9-6 |
| WebConsultSummary | drifted, 1/25 | same as ConsultSummary, two-column | `/records/visit-summaries*` | extras | ConsultSummary · D7-9 |
| WebEmergencyCard | drifted, 1/27 | editor + live preview card with QR, readiness %, who-can-see | `/profile` | QR card, 3 contacts, print | EmergencyCard · D6-2, D6-6, D9-7 |
| WebPass | drifted, 1/26 | pass + "laptop works at reception" note, scanned/photo/visit-only explainer | `/identity` | history, report | MyPass · D6-7, D6-8 |
| WebRequests | drifted, 1/25 | list with status + new-request dialog | `/my-requests`, `/support` | — | D9-8 |
| WebLegal | drifted, 0/1 | full notice, tabs | none (states the gap) | legal text | Legal · D6-10 |
| WebLeaveCampus | drifted, 1/25 | reason, destination, personal email, stays/changes lists, undo | `/campus/departure*` | — | D9-9 |
| WebDeleteAccount | drifted, 1/25 | as DeleteAccount, web layout | `/records/deletion-request` | export format, code step | DeleteAccount · D6-9 |

---

## WebVault

**Board vs today.** `/records` → `screens/vault/VaultWorkspaceHub.tsx` + `MemberPanels.tsx` in the navy
workspace shell. Board: "11 documents · Linked to ABDM · Portable after you graduate", Export all, Add a
document, four stat tiles (documents, lab reports, shared right now, last added), filter chips by type,
table (document, type, source, date, shared) with a row menu (share, revoke), share note, states Data /
First time ("Get verified first") / Offline.

**Will change.** Page layout inside S1, tiles and chips computed from the server list, table (S9 pattern),
row menu with share/revoke dialogs, first-time and offline states, brief icons.

**Will NOT change.** Upload, share creation (scope + expiry), revoke, export endpoint.

**Data / decision.** "Linked to ABDM" only when an ABHA link exists server-side (D9-1); "Portable after you
graduate" is true (records stay on departure). Export is JSON today (see D6-9).

**Accessibility.** Table with header cells and row-menu buttons labelled with the document name; filter chips
`aria-pressed`. **Tests.** Tile numbers equal list counts; revoke failure keeps the row shared.

## WebMyLabTests · WebReportInsights

**Board vs today.** `/prescriptions` (`MyPrescriptionsPanel.tsx`) lists prescriptions and tests; no lab-tests
page, no insights page. Boards: tabs Released / Awaiting collection / Outside reports, report cards ("reviewed
by Dr … before release", test, for, sample, View report, Book again, Explain it, parameter counts), app promo,
trust strip; insights page with clinician summary, "An AI draft may help the clinician write this. Nothing is
released until they sign it", body-system table with out / within / not-tested groups, "Add a test" links,
history.

**Will change.** WebMyLabTests from `GET /lab-orders` (own, released only shows report + note); WebReportInsights
phase 1 = clinician note + document + "talk to a doctor" (care-flows §5).

**Will NOT change.** Release rule, critical handling. "Add a test" / "Book again" go to lab booking with price
before booking; never from a value ("you're low, buy X") — Rule L.

**Decisions.** Counts and the body-system table need structured results (D7-6). "Outside reports" tab = student
uploads in the vault (reviewer to confirm). "An AI draft may help the clinician" line only if clinicians actually
get an AI draft (they do not today) — omit otherwise. App-store badges only when the app is published (D9-2).

**Tests.** Unreleased order shows no values; out-of-range rows `attention`; no link from a result to the shop.

## WebReportAssistant

**Board vs today.** Missing. Board: insights page with an Ayush panel "scoped to Complete health panel · 22 Sep"
that quotes the student's values (36 mg/dL vs lab range 40) and the doctor's note.

**Plan.** Do not build (D9-4). Ayush today cannot read records (`/agents/ayush/ask` takes a question only, and
the AyushWidget board itself says "I don't read your records"). A report-scoped assistant needs: a new API that
passes only the released report and note, routed through the AI constitution, a clinical review of its answers,
and consent copy. Until then the "Explain it" buttons are not drawn.

## WebAyush

**Board vs today.** `/ayush` → `AgentAyushPanel.tsx` inside the workspace shell. Board: own frame with top nav,
"Answers only from sources your care team approved, and cites every one", "Index current" chip, citation cards
("Approved source · relevance n", Open), suggestions, input, "What Ayush will not do" list, "Your transcript …
only you can read it, you can erase it" with Manage my data, call card (`phone-2`).

**Will change.** Layout and copy; container states as in WP-07 (header, disclaimer + crisis footer, input,
loading, error, offline); Manage my data → account erasure / transcript settings.

**Will NOT change.** Answers, citations, relevance floor, crisis interception, refusals, transcript storage.

**Decision D9-5.** "Index current" reads `/ops/knowledge/index-status`, which is ops-only. Show it to students
(needs a student-safe field) or drop the chip. Relevance score on citations: show to students or not.

**Tests.** As AyushChat (WP-07); citations only from the response.

## AyushWidget

**Board vs today.** Only the full page exists. Board (420×680): launcher orbs (`ayush-orb`, `-2`, `-3`), panel
header "Ayush · BETA · New", intro "I help you find care… I don't diagnose, prescribe or read your records",
emergency line "Call 112 · Tele-MANAS 14416 · free, any time", input with `arrow-up`, close `x`.

**Will change (container only, same scope as WP-07 AyushSheet).** Floating launcher (bottom-right, 44 px+,
labelled "Open Ayush"), panel as a non-modal dialog or modal on narrow widths (D9-6), header, intro, fixed
emergency line, input, loading / error / offline, close returning focus to the launcher; orb animation stops
under reduced motion.

**Will NOT change.** Ayush behaviour, crisis routing, data access.

**Safety.** The widget never covers the crisis/SOS controls of the page it floats over; it is not shown on
`/crisis`, `/sos`, the emergency card or checkout (D9-6). "BETA" is a product label, not a compliance claim.

**Tests.** Launcher keyboard-reachable; Escape closes; emergency line present in every state; not mounted on the
excluded routes.

## WebConsultSummary

Web layout of ConsultSummary (WP-07): two columns (note + e-Rx | follow-up + rating), same data and decisions
(D7-9). "Order these" → dispense flow, never cart.

## WebEmergencyCard

**Board vs today.** `features/emergency/views/WebEmergencyCard.tsx` (profile-backed editor, honest). Board:
editor (blood group with warning, allergies chips + "No known allergies", long-term conditions, medicines, up to
3 contacts) beside a **live preview card** with QR, "Works offline on your phone · QR shows only this card",
"Card is n% ready" checklist, "Who can see this card" (anyone who scans the QR; campus via audited break-glass,
you are notified), unsaved-changes bar, Print / save PDF.

**Will change.** Two-column layout, preview card from the draft, readiness checklist computed from filled
fields, unsaved bar with Discard / Save, icons.

**Will NOT change.** Profile fields and validation; allergies red; blood group "not set" default.

**Decisions.** QR that opens the card for anyone who scans it (D9-7): a public, unauthenticated card URL is a
privacy decision — not built without it; until then no QR and no "anyone who scans" line. Up to 3 contacts →
D6-6. Offline line → D6-2. Break-glass notification line only if the student is actually notified (check
`CampusBreakGlass` flow) — legal to confirm. Print: browser print of the card is fine (no server needed).

## WebPass

Web layout of MyPass (WP-06) with the board's note "Showing it from a laptop works at reception desks; at a
pharmacy counter use the phone" and the three-step explainer (scanned · photo matched, deleted after 24 h ·
visit only). "Photo deleted after 24 h" must match the scanner's actual retention (verify in WP-15) before it
ships. History and report: D6-8.

## WebRequests

**Board vs today.** `features/requests/views/RequestsViews.tsx` (`/my-requests`). Board: list of everything
asked with status, New request dialog (topic, what happened, "A person replies within 4 working hours. Don't
include passwords or card numbers").

**Will change.** List + dialog (S7), brief icons. **Will NOT change.** Request types and endpoints.

**Decision D9-8.** "Replies within 4 working hours" is a service promise; it needs a settings value and an owner,
or the line is dropped. Safety: a request that mentions self-harm is not triaged by this form; the dialog shows
the crisis line.

## WebLegal

Web layout of Legal (WP-06): own frame (logo + Help centre), tabs, sections. Text only from legal (D6-10).

## WebLeaveCampus

**Board vs today.** `features/campus/views/LeaveCampusView.tsx` (`/campus/departure`; lists only changes the
backend makes). Board: what's happening, where to, personal email (required), stays yours / changes lists,
"Changes take effect …", done state with undo, good-to-know list.

**Will change.** Layout and lists, icons replacing → and ✓, done + undo (`/campus/departure/cancel`).

**Will NOT change.** Departure rules, effective date from the server, records untouched.

**Decision D9-9.** Every "stays / changes" line must match what `campus_departure.py` does (e.g. "Care Circle and
medicine reminders" — Care Circle does not exist; "Edu ID prices end" — confirm pricing behaviour). Unverified
lines are dropped.

## WebDeleteAccount

Web layout of DeleteAccount (WP-06), same view-model; decisions D6-1 and D6-9.

---

## Decisions for the reviewer

- **D9-1 ABDM line** in the vault header: show only with a real ABHA link; confirm wording.
- **D9-2 App promo** on WebMyLabTests: only after the app is in the stores.
- **D9-3 Shell first.** Confirm no WP-09 screen starts before S1 merges (otherwise each screen rebuilds the frame).
- **D9-4 WebReportAssistant:** defer until a report-scoped Ayush API is designed, constitution-routed and
  clinically reviewed. "Explain it" buttons hidden until then.
- **D9-5 WebAyush index chip and relevance scores** visible to students or not.
- **D9-6 AyushWidget:** modal vs non-modal panel; routes where the widget is never shown (proposed: crisis, SOS,
  emergency card, checkout, sign-in).
- **D9-7 Public emergency-card QR:** allow an unauthenticated card URL, or no QR.
- **D9-8 Support reply-time promise:** keep (with a settings value and owner) or drop.
- **D9-9 Leave-campus lines:** only those the backend enforces.
- Plus the phone-twin decisions this package inherits: D6-1, D6-2, D6-6, D6-7, D6-8, D6-9, D6-10, D7-6, D7-9.
