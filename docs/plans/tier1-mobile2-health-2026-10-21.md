# Mobile 2.0 health screens (Tier 1): canvas plan approved 2026-10-21

**Approved by:** _(design reviewer, date)_ · _(clinical lead, date)_ · _(AI-constitution owner, date: M2AskAyush and the Ayush consent only)_

**Status:** approved 2026-10-21 (Krishna Chintakayala, all 18 recommended decisions); built in `feat/m2-healthA` (package A: M2Profile, M2Insights incl. the stored-values section, M2AskAyush general mode, M2Product, M2Vaccines booking half) and `feat/m2-healthB` (package B: M2ReportUpload, M2Trends). Package C and the parts routed to the clinical lead or the AI-constitution owner are not shipped.
**Boards:** canvas page 9 · Mobile 2.0 (folder `10-mobile-2`, approved by the founder 2026-10-21):
M2Product, M2Vaccines, M2Insights, M2Trends, M2ReportUpload, M2AskAyush, M2Profile. Briefs
`design/screens/briefs/M2*.md`, pictures `design/screens/screenshots/10-mobile-2/`, sources
`design/screens/source/10-mobile-2/`. What each board replaces: `design/screens/mobile-2-supersedes.md` §1;
its feature → backend table: §3 there.
**Builds on:** `tier1-canvas-wp07-2026-10-20.md` (WP-07: phone clinical values, records, Ayush),
`tier1-ayush-container-2026-10-20.md` (S11 Ayush container), `tier1-care-flows-2026-10-19.md` §1, §2, §5.
**Depends on:** the M2 pill nav and M2Home (Tier 2 package, not here), S4 phone frame on web, S6 state
screens, S7 sheets, S11 Ayush container.

## Rules every screen in this package keeps

- **The app never writes clinical advice.** Every sentence that tells a student what to do about their body
  is (a) the doctor's words from a signed record (`report-reviews` guidance, lab `reviewNote`, a visit note),
  shown verbatim with the doctor's name and date, or (b) an approved source passage Ayush cites, or (c) a
  fixed line the clinical lead approves in this file (marked **[CL copy]** below). Board sample copy that
  gives advice (vaccine "why" lines, medicine uses, the doctor's note, the 3 steps) never ships as app copy.
- **Clinical logic does not change** (WP-07 rule): lab release before the student sees anything
  (`lab_payload(for_patient=True)`), critical handling, Ayush's crisis gate, scope guard, grounding and
  output guards, prescription rules (`/cart/validate` refuses `requires_prescription`; prescription
  listings return no alternatives).
- **Colours for values.** Outside the lab's range = `attention` / `attention-bg` (amber). In range =
  `positive` / `positive-bg`, never celebrated (no confetti, no "great job", no pulsing ring on a value).
  No range on the report = neutral (`text-2` on `neutral-bg`). Red (`danger*`) only for: SOS, the emergency
  card, the Tele-MANAS / 112 crisis line, and a server-flagged critical or allergy alert. Values in
  `clinical-value` + mono. No score, percentile, streak or "improve" framing about the body.
- **Source of every number.** Each value carries where it came from, as the server records it: "From
  StudentKare lab · released by Dr …", "Confirmed by you from a City Lab report", "Typed by you". No number
  is drawn that the server did not return; board sample values and `[price]` placeholders never ship.
- **Rule L.** Clinical reads use `workflow_db`; store reads use `commerce_db`. A link from a clinical card to
  a store page carries no medicine, test or value in its route, query or state. No clinical value on a page
  reachable from the store rail (see D-M2-3).
- **Help is one tap away.** SOS in the header on Insights, AskAyush and Profile opens the existing SosBeacon
  flow; never behind loading or an error state. Crisis numbers come from the server
  (`crisis_gate.TELE_MANAS_PRIMARY`, `EMERGENCY_NUMBER`), not copy.
- **Accessibility** (all screens): role + label on every control, 44 px hit areas (board 34–40 px chips and
  steppers become 44), visible focus, `aria-pressed` / `aria-checked` on toggles and segments, charts have a
  text alternative and a table view, `aria-live="polite"` for status changes, reduced motion stops the scan
  line, rises, pulses and chart draw-in. en/te/hi strings fit at 320 px.
- **Web + Expo.** Each board renders in the web phone frame (`StudentPhoneFrame`, ≤ 430 px) and as an Expo
  screen in `src/native/App.tsx`. One view-model per screen under `src/features/<area>/viewmodel/`, shared
  by both views (MVVM, `AGENTS.md`). Icons only via `src/design-system/icons` with the brief's names;
  tokens per `mobile-2-supersedes.md` §2. `check-icons --screen <Screen>` must pass and the files must be
  listed in `design/screens/implementation-map.json`.
- **Notifications** never carry a value, a medicine name or a test name (`DESIGN.md` §7).

## Summary

| Screen | Today | Board vs today (biggest gaps) | Data today | Not connected | Key decision |
|---|---|---|---|---|---|
| M2Product | `ProductDetailView.tsx` (ProductDetail, partial) | about accordion, generics list, stepper, pickup/delivery chips, "Add Rx" | `/catalog`, `/catalog/{id}/alternatives`, `/inventory/{id}` | reviewed medicine information; pickup/delivery estimate | D-M2-1, D-M2-2 |
| M2Vaccines | `PreventiveCareBoard.tsx` (`/preventive/vaccines` directory) | the student's vaccine record; vaccine picker; clinic vs vaccine-only; slot booking | `/preventive/vaccines` offerings | dose record; vaccine slots; reviewed "why" text | D-M2-3, D-M2-4, D-M2-5 |
| M2Insights | `YourCareBoard.tsx`; MyReports / ReportInsights not built | latest report values, need-a-look / in-range cards, body systems, doctor's note, due from your care | `/health/documents`, `/records/shares`, `/appointments`, `/preventive/report-reviews`, `/lab-orders`, `/refills/plans` | stored lab values; test → body-system reference | D-M2-6, D-M2-7, D-M2-8, D-M2-9 |
| M2Trends | not built (VitalTrends is vitals, stays) | each test over time, range bar, table, bookmark, doctor's steps | — | lab values over time; bookmark; structured steps | D-M2-6, D-M2-10, D-M2-11 |
| M2ReportUpload | vault upload (`VaultWorkspaceHub.tsx`, `RecordCaptureScreen.tsx`) | Add → Read → Check → Saved; values confirmed before saving | `POST /health/documents`, `POST /intake/{id}/process` (heuristic, reads no values) | value reading; confirm-and-save; value store | D-M2-6, D-M2-12 |
| M2AskAyush | `AgentAyushPanel.tsx`, `AyushChatNativeView.tsx` | answers about the student's own records, consent banner, report card | `/agents/ayush/ask`, `/agents/ayush/history` | record access (Ayush refuses by design: `PERSONAL_RECORD_ANSWER`) | D-M2-13, D-M2-14 |
| M2Profile | `StudentProfileBoard.tsx`, `MoreHubBoard.tsx`, `AccountDetailsBoard.tsx` | completeness ring, vitals strip, document cards, consent switches, medical leave | `/me`, `/profile`, `/body/measurements`, `/health/documents`, `/plans` | course/year; medical leave; Ayush consent; family share | D-M2-13, D-M2-15, D-M2-16 |

---

## M2Product (SK-062)

**Board vs today.** Today: `src/features/shopPhone/views/ProductDetailView.tsx` +
`viewmodel/PhoneShopViewModel.ts` inside `/shop` (Expo: `MarketplaceRoute`). It shows name, brand, price/MRP,
pack, "what it is / how to take / contains" from catalogue free text, a pack-change sheet from
`GET /catalog/{id}/alternatives`, a caution note and an add button disabled for prescription items. Board:
strength chip, "Prescription needed", "In stock at the clinic", composition, price + MRP + "inclusive of
taxes", quantity stepper 1–9 (`minus` / `plus`), CLINIC PICKUP "Today by 6 pm" / TO BLOCK C "Tomorrow 10–12",
"Same composition, other makers · Cheapest first. A pharmacist confirms the swap.", an accordion (What it is
used for · Common side effects · Do not take with) with "Source: … · reviewed by a pharmacist", "Add Rx",
"Add n to cart". Icons: `arrow-left`, `cart`, `chevron-down`, `flask`, `minus`, `plus`.

**Will change.** Board layout; stepper with `minus`/`plus` (max from the server's cart limit, today
`quantity le=10` in `workflow_api.py`, exposed as a setting rather than the board's 9); stock chip from
`GET /inventory/{id}` (`available`); generics list from `/catalog/{id}/alternatives` with "Lowest" on the
first row; the accordion (one open at a time, `aria-expanded`, `chevron-down` rotates; reduced motion: no
rotation animation) **only when reviewed information exists** (D-M2-1).

**Prescription medicines (the board's own example is one).** The server already decides: alternatives for a
prescription listing are `restricted: true` with the message "Only your prescriber can change it to another
brand", and `/cart/validate` / `POST /orders` refuse prescription lines. So for `requiresPrescription`:
no generics list (show the server's message), no stepper, no "Add to cart"; the primary action is "Send
your prescription to a pharmacy" (dispense flow, care-flows §2) and "Add Rx" opens PrescriptionUpload. The
board's "A pharmacist confirms the swap" applies to OTC listings only (D-M2-2).

**Will NOT change.** Pricing, stock, substitution and dispensing rules; no personal data on this page.
"Do not take with" is general information and is **never** cross-checked here against the student's own
medicines or allergies (that would join clinical data into a commerce page). A personal interaction check
belongs to the pharmacist / dispense flow.

**States.** Loading (skeleton) · data OTC · data prescription · out of stock (add disabled, server reason) ·
no reviewed information (accordion and source line hidden) · alternatives empty · error with retry · item
missing (existing `product-detail-missing`).

**Clinical content and its source.** Composition and strength: `care_medicines` + `care_medicine_ingredients`
via the catalogue (`composition`). Uses / side effects / do-not-take-with: new reviewed fields (Gap 5). Never
from `POST /ai/medication-lookup` or catalogue marketing text.

**Not connected.** Pickup-ready time and delivery window: no estimate API → the two chips are left out
(not drawn with invented times). "Inclusive of taxes": only if the catalogue records tax-inclusive pricing;
otherwise omitted.

**Colours.** "Prescription needed" = `attention` chip with text (not red). Stock = `positive` text label.

**Tests.** Prescription item: no alternatives, no add, pharmacy CTA present; OTC: stepper bounded by the
setting, add posts once; accordion hidden without reviewed info and never filled from the AI lookup;
no profile/medication request is made from this view (assert the API client calls); `check-icons --screen M2Product`.

## M2Vaccines (SK-042)

**Board vs today.** Today: `/preventive-care` → `src/features/preventive/views/PreventiveCareBoard.tsx`,
`screens/PreventiveCareScreen.tsx`, `VaccineDirectoryViewModel.ts` (Expo `PreventiveCareScreen`): a verified
directory of `VaccineOffering` rows (provider, pincode, `price_paise` nullable, `availability`
UNKNOWN/CONFIRMED, source URL, last verified). Board: amber hero; "Your vaccine record" with a timeline
(Hepatitis B 3 of 3 · Complete, Influenza · Due now, HPV · Not started…), "Add an old card", "Only what you or
a clinic recorded. We never guess a dose you might have had."; "Book a vaccine" picker (FL/HP/HB/TY badges),
doses and a "why" paragraph, "Given at the clinic" / "Vaccine only" segment, price, "Pick a slot", "How it
works" steps. Icons: `arrow-left`, `ayush-spark`, `box`, `check`, `heart-3`, `home`, `syringe`, `user-5`.

**Will change.**
- *Booking half (Tier 2 content on a Tier 1 board):* picker built from the vaccine names in
  `GET /preventive/vaccines` (badges are the name's initials, computed); provider, price from `price_paise`
  ("Price not listed" when null), availability as recorded with its last-verified date; "Pick a slot" shown
  **unavailable** ("Booking at the clinic isn't connected yet") until a vaccine slot API exists (D-M2-4).
- *Record half:* per D-M2-3, moved to My health as a "Your vaccine record" card (link card left here with no
  personal data), built on the new dose record (Gap 3) — or shown "not available yet" until it exists.

**Will NOT change.** The directory's verification rules and ops screens.

**Advice copy.** The board's "why" lines ("Recommended for all young adults", "Protects your liver for life")
and dose schedules ("2 or 3 doses", "1 dose · 3 years") are clinical advice. They ship only as
clinician-reviewed reference text with a source (Gap 3 reference table, `reviewed_by`, `source_url`); until
then the picker shows name, provider and price only (D-M2-5). "Due now" is a schedule judgement: not
computed by the app unless the clinical lead approves a schedule (D-M2-3).

**States.** Directory loading / empty ("No verified offerings near you yet") / error; record: loading, empty
("Nothing recorded yet. Add an old card or ask the clinic"), data, error; "Vaccine only" per D-M2-4.

**Colours.** Hero `service-amber-deep` → `service-amber-shade`, white text; record "Complete" = `positive`,
"Due" (if approved) = `attention`, "Not recorded yet" = neutral. No red.

**Tests.** Null price → "Price not listed"; "Pick a slot" disabled with reason; no "why" text without a
reviewed source; record never shows a dose the server did not return.

## M2Insights

**Board vs today.** Today: `/your-care` → `src/features/yourcare/views/YourCareBoard.tsx` (Expo `YourCare`),
reading `/profile`, `/appointments`, `/health/documents`, `/records/shares`, `/refills/plans`,
`/lab-orders?limit=1`, `/billing/me`. MyReports / ReportInsights are not built (WP-07 D7-6). Board: navy hero
with tabs (Insights · Improve · Trends · Records), stats (2 NEED YOU · Fri 4:30 pm NEXT CONSULT · 11 DOCUMENTS ·
0 SHARED NOW), "No health score here…", LATEST REPORT card (2 Need a look / 6 In range toggles and the value
rows with lab range), "Your doctor's note" with name and review date and "See the 3 steps", "Due from your
care" (Refills due → store; Repeat test your doctor ordered → Lab tests), "By body system" (Heart and blood,
Blood sugar, Vitamins, Thyroid with amber/green dots and "1 of 4 needs a look"), "Ask Ayush about this
report · Only with your OK. A doctor checks anything clinical." Icons: `ayush-spark`, `bottle`, `box`,
`chevron-right`, `droplet`, `heart-3`, `home`, `refresh`, `stetho`, `thyroid`, `user-5`.

**Will change.** New `src/features/insights/` (view-model + web/native views) replacing YourCare's overview;
stats: NEXT CONSULT from `/appointments` (earliest upcoming), DOCUMENTS = `/health/documents` `total`,
SHARED NOW = active `/records/shares`; "NEED YOU" per D-M2-8; doctor's note from the latest APPROVED
`/preventive/report-reviews` (`guidance.summary`, verbatim) or a released lab order's `reviewNote`, with the
doctor's display name and review date (Gap 1 adds `reviewedByName` to the review payload, which today only
returns an account id); "See the steps" → M2Trends steps; Due from your care per D-M2-9.

**Values (needs Gap 1).** LATEST REPORT groups the newest confirmed or released results by report. Each row:
test name, value + unit (mono), "Lab range …" as printed, chip from the server's `rangeState`
(`IN_RANGE` / `ABOVE` / `BELOW` / `NO_RANGE`). The two count cards are toggles (`aria-pressed`) filtering the
list. By body system: server-side grouping from the test reference table (Gap 1); dots per test, amber/green,
with text "1 of 4 outside the lab's range" (dots are never the only cue). Without Gap 1 the section shows
"Values from your reports aren't stored yet. Your reports are in Records" with a link (honest empty state).

**Tabs.** "Insights" (this), "Trends" → M2Trends, "Records" → RecordsVault (`/records`), not Profile.
"Improve" is dropped (D-M2-7).

**Advice copy.** Doctor's note: verbatim, attributed. "No health score here: we show what needs doing, never
a number about your body" **[CL copy]**. Nothing else on the page interprets a value.

**States.** Loading · first time (no reports: "Add a lab report" → M2ReportUpload) · data need-a-look ·
data all in range (no green celebration, no ring animation) · report without a doctor's note ("Ask a doctor
to explain it" → `POST /preventive/report-reviews`) · review requested / assigned (status only) · error per
resource (one failing endpoint does not blank the page; each card has its own retry) · offline (banner;
nothing cached, D7-1 carries).

**Colours.** Hero `hero-bg` / navy gradient tokens; need-a-look card `attention-bg` + `attention`; in-range
card `positive-bg` + `positive`; Heart and blood tile rose (`service-rose-soft` + `-ink`). Selected card ring
is a 2.5 px `attention` / `positive` outline plus `aria-pressed`.

**Tests.** Unreleased lab orders contribute nothing; a value with no range is neutral; count cards match the
rows; no value or test name in any link to the store; each resource fails independently; "Ask Ayush about
this report" hidden unless D-M2-13 is built and consent is on.

## M2Trends

**Board vs today.** Not built. `screens/health/VitalTrendsTelemetryScreen.tsx` is vitals, unrouted and fake
(WP-07: delete it in the VitalTrends PR); VitalTrends (vitals) stays. Board: "3 reports · 2023 to 2026",
test chips (HbA1c · HDL · Vitamin D · Haemoglobin, each with an amber/green dot), LATEST value + unit + state
badge (In range / Above range / Below range), range bar (Low · Range · High) with a marker, Graph / Table
segment, `chart-test-trend` line chart with the range band and coloured points, table (date, lab, value chip),
"Values you confirmed from your reports. Different labs can use slightly different ranges.", "Your doctor's 3
steps · from Dr. S. Kumar" (Walk after lunch and dinner · Daily · 15 min; Fewer fried and refined foods;
Repeat HbA1c · In 3 months), header bookmark. Icons: `arrow-left`, `ayush-spark`, `bookmark`, `bowl`, `box`,
`flask`, `heart-3`, `home`, `user-5`, `walk`.

**Will change.** New screen from `GET /health/lab-results/trends?test=<code>` (Gap 1): chips for tests with
≥ 1 stored result; badge and range bar use the **latest row's own** range; each point coloured by its own
row's range; the band drawn only when every plotted row shares one range and unit (else the band is omitted
and the footnote explains); a line only with ≥ the settings minimum (`trends.min_points_for_line`, default 2),
below it the single value and "Too few reports for a trend" **[CL copy]**; rows with a different unit are never
plotted on the same axis (table only). `chart-test-trend` is a data-driven component in
`src/design-system/charts/` with a text alternative ("HbA1c over time: Dec 23 6.1, …") and the table as the
accessible equivalent. Bookmark per D-M2-10. Steps per D-M2-11.

**Will NOT change.** No direction words ("rising", "improving", "down 0.7 since March") unless the clinical
lead approves wording (WP-07 D7-8 carries). No trend line projected forward, no target, no goal.

**States.** Loading · empty (no stored values: "Add a lab report" → M2ReportUpload) · one report · data ·
mixed units · no doctor's steps (section hidden) · error · offline.

**Colours.** Points/chips `attention` outside, `positive` inside, neutral without range; selected chip
`action`; band = `color-mix(positive, surface)`; line `chart-categorical-1`. No red.

**Tests.** Range per row (two labs, two ranges → correct chips); band omitted on mixed ranges; unit mismatch
not plotted; draft (unconfirmed) values never appear; chart text alternative matches data.

## M2ReportUpload

**Board vs today.** Today: upload in RecordsVault (`src/screens/vault/VaultWorkspaceHub.tsx`; Expo
`RecordCaptureScreen.tsx`, `recordUpload.ts`) → `POST /health/documents` (categories LAB, PRESCRIPTION,
VACCINE, …; virus-scanned) and `POST /intake/{id}/process`, whose heuristic `extract_fields` reads a date, a
"Dr …" name, a document type and capitalised words as "medication" — **no lab values**. Board: orange hero,
stepper Add · Read · Check · Saved, sources (Take a photo · Upload a PDF · From a StudentKare lab), "Your report
stays in your vault. It is never used to sell you anything.", Read (scanning line, "Reading your report…",
progress, "Continue (preview)"), Check ("We found 8 values. Check them. Tap any value to fix it. Untick anything
we read wrong; it won't be saved." with ticks and range chips, "Save 8 values to my record"), Saved ("Added to
your record · 8 values from City Lab, 20 Jun. 2 are outside the lab's range.", "Ask a doctor to explain it",
"See my trends"). Icons: `arrow-left`, `camera-2`, `check`, `chevron-right`, `doc-upload`, `flask`.

**Will change.**
- *Add:* photo (existing Expo camera flow; web file input with `capture`), PDF, or "From a StudentKare lab"
  (lists the student's released lab orders from `/lab-orders`; nothing to upload). Limits ("JPG, PNG or PDF ·
  up to N MB") from the server.
- *Read:* per D-M2-12 there is no value reader today, so the Read step is **skipped** and the stepper shows
  Add · Check · Saved. No scanning animation or progress bar is drawn for work that is not happening.
- *Check:* the student enters or corrects each value (test from the reference list with free-text fallback,
  value, unit, range as printed, report date, lab name); every row starts **unticked** for a typed value and
  is saved only when ticked (no pre-ticked confirmation, `DESIGN.md` §7). When a reader exists, read values
  arrive as drafts and still need the tick.
- *Saved:* counts and "n are outside the lab's range" from the server's response; "Ask a doctor to explain it"
  → `POST /preventive/report-reviews` for that document (creates the review request, with the existing share
  rules); "See my trends" → M2Trends. No celebration: a plain `check` in `positive`, no pulsing ring.

**Will NOT change.** Document storage, virus scan, categories; prescriptions still go to PrescriptionUpload.

**States.** Pick · uploading (progress from the upload, real) · upload failed (server message, retry) ·
Check with 0 rows · Check validation errors (per row, server message) · saving · saved · partial save refused
(all or nothing, server 409) · offline (upload disabled; banner).

**Colours.** Hero `service-orange-deep` → `-shade`; chips per range state; "Saved" tick circle
`service-green-deep` → `-shade`.

**Tests.** Nothing is stored as a result until confirm; unticked rows are not saved; another account's
document/intake → 404; confirm twice is idempotent; saved values carry source `STUDENT_CONFIRMED`;
the "never used to sell you anything" line is true (Rule L test that `commerce` role cannot select the table).

## M2AskAyush

**Board vs today.** Today: `/ayush` → `src/screens/workspace/AgentAyushPanel.tsx`; native
`src/features/chat/views/AyushChatNativeView.tsx` + `viewmodel/AyushViewModel.ts`; the S11 container plan adds
the sheet/widget. Ayush answers from approved sources only and refuses personal-record questions
(`agent_ayush.PERSONAL_RECORD_ANSWER`: "I can't read your health records or interpret your results — that's
deliberate"). Board: header "Ayush · BETA · Explains your own records. Not a doctor.", SOS, consent banner "You
allowed Ayush to read your lab reports and prescriptions. Change", a thread about HbA1c, a report card ("From
your report · 20 Jun · Above range · HbA1c 7.6 % · Your doctor has already seen this and wrote a note · Talk to a
doctor about it"), suggestions (What changed since last time? · Explain my lipid profile · Which tests are due? ·
What did my doctor write?), the crisis line "Feeling low or unsafe? Tele-MANAS is free, 24×7. Call 14416", input
"Ask about your records", footer "Ayush can be wrong. A doctor checks anything clinical before it reaches you."
Icons: `arrow-left`, `arrow-right`, `phone`, `shield`.

**Will change (two modes).**
- *General mode (consent off, or D-M2-13 not built):* the board's frame with the S11 container behaviour
  (input, typing status from a real pending request, error, offline, crisis card from the server's `CRISIS`
  outcome). Header line "Answers from approved sources. Not a doctor." The consent banner reads "Ayush can't
  read your records" with "Turn on in Profile" only if D-M2-13 is built. Suggestions are general ones that
  pass the scope guard; record suggestions are hidden.
- *Records mode (consent on, D-M2-13 built):* banner text from the consent's recorded wording, "Change" →
  Profile switch; the report card drawn from the server's structured `recordFacts` in the answer (never from
  parsing the answer text); record suggestions shown.

**Will NOT change.** The crisis gate runs first on every message in both modes; scope guard; grounding and
output guards; no answer from model weights; transcript kept only if `ayush_history_enabled`.

**Answers about records (D-M2-14).** The record part of an answer is a deterministic statement built on the
server from stored rows: "Your 20 Jun report shows 7.6 %. The lab's range is 4.0–5.6 %, so it is above the
lab's range." plus, if a doctor's note exists, "Your doctor reviewed this on 22 Jun" (and the note verbatim
on request). What a test measures comes from an approved knowledge source, cited. "What should I do" →
"For what to do next, a doctor will guide you" **[CL copy]** + "Talk to a doctor about it" (`POST /appointments`
flow). Record facts never enter a model prompt (the constitution rule in `agent_ayush.py` stays true).

**Colours.** Range bar in the report card: in range `positive`, near/out `attention` (founder fix, no red).
Crisis line `danger` with `phone`, 44 px `tel:` button ("Call 14416, Tele-MANAS"). BETA neutral.

**States.** Empty thread (greeting + suggestions) · sending · answered with sources (`check` chips) ·
refused (existing refusal notes) · no approved source · crisis (card, not dismissible while latest, D7-5) ·
consent off · consent revoked mid-thread (next answer refuses; banner updates) · error · offline.

**Tests.** Consent off → records question gets `PERSONAL_RECORD_ANSWER`; consent revoked → refused on the
next turn (no cache); consent lookup failing → refused (fail closed); only CONFIRMED / released rows of the
asking account; record facts absent from `llm_gateway` prompts (spy); crisis text with consent on still
returns `CRISIS`; no advice verbs in record statements (output guard test); `check-icons --screen M2AskAyush`.

## M2Profile

**Board vs today.** Today: `/profile` → `src/features/account/views/StudentProfileBoard.tsx` (reads
`/profile`), `MoreHubBoard.tsx`, `AccountDetailsBoard.tsx`; Expo `More`, `DigitalId`. Board: SOS; avatar
initials, "Aarav Reddy · B.Tech CSE · 3rd year · Hostel B", "Profile 80% complete" ring with "This ring shows how
much of your profile is filled in. It is not a health score."; vitals strip (Height 174 cm · Added Jun ·
Weight 68 kg · Blood B+ · From lab); On campus: Emergency card (danger card, "Works offline"), Check-in pass,
Medical leave; Health documents cards (Lab reports 6 · Prescriptions 4 · Scans 1 · Vaccines 3, "+ Add");
Student Plus "₹149 a month · or 3 months for ₹2,199"; rows: Ayush can read my records (switch, on), Share with
family (switch, "coming soon"), Addresses, Orders and payments, Language, Privacy and data, Help and support;
Sign out. Icons: `chevron-right`, `credit-card`, `doc`, `flask`, `lock-4`, `map-pin-2`, `message-circle-3`,
`plus`, `plus-square`, `scan`, `settings`, `shield-2`, `star`, `syringe`, `translate`, `user-5`.

**Will change.**
- *Identity line:* `fullName`, `university`, `hostelBlock` from `/profile`. Course and year are not stored →
  omitted (D-M2-16). Initials computed.
- *Completeness ring (`chart-profile-complete-ring`):* computed on the client from which profile fields are
  filled (name, DOB, university, roll number, hostel/room, emergency contact, blood group, allergies answered),
  the field list declared once in the view-model; the ring and its text label ("6 of 8 details added") are
  equal cues. No backend (Gap 4). Never counts clinical values as "good".
- *Vitals strip:* height and weight from `GET /body/measurements` with their recorded date and source; blood
  group from `/profile` labelled "Typed by you" (the board's "From lab" only if a confirmed lab result
  exists for it — not in phase 1). Empty values "Not added" with an add link.
- *Documents cards:* counts by `category` from `/health/documents` (LAB, PRESCRIPTION, OTHER/scans per
  D-M2-16 mapping); "Vaccines" count from Gap 3 or the VACCINE document count, labelled as documents.
- *Student Plus:* name and prices from `GET /plans`; hidden if the call fails (no fallback price).
- *Ayush switch:* per D-M2-13. Defaults **off** (the board shows it on; pre-ticked consent is a dark pattern).
  Turning on opens a confirm sheet with the exact versioned wording (what Ayush reads, that it can be turned off
  any time, that a doctor checks anything clinical); the switch shows the server state only; while loading it is
  disabled; on any error it shows off with the error (fail closed). Turning off is one tap, effective at once.
  Without D-M2-13 the row shows "Not available yet", no switch.
- *Share with family:* no switch (a control that does nothing is fake); row "Coming soon", not focusable as a
  toggle (D-M2-15).
- *Addresses:* hostel block and room from `/profile` (the only address stored).
- *Rows:* Orders and payments → `/orders`; Language → client i18n; Privacy and data → DataExport /
  DeleteAccount; Help → HelpCentre; Emergency card, Check-in pass → existing Tier 1 screens (unchanged).
- *Medical leave:* no backend → left out (D-M2-16).

**Colours.** Emergency card `danger-fill` flat (founder list allows red here); document cards `-deep` →
`-shade`; completeness ring `action` (not positive/attention: it is not a health state).

**States.** Loading · data · partial (each resource independent) · no measurements · consent switch:
off / confirming / on / saving / error · error · offline (emergency card still opens from its offline view
model).

**Tests.** Switch never shows on without a server grant; withdraw takes effect on the next Ayush turn; ring
counts only declared fields; no price without `/plans`; course/year absent; `check-icons --screen M2Profile`.

---

## How WP-07 maps onto Mobile 2.0

| WP-07 board / decision | M2 | Carries over | M2 changes |
|---|---|---|---|
| MyReports, ReportInsights; **D7-6** structured results | M2Insights (+ M2Trends, M2ReportUpload) | Nothing before release; critical handling; doctor's note verbatim; "talk to a doctor" with price first; amber out of range | D7-6 becomes Gap 1 here: the boards assume stored values, so the recommendation flips from "document + note only" to "build the value store", with student-confirmed values added as a second source |
| "Ask Ayush about this report" (WP-09 D9-4) | M2Insights card, M2AskAyush | Not drawn until a report-scoped Ayush exists | Becomes D-M2-13/14: record access by explicit, revocable consent |
| AyushChat, AyushSheet; **D7-4** container, **D7-5** crisis card | M2AskAyush | S11 container scope, disclaimer always visible, crisis card from server outcome, not dismissible while latest (D7-5 recommendation carries) | New header/footer copy; consent banner; records mode |
| VitalTrends; **D7-8** direction wording | stays; M2Trends is lab values | No direction words without CL approval (D7-8 applies to M2Trends too); delete the fake telemetry screen | New lab-value trends screen with per-row ranges |
| RecordsVault upload; **D7-3** ABHA pull | M2ReportUpload | ABHA pull stays hidden (D7-3) | Confirm-before-save flow; values stored |
| RefillRequest; **D7-7** refill routing | M2Insights "Refills due" | Refills go through `/refills` to a pharmacy, never the cart | The founder linked "Refill in the store" → M2Medicines; see D-M2-9 |
| **D7-1** offline cache | all M2 health screens | No PHI cached on device until D7-1 is decided; offline shows banner + crisis/emergency only | — |
| ConsultSummary **D7-9** | — | — | not in this package |
| StudentProfile (not WP-07) | M2Profile | Emergency card / check-in pass / consent screens unchanged | Ayush consent switch is new |
| ProductDetail (care-flows §2), PreventiveCare | M2Product, M2Vaccines | Prescription items never reach the cart; directory verification | Product becomes Tier 1 (clinical information); vaccine record is new |

---

## The honest gaps and the smallest backend for each

All migrations branch from `f1a9c3e5b7d2` (the integrator re-chains). Every table gets a plane in
`backend/core/rule_l.py` (`tests/test_rule_l.py` fails otherwise), an FK to `care_accounts.id` where it holds a
person's data (so `services/erasure.py` discovers it), a section in `GET /records/export`, and the
`postgres_full_schema.sql` update if the CI drift check requires it. Owner-scoped reads; no PHI in logs or
audit text (audit carries ids only).

### Gap 1 — Stored lab values (Insights values, Trends, ReportUpload confirm-and-save)

- **Tables.**
  - `care_lab_test_reference` — **PLATFORM** (no person): `code` (PK; LOINC where known), `display_name`,
    `body_system` (enum: HEART_BLOOD, BLOOD_SUGAR, VITAMINS, THYROID, KIDNEY, LIVER, BLOOD_COUNT, OTHER),
    `default_unit`, `active`, `reviewed_by`, `reviewed_at`. Seeded by a clinician-reviewed migration; the
    body-system grouping is the clinical lead's.
  - `care_lab_results` — **CLINICAL**: `id`, `account_id` FK, `test_code` (nullable FK to reference),
    `test_name_as_printed`, `value_numeric` (nullable), `value_text`, `unit`, `ref_low`, `ref_high`,
    `ref_text` (as printed), `collected_on` (date), `lab_name`, `source` (`LAB_RELEASED` | `STUDENT_CONFIRMED`),
    `document_id` (nullable FK `care_documents`, cascade), `lab_order_id` (nullable FK `care_lab_orders`),
    `status` (`DRAFT` | `CONFIRMED`), `created_at`, `confirmed_at`.
    `range_state` is computed on read (never stored): within `[ref_low, ref_high]` → IN_RANGE, else ABOVE /
    BELOW, missing range or non-numeric → NO_RANGE.
  - `care_preferences.pinned_lab_tests` JSON column (CLINICAL table already) for the bookmark (D-M2-10).
- **Endpoints (`services/lab_results.py`, `workflow_db`).**
  - `GET /api/health/lab-results` — own CONFIRMED rows + rows from REPORT_RELEASED own lab orders; grouped by
    report; includes `rangeState`, `source`, `bodySystem`.
  - `GET /api/health/lab-results/trends?test=` — one test over time, newest first, each row's own range.
  - `GET /api/lab-tests/reference` — the reference list (public, platform).
  - `POST /api/health/documents/{id}/lab-results` — create DRAFT rows for an owned LAB document (typed by the
    student; later, from a reader).
  - `PATCH /api/health/lab-results/{id}` (DRAFT only, owner) · `DELETE` (owner; CONFIRMED student rows too).
  - `POST /api/health/documents/{id}/lab-results/confirm` `{ids:[…]}` — all-or-nothing → CONFIRMED; returns
    counts by `rangeState`.
  - `PUT /api/health/lab-results/pinned` `{codes:[…]}`.
  - Lab-entered values for StudentKare lab orders (`LAB_RELEASED`) are a follow-on: the lab enters rows with
    the report; they become visible only through the existing release gate. Not in phase 1 (the lab console
    is a separate Tier 1 surface).
- **Settings.** `lab_results.max_rows_per_report`, `trends.min_points_for_line`, value/unit bounds.
- **Fail-closed tests.** another account's document/result → 404; DRAFT never returned by list/trends/Ayush;
  unreleased lab order rows never returned; confirm of an id from another document → 422 and nothing saved;
  commerce session cannot select `care_lab_results` (rule_l grants test); erasure removes rows; export
  includes them; notification payloads contain no value or test name; no-range row → NO_RANGE.

**Built 2026-10-21 (package B backend, branch `feat/m2-labvalues`; migration `c3d7e2a9f4b1`, branches from
`f1a9c3e5b7d2`).** No screens.
- Tables: `care_lab_test_reference` (PLATFORM; created **empty**: the seed is a separate clinician-reviewed
  migration, the clinical lead owns the body-system grouping), `care_lab_results` (CLINICAL), column
  `care_preferences.pinned_lab_tests`. As specified above; `unit` is 40 chars.
- Endpoints (`services/lab_results.py`, students only, owner only; other account → 404, other role → 403):
  `GET /api/lab-tests/reference` · `GET /api/health/lab-results` (reports + `bodySystems` + `total`) ·
  `GET /api/health/lab-results/tests` (chips: one per test key, bookmarked first) ·
  `GET /api/health/lab-results/trends?test=<key>` · `GET` / `PUT /api/health/lab-results/pinned` `{codes}` ·
  `GET` / `POST /api/health/documents/{id}/lab-results` (the Check step's rows; POST adds DRAFTs; LAB documents
  only) · `POST /api/health/documents/{id}/lab-results/confirm` `{ids}` (all or nothing: ids from another
  report → 422 and nothing saved; concurrent change → 409; unticked drafts of that report are discarded;
  idempotent) · `PATCH /api/health/lab-results/{id}` (DRAFT only, else 409) · `DELETE /api/health/lab-results/{id}`
  (not LAB_RELEASED rows).
- Test key: the reference code, or `name:<printed name, case-folded>` for a test typed without a code.
- Every value returns `rangeState` (computed on read from its own printed range) and `rangeSource`
  (`TYPED_FROM_REPORT` | `LAB_REPORT`, null when NO_RANGE). One-sided printed ranges ("< 200", "> 40") work.
- Settings: `lab_results.max_rows_per_report`, `.value_abs_max`, `.collected_on_max_age_years`, `.list_cap`,
  `.pinned_max`, `trends.min_points_for_line`. Input bounds only; no clinical thresholds.
- `GET /records/export` gains `labResults` and `pinnedLabTests`; deleting a report deletes its values; erasure
  finds the table through its `account_id` FK.
- D-M2-11: `nextSteps` accepts plain lines or `{text, kind, often?, when?}`; the review payload keeps
  `nextSteps` as strings and adds `steps` (plain lines read back as OTHER).
- Frontend data layer: `src/features/labResults/data/LabResultsRepository.ts`,
  `viewmodel/labValueModels.ts`, `viewmodel/LabValuesViewModels.ts` (InsightsValues, Trends, ReportCheck).
- Not built here: lab-entered `LAB_RELEASED` rows (follow-on, lab console), doctor reads through shares, Ayush
  reads (Gap 2), the reference seed, `reviewedByName` (package A).

### Gap 2 — Ayush record access

- **Consent store.** Reuse `care_consent_records` (CLINICAL, append-only, versioned, `withdrawn_at`) with
  purpose `AYUSH_READ_LAB_RESULTS`; wording version in `care_dpdp_consent_policy_versions`. No new table.
  (Not `care_notification_preferences`, which is IDENTITY plane and is where `ayush_history_enabled` lives.)
- **Endpoints.** `GET /api/agents/ayush/record-access` (state + wording version) · `POST` (grant, with the
  version shown) · `POST /api/agents/ayush/record-access/withdraw`.
- **Agent.** In `agent_ayush.ask`, after the crisis gate and scope guard: if the question is a personal-record
  question **and** an active grant exists (read per turn, exception → no access), answer with deterministic
  record statements from Gap 1 rows (CONFIRMED / released, own account) + cited approved passages; return
  structured `recordFacts` for the report card. Otherwise `PERSONAL_RECORD_ANSWER` as today. Record facts
  are never put into the `llm_gateway` prompt; the module docstring is updated by the AI-constitution owner.
- **Scope phase 1:** lab results only. Prescriptions (board: "lab reports and prescriptions") later (D-M2-13).
- **Fail-closed tests:** listed under M2AskAyush; plus grant without the current version → 409; withdraw
  is immediate; erasure and export include the grant history.
- **Depends on Gap 1.** Without stored values there is nothing to read: ship unavailable.

### Gap 3 — Vaccine record

- **Tables.** `care_vaccine_doses` — **CLINICAL**: `id`, `account_id` FK, `vaccine_code` (FK reference),
  `dose_number` (nullable), `given_on` (date) + `date_precision` (DAY | MONTH | YEAR), `source`
  (`CLINIC_RECORDED` | `STUDENT_TYPED` | `FROM_DOCUMENT_CONFIRMED`), `document_id` nullable FK, `recorded_by`,
  `created_at`. `care_vaccine_reference` — **PLATFORM**: `code`, `display_name`, `doses_text`, `about_text`,
  `source_title`, `source_url`, `reviewed_by`, `reviewed_at` (empty about/doses until a clinician fills them).
- **Endpoints.** `GET /api/health/vaccinations` (own) · `POST` (STUDENT_TYPED, optional `documentId` of an
  owned VACCINE document) · `DELETE /{id}` (own STUDENT_TYPED only) · `POST /api/work/vaccinations` (clinician
  at the clinic, CLINIC_RECORDED; needs an active care relationship — reuse the record-share check) ·
  `GET /api/vaccines/reference`.
- **No "Due".** No schedule logic in phase 1 (D-M2-3).
- **Fail-closed tests:** other account → 404; a student cannot create CLINIC_RECORDED; clinician without an
  active share → 403; rule_l plane; erasure/export.
- **Smaller alternative:** ship "Your vaccine record" unavailable and keep "Add an old card" as a VACCINE
  document upload (exists today).

### Gap 4 — Profile completeness

No backend. Computed on the client from `/profile` fields, list declared once. Course/year: not stored; adding
them is an identity-plane profile change (`ProfileUpdate`) — not proposed here (D-M2-16).

### Gap 5 — Reviewed medicine information (M2Product)

Columns on `care_medicines` (**COMMERCE**, no person): `uses_text`, `side_effects_text`, `avoid_with_text`,
`info_source_title`, `info_source_url`, `info_reviewed_by` (pharmacist or prescriber account), `info_reviewed_at`.
Written via `PATCH /api/work/medicines/{id}/information` by `require_dispenser_or_prescriber`; returned by the
catalogue only when reviewed. Tests: unreviewed → absent; super-admin alone cannot mark reviewed; fields never
populated from `/ai/medication-lookup`. Smaller alternative: ship the accordion hidden.

### Residual risks found while planning (not fixed here)

- `GET /api/ops/intake/review` shows super-admins extracted fields (doctor names, "medication" tokens) from
  students' own documents. That is clinical data on an ops queue; the Gap 1 work should not extend it, and it
  needs its own review.
- `bloodGroup`, `allergies` and `chronicConditions` live in `care_accounts.profile` (IDENTITY plane), not a
  clinical table. M2Profile reads them as today; the plane question is for the Rule L owner.
- `/refills/plans` returns `id`, `name`, `dosage` only — no refill-due date, so the board's "Vitamin D3 60K ·
  2 Nov" cannot be shown; lab orders carry no "due since" date (only `created_at`).

---

## Decisions for the reviewer

Each has a **recommended** answer so the plan can be approved in one pass.

1. **D-M2-1 Medicine information on M2Product.** Build reviewed fields (Gap 5) or hide the accordion.
   **Recommended:** hide the accordion in package A; build Gap 5 in package C; never fill from the AI lookup.
2. **D-M2-2 Prescription medicines on M2Product.** The board shows generics and "Add to cart" on a
   prescription medicine; the server refuses both. **Recommended:** keep the server rules; prescription items
   show the server's "only your prescriber can change it" message and "Send your prescription to a pharmacy" /
   "Add Rx"; generics + cart only for OTC.
3. **D-M2-3 Vaccine record placement and "Due".** **Recommended:** move "Your vaccine record" to My health
   (as the founder did for refills: no personal health data on a store-rail page); M2Vaccines keeps a plain
   link card; no "Due now" until the clinical lead approves a schedule.
4. **D-M2-4 Vaccine booking.** No vaccine slot API; "Vaccine only" implies dispensing a prescription
   biological without administration. **Recommended:** "Pick a slot" shown unavailable; drop "Vaccine only"
   (clinic-given only).
5. **D-M2-5 Vaccine "why" and dose text.** **Recommended:** omit until clinician-reviewed reference text with a
   source exists (`care_vaccine_reference`); never ship board copy.
6. **D-M2-6 Stored lab values (supersedes WP-07 D7-6).** **Recommended:** build Gap 1 with student-confirmed
   values first; lab-entered values for StudentKare orders as a follow-on through the release gate.
7. **D-M2-7 Insights tabs.** **Recommended:** Insights · Trends · Records (→ RecordsVault); drop "Improve"
   (no content behind it; "improve" framing about the body).
8. **D-M2-8 "NEED YOU" stat.** **Recommended:** count of open care actions (refills due, doctor-ordered tests
   not yet collected, review requests with a decision) — not a count of out-of-range values; label "To do".
9. **D-M2-9 Due-from-your-care links.** The founder linked "Refill in the store" → M2Medicines and "Book in Lab
   tests" → M2Labs. Prescription medicines cannot be bought in the store, and a doctor-ordered test is already a
   lab order. **Recommended:** "Request a refill" → RefillRequest (`/refills`); "Pick a collection time" on
   the existing order (`/lab-orders/{id}/slots`); no store link from these cards. Needs the founder's OK.
10. **D-M2-10 Trends bookmark.** **Recommended:** build (one JSON column on `care_preferences`, server-side;
    never in client storage, a test name is health data).
11. **D-M2-11 Doctor's steps with icons and "often / when".** Guidance `nextSteps` are free-text strings.
    **Recommended:** extend `nextSteps` to `{text, kind: ACTIVITY|FOOD|TEST|OTHER, often?, when?}` chosen by the
    doctor in the review form (back-compatible: strings render as OTHER without an icon); icons `walk`, `bowl`,
    `flask` map from `kind`.
12. **D-M2-12 Reading values from a report.** There is no reader; any OCR/LLM reader must go through the AI
    constitution and is out of scope. **Recommended:** ship Add · Check (typed by the student, unticked by
    default) · Saved; no "Reading your report…" animation until a reader exists and is approved.
13. **D-M2-13 Ayush record access.** **Recommended:** build Gap 2 after Gap 1, lab results only (prescriptions
    later), consent in `care_consent_records` with versioned wording, default off, checked per turn, one-tap
    withdraw; until then the switch row reads "Not available yet" and M2AskAyush runs in general mode.
14. **D-M2-14 What Ayush may say about a value.** **Recommended:** only deterministic statements (value, the
    lab's range, above/below/within, date, whether a doctor reviewed it) + cited approved passages; any "what
    should I do" → the doctor line and booking. No model sees record values.
15. **D-M2-15 Share with family.** **Recommended:** row "Coming soon" with no switch.
16. **D-M2-16 Profile fields without a backend.** Course/year, medical leave, "From lab" on blood group.
    **Recommended:** omit course/year and medical leave; blood group labelled "Typed by you"; scans card = OTHER
    category documents until a SCAN category exists.
17. **D-M2-17 Colour from the lab's printed range** (care-flows §5 said "never colour-code without a
    clinician-approved range"). **Recommended:** amber/green from the lab's own printed range, with the range
    always shown next to the value and the source labelled (including "range as you typed it"); clinical lead
    to confirm.
18. **D7-5 and D7-8 carry over** (crisis card stays while latest; no direction wording on trends).
    **Recommended:** as WP-07.

---

## Build order

Each package is one ticket per screen, each screen its own PR after approval; backend PRs first in a package.

**Package A — M2 health screens on today's data (no new tables).**
M2Profile (Ayush row "Not available yet", no family switch), M2Insights phase 1 (stats, doctor's note with
`reviewedByName` — a payload-only change in `preventive_care.review_payload`, due-from-your-care per D-M2-9,
values section as an honest empty state), M2AskAyush general mode (on the S11 container), M2Product (OTC/Rx per
D-M2-2, accordion hidden), M2Vaccines booking half (directory, "Pick a slot" unavailable, record link card).

**Package B — Lab values (Gap 1) and the screens that need them.**
Backend: reference + results tables, endpoints, pinned tests, guidance `nextSteps` shape (D-M2-11), settings,
tests. Then M2ReportUpload (Add · Check · Saved), M2Trends, and the M2Insights values / body-system sections.

**Package C — Consent-gated Ayush, vaccine record, medicine information.**
Backend: Gap 2 (AI-constitution owner signs), Gap 3, Gap 5. Then M2Profile Ayush switch, M2AskAyush records mode
and report card, "Ask Ayush about this report" on M2Insights, "Your vaccine record" in My health, M2Product
accordion.


## Approval

Krishna Chintakayala (founder, named Tier 1 reviewer) approved all 18 recommended decisions on 2026-10-21, including #9 (care links go to RefillRequest and the existing order's slot booking, not the store). Items the plan routes to the clinical lead or the AI-constitution owner still need their sign-off before those parts ship.

## Decisions taken (approved by Krishna Chintakayala, 2026-10-21)

### Package A (feat/m2-healthA)

One line each: ID, choice, why.

- D-M2-1: "About this medicine" not drawn; never filled from the AI lookup. No reviewed fields exist (Gap 5 is package C).
- D-M2-2: prescription listings show the attention chip, the prescriber note, "Add Rx" (vault upload) and "Send your prescription to a pharmacy" (dispense flow); no other makers, stepper or add. OTC: other makers cheapest first with "Lowest", stepper bounded by new public setting `shop.cart_line_max` (default 10, enforced by /cart/validate and /orders).
- D-M2-3: no vaccine record on M2Vaccines (plain link card to My health); M2Insights shows "Your vaccine record · not available yet" with "Add an old card" (vault upload). No "Due".
- D-M2-4: "Pick a slot" drawn disabled with the reason; "Vaccine only" dropped.
- D-M2-5: no "why" text or dose schedules; picker shows name, provider, price ("Price not listed" when null), availability and last-checked date.
- D-M2-6: Insights values come from the package B store (GET /health/lab-results); student-confirmed values only today.
- D-M2-7: tabs Insights · Trends (/health/trends) · Records (vault); "Improve" dropped.
- D-M2-8: "To do" = refill plans + doctor-ordered tests not yet collected. Review decisions are not counted (the API cannot tell whether one was seen).
- D-M2-9: "Request a refill" opens the refill request; "Pick a collection time" opens the student's orders and prescriptions (web) where the order's slot is picked; no store link, nothing passed in the link. Expo: refill only (no slot screen in the app yet).
- D-M2-10, D-M2-11, D-M2-12: package B (not here). "See the n steps" links to Trends only when the approved review has steps.
- D-M2-13: not built (AI-constitution owner). Profile row "Ayush can read my records · Not available yet", no switch; M2AskAyush general mode only; "Ask Ayush about this report" not drawn.
- D-M2-14: not applicable in general mode (no record answers).
- D-M2-15: "Share with family · coming soon", no switch.
- D-M2-16: course/year and medical leave omitted; blood group "Typed by you"; scans card = OTHER documents.
- D-M2-17: amber/green from the server's rangeState on the lab's printed range, range always printed next to the value, "ranges as you typed them" note; clinical lead still to confirm.
- D7-5 / D7-8: crisis card from the server's CRISIS outcome stays in the thread; no direction words anywhere.
- Backend (rule 5): `reviewedByName` on GET /preventive/report-reviews (approved only), `categoryCounts` on GET /health/documents (owner only), `shop.cart_line_max` setting. Tests in backend/tests/test_m2_health_payloads.py.
- Profile ring counts 7 declared fields, not 8: allergies are left out because the server stores the same empty list for "none" and "not answered" (counting it would penalise a true "none").
- Doctor's note source: APPROVED report reviews only; a released lab order's `reviewNote` is not used (its payload has no reviewer name to attribute it).
- Crisis numbers: shown from the app's crisis constants (`TELE_MANAS_NUMBER`, SYNC with crisis_gate.py) so they never wait on a request; there is no endpoint exposing them.

### Package B (feat/m2-healthB)

M2ReportUpload, M2Trends; web phone frame and Expo.

- D-M2-6: student-confirmed values only; no lab-entered (`LAB_RELEASED`) rows exist yet, so every value reads "Typed by you from your report". "From a StudentKare lab" opens a released report's own vault document on the Check step (nothing uploaded); the student still types the values.
- D-M2-10: bookmark built on the server (`PUT /health/lab-results/pinned`); the button shows only the server's saved list (`aria-pressed`), and a refusal shows the server's message.
- D-M2-11: steps from the newest APPROVED review of a report the test's values come from, verbatim, with `walk` / `bowl` / `flask` from `kind` (none for OTHER) and the doctor's often / when as chips. The header reads "from {name}" once the review payload carries `reviewedByName` (package A); until then "reviewed {date}". Hidden without steps.
- D-M2-12: Add, Check, Saved. No Read step, no scanning line, no progress bar (no reader exists). Hero copy changed from the board's "We read the values. You check them." to "Add your report. Then type in its values." because nothing is read. Rows start unticked; only ticked rows are saved (server confirm, all or nothing). Uploading shows a plain status, no percentage (the upload reports no progress).
- D-M2-17: amber / green from each row's own printed range (`rangeState`, computed by the server); range always shown next to the value; neutral without a range. No red on either screen.
- D-M2-18 (D7-8): no direction words, no projection, no target on Trends. "Too few reports for a trend" [CL copy] below `trends.min_points_for_line`.
- Chart: `chart-test-trend` in `src/design-system/charts/`, text alternative per test, the table as its equivalent; band only when every plotted value shares one range; other units and written results in the table only. The line draws in on the web only when motion is allowed; native draws it at rest.
- Upload limits: the server's file-size limit is not exposed as a setting, so the screen names the accepted formats only and shows the server's own message when it refuses a file.
- Expo: "Upload a PDF" is shown as not available on the device (no document picker is bundled); "Take a photo" uses the camera on the screen, as RecordCaptureScreen. Web takes both through the browser's file picker.
- Pill nav: "My health" draws the plain heart (`heart-3`) both when current and when idle (integration decision on feat/release-m2; `currentIcon` stays available for a destination whose boards draw another current icon).
