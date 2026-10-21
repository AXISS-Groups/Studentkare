# WP-15 · Partner dispensing, lab and staff app: Tier 1 canvas plans

**Approved by:** _(name, date)_

**Status:** proposed. Plans only; no screen code has been written for this package.
**Rule:** `CLAUDE.md`, `DESIGN.md` §5–6, `AGENTS.md` (guardrails 1, 2, 4, 9, 11). These screens
release lab values, dispense prescription medicines and verify identity at a counter. Each needs
a named design reviewer **and** clinical (pathology / pharmacy) or legal sign-off before its
branch opens. One screen = one ticket, one branch, one PR.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` (§6 Partner, WP-15). Boards under
`design/screens/source/07-partner-pharmacy-lab-clinic/`, pictures under
`design/screens/screenshots/07-partner-pharmacy-lab-clinic/`.

## Summary

| # | Screen | Route / files today | check-icons | Data today | Real API that exists | Blocking decision |
|---|---|---|---|---|---|---|
| 1 | LabQueue | `/lab-queue` · `screens/vendor/LabSampleToReportScreen.tsx` → `workspace/FulfilmentQueuePanel` `LabQueuePanel` | 1/23 · lucide | **real** `/work/lab-orders`, `PATCH /lab-orders/{id}` | same + `/work/lab-orders/{id}/report` | Who releases a critical value (board: lab; code: doctor releases) |
| 2 | LabReporting | `/lab-queue` (release step) · same files | 0/22 · lucide | real (report upload) | `/work/lab-reviews/{id}/release` is `require_staff` | Pathologist sign-off role does not exist |
| 3 | LabCollection | `/run-sheet` · `LabCollectionScreen.tsx` (687 L) | 1/23 · lucide | **props only** (empty in app) | `/collector/pickups`, `…/collected`, `…/handed-to-lab` | Fasting check: student-confirmed vs staff-confirmed |
| 4 | LabColdChain | `/cold-chain` · `LabColdChainScreen.tsx` (569 L) | 2/22 · lucide | props only | **none** | Breach threshold and "free recollection" policy |
| 5 | DispenseRegister | `/dispense-register` · `DispenseRegisterScreen.tsx` (854 L) | 2/24 · lucide | props only | `GET /ops/dispense-register`, `/work/dispenses`, `/dispenses/{id}/substitutions` | Append-only corrections; CSV export |
| 6 | VendorOrders | `/orders` (vendor) · `VendorOrdersScreen.tsx` | 0/22 · lucide | props only | `/work/dispenses`, `/dispenses/{id}` (PATCH), quotes | Price on the order row vs Rule L |
| 7 | VendorHandover | `/handover` · `VendorHandoverScreen.tsx` (962 L) | 1/23 · lucide, `✓` | props only | `/identity/verify` (pass) | Bag photo storage; OTP model |
| 8 | VendorSubstitution | `/substitutions` · `VendorSubstitutionScreen.tsx` (803 L) | 1/22 · lucide | props only | `GET /work/substitutions`, `POST /dispenses/{id}/substitutions`, `POST /substitutions/{id}/decide` | NTI list owner |
| 9 | VendorRxReview | `/rx-review` · `VendorRxReviewScreen.tsx` (731 L) | 1/26 · lucide | **real** `/v1/pharmacy/rx-reviews` approve/reject | + `/v1/pharmacy/rx-uploads/*` | OCR suggestions; pharmacist sees allergies? |
| 10 | ScanVerify (phone) | `/scan-verify` at 390 px · `WebScanVerifyScreen.tsx` | 0/3 · lucide | **real** `POST /identity/verify` | same | No staff app; photo match has no backend |
| 11 | WebScanVerify | `/scan-verify` · `WebScanVerifyScreen.tsx` (754 L) | 1/22 · lucide | real | same | Same as 10 |
| 12 | StaffHandover (phone) | — | — (brief 3) | — | `/identity/verify` only | Build the staff app shell (Expo) or a web phone frame |
| 13 | StaffCollect (phone) | — | — (brief 2) | — | `/collector/pickups/*` | Tube-label scan / sample linking model |

Biggest finding: **five screens (3, 5, 6, 7, 8) look like the board but render only what a caller
passes as props** (they are empty in the running app) even though real endpoints exist for 3, 5,
6 and 8. Wiring them is a data change on a Tier 1 surface, so it is planned here, not done.

## Applies to every screen in this package

**Prerequisites.** S3 partner shell icons (`feat/canvas-s3`: replace lucide in
`screens/vendor/vendorNavigation.ts`); S9 console table; S7 dialogs; a camera-frame component on
the `camera-bg` / `camera-accent` / `on-camera` tokens (screens 10–13), and S4 phone frame for the
phone boards.

**Will change (all thirteen).**
- Icons: `<Icon>` / `<Illustration>` exact names from each brief; `→` → `arrow-right`,
  `✓` → `check` where the brief lists it; lucide removed from each screen file.
- Copy: the screens already use `useT` (`partner.*` keys); add the board's missing strings to
  `src/i18n/areas/partner*.ts` in en/te/hi.
- States: data, loading, empty, error (`Ref …`), not connected, and **offline**: lists read-only;
  every release, dispense, hand-over and verify action disabled offline, **except** the
  pass-signature offline check on ScanVerify if the reviewer approves it (decision 10.1).
- Replace the in-file `initial*` sample arrays used for tests with fixtures under `__tests__`.

**Will NOT change (all thirteen).** Who may release, dispense, substitute or hand over; Schedule
H/H1 rules; payment-gated packing (`test_priced_dispenses.py`); the pass verification rules
(fresh 30 s step, single use, `DIGITAL_ID_VERIFIED` / `_REFUSED_STALE` audit); Rule L: a partner
never sees a diagnosis, and commerce rows carry no clinical value; role guards
(`require_pharmacy`, `require_collector`, `require_staff`).

**Accessibility baseline.** As WP-13; camera views have a text alternative ("Type the code"),
a visible manual-check path, and announce scan results via `role="status"`; match decisions
are two large buttons (≥ 54 px) with text, never colour alone.

**Tests baseline.** Extend the existing `screens/vendor/__tests__/*.test.tsx` for each state and
for fail-closed writes; a test per wired screen that it calls the real endpoint and renders
nothing when it errors; `check-icons --screen`; implementation-map entry moved to `screens`.

---

## 1. LabQueue — sample queue

**Approved by:** _(design reviewer, pathology lead — date)_

**Board vs today.** Board: pipeline header "Booked → Collected → Transit → Analysed → Released";
a critical interrupt banner ("CRITICAL VALUE — INTERRUPTS THE QUEUE · SMP-77412 · Potassium 6.8
… does not wait for the rest of the panel … Release critical value now"); queue with clock and
flag per sample. Today: `LabQueuePanel` (real list, sample id capture, report upload); no
pipeline header, no critical banner. Copy 30%.

**Will change.** Board layout around the existing panel logic; pipeline counts from the list;
critical banner when a released report carries a critical flag.

**Will NOT change.** Report upload endpoint and its validation.

**Safety-critical.** The banner is driven by the lab's flag on the value, not by a client
threshold. Releasing a critical value must start the clinician clock that ClinicalReview
(WP-13 §1) reads.

**Data.** Real list; per-stage clocks need timestamps the API may not return (verify) → show
only what is returned.

**Open decisions.** **Who releases:** the board has the lab release critical values directly to
the clinician; today labs file reports and a doctor releases (`/work/lab-reviews/{id}/release`,
see `LabReviewRelease.test.tsx`). Keep the current split, or add a lab-side critical release?

---

## 2. LabReporting — release results

**Approved by:** _(design reviewer, pathology lead — date)_

**Board vs today.** Board: "A pathologist signs. A critical value goes out before the rest of the
batch."; tiles critical released / not yet acknowledged / signed awaiting release / median to
clinician; rows result · student · reference · flag (Critical high / Critical low / High /
Normal / Low) · release state; "Release batch". Today: a step inside the same queue, no separate
release table. Copy 30%.

**Will change.** A release table view on the queue route with the board's columns; "Release
batch" only if the server supports batch release (else per row).

**Will NOT change.** Release endpoint semantics.

**Safety-critical.** Critical rows cannot be batched behind normal ones; they release on their
own. Flag text plus colour: critical `danger`, high/low `attention`, never red for non-critical.
Student shown as initials + room (board), never full name, on the lab surface.

**Data.** Release: real (staff role). "Signed by pathologist": no pathologist role or signature
field.

**Open decisions.** Add a pathologist sign-off (role + field) before release, as the board
requires? Student identity format on lab screens.

---

## 3. LabCollection — run sheet

**Approved by:** _(design reviewer, pathology lead — date)_

**Board vs today.** Board: day header (phlebotomist, campus), "Close run"; next-stop card with
the three-step order "Verify student → Scan tube → Collect" and "Verify on phone"; tiles stops /
collected / reschedule needed / median per stop; rows time · location · student & test ·
preparation ("Fasting since 21:30", "Not fasted — reschedule") · status; note "rescheduled, never
collected anyway". Today: a near-complete board build (copy 67%) fed by `initialStops` props;
empty in the app.

**Will change.** Source from `GET /collector/pickups` and actions `…/collected`,
`…/handed-to-lab`; "Verify student" opens ScanVerify in lab mode; tube step links to StaffCollect.

**Will NOT change.** Collector scoping (`require_collector`, own lab only).

**Safety-critical.** "Collect" disabled until the pass is verified for this booking. A
not-fasted stop offers reschedule only.

**Data.** Pickups and state changes: real. Fasting-since time, tube id, cold box: not in the
pickup payload (verify) → not connected.

**Open decisions.** Is fasting confirmed by the student in the app (board: "Student confirms")
or by the phlebotomist? Where is that stored?

---

## 4. LabColdChain — cold chain log

**Approved by:** _(design reviewer, pathology lead — date)_

**Board vs today.** Board: tiles boxes in transit / breached / samples held / logged end to end;
rows box · contents · required 2–8 °C · recorded ("9.4 °C for 22 min") · outcome (In range /
Breached — held / Delivered); note: a breached box is held, never run with a footnote, and the
students are offered a free recollection. Today: board build fed by props (copy 69%), empty.

**Will change.** Copy and icons; not connected.

**Safety-critical.** "Breached — held" must block result entry for those samples on the server
when built; a UI label alone is not a safeguard.

**Data.** Not connected (no cold-box or temperature model).

**Open decisions.** Temperature range and breach duration as settings (pathology owner); who pays
the "free recollection" (commerce plane) without the commerce side learning the test.

---

## 5. DispenseRegister — Schedule H1 register

**Approved by:** _(design reviewer, pharmacist adviser, legal — date)_

**Board vs today.** Board: "Schedule H1 · retained three years"; tabs Schedule H1 / All
dispenses / Substitutions; rows entry · drug · prescriber (NMC no.) · patient ("Edu ID checked")
· state; substitution sign-off panel ("Azee 500 → Azithral 500 … Pharmacist sign-off required ·
S. Kulkarni · D.Pharm TS-44120 · Sign and dispense"); note "append-only; a correction is a new
entry". Today: board build (copy 72%) fed by props; a client-side CSV download.

**Will change.** Source from `GET /ops/dispense-register`; sign-off via the substitution decide
endpoint; CSV export only if served by the API (else removed — a client CSV of a statutory
register is an unaudited export).

**Will NOT change.** Append-only register; no edit control.

**Safety-critical.** No edit or delete affordance anywhere; correction = new entry referencing the
old id (needs server support — verify). Pharmacist identity on sign-off comes from the session.

**Data.** Register: real (`require_staff`). Correction entries: verify.

**Open decisions.** Keep the export (server-generated, audited) or drop it? Retention (3 years)
shown as copy only if it is enforced.

---

## 6. VendorOrders — pharmacy orders

**Approved by:** _(design reviewer, pharmacist adviser — date)_

**Board vs today.** Board: tiles open / awaiting pharmacist / out for delivery / median pack;
rows order · deliver to (block) · contents ("2 items · ₹578") · prescription (verified / no
prescription needed / awaiting pharmacist check) · status ("Blocked"); note "the button is
absent, not disabled. You see the block, never what the student was treated for." Today: board
build fed by props; empty in the app.

**Will change.** Source from `/work/dispenses` (+ quote state); "Pack" absent for rows awaiting a
pharmacist or unpaid.

**Will NOT change.** Payment-gated packing; quote expiry (`pharmacy.quote_expiry_hours`).

**Safety-critical.** No diagnosis or prescriber note on the row.

**Data.** Real (verify the vendor-scoped list returns delivery block and item count).

**Open decisions.** The row shows a price next to prescription status: acceptable on the partner
surface (it is the partner's own sale), or split commerce and Rx state into separate columns
fed by separate planes?

---

## 7. VendorHandover — counter handover

**Approved by:** _(design reviewer, pharmacist adviser, legal — date)_

**Board vs today.** Board: "At the counter now" card with steps "✓ Verified · ✓ Rx matches · ●
Bag photo · ○ Handed over"; rows order · collector (Student / Friend named by student / Friend
not named) · contents · OTP · state ("Prescription cannot be proxied", "Expired after 30 min");
note: pass scan + photo match first, OTP alone is not enough; Rx-only never handed to anyone else.
Today: board build fed by props; `✓` glyphs.

**Will change.** Copy, `check` icons; counter card starts from a ScanVerify result; list not
connected until a handover model exists.

**Will NOT change.** Pass verification endpoint.

**Safety-critical.** "Hand over" disabled unless: pass verified for this order's student in this
session, and, for any Rx item, collector = the patient. A friend may only collect OTC (server
rule when built).

**Data.** Verify: real. Handover records, OTP, bag photo: not connected.

**Open decisions.** OTP + pass, or pass alone? Bag photo storage, retention and who can open it
(it can show medicine names).

---

## 8. VendorSubstitution — generic substitutions

**Approved by:** _(design reviewer, pharmacist adviser — date)_

**Board vs today.** Board: "Bio-equivalent generics · offered, never imposed"; tiles saved for
students today (₹) / accepted / declined / blocked by prescriber; rows prescribed · generic ·
saving · prescriber permission · outcome; NTI note (levothyroxine dispensed as written). Today:
board build fed by props.

**Will change.** Source from `GET /work/substitutions`; propose via
`POST /dispenses/{id}/substitutions`; outcome from the student's decide call.

**Will NOT change.** Prescriber permission gate; student choice; no second prompt after decline.

**Safety-critical.** NTI medicines cannot be offered a swap (server rule — verify it exists; if
not, it is a backend ticket before this screen).

**Data.** Real for list/propose/decide; "saved today" tile needs a server sum.

**Open decisions.** Who owns the NTI list (pharmacist adviser), and is it a settings-registry list?

---

## 9. VendorRxReview — pharmacist prescription review

**Approved by:** _(design reviewer, pharmacist adviser — date)_

**Board vs today.** Board: queue (RX ids, items, Schedule H / Specialist Rx chips) with a "waiting
for a pharmacist" timer; prescription image; OCR-read items each to confirm ("Low confidence —
confirm strength against the image"); pharmacist checks (doctor registration verified, date
valid, patient matches, allergy check, Schedule H logged); Approve and pack / Ask the doctor /
Reject. Today: real queue and approve/reject (copy 43%); no OCR items, no checks list, no "Ask the
doctor".

**Will change.** Board layout; the checks list as manual tick-boxes the pharmacist must complete
before Approve enables; OCR panel not connected; "Ask the doctor" hidden until an endpoint exists.

**Will NOT change.** Approve/reject endpoints and audit; "a substitution is never automatic".

**Safety-critical.** Approve disabled until every check is ticked and every item confirmed.
Image opened via the signed `file-link` endpoint only.

**Data.** Real for queue, image, approve/reject.

**Open decisions.** "Allergy check" means the pharmacist sees the student's allergies — a data
access change (today the pharmacy role does not read clinical allergies; verify). Allow it,
or show only "no conflict / conflict" computed server-side?

---

## 10. ScanVerify — staff app (phone)

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board states: Pharmacy / Lab / Clinic / Camp modes; Scan, No phone (manual
check by roll number + physical college ID), Student found, Compare (live photo vs on-file;
"Match hint Strong · 94% — A hint, not a decision"), Verified, Mismatch ("Stop — don't continue",
reason, "Flag and notify the student"), Expired code (30 s), Offline ("checked against the pass
signature on this device"). Today: the web counter screen at 390 px; real `POST /identity/verify`;
no camera frame, no photo compare, no flag.

**Will change.** Phone layout in the S4 frame (or the Expo staff app, decision 12.1); camera
frame on camera tokens with `illustration-face-oval-guide`; states as listed, each wired to the
verify response or shown not connected.

**Will NOT change.** Verify rules (fresh step, single use, audit), roles allowed.

**Safety-critical.** The human decides "Same person / Not the same"; nothing auto-verifies.
Mismatch stops every downstream action for that student in that session. Manual check is
logged and the student is told next sign-in (needs server support — verify).

**Data.** Verify: real. Live photo capture, face match hint, 24 h deletion, flag/notify,
manual-check lookup: **no backend**.

**Open decisions.** (1) Offline verification against a device-held signature contradicts
"fail closed" unless scoped to read-only check-in — allow? (2) Show a machine match hint at all?
No face-match service exists; building one is a biometric processing decision under DPDP.
(3) Live photo retention (board: 24 h).

---

## 11. WebScanVerify — counter / reception

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Same flow as §10 at counter-tablet size, plus "Today at this counter" list and
"Rules at the counter" card. Today: real verify (copy 48%), lucide.

**Will change / not change / safety / data / decisions.** As §10. The rules card is static copy.
"Today at this counter" needs a per-counter verify log endpoint (not connected).

---

## 12. StaffHandover — staff app (new)

**Approved by:** _(design reviewer, pharmacist adviser — date)_

**Board vs today.** Board: verified header with "Re-check"; "In the bag · 2 items" with OTC / Rx ·
Schedule H chips; "✓ Prescription by Dr. S. Menon is for Krishna C. — same person you just
matched"; photo of the sealed bag; counselling attestation checkbox; "Hand over to Krishna";
done state ("receipt with this photo… your access to it has ended"). Today: no screen.

**Will change.** New phone screen; not connected beyond verify.

**Safety-critical.** As §7. Order access ends when the order closes (server-enforced).

**Open decisions.** (1) Staff app as an Expo target vs a web phone route — affects auth (staff
sign-in, WP-03 AdminSignIn). (2) Counselling attestation stored where?

---

## 13. StaffCollect — staff app (new)

**Approved by:** _(design reviewer, pathology lead — date)_

**Board vs today.** Board: verified header; booking card (tests, tube type, fasting 10 h,
"Student confirms nothing to eat since 21:30"); tube label scan linking T-5521-B to the booking,
name on label matches; "Sample collected"; done state (cold box and temperature; "report comes
back to Krishna only"). Today: no screen.

**Will change.** New phone screen; `…/collected` is real; tube linking not connected.

**Safety-critical.** Collect disabled until verify + tube linked + fasting confirmed (when the
test requires it).

**Open decisions.** Tube-label scanning and sample-id model; cold-box assignment (ties to §4).
