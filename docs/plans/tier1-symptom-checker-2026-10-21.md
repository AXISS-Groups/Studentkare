# Symptom checker (Tier 1): plan for the clinical lead

**Approved by:** _(clinical lead, date)_ · _(design reviewer, date)_ · _(legal / DPO, date: §Data and §Regulatory only)_ · _(AI-constitution owner, date: D-SC-23 only)_

**Status:** plan only. Krishna Chintakayala (founder) asked for a symptom checker on 2026-10-21 and decided the
plan goes to the clinical lead **before any code**. Nothing in this file is built until the clinical lead fills
and signs every table in §Triage logic and the scenario test set in §Testing. No screen, backend, protocol file or
migration is in this branch.
**Inspiration, not source:** a third-party mockup kit's flow (Symptoms list → "Let us know about your symptoms"
yes/no questions → result). Its copy, pictures, icons and medical content are not ours and do not ship. There is
**no Student Kare board** for this flow yet: boards must be drawn on canvas page 9 (Mobile 2.0, folder
`10-mobile-2`) and approved before build (`CLAUDE.md`: the canvas is the source of truth; `DESIGN.md` §5).
**Code read for this plan:** `src/ai/core/crisisGate.ts`, `backend/services/crisis_gate.py`,
`src/ai/core/constitution.ts` (Rule-A, Rule-B, Rule-C, Rule-L1, Rule-L4, Rule-K-Anonymity),
`src/screens/workspace/CareNavigatorPanel.tsx` (the care navigator and its on-device crisis path),
`src/components/health/DiseaseAwarenessHub.tsx`, `backend/services/clinical_api.py` (`/care/crisis-signal`,
`record_crisis_event`), `backend/core/rule_l.py`, `src/components/health/EmergencyBar.tsx` (108),
`design/icons/icon-manifest.json`.
**Builds on:** `tier1-mobile2-health-2026-10-21.md` (rules every M2 health screen keeps; [CL copy] convention),
`tier1-canvas-wp07-2026-10-20.md` (D7-5 crisis card persistence; Devices: "We no longer take readings with your
phone camera"), `tier1-ayush-container-2026-10-20.md`.
**Depends on:** S4 phone frame on web, S6 state screens, S7 sheets, the M2 pill nav, the existing SOS flow
(`src/modules/m04-emergency/view/SosView.tsx`, `src/features/emergency/views/*`) and crisis support
(`src/features/crisis/views/CrisisSupportBoard.tsx`).

## Purpose and hard boundaries

**What it is.** Navigation. A student says what is bothering them, answers a few yes/no questions, and is told
**where to go and how soon**: one of four outcomes (§Triage logic). It helps a student who is unsure whether to
call for help, walk to the campus clinic, book a consult, or read reviewed self-care information.

**What it never does.** Each line is a test in §Testing.

1. **Never names a disease or condition.** No "possible causes", no list of conditions, no "this could be
   dengue", no probability, percentage, likelihood, score, "match" or ranking. The result names a place and a
   time, never a cause.
2. **Never advises a medicine or a dose.** No OTC suggestion, no home remedy with an amount, no "take
   paracetamol". No link to the shop, a product, a lab test package or a pharmacy from any screen in this flow
   (Rule-L1, Rule-L4).
3. **No LLM decides urgency.** Questions, red flags and outcomes come only from rule tables the clinical lead
   signs. No model chooses a question, reads an answer, writes the result or rewrites approved copy. Ayush is
   not called from this flow (D-SC-22).
4. **Red flags go straight to help.** The moment a red-flag answer is given, the flow stops and the Emergency
   screen opens: **112**, **108** (ambulance), **campus SOS** (the existing SOS flow), and the emergency card.
   Nothing later in the flow can lower that outcome.
5. **Mental-health crisis goes to Tele-MANAS through the existing crisis gate.** Any text the student types
   (the list search, D-SC-12) is evaluated on the device by `evaluateCrisisGate` (`src/ai/core/crisisGate.ts`,
   fail-closed); a crisis outcome shows the crisis card: **Tele-MANAS 14416** (and 1-800-891-4416), 112, and
   the campus counsellor only where a campus has configured its own number (the bundled
   `DEFAULT_CAMPUS_COUNSELLOR` is not a campus desk; the navigator already omits it). A "Feeling low, anxious or
   unsafe" entry goes to the same crisis support, not to yes/no questions (D-SC-13).
6. **Never reassures away from care.** No "nothing to worry about", no "you're fine", no green tick on a
   result. Every non-emergency result carries a safety-net line [CL copy] ("If it gets worse, or you are worried,
   …") with the emergency numbers.
7. **Help is one tap away on every screen and in every state**: SOS in the header, emergency line in the
   fixed footer, never behind loading, an error, sign-in or consent (`DESIGN.md` §2.4).
8. **Takes no photo, sound or sensor reading.** Answers are taps. See §Camera features.
9. **Claims nothing it cannot prove** (`AGENTS.md` guardrail 6): no "AI", "diagnose", "accurate", "doctor
   approved" or "clinically validated" in copy unless the evidence exists and the clinical lead signs the
   wording.

## Camera features (founder decisions, 2026-10-21)

Recorded here so no ticket reopens them by accident.

| Feature | Decision | Why |
|---|---|---|
| Camera pulse (rPPG, heart rate from the face or a fingertip) | **Waits for clinical sign-off.** If ever built, **wellness only**: never an input to this symptom checker, never shown as a clinical value, never a red flag. Not built in this plan. | Accuracy on phones varies with skin tone, light and motion; a wrong pulse in a triage flow is a safety risk. Matches WP-07 Devices ("pulse not available"). |
| Camera body temperature | **Off.** Not built. | A phone camera cannot measure body temperature (no thermal sensor). Fever is a question, answered from how the student feels or from their own thermometer, never measured by the app. |
| Skin / nutrient-deficiency checks from a photo | **Off.** Not built. | Photo-based diagnosis of a skin condition or a deficiency would be Software as a Medical Device under CDSCO rules (Medical Devices Rules, 2017), needing licensing and clinical evidence we do not have. |

## Rules every screen in this flow keeps

- **Mobile 2.0 language.** M2 phone frame; hero with the service gradient (`service-<hue>-deep` →
  `service-<hue>-shade`, white text only on the deep end, `DESIGN.md` §3); symptom tiles from the service-tile
  pattern with a **text label always** (icon decorative, `aria-hidden`); primary CTA 54 px, answer buttons
  ≥ 50 px; pill nav hidden inside the flow (a focused task), back and close in the header.
- **Colours.** Emergency outcome = `danger*` (allowed: SOS / 112). Clinic today = `attention*`. Book a consult =
  `action` / `surface-3`. Self-care info = neutral (`text-2` on `neutral-bg`), **not** `positive`: nothing about
  the body is celebrated. No confetti, no success animation anywhere in the flow.
- **Copy.** Every user-facing string in i18n (en/te/hi). Every question, red flag, outcome line and safety net
  is **[CL copy]**: written or approved by the clinical lead, word for word. te/hi strings for this flow are not
  allowed to ship as drafts (D-SC-18).
- **Icons** only via `src/design-system/icons` with the brief's exact names, once the brief exists. Checked
  against `design/icons/icon-manifest.json` while planning: present — `chevron-left`, `x`, `check`, `phone-2`,
  `alert-triangle`, `thermometer`, `stethoscope`, `brain`, `stomach`, `eye`, `heart-3`, `droplet`, `search`,
  `info`, `help-circle`, `calendar`, `share`, `lock-5`, `file-text`, `arrow-right`, `shield-check`. **Not in
  the manifest:** `lungs`, `ear`, `bone`, `head`, `hospital`, `siren`, `first-aid`. If the board draws any of
  these, stop and say so; no look-alike substitutes (`CLAUDE.md`).
- **Accessibility.** Role and label on every control; 44 px targets; visible focus; yes / no / not sure are a
  radio group (`role="radiogroup"`, `aria-checked`), not colour-only; the question is the group's label and is
  announced on arrival (focus moves to the question heading); the Emergency screen is announced assertively
  (`role="alert"`) and its first focus is the 112 call button; `aria-live="polite"` for progress; reduced
  motion: no slide transitions; en/te/hi fit at 320 px; works with TalkBack / VoiceOver and keyboard only.
- **Web + Expo.** One view-model `src/features/symptoms/viewmodel/` shared by a web view (in
  `StudentPhoneFrame`, ≤ 430 px, and the public site layout) and an Expo screen in `src/native/App.tsx`
  (MVVM, `AGENTS.md`). The rule evaluator is a pure module shared by both (and mirrored in Python, §Triage
  logic).
- **Rule L.** No commerce surface links into or out of this flow. No ad, partner banner, offer, price (except
  the consult price shown before a slot is picked, in the existing booking flow), or points.

## Summary

| Screen (proposed board name) | Board | Today | Data | Key decisions |
|---|---|---|---|---|
| SymptomStart | to draw | — | none | D-SC-1, D-SC-2, D-SC-3 |
| SymptomPick | to draw | — | protocol (symptom list) | D-SC-4, D-SC-12, D-SC-13 |
| SymptomQuestions | to draw | — | protocol (questions, red flags) | D-SC-5, D-SC-6 |
| SymptomEmergency | to draw | SOS flow, EmergencyBar, emergency card exist | campus SOS config | D-SC-8 |
| SymptomResult | to draw | — | protocol (outcomes, [CL copy]), campus clinic config, reviewed sources | D-SC-7, D-SC-9, D-SC-10, D-SC-11 |
| SymptomSave (signed-in) | to draw | consent records, record shares exist | new `care_symptom_checks` | D-SC-15, D-SC-16 |
| Crisis card | reuse | `CrisisSupport` in CareNavigatorPanel, CrisisSupportBoard | crisis gate | D-SC-13, D-SC-14 |

---

## SymptomStart

**Purpose.** Say plainly what this is and is not, before any question.

**Will show.** Title [CL copy]; three lines [CL copy]: "This helps you decide where to go. It does not diagnose.
It does not suggest medicines."; a direct emergency block above the CTA ("Very unwell right now? Call 112" with
the call button, `danger`); the age question (D-SC-2) and the exclusion questions (D-SC-3) as the first step;
"Start" (primary).

**States.** Default · protocol loading (Start disabled, emergency block live) · protocol unavailable → bundled
approved version (D-SC-8) · offline (works from the bundled version; says so) · under 18 → a page with "Please see
a doctor; in an emergency call 112" [CL copy] and no flow.

**Tests.** Emergency call reachable before the protocol loads; under-18 never reaches SymptomPick.

## SymptomPick

**Purpose.** "What is bothering you most?" One symptom per check (D-SC-4).

**Will show.** Search field (local filter; its text runs through the crisis gate on the device and is never sent,
D-SC-12); tiles for the symptoms in table T1, each with its label and a decorative icon; "Feeling low, anxious or
unsafe" tile that opens crisis support directly (D-SC-13); "My symptom isn't here" → Book a consult / campus
clinic outcome with the safety net (never "not supported, sorry").

**States.** Data · search no match (same "isn't here" path) · crisis text in the search → crisis card replaces
the list (stays while it is the latest thing on screen, D7-5) · offline (bundled list).

**Tests.** Search text never in a request, log, analytics event or storage; crisis phrases from the gate's table
in en/te/hi/Hinglish open the crisis card; hyperbole allowlist does not.

## SymptomQuestions

**Purpose.** The kit's "Let us know about your symptoms", as one question per screen.

**Order.** (1) the **universal red flags** (T2) first, for every symptom; (2) the symptom's own questions (T3),
red-flag questions before the rest; (3) stop as soon as a rule (T4) decides — the student is not asked more than
needed.

**Will show.** The question [CL copy]; an optional "What does this mean?" line [CL copy] under it; **Yes / No /
Not sure** (D-SC-6); progress as "Question n" with the branch's maximum where known (no percentage bar); back
(changes an earlier answer; the evaluator re-runs from the start); close (confirms, then clears everything).

**Behaviour.** A red-flag "Yes" (or "Not sure", per D-SC-6) opens SymptomEmergency **immediately**, not at the
end. Answers live in memory only; closing, backgrounding past a timeout, or signing out clears them (public and
signed-in alike until the student chooses to save).

**States.** Question · evaluating (synchronous; no spinner needed) · evaluator error → fail closed (D-SC-8) ·
offline (unchanged; runs on the device).

**Tests.** Every red flag in T2 interrupts at once; back + change answer can raise but never lower an outcome
already reached through a red flag; "Not sure" follows D-SC-6; no answer leaves the device in public mode.

## SymptomEmergency

**Purpose.** The red-flag interrupt. Nothing else on the screen.

**Will show.** Heading [CL copy] ("Get help now"); **Call 112** (primary, `danger-fill`, first focus); **Call
108 · ambulance**; **Campus SOS** (opens the existing SOS flow; shown only where the campus has SOS set up,
otherwise left out, not disabled); **Open my emergency card**; one line [CL copy] on what to do while waiting
(e.g. "Stay where you are and keep your phone on"), only if the clinical lead writes one. No outcome text from
other tables, no Ayush, no booking, no "go back and change your answer" prompt (back still works).

**Colours / icons.** `danger*` per the founder list (SOS / 112). `phone-2`, `alert-triangle`.

**States.** Default · offline (calls still work; SOS shows its own offline behaviour) · signed out (all of the
above still shown; SOS asks for sign-in only if the SOS flow itself requires it — check before build).

**Tests.** First focus on 112; `tel:` links exact; nothing commercial on screen (Rule-L4); reachable offline.

## SymptomResult

**Purpose.** One of the three non-emergency outcomes (§Outputs), stated as where and when.

**Will show, per outcome.**

- **See the campus clinic today.** Clinic name, hours and location from the campus's configuration (not
  hard-coded); if closed now or not configured → D-SC-9. "Show the clinic this summary" (signed-in, D-SC-16).
- **Book a consult.** "Book a consult" → existing teleconsult booking (price shown before the slot, as today);
  the campus clinic listed alongside as an equal option. No commerce beyond the consult's own booking.
- **Self-care information from reviewed sources.** Passages from the knowledge base that the clinical lead
  approved for this symptom (T6), each with its source title and version (as `/care/navigate` citations show
  them). No medicine, no dose. Never from `DiseaseAwarenessHub` (see §Residual risks).

Every outcome: the safety-net line with time limit [CL copy] (T5) and the emergency numbers; "This is not a
diagnosis" footer; "Start again".

**States.** Data · clinic info missing → D-SC-9 copy · sources unavailable (offline / error) → the safety net and
"Book a consult" only, never an empty self-care page · signed-in save offered (SymptomSave).

**Tests.** No condition name, probability or medicine appears in any outcome (string scan of the rendered tree
against a deny-list the clinical lead approves); self-care never shown without at least one reviewed source;
safety net present in every non-emergency outcome.

## SymptomSave (signed-in only)

**Purpose.** Let a student keep a short summary to show their doctor, only if they choose.

**Will show.** A card on SymptomResult: "Save a summary for your doctor" with the consent text [CL copy + legal]:
what is saved (the symptom, your answers, the outcome, the date), who can see it (only you, and a doctor you
share it with), how long it is kept (D-SC-16), how to delete it. A checkbox **unticked by default**, then "Save".
After saving: "Saved to your records · only you can see it" with "Share with a doctor" (existing record-share
flow: who, what, until when, revocable) and "Delete".

**States.** Not signed in → card not drawn (no nudge to sign in on a health result) · consent unticked → Save
disabled · saving · saved · save failed (calm copy, retry, reference code; the result stays on screen) · deleted.

**Tests.** Nothing written without the tick; withdrawal deletes; a share expires as set; campus roles get 403.

## Crisis card

Reuse the existing `CrisisSupport` card (CareNavigatorPanel) promoted to the design system (it carries a safety
rule, `DESIGN.md` §4), drawn in the M2 language: Tele-MANAS 14416 (primary) and 1-800-891-4416, 112, campus
counsellor where configured. Copy from `assist.nav.crisis.*` i18n keys, not the gate's English message. Stays
while it is the latest thing on screen (D7-5).

---

## Triage logic

### Model

- **Rule tables only.** A versioned **protocol** file holds the symptom list, questions, red flags, rules,
  outcome copy keys and source references. Two evaluators read it: TypeScript (on the device, shared by web and
  Expo) and Python (server, used only to recompute the outcome when a signed-in student saves, so a saved
  outcome is never taken from the client). A parity test runs both on the scenario set, as
  `tests/test_crisis_gate.py` does for the crisis phrase table.
- **Order of evaluation.** Crisis gate on any typed text → universal red flags (T2) → symptom red flags (T3
  marked RF) → rules (T4) in priority order → default (D-SC-7).
- **Escalation only.** Outcomes are ordered EMERGENCY_NOW > CLINIC_TODAY > BOOK_CONSULT > SELF_CARE_INFO. The
  highest outcome any matched rule gives wins; no rule can lower an outcome another rule raised.
- **Fail closed.** Unknown question id, missing answer, malformed protocol, version hash mismatch or any
  exception → the fail-closed screen (D-SC-8). Never SELF_CARE_INFO by error or by default.
- **No LLM** anywhere in evaluation, question choice or result text.
- **Protocol is not an ops setting.** It is not in the settings registry and cannot be changed by
  `PATCH /api/ops/settings`. A change is a new version, re-run of the scenario set, and a new clinical-lead
  signature (D-SC-19). The app ships the last approved version bundled (works offline) and may fetch a newer
  approved one (`GET /symptom-check/protocol`, public, no body, no query); a fetched file whose hash is not on
  the approved list is ignored.

### Outputs

| Code | Label [CL copy] | Colour | Actions | Notes |
|---|---|---|---|---|
| EMERGENCY_NOW | "Emergency — get help now" | `danger` | 112 · 108 · campus SOS · emergency card | Ends the flow at the first red flag |
| CLINIC_TODAY | "See the campus clinic today" | `attention` | Clinic hours / location · save summary (signed-in) | Closed / not configured → D-SC-9 |
| BOOK_CONSULT | "Book a consult" | `action` | Teleconsult booking (price before slot) · campus clinic | Default when no rule matches (D-SC-7) |
| SELF_CARE_INFO | "Self-care information" | neutral | Reviewed passages with source + version · safety net | Never by default or on error |

### Tables FOR THE CLINICAL LEAD TO FILL

Everything below is deliberately empty. Rows marked _candidate_ are suggestions for the clinical lead to keep,
change or delete; they carry no clinical content. Nothing ships with a blank cell.

**T1 · Symptom list (entry points)**

| ID | Label (en) [CL] | te / hi reviewed | Icon (manifest name) | In v1? | Notes [CL] |
|---|---|---|---|---|---|
| S-01 | _candidate:_ Fever | | `thermometer` | | |
| S-02 | _candidate:_ Headache | | _(none in manifest; brief to decide)_ | | |
| S-03 | _candidate:_ Cough, cold or sore throat | | | | |
| S-04 | _candidate:_ Stomach pain | | `stomach` | | |
| S-05 | _candidate:_ Vomiting or loose motions | | | | |
| S-06 | _candidate:_ Rash or skin problem | | | | |
| S-07 | _candidate:_ Eye problem | | `eye` | | |
| S-08 | _candidate:_ Injury (fall, sprain, cut) | | | | |
| S-MH | Feeling low, anxious or unsafe → crisis support, no questions (D-SC-13) | | `brain` | | |

**T2 · Universal red flags (asked first, for every symptom)**

| ID | Question [CL copy] | Triggers on | Outcome | Source (document, section, version) | CL initials |
|---|---|---|---|---|---|
| RF-01 | | Yes / Not sure | EMERGENCY_NOW | | |
| RF-02 | | | | | |
| RF-… | | | | | |

Inputs the clinical lead may want to look at (not rows, not reviewed): Rule-B in `constitution.ts` names
"severe chest pain, breathing difficulty, acute trauma, self-harm"; the crisis gate's `CRISIS_MEDICAL` phrases
are "chest pain", "can't breathe", "bleeding heavily", "swelling throat", "unresponsive", "seizure",
"anaphylaxis" (English only, marked `TODO(clinical-review)` in code).

**T3 · Questions per symptom**

| Q ID | Symptom | Question [CL copy] | Help line [CL copy] | Answers | Red flag? | Source | CL initials |
|---|---|---|---|---|---|---|---|
| S-01-Q1 | S-01 | | | Yes / No / Not sure | | | |
| S-01-Q… | | | | | | | |

**T4 · Rules**

| R ID | Symptom | Condition (question ids and answers) | Outcome | Priority | Source | Rationale [CL] |
|---|---|---|---|---|---|---|
| R-01 | | | | | | |
| R-… | | | | | | |

**T5 · Outcome and safety-net copy**

| Outcome | Symptom (or all) | Safety-net line [CL copy] | Time limit ("if not better in …") | CL initials |
|---|---|---|---|---|
| CLINIC_TODAY | | | | |
| BOOK_CONSULT | | | | |
| SELF_CARE_INFO | | | | |
| Fail closed (D-SC-8) | all | | — | |
| Under 18 (D-SC-2) | all | | — | |
| Exclusion (D-SC-3) | all | | — | |

**T6 · Self-care sources**

| Symptom | Knowledge-base source id / title | Version | Passage reviewed by | Date | Contains no medicine or dose (Y) |
|---|---|---|---|---|---|
| | | | | | |

**T7 · Exclusions (route out of self-care)**

| ID | Question [CL copy] | If yes → | Notes [CL] |
|---|---|---|---|
| X-01 | _candidate:_ Could you be pregnant? | | |
| X-02 | _candidate:_ Do you have a long-term condition a doctor is treating? | | |
| X-03 | _candidate:_ Has this lasted more than [CL] days? | | |

### Source protocols to consider (ALL TO BE VERIFIED by the clinical lead)

None of these has been checked for this plan: existence of a current edition, licence terms, and whether it is
fit for **self-triage by lay users** (most are written for trained staff and need adaptation and validation) are
for the clinical lead to confirm.

- WHO guidance on emergency triage, e.g. the WHO / ICRC / MSF *Integrated Interagency Triage Tool* and WHO
  *Emergency Triage Assessment and Treatment (ETAT)* — **to verify** (edition, scope: ETAT is paediatric).
- Ministry of Health and Family Welfare / ICMR *Standard Treatment Workflows* for India — **to verify** which
  conditions and red-flag lists apply to young adults.
- NIMHANS / Tele-MANAS guidance and WHO *mhGAP* for the mental-health route — **to verify**.
- Licensed systems such as the Manchester Triage System or NHS Pathways — **to verify** licence and suitability;
  do not copy wording without a licence.
- The campus clinic's own referral protocol, if it has one — **to verify** with the campus medical officer.

---

## Public vs signed-in

**Recommended (D-SC-15): public, with no storage.** Anyone can use the flow at a public route (web) and without
signing in (Expo), because help must not sit behind a login (`DESIGN.md` §2.4).

| | Public | Signed-in, not saved | Signed-in, saved with consent |
|---|---|---|---|
| Evaluation | On the device | On the device | On the device; server recomputes on save |
| Answers sent to the server | Never | Never | Only on Save, after the tick |
| Stored | Nothing (memory only) | Nothing | Summary in `care_symptom_checks` |
| Device storage (localStorage / AsyncStorage) | None (`AGENTS.md` 9) | None | None |
| Analytics events | None (D-SC-17) | None | None |
| Crisis signal | None (no account) | Per D-SC-14 | Per D-SC-14 |

## Data

**What is stored (signed-in, saved only).** New table `care_symptom_checks`: `id`, `account_id`,
`protocol_version`, `symptom_id`, `answers` (question ids → YES / NO / NOT_SURE; **ids, never question text and
never free text**), `outcome` (recomputed by the server), `consent_record_id`, `created_at`, `expires_at`.
No search text, no location, no device data.

**Rule L plane.** `CLINICAL` in `backend/core/rule_l.py` `TABLE_PLANES` (it holds a health fact).
`sk_commerce` has no grant; commerce code paths cannot read it (`tests/test_rule_l.py` fails if the plane is
missing). The protocol itself is not personal data (`PLATFORM` if stored in a table at all).

**Consent.** A versioned consent record in `care_consent_records` (purpose: "keep a symptom summary to share with
a doctor"), unticked by default, withdrawable in one tap; withdrawing deletes the summary. Sharing uses the
existing `care_record_shares` (who, what, until when, revocable).

**Retention.** Settings-registry value `symptom_check.summary_retention_days` (D-SC-16) with owner and bounds; a
scheduled job deletes expired rows; the student can delete any time; account erasure includes the table.

**Audit.** `audit()` on create, share, view by a clinician through a share, delete, expiry; audit rows carry ids
only, never answers.

**Never shown to campus.** No campus, hostel or campus-admin endpoint reads the table; campus dashboards get no
counts from it, even aggregated (D-SC-17). The only campus-adjacent signal is the existing crisis signal, if
D-SC-14 keeps it: kind only, no symptom, no answers.

**Never used for commerce.** No offer, ad, recommendation, notification, points or partner payload is derived from
any part of this flow (Rule-L2, Rule-L5). No notification mentions a symptom or an outcome (`DESIGN.md` §7).
Never used to train any model (Rule-C).

## Regulatory notes (for legal to confirm; not legal advice)

- **CDSCO / SaMD boundary.** Software intended for diagnosis, prevention, monitoring or treatment can be a
  medical device under the Medical Devices Rules, 2017. This plan keeps the intended use to **navigation to a
  level and place of care, without naming a condition**, to stay on the information side of that line. That is
  a design aim, not a conclusion: in some jurisdictions a tool that recommends a level of care is itself
  regulated (EU MDR treats many triage apps as devices). **A written regulatory opinion is required before
  public launch** (D-SC-20). The intended-use statement is fixed in the protocol file and in the Start screen
  copy, and any change to it re-opens this review.
- **Camera features.** Photo-based skin or deficiency assessment stays off for the same reason (§Camera
  features).
- **DPDP Act, 2023 (and its Rules — legal to confirm the version in force).** Purpose-specific notice and
  consent for the saved summary; withdrawal as easy as giving; erasure on request and on expiry; data
  minimisation (ids, not text); children's data needs verifiable parental consent, one reason the flow is 18+
  (D-SC-2, `AGENTS.md` guardrail 8). Public mode collects nothing, so there is no personal data to govern.
- **Telemedicine Practice Guidelines (2020).** The checker is not a teleconsult; "Book a consult" hands over to
  the existing consult flow, which carries its own compliance.
- **ABDM.** Not involved in v1; nothing is pushed to ABHA.
- **No compliance claims** in code or copy (`AGENTS.md` guardrail 6).

## Clinical governance and sign-off

- **Owner:** the clinical lead owns the protocol (T1–T7) and the scenario test set. Recommended: a second
  clinician reviews each version.
- **Sign-off record:** each protocol version carries `version`, `approvedBy`, `approvedAt` and a content hash; the
  hash is listed in this plan's Approval section and in the app's approved-hash list.
- **Change control:** any change (wording, order, rule, source) is a new version; the full scenario set re-runs;
  the clinical lead signs again; te/hi re-reviewed if their strings change.
- **Review cadence:** every 6 months, and whenever a source protocol changes.
- **Incidents:** a reported wrong outcome goes to the clinical lead through the existing ops safety feed, without
  answer data unless the student shares a saved summary.

## Testing

- **Clinical scenario test set (the clinical lead approves).** Written vignettes, each with symptom, answers and
  the expected outcome. Recommended (D-SC-24): at least 100, including at least two per red flag, every rule,
  every boundary, "Not sure" paths, contradictory answers and the exclusions. Pass: 100 % agreement on both
  evaluators, and **zero under-triage on any red-flag vignette**. The set lives as a fixture in the repo and runs
  in CI.
- **Property tests.** Outcome is monotonic (adding a "Yes" never lowers it); default is never SELF_CARE_INFO;
  any error is the fail-closed screen; TS and Python evaluators agree on every vignette and on generated
  answer sets.
- **Safety tests.** Deny-list scan (condition names, probabilities, medicine and dose words — list approved by
  the clinical lead) over every rendered outcome in en/te/hi; no shop link in the flow; SOS and 112 present in
  every state; crisis phrases in the search open the crisis card.
- **Privacy tests.** Public and unsaved modes: no request carries answers or search text, no storage write, no
  analytics event; save without the tick is impossible; campus roles get 403; commerce role gets `permission
  denied` on `care_symptom_checks`.
- **UI.** Every state above, axe-clean, keyboard and screen reader, 320–390 px and 1440 px, light and dark,
  `check-icons --screen <Screen>` per screen.
- **People.** A comprehension test with students (do they understand the outcome and the safety net?) before
  launch, in each language that ships.

## Residual risks found while planning (not fixed here)

- **`DiseaseAwarenessHub.tsx` must not be the self-care source.** It has no importers (unrouted), carries
  unreviewed clinical copy (temperatures, "if fever persists over 24 hours"), bylines from agents that do not
  exist ("4-Hr Health Scouting Loop Agent v2.4"), commerce CTAs next to symptom content ("Book CBC & Platelet Lab
  Test", "Check Campus Pharmacy Stock": Rule-L1 / L5), emoji in tab labels, and raw `lucide-react` icons.
  Recommend deleting it or rewriting it under clinical review in its own ticket.
- **Constitution wording.** Rule-A says "AI provides educational symptom triage and suggestions"; this plan is
  narrower (no AI in triage, no suggestions of conditions or medicines). Rule-B names only 108; the app uses 112
  and 108. Aligning both is for the AI-constitution owner (D-SC-23).
- **Crisis gate coverage.** `CRISIS_MEDICAL` phrases are English only and marked `TODO(clinical-review)`; the
  te/hi/Hinglish rows are self-harm only. The search field inherits this gap.
- **SOS wording, not verified.** `EmergencySosWebView.tsx` / `EmergencySosNativeView.tsx` contain "AMBULANCE
  DISPATCHED" strings. Before this flow routes students to campus SOS, confirm that text appears only when an
  ambulance has actually been dispatched.

## Decisions for the clinical lead

Each has a **recommended** answer so the plan can be approved in one pass. D-SC-14, D-SC-15, D-SC-16 and
D-SC-17 also need the founder; D-SC-20 needs legal; D-SC-23 needs the AI-constitution owner.

1. **D-SC-1 Scope.** **Recommended:** navigation only; four outcomes; never names a condition, probability or
   medicine.
2. **D-SC-2 Age.** **Recommended:** 18+ only; the first question asks; under 18 → "please see a doctor; in an
   emergency call 112" [CL copy], no flow.
3. **D-SC-3 Exclusions (T7).** **Recommended:** pregnancy, long-term conditions under treatment and symptoms
   beyond [CL] days skip SELF_CARE_INFO (at least BOOK_CONSULT), red flags still apply first.
4. **D-SC-4 Symptom list (T1).** **Recommended:** at most 8 common campus presentations in v1, one symptom per
   check; the clinical lead chooses.
5. **D-SC-5 Red flags and source protocol (T2, T3).** **Recommended:** the clinical lead picks one primary
   published protocol, adapts it for lay self-triage and cites a source on every row.
6. **D-SC-6 "Not sure".** **Recommended:** offered on every question; counts as "Yes" on red flags and takes the
   safer branch elsewhere.
7. **D-SC-7 No rule matches.** **Recommended:** BOOK_CONSULT, never SELF_CARE_INFO.
8. **D-SC-8 Errors and protocol failure.** **Recommended:** fail closed: emergency numbers plus "see the campus
   clinic today" [CL copy]; use the bundled approved version offline or when the fetch fails or the hash is
   unknown.
9. **D-SC-9 Clinic closed or not configured.** **Recommended:** CLINIC_TODAY reads "See a clinic or hospital
   today" [CL copy] with 108 / 112 if it gets worse; clinic hours come from the campus configuration, never
   hard-coded.
10. **D-SC-10 Self-care content (T6).** **Recommended:** only clinician-reviewed knowledge-base passages with
    source and version; no medicines or doses; no Ayush answer; `DiseaseAwarenessHub` not used.
11. **D-SC-11 Safety net (T5).** **Recommended:** on every non-emergency outcome, with a time limit per symptom.
12. **D-SC-12 Free text.** **Recommended:** none in v1 except the list search, which is filtered and
    crisis-checked on the device and never sent.
13. **D-SC-13 Mental health.** **Recommended:** "Feeling low, anxious or unsafe" opens crisis support directly
    (Tele-MANAS 14416 first, toll-free, 112, campus counsellor where configured); no yes/no questions about mood.
14. **D-SC-14 Crisis signal from this flow.** The existing gate path (`/care/crisis-signal`, kind only, campus-
    scoped counsellor follow-up) would be the one place a campus-side person learns anything.
    **Recommended:** keep it for signed-in students, self-harm and overdose kinds only, kind and surface
    `symptom_checker` only; never for medical red flags, never in public mode. Founder to confirm against
    "never shown to campus".
15. **D-SC-15 Public mode.** **Recommended:** public, evaluated on the device, nothing stored or sent.
16. **D-SC-16 Signed-in save.** **Recommended:** optional, unticked consent, ids-only summary, shared only
    through a record share; retention setting default **90 days**, deletable any time.
17. **D-SC-17 Aggregate statistics.** **Recommended:** none in v1, not even counts of outcomes; revisit later
    only with k ≥ 20 (Rule-K-Anonymity) and never per campus below that.
18. **D-SC-18 Languages.** **Recommended:** a language ships only after a clinician reviews its strings; until
    then the flow is not offered in that language (with a link to the English version), no draft te/hi.
19. **D-SC-19 Change control.** **Recommended:** protocol is not an ops setting; new version + full scenario
    re-run + clinical-lead signature for every change.
20. **D-SC-20 Regulatory opinion.** **Recommended:** a written CDSCO SaMD opinion is **blocking** for public
    launch; the intended-use statement is frozen with it.
21. **D-SC-21 Camera.** **Recommended:** confirm the founder's decisions: rPPG waits for clinical sign-off and
    is wellness-only if ever built; camera temperature and photo skin / deficiency checks stay off.
22. **D-SC-22 Ayush.** **Recommended:** no Ayush entry from any result screen in v1.
23. **D-SC-23 Constitution wording.** **Recommended:** AI-constitution owner narrows Rule-A to "no AI decides
    triage; navigation only" and adds 112 to Rule-B.
24. **D-SC-24 Scenario test set.** **Recommended:** ≥ 100 vignettes (≥ 2 per red flag), 100 % agreement, zero
    under-triage on red flags, both evaluators.

---

## Build order

Nothing starts until step 0 is complete. One ticket per screen, branch and PR; backend PRs first.

0. **Gate (blocking).** Clinical lead fills T1–T7 and the scenario set and signs; decisions above taken; boards
   drawn on canvas page 9 with briefs and approved by the design reviewer; regulatory opinion (D-SC-20) for
   public launch.
1. **Protocol package (no UI).** Protocol JSON schema and the signed v1 file; TS evaluator
   (`src/features/symptoms/protocol/`); Python evaluator (`backend/services/symptom_protocol.py`); parity,
   property and scenario tests; approved-hash list; `GET /symptom-check/protocol` (public, read-only).
2. **Public flow.** SymptomStart, SymptomPick, SymptomQuestions, SymptomEmergency, SymptomResult; the crisis card
   promoted to the design system; web (public route + phone frame) and Expo; behind
   `symptom_check.enabled` (settings registry, default off).
3. **Signed-in save.** Migration for `care_symptom_checks` (Rule L `CLINICAL`), consent record, server recompute,
   share, retention job, audit, SymptomSave.
4. **Before switching on.** Student comprehension test; te/hi clinical review; crisis-signal behaviour per
   D-SC-14; clinical lead signs the release.

## Approval

_(Clinical lead: name, date, protocol version and hash.)_
_(Design reviewer: name, date, boards.)_
_(Legal / DPO: name, date, §Data and §Regulatory.)_
_(AI-constitution owner: name, date, D-SC-23.)_
