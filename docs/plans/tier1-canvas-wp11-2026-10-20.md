# WP-11 · Campus safety and named-student access: Tier 1 canvas plans

**Approved by:** Krishna Chintakayala (founder, named Tier 1 reviewer), 2026-10-21 ("Approve all")

**Status:** approved 2026-10-21, built in feat/t1-wp11.
**Rule:** `CLAUDE.md`, `DESIGN.md` §5–6, `AGENTS.md`. Every screen here is Tier 1. Each needs a named
design reviewer **and** clinical/legal sign-off before its branch is opened. One screen = one
ticket, one branch, one PR. Write the approver and date on the package line above and on each
screen's line below; a screen without both is not started.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` (§4 Campus, WP-11). Boards under
`design/screens/source/05-campus-hostel-admin/`, pictures under
`design/screens/screenshots/05-campus-hostel-admin/`.

## Summary

| # | Screen | Route / files today | Status | check-icons today | Backend today | Blocking decision |
|---|---|---|---|---|---|---|
| 1 | CampusInsights | `/campus` → Health insights tab · `screens/institution/CampusHealthInsightsScreen.tsx` | drifted | 0/34 · lucide | **none** for cohort aggregates | Suppression floor (board says 20; AdminConsentPolicy says k = 5) |
| 2 | CampusAccessRequests | `/campus-access-requests` · `screens/institution/CampusAccessRequests.tsx` | drifted | 0/34 · lucide | **none** (form fails closed by design) | Build the consent-request backend first, or ship the board as "not connected" |
| 3 | CampusBreakGlass | `/campus-break-glass` · `screens/institution/CampusBreakGlass.tsx` | drifted | 0/37 · lucide | table `break_glass_sessions` only, **no route** | Single-actor 15-min emergency card (this board) vs dual-custody 4 h (SuperAdminConsole board) |
| 4 | CampusIncidents | `/campus` → Incidents tab · `CampusIncidentsDeskScreen.tsx` (wraps `MeoDashboardScreen` + `MedicalIncidentScreen`) | drifted | 0/36 · lucide | `/ops/sos` list/ack/resolve; **no incident model** | Is an incident an SOS alert, or a new record? |
| 5 | CampusCounsellor | `/counsellor` · `CounsellorQueueScreen.tsx` | drifted | 7/34 · lucide | `GET /ops/crisis-events`, `POST …/{id}/acknowledge` (real) | Outreach log, escalate and close need endpoints; 15-min threshold has no setting |
| 6 | CampusIsolation | `/campus` → Isolation tab · `OutbreakIsolationDeskScreen.tsx` | drifted | 0/27 · lucide | **none** | Who may see bay ↔ student (board: health officer only) |
| 7 | CampusAmbulance | `/campus` → Ambulance tab · `AmbulanceDispatchTrackerScreen.tsx` | drifted | 0/27 | **none** (no vehicle/GPS feed) | Manual dispatch log vs live feed; whether destination + reason may be shown |
| 8 | CampusSla | — | missing | — (brief: 26 + logo) | **none** (no timers model) | Which timers exist, their targets, who they escalate to |
| 9 | CampusDischarge | — (`MedicalLeaveApprovalsScreen` is leave, not this) | missing | — (brief: 26 + logo) | **none** | Clinician-only certification; no admin override (board) |

Seven of nine screens have no backend that can supply the board's data. The plans below build
the **frame, copy, states and icons** honestly ("not connected" where there is no source) and
list the backend each screen needs as a separate, Tier-1-reviewed backend ticket. **No screen
will show the board's sample people, numbers or times.**

## Applies to every screen in this package

**Prerequisites.** S2 campus console shell (`feat/canvas-s2`: grouped sidebar Campus / Safety /
Public health / Admin, scope picker, search, 2FA chip), S7 sheets and confirm dialogs
(`feat/canvas-s78`), S9 console table (`feat/canvas-s9`). Until S2 merges, these screens keep
rendering inside `InstitutionWorkspaceHub`; they are not started before S2 lands.

**Will change (all nine).**
- Move into the S2 campus shell; leave `InstitutionWorkspaceHub` tabs as redirects to the new routes.
- Icons: replace every `lucide-react` import with `<Icon>` / `<Icon3d>` / `<BrandLogo>` using the
  brief's exact names. Shell icons (sidebar) are S2's; per-screen icons are listed per screen.
  `⌘` stays as text (brief). No icon is invented; any icon missing from
  `design/icons/icon-manifest.json` stops the ticket.
- Copy: every string from the board goes into `src/i18n/areas/campus.ts` (en, te, hi) via `t()`.
  No literals (ESLint `sk-copy/no-literal-copy`).
- Colours, type, spacing, radius: tokens only. The board's `#E11D48` error triangle and red
  severity chips map to `danger*` only where the meaning is SOS/crisis/error; never on a lab or
  vital value (`attention` is the out-of-range colour).
- States from the board's preview switcher: Data, Loading (skeleton), Empty (message + one next
  step), Error ("This is on our side, not yours", retry, `Ref ERR-<code> · <Screen>`), plus
  **Not connected** wherever the source is absent, and **Offline** (read-only notice; any
  action that grants access is disabled offline).

**Will NOT change (all nine).** Consent semantics (a campus sees nothing a student has not
shared); break-glass semantics; SOS and crisis routing and their acknowledgement rules; the
audit log (`record_audit`) and what it records; Rule L planes in `backend/core/rule_l.py`;
campus scoping (`campus_scope`, `_crisis_accounts_in_scope`); role guards on existing endpoints.
Any change to these is called out below as a decision, not made silently.

**Safety baseline.** Crisis support and 112 / 108 / Tele-MANAS 14416 stay reachable from the
shell on every screen (never behind loading or error). Nothing on these screens is cached in
`localStorage`. No student name, roll number or health detail in logs, analytics or error text.

**Accessibility baseline.** Tables use `<table>` with caption and `scope` headers (S9).
Every control ≥ 44 × 44 with role and label; dialogs `aria-modal` with focus trap and return
focus; status chips carry text, never colour alone; live timers announce at most once a minute
(`aria-live="polite"`); reduced motion stops the skeleton shimmer and row rise.

**Tests baseline.** Per screen: vitest view tests for each state (data / loading / empty /
error / not-connected / offline), a test that no board sample name renders in a production
build, `check-icons --screen <Screen>` passing, and the screen moved from `inProgress` to
`screens` in `design/screens/implementation-map.json`. Backend tickets add pytest for wrong
role, other campus, other student and fail-closed paths.

---

## 1. CampusInsights — cohort health insights

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: cohort chips (Whole cohort, 1st year, 4th year, CSE, Civil · 4th yr); blood-pressure
  bands and BMI bands as share-of-cohort bars; "Withheld — fewer than 20 students in this
  cohort"; screening coverage by month (Jul–Dec line); a "What this page will never show" card
  (no names next to values, no groups under 20, no rankings, no counsellor/crisis/mental-health
  or sexual-health counts); "Export aggregate PDF"; link to access requests.
- Today: a title, a cohort `<select>` with only "All", and `CampusEpidemicOutbreakRadar`. No
  bands, no suppression note, no "never show" card, no export. lucide `BarChart3`, `Filter`.
  Copy found 9%.

**Will change.** Header strip with the board's lead ("Aggregates only…"); cohort chips; the
"never show" card and the access-request link (both static copy, always shown); band panels and
coverage chart as **not-connected** panels until an aggregate endpoint exists; export button
hidden until the endpoint exists. Icons per brief (34 incl. shell) with `chart-alt--p4` on the
empty state.

**Will NOT change.** No per-student query from this screen. The radar component's data source
is unchanged.

**Safety-critical.** Suppression must be computed **server-side** before any number leaves the
API; the client never receives a cell under the floor and never computes one. BMI is bands
only. Mental-health, crisis and sexual-health counts are excluded at the query, not hidden in
the UI. Band labels on the board ("Under / Healthy range / Over / Obese", "Elevated / Stage 1 /
Stage 2") are category words; see decision.

**Data.** Not connected. Needs `GET /api/campus/insights?cohort=` returning pre-suppressed
shares with `withheld: true` per cell, campus-scoped, from camp screening data (backend ticket).

**Open decisions.**
1. Suppression floor: board says 20; AdminConsentPolicy and AdminRuleL say k = 5;
   AdminSurveillance says n ≥ 80. One number (or one per surface) as a non-public, clinical-owned
   setting with a minimum that cannot be lowered.
2. BMI and BP band wording: the board's "Obese/Over" category words conflict with the neutral
   band labels approved for the student weight screen (`tier1-wellness-screens-2026-10-20.md` §3).
   Use numeric band labels?
3. Is "Export aggregate PDF" wanted at launch (export is an access path that needs its own audit)?

---

## 2. CampusAccessRequests — ask a student to share

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: list with filter tabs (All / Pending / Approved / Declined / Expired), rows show
  student, purpose, fields, requested by, age, state chip, action (Remind / View / Ask again);
  "New request" drawer: student, purpose (student sees this), fields "ask for the minimum"
  (Vaccination status "done/due only, no dates", Allergies, Blood group, Medical certificate
  "validity only, never diagnosis", Camp screening result "normal/follow-up only"), expiry
  (7 / 14 / 30 days), a live preview of what the student will see, "Every request is logged
  with your name".
- Today: a single form (student free text, purpose, duration 12/24/72 h) that **always fails
  closed** ("not connected"); no list, no fields picker, no preview, no states beyond offline.
  lucide icons. Copy found 4%.

**Will change.** Board layout: list + filter chips + "New request" drawer (S7) with the field
picker, expiry choice and the student-facing preview. While no endpoint exists the list shows
the not-connected state and the drawer's submit stays disabled with the existing
`campus.access.unavailable` reason.

**Will NOT change.** Fail-closed submit. A campus never sees a field before the student
approves. Durations offered never exceed the student-side maximum share duration.

**Safety-critical.** The preview text must be generated from the same data the student's
`ConsentInbox` will render (one source), so the campus cannot word a request differently from
what the student reads. Fields are an allow-list of coarse projections (done/due, validity) —
never free-text "anything else".

**Data.** Not connected. Needs a consent-request model and endpoints (create, list by campus,
student approve/decline, expire, audit) on the clinical plane, with the student side in WP-06
`ConsentInbox`. Existing `/records/shares` is student-initiated sharing and is not reused for
campus-initiated requests without a decision.

**Open decisions.**
1. Build the consent-request backend in this package or ship the screen not-connected?
2. Expiry options: board 7/14/30 days vs today's 12/24/72 hours — legal to choose.
3. "Remind": how often may a campus nudge a student who has not answered (pressure risk)?

---

## 3. CampusBreakGlass — emergency card when the student cannot consent

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: two steps — 1 · find the student (name/roll search, matches), 2 · reason chips
  (Collapse / unconscious, Severe allergic reaction, Seizure, Serious injury) + mandatory free
  text; "Open emergency card"; confirm dialog ("Aarav gets a notification immediately…", "The
  super admin audit log records this view", "Access closes by itself after 15 minutes");
  then the card (blood group, allergies, conditions, current medicines, organ donor, emergency
  contacts), an audit box (Audit ID, opened by, reason, student notified, super admin log
  updated), a countdown chip, "Call 108 ambulance", "Log this as an incident", "Close access
  now". Header: "4 uses this term · all reviewed" and a misuse warning.
- Today: reason + "authoriser" free-text form that always fails closed; no search, no card,
  no timer, no audit box. lucide. Copy found 4%.

**Will change.** The board's two-step layout, reason chips, confirm dialog (S7) and the card
layout, all rendering **not connected** until the backend exists: the search returns nothing
and "Open emergency card" stays disabled with the reason shown. The 108 call link is live
regardless (it is a `tel:` link, not data).

**Will NOT change.** Today nothing opens; that remains true until an endpoint exists that
records the opening, notifies the student and expires the session server-side.

**Safety-critical.** Only the emergency-card projection is ever returned (never records,
reports or history). The countdown is the server's `expires_at`, not a client timer; when it
passes the card is removed from the DOM. Allergies use `danger` (the one allowed red on the
emergency card after the colour plan); other values plain. The card is never cached. "Close
access now" must end the server session before the UI hides it.

**Data.** Not connected. Needs routes over the existing `break_glass_sessions` table (clinical
plane): open (reason category + text, student id → session + audit id + card projection), close,
and the student notification; plus the super-admin side in WP-17 AdminBreakGlassLog.

**Open decisions.**
1. **Model conflict:** this board is one campus admin, 15 minutes, emergency card only;
   SuperAdminConsole's board is dual custody (second approver, scope picker incl. lab diagnostics
   and prescriptions, up to 4 h). The table already has `dual_approver_admin_id` and `scope`.
   Which applies to campus admins, and does the 15-minute window become a setting?
2. Who may open: campus admin only, or also the medical officer / warden roles?
3. "4 uses this term · all reviewed": shown to the campus admin, or only to the super admin?

---

## 4. CampusIncidents — incident desk

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: list of incidents (id, title, where, reported by, severity Urgent/Routine, state
  New/Triaged/Dispatched/Resolved, age, owner) with a detail drawer (where, reported by,
  dispatch: Call 108 / Send medical officer / Hostel visit / Emergency card; timeline; Add note;
  Mark resolved); "Log incident"; on-call strip ("On call: Dr. S. Menon (MO)") and "Life-threatening?
  Call 108 first, then log it here." Lead: "Details are limited to the responders on each incident."
- Today: a two-tab switch that embeds `MeoDashboardScreen` and `MedicalIncidentScreen`. lucide.
  Copy found 8%.

**Will change.** Board layout with the 108 strip always first; list + drawer; "Emergency card"
action links to CampusBreakGlass (no direct read). On-call strip reads the existing
`/ops/campus/security-contacts`; if none are configured it says so (no invented doctor).

**Will NOT change.** SOS acknowledge/resolve semantics (`/ops/sos/{id}/acknowledge|resolve`).

**Safety-critical.** 108 / 112 reachable during loading and error. Incident details limited to
responders: the list shows title and place, never a condition, to anyone not on the incident.

**Data.** `/ops/sos` (real, campus-scoped) can fill student-raised rows. Warden/staff-reported
incidents, notes, dispatch and resolve have no model.

**Open decisions.** Is an incident an SOS alert plus notes, or a new clinical-plane record? Who
counts as a "responder" for visibility?

---

## 5. CampusCounsellor — crisis follow-up queue

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: queue rows (signal kind e.g. "Self-harm language", "Panic, repeated", "Low mood, 3
  signals this week"; where/source; age; state new/ack/closed) with a 15-minute ring per row;
  "Median ack 6 min · this week"; on-call counsellors card; escalation note (unacknowledged
  after 15 min → super admin safety centre; after hours Tele-MANAS 14416); "What you can and
  can't see" (✓ that a signal happened, kind, name and contact; ✗ anything typed to Ayush or
  the navigator; ✗ records unless shared); follow-up drawer: "Signal kind … never the message
  text", outreach log (Called the student / Reached and safe / Session booked / Emergency
  contact informed — only if risk is immediate), Escalate, "Close with follow-up booked".
- Today: real queue from `GET /ops/crisis-events` with acknowledge; i18n in place; no ring,
  no on-call card, no can/can't-see card, no outreach log, escalate or close. lucide partly
  (7/34 icons). Copy found 10%.

**Will change.** Board layout and copy; the can/can't-see card with `check` / `x` icons for
`✓` / `✗` (brief); per-row elapsed ring computed from the event's `createdAt`; on-call card
only if a roster source exists (else omitted, not invented); outreach log, Escalate and Close
rendered disabled with "not connected" until endpoints exist. "Queue clear. Nice work." stays
(not about a body value) unless the reviewer objects.

**Will NOT change.** The acknowledge call, its campus scoping and audit; the crisis gate
(`services/crisis_gate.py`); escalation behaviour on the server.

**Safety-critical.** The message text is never fetched (the API does not return it — keep a
test). "Emergency contact informed" must be guarded by an explicit confirm and its own audit
entry. Escalation must not depend on the screen being open.

**Data.** Queue + acknowledge: real. Outreach log, escalate, close: not connected (backend
ticket). Median-ack figure: needs a server aggregate; show "—" until then.

**Open decisions.** 15-minute target as a setting (`crisis.ack_target_minutes`, clinical
owner)? Does the server actually escalate to the super admin and Tele-MANAS today? (Not
verified in code — the board's note must not be shown as fact until it is.)

---

## 6. CampusIsolation — quarantine bays

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: bay table (Q-01…Q-05; student shown as room + initials; reason & day "Influenza A ·
  day 3 of 5"; daily check "Done 08:10 · afebrile 12 h" / "Missed 08:00"; status On track /
  Extended / Free), stat tiles (4 of 5 bays, check overdue, extended stay, median stay), and
  the note "Wardens see that a bay is occupied, never by whom or why".
- Today: empty roster ("no isolation records API") with a red status card. lucide. Copy 9%.

**Will change.** Board table and tiles in the not-connected state; the privacy note always
shown; red status card removed (no SOS meaning here — `attention` for "check overdue").

**Will NOT change.** No invented bays or students.

**Safety-critical.** Reason and daily-check values are clinical: visible to the health officer
role only. A warden-role view shows occupancy only — enforced by the API projection, not by
hiding columns.

**Data.** Not connected (needs bays, stays and daily checks on the clinical plane).

**Open decisions.** Which role is "health officer" in our role model (`CAMPUS_ADMIN` has no
sub-role today)? Are daily-check values (temperature) entered here or by a clinician?

---

## 7. CampusAmbulance — dispatch board

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: tiles (live now, median time to scene, off-campus transfer, campus vehicle SK-01
  available); table (call id, destination & reason e.g. "Block B lobby → campus health centre",
  vehicle, ETA/elapsed, state On scene / En route / Closed); note that destination and reason
  are visible to the coordinator but the record never travels with the row.
- Today: empty list ("no ambulance/GPS feed"), no table, no tiles. Copy 10%.

**Will change.** Board table and tiles, not connected; the note always shown; `→` in
destinations drawn with `arrow-right` (brief).

**Will NOT change.** No vehicle, driver, phone or ETA is shown without a source.

**Safety-critical.** 108 call link first on the page. "Reason" is a short dispatch reason,
never a diagnosis field.

**Data.** Not connected. Options: a manual dispatch log tied to SOS/incident, or a provider
feed (none integrated).

**Open decisions.** Manual log vs feed; free-text "reason" allowed at all, or a fixed list?

---

## 8. CampusSla — escalation timers (new screen)

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: tiles (breached, within target, worst breach, **auto-closed**); table (request id,
  what is waiting — e.g. "Critical lab value — clinician acknowledgement", "Isolation daily
  check", "Record access request — student decision", "Counsellor referral — first contact",
  "Sanitary re-inspection"; target; elapsed; escalation); note "Nothing on this board closes
  itself…".
- Today: no screen, no route.

**Will change.** New route `/campus/sla` in the S2 shell, board layout, not connected.

**Safety-critical.** The "Auto-closed" tile must read 0 from the server (or "—"), never a
client constant. Breached rows sort first.

**Data.** Not connected. Some timers have real sources (critical-result acknowledgement:
`/work/critical-results`; crisis acknowledgement: `/ops/crisis-events`), but a campus admin
must not see clinical content of a critical result — only that a timer is breached.

**Open decisions.** Which timers, their targets (as settings), and whether a campus admin may
see a critical-lab-value timer at all (it reveals that a student has one).

---

## 9. CampusDischarge — fit-to-return certificates (new screen)

**Approved by:** Krishna Chintakayala (named Tier 1 reviewer), 2026-10-21 — approved as part of the package; legal/clinical items settled conservatively (see Decisions taken).

**Board vs today.**
- Board: tiles (issued this week, stay extended, early release refused, issued without
  sign-off = 0); table (bay, student initials, clearance e.g. "Afebrile 48 h, day 5 of 5",
  certified by "Dr. A. Reddy · NMC-TS-88412", state Certificate issued / Stay extended /
  Refused — no clinician sign-off); note "A warden can ask; only a clinician can certify… no
  administrative override".
- Today: no screen. `MedicalLeaveApprovalsScreen` is leave approval, a different thing.

**Will change.** New route `/campus/discharge`, board layout, not connected. A campus admin can
view and request; there is no "issue" control for non-clinicians.

**Will NOT change.** `MedicalLeaveApprovalsScreen` and its route.

**Safety-critical.** Certification is a clinician action (`require_clinician`) on the server;
the campus screen shows the result only. "Issued without sign-off" is computed, never asserted.

**Data.** Not connected (depends on the isolation model in §6).

**Open decisions.** Does the certificate show the clearance reason to the campus admin, or only
"fit to return" (the board shows clinical detail)? Registration number display (NMC) — confirm.

## Decisions taken (approved by Krishna Chintakayala, 2026-10-21)

Approved as a set; each open decision settled on the conservative, honest option.

- **Shared · backend.** No backend added. The consent-request model (§2), break-glass routes (§3), incident model (§4), outreach/escalate/close (§5), isolation bays (§6), dispatch log (§7), timers (§8) and discharge sign-off (§9) are each more than a small scoped addition (student-side flows, notifications, server-side expiry), so every one ships as an honest "not connected" board.
- **Shared · crisis lines.** 108 / 112 / Tele-MANAS 14416 are drawn as plain `tel:` links on Break-glass, Incidents, Ambulance and Counsellor, in every state. The campus shell itself was not changed (a shared shell change touches every campus board); listed for the integrator.
- **Shared · routes.** The nine boards live in `src/features/campus/safety` and mount in the campus shell; the five superseded screens in `src/screens/institution` are deleted. `MeoDashboardScreen` (in-memory demo store) is no longer mounted on the campus Incidents board; its own `meo` route is unchanged.
- **1.1 Suppression floor.** The console's one k-anonymity value (`CAMPUS_MIN_GROUP` = `InstitutionConsoleQueryGuard.K_ANONYMITY_FLOOR`, 20) is shown by interpolation, never the picture's literal. No new setting.
- **1.2 Band wording.** No band labels are drawn while not connected; the "Obese / Stage 2" wording stays undecided.
- **1.3 Export.** "Export aggregate PDF" drawn disabled with "not available yet" (the header layout needs it).
- **1 · cohorts.** Only "Whole cohort"; year/branch chips have no source.
- **2.1 Access-request backend.** Not built; list not connected, drawer submit always disabled with the reason.
- **2.2 Expiry.** No choices drawn (no setting, legal to choose); the drawer says expiry is set with the student's sharing limits once connected.
- **2.3 Remind.** Not drawn (no list). Preview of the student's wording not drawn either: it must come from the student's ConsentInbox (one source).
- **3.1 Break-glass model.** Undecided, so nothing opens: search disabled, "Open emergency card" always disabled, no card, timer, audit ID or contact drawn. No time limit number shown (no setting).
- **3.2 Who may open.** Unchanged: the route stays campus admin / super admin; nothing can open anyway.
- **3.3 Uses this term.** Shown as "not counted yet" (no count source).
- **4 · Incident model.** An incident is an SOS alert for now (`GET /ops/sos?open=false`). Columns: New = ACTIVE, Acknowledged = ACKNOWLEDGED (renamed from "Triaged": nobody triaged it here), Resolved = RESOLVED/CANCELLED; Dispatched says it is not tracked. Cards show place and age, never a name or condition; the name is in the incident panel only (the same campus responders see it on the SOS desk). Acknowledge/close stay on the SOS desk (linked), unchanged. "Log incident", notes, "Send medical officer", "Hostel visit" drawn disabled. The on-call strip reads `/ops/campus/security-contacts` names; no invented doctor.
- **5 · Counsellor.** The queue stays on the counsellor's own home (`/counsellor`); a campus admin still sees the explanation page (role guards unchanged). The 15-minute window stays the existing constant (no new setting). On-call card omitted (no roster). Median shown as "—". The board's escalation note is replaced by the true statement that the queue does not escalate on its own yet (verified: no server escalation exists). Outreach log / Escalate / Close not drawn; the existing outcome + note follow-up (incl. "Escalated") is kept in the drawer.
- **6 · Health-officer role.** No sub-role exists; the board shows nothing to anyone, and the privacy rule is shown.
- **7 · Dispatch.** Not connected; 108 call link first on the board; the "record is opened and logged at the receiving end" sentence dropped (not true of the app).
- **8 · Timers.** Not connected; all four figures "—" incl. Auto-closed; the "breached timer escalates to a named person" sentence dropped.
- **9 · Certificate detail.** Nothing listed; no NMC numbers drawn; the page states it cannot issue a certificate.

