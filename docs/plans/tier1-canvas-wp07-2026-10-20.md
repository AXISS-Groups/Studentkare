# WP-07 Phone: clinical values, records and Ayush (Tier 1): canvas plan awaiting review

**Approved by:** _(name, date)_

**Status:** plan only. No screen code is written until a named design reviewer **and** the clinical
lead sign this file (`DESIGN.md` §5); Ayush screens also need the AI-constitution owner. One screen
per ticket, branch and PR.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` lane 2 and lane 8 (AyushSheet), each
board's brief, screenshot and source, and the code named below. Where an earlier plan already
covers the behaviour, this plan adds only the canvas layer and points to it:
`tier1-care-flows-2026-10-19.md` §1 PrescriptionUpload, §2 Medications → order, §4 Teleconsult,
§5 ReportInsights; `tier1-wellness-screens-2026-10-20.md` §2 (VitalTrends heart-rate split).
**Depends on:** S4 phone frame on web, S6 state screens, S7 sheets, S11 Ayush sheet (container).
Web twins (WebVault, WebMyLabTests, WebReportInsights, WebAyush, WebConsultSummary) are in WP-09
and share view-models with these.

## Rules every screen in this package keeps

- **Clinical logic does not change.** Lab release (a doctor releases before the student sees
  anything, `lab_payload(for_patient=True)`), critical-result handling, prescription signing,
  refill authorisation, Ayush's retrieval, relevance floor, crisis interception and refusal
  reasons, consult media-token window. The canvas changes layout, copy, states and icons only.
- **Colours for values.** A result outside the lab's range is **amber** (`attention`), never red;
  red only for clinical alerts the server flags (critical, allergy) and SOS/112 (founder rule,
  2026-10-20). Values in `clinical-value` mono. No scores, percentiles, streaks or celebration on
  anything about the body (`DESIGN.md` §2.2).
- **Source of every number shown.** Device / typed / clinic, as the server records it ("Typed by
  you"). No number is drawn that the server did not return; board sample values never ship.
- **Rule L.** Nothing on these screens links a clinical value to the shop. Prescriptions reach a
  pharmacy through the dispense flow (`/dispenses`), never the shop cart.
- **Offline.** "Still works without internet: emergency card, check-in pass, crisis calls" is shown
  only for what is actually true on that platform (see WP-06 D6-2, D6-7).
- Crisis help reachable from every screen here. Icons via `src/design-system/icons`; text glyphs
  (✓ ★ 📱 🩸 🩺) replaced per `skTextGlyphIcons` (`check`, `star-filled`, `devices`, `droplet`,
  `stethoscope`).

## Summary

| Screen | Today | Board vs today (biggest gaps) | Data today | Not connected | Key decision |
|---|---|---|---|---|---|
| Teleconsult | drifted, 0/7 | full-screen call: live timer, encrypted chip, doctor strip, "shared for this consult" | `/consultation/{id}/*` (LiveKit) | — | care-flows §4 |
| Medications | drifted, 0/3 | Today doses, courses, first-time, offline states | `/meds/*` | offline cache | D7-1 offline |
| Devices | drifted, 0/1 | connected sources, latest readings, add by hand | `/health/readings` | device sync | D7-2 |
| RecordsVault | drifted, 0/2 | locked hero, count + access line, first-time, offline | `/health/documents`, `/records/shares` | ABHA pull | D7-3 |
| AyushChat | drifted, 0/4 | header with sources line, suggestions, cited answers, call | `/agents/ayush/*` | — | D7-4 |
| AyushSheet | partial, 0/5 | bottom sheet container with crisis card | same | — | D7-4, D7-5 |
| PrescriptionUpload | partial, 0/6 | own screen, camera/files, validity list | `/health/prescription-uploads*` | — | care-flows §1 |
| MyReports | missing | lab tests list with released reports | `/lab-orders` (own) | parameter counts | D7-6 |
| ReportInsights | missing | systems overview, clinician summary, counts | review note + document | structured results | D7-6 |
| RefillRequest | drifted, 0/1 | active medicines with status, what we won't do | `/refills*` | — | D7-7 |
| VitalTrends | missing (unrouted fake screen) | 4 vitals with source tags, 90 days | `/health/readings` | sparklines need a metric filter | D7-8 |
| ConsultSummary | drifted, 2/2 | plain summary, red flags, e-Rx, follow-up, rating | `/records/visit-summaries*` | type/price, follow-up, rating | D7-9 |

---

## Teleconsult

**Board vs today.** `features/teleconsult/views/TeleconsultNativeView.tsx`, web dialog
`components/health/consult/ConsultCallPanel.tsx` (LiveKit, devices only after Join). Board: full-bleed
video, "LIVE · 04:12", "ENCRYPTED", doctor name + "MD · NMC verified", self view, controls (`mic-2`,
`video-3`, `phone-2`, `message-circle-3`, `plus`), "Shared for this consult · access ends when the
consult ends", "End and see the visit note".

**Will change.** Full-screen phone frame, control bar with brief icons, shared-for-this-consult card,
end → ConsultSummary.

**Will NOT change.** Token window, no recording, 503 `MEDIA_UNAVAILABLE` state (care-flows §4).

**Safety.** "Encrypted" only if transport is (LiveKit TLS/SRTP: reviewer to confirm wording, no
"end-to-end" claim). "NMC verified" only from the doctor's registration on record. Crisis link in
the overflow. End button is not red (founder rule; it is not SOS).

**Tests.** Every call state from care-flows §4; no camera prompt before Join; chip text from props.

## Medications

**Board vs today.** `screens/workspace/MedicationPanel.tsx` (web), `native/MedicineRemindersScreen.tsx`.
Board states Data / First time / Offline: Today ("2 doses left") with tick-to-record, courses running,
"Nothing here is scored, and no one is told if you miss one", empty state with upload + add, offline
banner and "still works without internet", video asset `video-379108.mp4`, `pill-alt--p3`.

**Will change.** Three states laid out as the board; dose rows with `check`; empty state with the two
next steps; asset copied from `design/assets/`.

**Will NOT change.** `/meds/today`, `/meds/log-dose`, `/meds/plans`, dose-deletion semantics; no
adherence score or streak; nobody notified of a missed dose.

**Data / decision.** Offline "showing what was saved at 4:12 pm" needs a read cache of the schedule on
the device (PHI in client storage, `AGENTS.md` 9) — D7-1. Without it, offline shows the banner and the
crisis/emergency line only.

**Tests.** Tick posts once and reverts on failure; empty state; no score text anywhere.

## Devices

**Board vs today.** `screens/workspace/DevicesAndSensorsScreen.tsx`: capability tabs (camera snapshot to
records, pedometer, voice, pulse "not available"). Board: "We no longer take readings with your phone
camera", connected sources (Health Connect steps and sleep only, BP cuff, glucometer over Bluetooth),
latest readings, "Add by hand" sheet with "Saved as 'Typed by you'" and "get help" link.

**Will change.** Replace the tab set with the board's sources list and readings list; add-reading sheet
posting to `/health/readings`; icons `chevron-left`, `devices`, `droplet`, `stethoscope`.

**Will NOT change.** No camera-derived vital (pulse stays "not available").

**Data / decision.** No Health Connect or Bluetooth sync backend: sources show "Not connected" (D7-2).
Readings: `GET/POST /health/readings`. Typed bounds from the settings registry.

**Tests.** No numeric reading without a `source`; out-of-bounds value refused with server message.

## RecordsVault

**Board vs today.** `/records` → `screens/vault/VaultWorkspaceHub.tsx` (tabs incl. family and access),
native `HealthVaultNativeView.tsx`. Board: "LOCKED · yours and only yours", record count, "1 person has
access right now", revoke note, also-here Consent and My lab tests, states Data / First time / Offline,
`vault-alt--p4`.

**Will change.** Hero with count and live access count from `/records/shares`, document list, first-time
empty state (upload; "Pull records from ABHA" only if D7-3), offline state.

**Will NOT change.** Document storage, share creation/revoke, export.

**Tests.** Access count equals active shares; revoke reflects immediately; empty state.

## AyushChat · AyushSheet (the Ayush container on phone)

**Board vs today.** Chat: `features/chat/views/AyushChatNativeView.tsx`, web panel `AgentAyushPanel.tsx`
(cited answers from `/agents/ayush/ask`, history, plain refusal reasons). Sheet board (design-system
page): bottom sheet "Ask Ayush", status "● Answers only from approved sources", messages with `✓` source
chips, an in-thread crisis card ("You don't have to handle this alone", Tele-MANAS 14416 Call, campus
counsellor Open, "In immediate danger, call 112"), suggestions, "Ayush can't diagnose or prescribe",
"Open full chat · emergency: 112", icons `arrow-right`, `chevron-down`, `chevron-up`, `sparkles`, `x`.

**Will change (container only).**
- *Launcher / entry:* opens the sheet from Discover / Your Care; full chat route unchanged.
- *Frame:* bottom sheet (S7), drag handle, collapse (`chevron-down`) / expand (`chevron-up`), close (`x`),
  `aria-modal`, focus trap, Escape and back gesture close.
- *Header:* name, "answers only from approved sources" line, `sparkles` mark.
- *Disclaimer and crisis line:* fixed footer "Ayush can't diagnose or prescribe · emergency: 112", always
  visible, never scrolled away, tappable 112.
- *Input:* labelled text field, send with `arrow-right`, disabled while sending, length limit from the
  server model.
- *Loading / typing:* skeleton for history, a polite "Ayush is answering" status (no fake typing delay).
- *Error:* calm copy, retry, reference code; crisis line still visible.
- *Offline:* input disabled with "Ayush needs a connection"; crisis numbers still work.
- *Crisis card:* rendered when the server marks the turn as a crisis outcome, never from client keyword
  matching.

**Will NOT change.** Ayush's answers, sources and relevance floor, the server's crisis interception and
routing, refusal reasons, what Ayush can read (it does not read records), transcript storage and erasure.

**Safety.** 112 red; Tele-MANAS secondary; the crisis card cannot be dismissed while it is the latest
turn (D7-5). Transcript is clinical data: never on a shop surface.

**Tests.** Crisis outcome → crisis card; disclaimer present in every state; offline disables input but not
the call links; focus returns to the launcher on close; `check-icons --screen AyushSheet` / `AyushChat`.

## PrescriptionUpload

Behaviour per care-flows §1 (send to a pharmacy, never the cart; scanner fails closed). Canvas layer: own
screen, Camera / Files, "JPG, PNG or PDF · up to 10 MB" from the server limit, "What makes it valid" list,
"goes to your vault, not to the shop" line, icons `camera`, `file-text`, `lock-5`, `share`, `check`.
**Decision:** the brief links "Checkout"; it becomes "Send to a pharmacy" (already decided in care-flows).

## MyReports · ReportInsights

**Board vs today.** Both missing; reports sit in `/records`. MyReports board: upcoming collection with
Track, released reports (test, release date, reviewing doctor, "69 parameters · 9 outside range"), View
report, Book again. ReportInsights board: "5 / 13 systems to discuss", reviewed by, clinician summary,
out / within / none counts, body-system list with counts, "Go over it with a clinician · from ₹199 · price
before the slot", "No score, no percentile", "Ask Ayush about this report".

**Will change.** MyReports from `GET /lab-orders` (own): upcoming collection, released reports with the
reviewing doctor and the review note, View report (document), Book again (lab booking flow). ReportInsights
phase 1 per care-flows §5: the clinician's note, the report document, "talk to a doctor" link with price
shown before the slot.

**Will NOT change.** Nothing before release; critical handling; Ayush does not read the report.

**Data / decision.** Parameter counts, body systems and out-of-range counts need **structured results with
reference ranges** that the backend does not store (only a document + note). D7-6: build a structured
results model (lab-entered, with the lab's ranges) or ship document + note only. "Ask Ayush about this
report" is not drawn until a report-scoped Ayush exists (WP-09 D9-4).

**Tests.** Unreleased orders show status only; no value or flag before release; out-of-range uses
`attention`.

## RefillRequest

**Board vs today.** `features/requests/views/RequestsViews.tsx` (refill form on `/refills*`). Board: active
medicines with status chips (refill soon / in date / ended), per-medicine request, "What happens after you
ask", "What we will not do", "usually answered within a working day".

**Will change.** List layout and chips from `/refills/plans`, request sheet, the two explainer blocks.

**Will NOT change.** Server rules (one open refill per medicine, pharmacy from the list, active plan only).

**Decision D7-7.** The board says **the prescribing clinician** decides; the API routes a refill to a
**pharmacy** (`/refills/pharmacies`, `/work/refills`). Copy must describe what actually happens, or the
routing changes (clinical decision). "Refill a controlled medicine" exclusion must be enforced server-side
before the copy claims it.

## VitalTrends

**Board vs today.** `screens/health/VitalTrendsTelemetryScreen.tsx` is unrouted and **hard-codes fake
vitals and a fake sync** ("72 bpm", "Sync Wearables Now"); it must not be routed and should be deleted in
the build PR. Board: last 90 days, resting heart rate, SpO₂, blood pressure, sleep, each with MEASURED /
MANUAL / ESTIMATE tags, "3 readings only — too few for a trend", "A trend is not a diagnosis", "Share these
with a clinician", sparkline illustrations.

**Will change.** New screen from `GET /health/readings` (own, raw, with source), per-vital card with source
tag, "too few for a trend" below a settings-registry minimum, share via existing clinician share.

**Will NOT change.** No interpretation, no "down 4 bpm" style comparison unless the clinical lead approves
the wording (D7-8); nothing sent to a clinician unless shared.

**Data.** Wellness plan §2 asks for a `metric` filter on readings before this is built. Sparklines are
data-driven components, not the static illustrations, unless the reviewer wants decorative ones.

## ConsultSummary

**Board vs today.** `features/vault/views/VisitSummaryView.tsx` (signing doctor, registration, times, four
note parts, prescriptions; deliberately no type, price, plain rewrite, follow-up or rating). Board adds
consult type/length/price, "saved to your vault · his access has ended", plain "what the doctor said",
red-flag "see a doctor in person if…", e-prescription with "Digitally signed · NMC", Rx/OTC tags, allergy
check line, "Order these · to Block B tonight", PDF + QR, follow-up booking, star rating.

**Will change.** Layout; note sections; red-flag block styled `attention` with an icon (not red unless the
clinician marks it urgent); e-Rx list from prescriptions; PDF link if the server issues one; `check`,
`chevron-left`, `star-filled` icons.

**Will NOT change.** The note text is the doctor's, verbatim; no AI rewrite unless phase-2 approved.

**Safety / Rule L.** "Order these" goes to the dispense flow (choose a pharmacy, price first), never the
cart (care-flows §2). "Allergy checked" only if the server ran the check. Rating, if built, is commerce
plane and never attached to clinical data.

**Decision D7-9.** Which of type/price, access-ended line, follow-up booking and rating to build backends for.

---

## Decisions for the reviewer

- **D7-1 Offline medicines/records cache** on the device (PHI in client storage): allow, encrypted, or no
  offline data view.
- **D7-2 Device sync:** show Health Connect / BP cuff / glucometer as "Not connected" now, or hide until
  built.
- **D7-3 "Pull records from ABHA":** only after ABDM HIP/HIU integration; hide until then?
- **D7-4 Ayush container:** approve the sheet container scope above (launcher, frame, header,
  disclaimer/crisis footer, input, loading, error, offline), with no change to answers or routing.
- **D7-5 Crisis card persistence:** can the student dismiss it, or does it stay while it is the latest turn?
- **D7-6 Structured lab results:** build a results model with the lab's reference ranges (enables counts,
  systems and amber flags), or ship report document + doctor's note only.
- **D7-7 Refill routing:** prescribing clinician (board) vs pharmacy (today). Clinical call.
- **D7-8 VitalTrends wording:** may the screen state direction ("down 4 bpm since August")?
- **D7-9 ConsultSummary extras:** type/price line, follow-up booking, rating: build or omit.


## Approval (2026-10-21)

Krishna Chintakayala (founder, named Tier 1 reviewer) approved this plan on 2026-10-21 ("approve all"). Where it overlaps `tier1-mobile2-health-2026-10-21.md`, that plan wins. Anything this plan routes to the clinical lead, legal or the AI-constitution owner stays unavailable until they sign.
