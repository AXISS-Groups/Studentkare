# WP-06 Phone: safety, consent and account deletion (Tier 1): canvas plan approved 2026-10-21, built in feat/t1-wp06

**Approved by:** Krishna Chintakayala (founder, named Tier 1 reviewer), 2026-10-21 ("Approve all").

**Status:** approved 2026-10-21, built in feat/t1-wp06. The approval covers the layout, copy and
states described here; it does not supply the clinical, legal or vendor input the plan marks as
missing, so those parts are built in their honest reduced form (see Decisions taken).
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` lane 2, each board's brief, screenshot and
`design/screens/source/02-student-app-mobile/<Screen>.html`, and the code named below.
**Depends on:** S4 phone frame on web (phone header, tab bar at ≤ 430 px), S7 sheets/dialogs,
the crisis card (`design-system/CrisisLinks.tsx`). Web twins of EmergencyCard, MyPass, DeleteAccount
and Legal are in WP-09 and share their view-models with these.

## Rules every screen in this package keeps

- **Crisis and SOS routing does not change.** 112 and Tele-MANAS 14416 numbers, `tel:` links,
  `/crisis` and `/medical-incident` stay public (no sign-in, no network). SOS still raises through
  `POST /api/emergency/sos` and shows only what the server recorded.
- **Colour (founder, Krishna Chintakayala, 2026-10-20: "red as sos and rest on regular color").**
  Red (`danger`) only for: the SOS trigger and live-SOS state, Call 112, and clinical alerts
  (allergies on the emergency card, kept red in commit 45321e2). Every other rose element on these
  boards (eyebrows, chips, "This wasn't me", "Revoke now", delete buttons) is drawn in neutrals /
  `action` unless D6-1 says otherwise.
- **Honest data.** Several boards show people, devices and events with no backend (ICE order,
  check-in history, care circle, consent requests). Those parts show the not-connected state, not
  sample rows. No demo content outside demo builds.
- **No motion on destructive or emergency screens** beyond the 160 ms tap response; everything
  stops under reduced motion.
- Icons through `src/design-system/icons` with the brief's names; text glyphs (✕ ✓ ⬇ → ☀) are
  replaced per `skTextGlyphIcons` (`x`, `check`, `download`, `arrow-right`, `sun`).
- Copy from `src/i18n`; durations and limits from the server or the settings registry.

## Summary

| Screen | Today | Board vs today (biggest gaps) | Data today | Not connected | Key decision |
|---|---|---|---|---|---|
| EmergencyCard | partial; phone offline card unrouted | phone card (offline, lock-screen), edit sheet, Call 112 | `GET/PATCH /profile` | offline storage on device | D6-2 offline card |
| CrisisSupport | drifted, 0/5 | "Talk to someone now" card, what happens when you call, counsellor booking | none (static) | counsellor booking | D6-3 counsellor link |
| SosBeacon | drifted, 0/2 | live timer, location accuracy, who-was-told timeline | `/emergency/sos*` | live location updates | D6-4 poll interval |
| SosDebrief | drifted, 0/1 | everyone told, counsellor check-in, private note | `/emergency/sos/current` | check-in request, note | D6-5 |
| IceContacts | partial; setup screen unrouted | ordered list of up to N contacts with roles, "what they see" | one contact on `/profile` | multi-contact ICE | D6-6 |
| MyPass | partial (web only) | phone pass, brightness, spoken code, history, report | `/identity` (QR window) | check-in history, report | D6-7 offline |
| CheckinReceipt | missing | handover receipt with bag photo and items | none for students | receipt API | D6-8 |
| DeleteAccount | drifted, 0/2 | export first, deleted vs kept, reason, type DELETE + code, scheduled | `/records/deletion-request` | PDF+FHIR export, code step | D6-9 |
| Legal | drifted, 0/1 | full notice, tabs, grievance | none (page states the gap) | legal text | D6-10 |
| PlanBilling | drifted, 0/3 | plan card, included list, not-connected payment, history | `/billing/me`, `/billing/plans` | — | D6-11 |
| FamilyCircle | drifted, 0/1 | guardian card, what's shared switches, leave | none (honest note) | care-circle API | D6-12 |
| ConsentInbox | drifted, 0/1 | awaiting / active grants, allow 7 days, revoke | `/records/shares` (clinician shares) | access requests | D6-13 |

---

## EmergencyCard (phone)

**Board vs today.** Web editor `features/emergency/views/WebEmergencyCard.tsx` with
`EmergencyCardViewModel` (reads/writes the student's own `/profile`; fake prefill removed
2026-10-09). The phone card `screens/emergency/EmergencyCardScreen.tsx` exists but no route renders
it. Board: "OFFLINE · stored on this phone, works without unlocking", identity strip, blood group
(large), allergies (alert), current medicines, "If I am unresponsive, call" contacts, **Call 112**,
"Nothing on this card is sent anywhere", edit sheet (blood group with "pick only what a report or
doctor confirmed", allergies chips + "No known allergies", medicines), `wifi-off`, `check-2`,
`phone-2`. Missing-field warning.

**Will change.** Route the phone card; layout to the board; edit as a bottom sheet (S7); missing
blood group / allergies prompt; icons from the brief.

**Will NOT change.** Blood-group enum = `BLOOD_GROUPS` the server accepts; "not set" default;
save reports failure as failure; card data is the student's own profile only.

**Safety.** Allergies stay red (clinical alert); blood group large in `clinical-value` mono; Call
112 red. Card must render without network and without a session **only if** D6-2 approves device
storage of PHI (`AGENTS.md` 9 forbids PHI in client storage today). Until then the board's
"Stored on this phone, works without unlocking" line is not shown.

**Data.** `GET/PATCH /api/profile`. Current medicines: from `/meds/schedule` (own) or typed — D6-2.

**Accessibility.** Blood group read as words ("O positive"), Call 112 labelled "Call 112, emergency
services", sheet `aria-modal` + focus trap.

**Tests.** No prefilled clinical data; save failure shows error; offline line hidden unless enabled;
`check-icons --screen EmergencyCard`.

## CrisisSupport

**Board vs today.** `/crisis` → `screens/medical/MedicalIncidentScreen.tsx` (situations radio and
first steps) + `CrisisLinks`. Board: "Campus SOS" also-here link, "Talk to someone now · free,
confidential, 24 hours" card with Call, "What happens when you call" three steps, privacy line
("Your campus never sees that you opened this screen"), "Book time with a campus counsellor",
icons `lock-3`, `map-pin`, `phone-2`, `shield-2`.

**Will change.** Layout and copy to the board, steps list, SOS link, counsellor link (D6-3).

**Will NOT change.** Public route, no request on load, numbers 112 / 14416 and their `tel:` links,
the first-steps content (clinical review still owed per the file comment; reviewer to confirm whether
the board drops it or keeps it below the fold).

**Safety.** Nothing on this screen logs or emits analytics (the board's privacy promise must be
true: verify no route-view telemetry fires for `/crisis` — test). Works offline and signed out.

**Tests.** Renders with network blocked and no session; no `apiRequest` / telemetry call; both numbers present.

## SosBeacon · SosDebrief

**Board vs today.** `modules/m04-emergency/view/SosView.tsx` (one source, approved earlier by the
owner as reviewer): Call 112 on every state, delivery list from the server, polls every 15 s.
Board beacon: "SOS active · LIVE 00:41", location with accuracy and "updated 3 s ago", "updates
every 10 seconds", who has been told (security, warden, ambulance, ICE contact, on-shift doctor)
with offsets, "I am safe — end SOS". Debrief: "You're marked safe" with duration, everyone told,
counsellor check-in offer, private note, "Still not okay? Talk to someone now".

**Will change.** Layout, elapsed timer, delivery rows styled as the board's timeline with
recipient kinds the server returns, `map-pin-3`, `check`, debrief summary.

**Will NOT change.** Raise/cancel endpoints, who is alerted (server), red SOS state, Call 112 on
every state, "ending tells everyone you ended it" behaviour as implemented.

**Safety.** Location line only if the server holds a location; no "accurate to 6 m" or "updated
3 s ago" unless real. Poll interval is hard-coded `POLL_MS = 15000`; move to the settings registry
(D6-4). Ending SOS needs one confirm, never a typed confirmation.

**Data.** `POST /emergency/sos`, `GET /emergency/sos/current`, `POST /emergency/sos/{id}/cancel`.
**Not built:** continuous location updates, counsellor check-in request, private SOS note (D6-5).

**Tests.** Timer from server start time; recipients only from deliveries; cancel failure keeps SOS
shown active; crisis links on debrief.

## IceContacts

**Board vs today.** Contact section of the web emergency card; `EmergencyContactsSetupScreen.tsx`
is unrouted. Board: ordered list (1 Primary, 2 Medical, 3 Nearby) with roles, "they have not been
told", "What they see" (location yes, blood group yes, record never, last treatment never), add
sheet with +91 validation `[6-9]\d{9}`, relationship and role.

**Will change.** Route the screen; list, add sheet, "what they see" table, validation copy.

**Will NOT change.** Phone validation (`isValidIndianMobile`), "we won't message them".

**Data / decision.** The profile holds **one** emergency contact. An ordered multi-contact list with
roles (and "medical contact receives the card") needs a backend change and a clinical decision on
who receives what (D6-6). Until then: one contact, and the "what they see" table must describe what
SOS actually sends.

**Tests.** Invalid number blocked; no second contact UI until API exists.

## MyPass

**Board vs today.** Web-only `features/digital_id/views/WebPass.tsx` (server-signed 30 s codes, ten
minutes held in memory, honest empty history). Board: brightness hint, identity strip, "Identity
verified · 4 of 4", QR with countdown ring (`chart-refreshes`), spoken code, "Works offline ·
Screenshots won't work · Never share the code by phone", recent check-ins with "This wasn't me".

**Will change.** Phone pass layout, countdown ring, spoken code if the server issues one, brightness
tip as text (`sun` icon), QR in `qr-foreground/background` (never inverted).

**Will NOT change.** Code signing/window logic (`livePass.ts`); nothing written to storage.

**Safety / decisions.** "Identity verified · 4 of 4" only from server state (WP-03). "Works offline"
is true only while codes are in memory; copy must say so (D6-7). History and "This wasn't me" have no
backend (no check-in record) — empty state, report action hidden.

**Tests.** Stale code hidden; no localStorage writes; QR colours fixed in dark mode.

## CheckinReceipt

**Board vs today.** Missing. Board: handover receipt with order number, pharmacist, time, bag
photo, items with price, dosage note, how you were checked, face-photo deletion time, "Something's
wrong" and "I didn't collect this".

**Plan.** Not built until a student-facing handover receipt API exists (D6-8). When built: medicine
names appear only here (clinical surface), never in the notification that links to it; prices shown
as charged; "I didn't collect this" opens a support case and pauses the pass server-side.

## DeleteAccount

**Board vs today.** `features/account/views/DeleteAccountView.tsx` + `DeleteAccountViewModel`
(`/records/deletion-request` GET/POST/DELETE, 7-day grace in `backend/services/erasure.py`). Board:
"download your records first (PDF + FHIR)", deleted vs kept lists, ABHA note, optional reason with a
distress branch (Tele-MANAS + counsellor), "Type DELETE" and a code sent to the phone, scheduled
state with request id and day n of 7, cancel → "Glad you're staying".

**Will change.** Layout and lists, reason step with the crisis branch, scheduled and cancelled
states, `check` / `chevron-left` / `x` / `download` icons.

**Will NOT change.** Grace period and erasure job; what is kept (archive retention disclosed per
erasure.py); crisis support and emergency card keep working during the grace period.

**Safety.** Reason "it's hard right now" shows crisis numbers but never blocks deletion. Delete
button: neutral or `danger` per D6-1. "Kept, because the law requires it" lines need legal sign-off.

**Data / decisions.** Export today is JSON from `/records/export`, not PDF + FHIR. Typed-DELETE +
OTP confirmation has no server step (D6-9). `GRACE_SECONDS` is a literal; to settings registry.

**Tests.** Cannot submit without the confirmation; cancel restores; crisis branch present; grace
days from server.

## Legal

**Board vs today.** `features/legal/views/LegalView.tsx` deliberately shows no notice (no approved
text, no appointed grievance officer). Board: version line, sections (who we are, what we collect,
why, who sees it, how long, your rights), short-version tab, "not an emergency service", "Doctors
decide, not the app", grievance.

**Plan.** Layout and tabs can be built; **text only from legal-approved i18n keys** with a version
the server or a config holds (D6-10). No compliance claims (`AGENTS.md` 6). "Not an emergency
service · call 112" may ship first (reviewer to confirm).

## PlanBilling

**Board vs today.** `screens/billing/BillingPanel.tsx` (`/billing/me`, checkout via Razorpay when
`checkoutAvailable`). Board: "Free Student Account", "records never behind a paywall", included
list, Student Plus with "Online payment is not connected yet · Contact support", partner-funded
disclaimer, payment history.

**Will change.** Layout, not-connected card driven by `checkoutAvailable`, history from `receipts`.

**Will NOT change.** Payment confers no access (Rule L); plan data from the server; nothing
clinical on this screen.

**Tests.** Not-connected card when `checkoutAvailable` false; prices only from server.

## FamilyCircle

**Board vs today.** `screens/vault/FamilyAccessShareScreen.tsx` says no family-share API exists and
points to the emergency card. Board: guardian card, shared list (vaccination status, camp
attendance, emergency alerts, plan & billing), never-shared list (results, notes, prescriptions,
mental health "never available, at any setting"), "Paying does not buy access", leave.

**Plan.** Keep the honest not-available state styled to the board until a care-circle API exists
(D6-12). When built: defaults off, the "never" categories are not switchable at all, the guardian is
not told which switches are off, leaving tells the payer only that the student left.

## ConsentInbox

**Board vs today.** `screens/vault/AccessConsentInboxPanel.tsx`: no consent-request API; shows
export and delete. Board: Awaiting you (allow 7 days / refuse), Active now (clinician share with
expiry, lab "until done", campus "required", family), revoke now, "cannot un-read what was opened".

**Will change.** Active-now list from **real clinician shares** (`GET /records/shares`,
`POST /records/shares/{id}/revoke`) with scope and expiry; campus row as static "enrolment only"
fact; revoke confirm sheet.

**Not built.** Awaiting-you requests (no request API), lab "until done" grants, family grants (D6-13).

**Safety.** Revoke is immediate and needs no reason; the screen says what revoking can't undo.

**Tests.** Revoke failure leaves the row active with an error; expiry from server.

---

## Decisions for the reviewer

- **D6-1 Red beyond SOS.** Destructive actions (delete account, revoke, "This wasn't me") and
  error states: `danger` (DESIGN §3) or neutral per the founder's rule?
- **D6-2 Offline emergency card on the phone.** Approve storing the card (blood group, allergies,
  medicines, contact) on the device, encrypted, readable without unlocking the app? That is a
  guardrail-9 exception and needs clinical + privacy sign-off. If no, drop the "Offline" promise.
- **D6-3 Counsellor booking** from CrisisSupport: link to the counsellor queue that exists, or omit?
- **D6-4 SOS poll interval** to the settings registry (board says location every 10 s, code polls 15 s).
- **D6-5 After-SOS counsellor check-in and private note:** build backends or omit.
- **D6-6 ICE contacts:** approve multi-contact ordered list with roles (backend + clinical rules on
  who gets the card), or keep one contact.
- **D6-7 Pass offline copy:** "works offline for about ten minutes after opening" vs dropping it.
- **D6-8 Check-in history and handover receipt:** build student-facing check-in log + receipt API?
- **D6-9 Deletion confirmation:** add typed DELETE + OTP server step? Export as PDF + FHIR?
- **D6-10 Legal text:** who supplies and versions it; can the safety disclaimers ship first?
- **D6-11 PlanBilling:** confirm "Contact support" path while payments are not connected.
- **D6-12 / D6-13 Care circle and consent requests:** build the APIs, or keep honest not-available
  states styled to the boards?

## Decisions taken (approved by Krishna Chintakayala, 2026-10-21)

Approved as a set; each item takes the conservative, honest option.

- **D6-1** Red only for SOS, Call 112, clinical alerts (allergies) and account deletion (`danger`, `dangerOutline` for "Continue to delete" / "Still not okay?"); revoke, "This wasn't me", eyebrows and chips use `action` / neutral. Why: founder colour rule.
- **D6-2** No device storage of the emergency card. The "OFFLINE · stored on this phone" line is not drawn; offline, the card says it can't load and Call 112 still works (`wifi-off`). ABHA number, current medicines and "No known allergies" omitted (no profile fields). Why: guardrail 9 exception has no clinical/privacy sign-off.
- **D6-3** Counsellor card and "Book time with a campus counsellor" omitted from CrisisSupport; step 3 dropped, step 2 reworded to what Student Kare can promise. The existing first steps stay below the call cards. Why: no student-facing counsellor line or booking exists; no dead options on a crisis screen; first-steps change needs clinical review.
- **D6-4** SOS poll interval moved to the settings registry: `emergency.sos_poll_seconds` (int, default 15, 5–120, public). Copy says "checks for replies every {n} seconds"; no "location updates every 10 s" claim. Why: rule 11; the server pushes nothing.
- **D6-5** No counsellor check-in request or private SOS note (no backend). Debrief lists who was alerted with real statuses and says only the campus console is told you ended it (that is what `cancel_sos` does); the "everyone was told" list is not drawn. Why: honesty.
- **D6-6** One emergency contact (the profile field), ordered list / roles not built. "What they see" describes the real SOS WhatsApp: name + time yes, typed location yes, blood group and record never. Why: backend + clinical decision missing.
- **D6-7** Pass offline chip reads "Works without signal for {n} min", computed from the codes held in memory (0 hides it). Why: true only while the window lasts.
- **D6-8** CheckinReceipt **not built**; MyPass check-in history is an honest empty state and "This wasn't me" is hidden. Why: no student check-in record or receipt API.
- **D6-9** No typed-DELETE + OTP server step and no PDF + FHIR export: the existing typed DELETE stays, the export link opens the JSON data export. "Kept because the law requires it" lines replaced by what erasure.py keeps (sealed copy for the server's retention days, pseudonymous audit). Request id and "we've emailed you" omitted. `GRACE_SECONDS` left in erasure.py (backend change not in scope). Why: no server step, no legal sign-off.
- **D6-10** Legal board ships tabs and layout with the honest "not published yet" notices (existing reviewed keys), no grievance officer name, and the "not an emergency service · Call 112" line. Why: no legal text or officer.
- **D6-11** "Contact support" opens the Help centre without promising support can activate Student Plus. Why: no such admin path verified.
- **D6-12** Care circle: no guardian card, switches or leave; honest not-available board with "paying does not buy access" (true by Rule L). Why: no care-circle API.
- **D6-13** Consent inbox: active clinician shares from `GET /records/shares` with revoke; "Awaiting you" states nothing can ask yet; lab and family grants omitted; campus row is a fixed "enrolment only" fact. Why: no access-request API.
- **Routes** New student routes `/ice-contacts`, `/consent`, `/care-circle`; `/crisis` added to route paths (public). The records hub's Access and Family tabs now show the ConsentInbox and FamilyCircle boards; the old AccessConsentInboxPanel and FamilyAccessShareScreen were removed (export and delete stay on Account and Data export).
- **Native** Expo screens updated where they exist: SOS (Emergency) and DeleteAccount share the boards' source and now draw their own header. No Expo screen exists yet for EmergencyCard, IceContacts, CrisisSupport, MyPass, Legal, PlanBilling, FamilyCircle or ConsentInbox (native parity later).

## Amendment 2026-10-23: legal documents, consents and data rights (fix/consent-a11y)

Asked for in the fix/consent-a11y ticket (security audit H2), built within this plan's rules. Listed for
the named Tier 1 reviewer (Krishna Chintakayala) to confirm in the PR review.

- **D6-10 (amends).** The privacy notice, terms and grievance officer are admin-editable, versioned
  documents (`care_legal_documents`, Super admin → Governance → **Legal documents**): a super admin pastes
  legal's text into a draft and publishes it, live without a deploy. A published version is frozen and
  the one it replaces is kept as "Replaced". Legal (phone board) and WebLegal show the published text
  with its version and date, exactly as published (paragraphs split on blank lines, no formatting
  added); until a kind is published each tab keeps the honest "not published yet" notice it had. The
  "not an emergency service · call 112" line stays on every tab.
- **Profile → Privacy & consent** (`/privacy-consent`, student only; Tier 1 consent). Lists the sign-up
  consents (purpose, wording version, date, the notice/terms versions shown) and each optional consent with
  a `role=switch` that gives or withdraws it in one tap, the date it was given or withdrawn, and the full
  record. Withdrawing stamps `withdrawn_at`, is audited, and turns off the flag the processing reads in
  the same transaction (Ayush history: the agent stops keeping words and the kept words are erased; blood
  donor contact: out of every donor match and SOS; pickup location, seasonal tips, offers: stored only,
  nothing reads them today, the copy says so). The required ones explain that withdrawing means deleting
  the account and link to Download my data and Delete my account. Clinician shares stay on ConsentInbox
  (linked). No canvas board exists for this page: it is built from the student web parts (DESIGN.md §5,
  composed from components) and reflows into the phone frame.
- **Your data rights** (`/data-rights`, student only): access (data export), correction (profile and
  emergency card; records a doctor or lab created are corrected by them through Help), erasure (delete
  account, grace days from `privacy.deletion_grace_days`), consent withdrawal, and grievance (the published
  grievance officer document, or "not published yet" and Help).
- Not built: a typed reason or OTP on withdrawal (not needed: withdrawal is as easy as giving), a consent
  withdrawal for clinician shares here (ConsentInbox already revokes them), Expo screens for these pages
  (native parity later; the Expo Profile still opens Delete account).
