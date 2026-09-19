# Student Health Platform — Build Documentation v0.4

**Working name:** TBD (placeholder: *AXISS Care*)
**Owner:** Krishna Chintakayala / AXISS Group
**Model:** Standalone brand · B2B + B2C · every 18+ student and every campus eligible
**Stack:** React Native (web + mobile) · FastAPI · AXISS Cortex AI layer
**Date:** August 2026 · supersedes v0.3

---

## 0. Decisions locked

| Question | Decision |
|---|---|
| Age scope | **18+ only.** Age verification evidenced, never self-declared. |
| Market | India launch. Region-abstracted architecture for global. |
| Customers | **Both.** Any 18+ student direct (B2C); any campus by contract (B2B). `institution_id` is nullable. |
| Brand | **Standalone.** Own entity, own DPDP registration, own consent notice. SSO from StudentAlumni.ai for distribution only. |
| ABDM role | **HIU in v1. HIP from Phase 3**, via the campus clinic in the Health Facility Registry. |
| Wallet | **Points ledger only.** Nothing loaded, nothing withdrawable, nothing transferable. |
| **Prediction** | **Clinician-facing in v1. Not student-facing.** The engine gets built; its output lands on a doctor's dashboard. Consumer-facing prediction is a licensed SaMD path, Phase 8. |
| **Awareness** | **Student-facing, unrestricted, aggressive.** General RMP-reviewed education. This is where most student value lives. |
| Clinical accountability | Named medical advisor, appointed before Phase 1. |
| Insurance | Multiple vendors in conversation; no exclusivity. |

### Why prediction moved to the doctor's side

CDSCO's guidance puts **prediction** explicitly inside the regulated set: software performing a medical purpose — diagnosis, prediction, prevention, treatment or physiological monitoring — is regulated, while lifestyle and wellness apps sit outside. Classification is confirmed on **intended use and design characteristics**. A mandatory "consult a doctor" banner is neither. It does not declassify the software, and it does not change user behaviour — people act on the prediction and skim the warning.

Meanwhile the telemedicine rules leave a clean lane open: AI and ML-based decision support **may** be used to assist and support the RMP on patient evaluation, diagnosis or management, provided the final counselling or prescription is delivered directly by the RMP.

So: **build the whole engine, point it at the clinician.** Same clinical value delivered, fully compliant, and it makes M8 far more saleable — a doctor triaging 400 camp screenings with AI flags instead of paper. It also generates the validated dataset you'd need to license a consumer version later.

---

## 1. Module map

```
┌─── FOUNDATION ────────────────────────────────────────────────┐
│ M1 Identity & Age Verification    M2 Health Record Vault      │
│ M3 ABDM Bridge (HIU → HIP)        M4 Consent & Audit          │
└───────────────────────────────────────────────────────────────┘
┌─── INTELLIGENCE ──────────────────────────────────────────────┐
│ M5  Care AI — student-facing   (§3.2a — restate, explain, route)│
│ M17 Awareness Library — student-facing, general, RMP-reviewed │
│ M18 Clinical Intelligence — CLINICIAN-FACING ONLY             │
│     flags · trends · risk stratification · camp triage        │
└───────────────────────────────────────────────────────────────┘
┌─── CARE DELIVERY ─────────────────────────────────────────────┐
│ M6  Teleconsult          M7  Mobile Diagnostics & Collection  │
│ M8  Health Camps         M9  Emergency & Ambulance            │
│ M10 Campus Clinic OPS    M11 Mental Health Access             │
└───────────────────────────────────────────────────────────────┘
┌─── ENGAGEMENT & COMMERCE ─────────────────────────────────────┐
│ M12 Points Ledger        M13 Marketplace (wellness SKUs)      │
│ M14 Rewards & Coupons                                         │
└───────────────────────────────────────────────────────────────┘
┌─── B2B ───────────────────────────────────────────────────────┐
│ M15 Institution Console  M16 Provider & Ops Console           │
└───────────────────────────────────────────────────────────────┘
```

**M18 is architecturally isolated.** It has no API surface reachable by a student session. Not a permissions check — a separate service, separate auth realm, output written only to clinician and camp-review contexts. The isolation is the compliance boundary; if a student can ever reach M18 output, the product has silently become consumer-facing SaMD.

---

## 2. Architecture summary

Four abstraction seams keep India specifics out of business logic: **health identity** (`HealthIdentityProvider` interface, `AbdmProvider` first impl), **clinical data** (FHIR R4 for everything), **compliance policy** (per-region policy objects — differences are data, never `if country == "IN"`), **money** (payments interface).

Regional data plane, never crossing. Postgres + S3 with per-user envelope encryption + Redis + append-only audit log + per-user-namespaced vector store. Consent enforced at the FastAPI gateway, not in service code.

Added in v0.4: **M18 sits behind its own gateway** with clinician-only auth, and writes to a `clinical_flag` table that the student API has no grant on. Enforce at the database role level, not the ORM.

---

## 3. THE AI CONSTITUTION

Governs every AI feature. Not guidance — a PR violating a rule here does not merge.

### 3.1 Regulatory position

**Rule A1 — Student-facing surfaces stay outside SaMD in v1. Clinician-facing decision support stays inside the TPG assist lane. These are design constraints.**

The CDSCO final Guidance Document on Medical Device Software issued 21 July 2026 (Doc No. CDSCO/MD/GD/MDSW/01/2026) covers classification, safety and performance requirements, documentation, quality management and post-market obligations. Risk classes run A to D based on severity of clinical impact if the software malfunctions, with AI/ML decision-support tools facing the most stringent validation. Class A and B are licensed by State Licensing Authorities; Class C and D centrally by CDSCO.

**Rule A2 — Intended use is a regulatory surface. Marketing copy can reclassify the product.**
Classification follows the manufacturer's stated intended use. A landing page reading "our AI predicts your health risks" reclassifies you regardless of where the output goes. The intended-use statement is a controlled document. Nobody writes *diagnose, detect, screen, predict, risk score* about a student-facing feature without medical advisor sign-off. For M18, the language is "clinical decision support for registered practitioners" — and the marketing audience for it is institutions and doctors, not students.

**Rule A3 — The AI never counsels or prescribes.**
Technology platforms based on AI/ML are not allowed to counsel patients or prescribe any medicines; only an RMP may do that, communicating directly with the patient. AI/ML decision support may assist and support the RMP, with final counselling or prescription delivered by the RMP. The prohibition is absolute.

Architecture follows: **AI assists the doctor → the doctor talks to the student.** Never AI talks to the student with a doctor reviewing afterwards.

**Rule A4 — TPG platform obligations apply to M6 from day one.**
Platforms must verify every practitioner is registered with the relevant medical council, conduct due diligence before listing, publish each RMP's name, qualification, registration number and contact details, and run a grievance mechanism. Non-compliance can get the platform blacklisted, after which no RMP may practise telemedicine on it. Build registration verification as a hard gate in M16.

**Rule A5 — The student/clinician boundary is the compliance boundary.**
Any change that moves M18 output toward a student surface is a regulatory change, not a product change. It requires medical advisor sign-off and a classification reassessment. Log it as such.

---

### 3.2a Student-facing capability

| Capability | Status | Guardrail |
|---|---|---|
| Ingest, OCR, classify, file a record | ✅ | Show source image on low OCR confidence |
| Restate what a report says, in plain language | ✅ | Only what's printed. Zero added interpretation. |
| Flag that a value sits outside **the lab's own printed range** | ✅ | Neutral wording, amber not red, ends in "discuss with a doctor" |
| Plot a value the student already has, over time | ✅ | Each point labelled with source report + date |
| Explain what a test measures | ✅ | Educational. No personal application. |
| Serve awareness content linked to a term **printed in their report** | ✅ | Glossary lookup, not inference. See Rule B1. |
| General awareness content (campus, season, year of study) | ✅ | M17. Unpersonalised by clinical data. |
| Prescription transcription (OD/BD/TDS, Indian brands) | ✅ | Transcription only. Never advise on the regimen. |
| Non-clinical nudges — "last checkup 14 months ago", "camp is Thursday" | ✅ | Calendar and completeness facts only |
| Reminders, booking, navigation | ✅ | — |
| Route a symptom to a care pathway | ⚠️ | Routes to a *service*. Never names a cause. |
| Voice intake in Indic languages | ⚠️ | Transcription + routing only |
| **Prediction, risk score, screening flag, "you may be developing X"** | ❌ | → M18, clinician-facing |
| Diagnosis or differential | ❌ | — |
| Prognosis, survival, "how serious is this" | ❌ | — |
| Dosage, drug interaction, substitution, "can I stop this" | ❌ | — |
| Imaging interpretation | ❌ | — |
| Calorie targets, weight goals, "ideal weight", BMI as a score | ❌ | Rule E4 |
| Fertility, pregnancy, sexual health guidance | ❌ | Route to RMP |
| Mental health assessment or therapeutic response | ❌ | §3.4 |

**Rule B1 — The glossary/inference line.** Linking an article about haemoglobin because the word *haemoglobin* appears on the student's uploaded report is a lookup, and it's fine. Linking an article about anaemia management because a model inferred elevated risk is prediction, and it isn't. The test: does the trigger appear literally in the source document, or did you derive it? Implement as a term-match on extracted FHIR codes, never as a model call.

**Rule B2 — Awareness content is general, never addressed.** "1 in 4 Indian students is vitamin D deficient" is fine. "You are likely vitamin D deficient" is not. Second person plus a clinical claim is the thing to grep for in review.

---

### 3.2b Clinician-facing capability (M18)

Available **only** to a verified RMP or, in the camp context, to the reviewing doctor. Never rendered in a student session.

| Capability | Status | Guardrail |
|---|---|---|
| Trend flags across a patient's record history | ✅ | Every flag cites source records + dates |
| Camp triage — stratify N screenings by review priority | ✅ | Priority ordering, not a diagnosis |
| Risk stratification on structured lab data | ✅ | Presented as "for your review", never as a finding |
| Cohort patterns for the institution | ✅ | Aggregated and anonymised only |
| Prep summary before a teleconsult | ✅ | Record summary, no recommendation |
| Draft clinical notes for RMP editing | ✅ | Doctor edits and signs; draft never auto-files |
| Suggested next investigations | ⚠️ | Framed as options for the RMP to consider |
| Autonomous decisions of any kind | ❌ | RMP is the decision-maker, always |
| Anything reaching a student unmediated | ❌ | Rule A5 |

**Rule B3 — Every M18 output carries an RMP action.** Acknowledge, act, or dismiss-with-reason. Logged with the practitioner's registration number. This is your evidence that a human made the decision, and it's what keeps you in the "assist and support" lane rather than the "AI counselled the patient" one.

**Rule B4 — Flags expire.** An unreviewed flag older than the defined SLA escalates to the campus clinic lead. A prediction engine that generates alerts nobody reads is worse than none — it manufactures a documented, ignored warning.

**Rule B5 — Alert volume is a tracked metric.** Measure dismissal rate. Above ~30% dismissal, the model is miscalibrated and gets retuned. Alert fatigue is the standard failure mode of clinical decision support and it kills adoption faster than inaccuracy.

---

### 3.2c Prohibited everywhere, both surfaces

Autonomous prescribing. Any output to a user who failed 18+ verification. Any use of clinical data for offer targeting. Any training on user health data. Any model-supplied reference range.

---

### 3.3 Human-in-the-loop

**C1.** Every student-facing clinical-adjacent output ends in an action: **book**, **escalate**, or **see a doctor**. No action = a bug.
**C2.** Camp pipeline is `M18 flags → RMP reviews → student receives`. Flagged findings require sign-off logged against a registration number. Only plain-restatement output may auto-release.
**C3.** The medical advisor owns and versions system prompts, boundary rules, the crisis taxonomy, and M18's flag thresholds. Version-controlled, referenced by ID in every logged output.
**C4.** No AI feature ships without written advisor approval of its intended-use statement and eval results.
**C5.** M17 content is RMP-reviewed before publication and re-reviewed annually. Content is a clinical artefact, not marketing copy.

### 3.4 The crisis gate

**D1.** Deterministic classifier **before** the LLM on every free-text input in the product — triage, chat, camp questionnaire, symptom entry, support tickets, feedback. Fires → LLM bypassed entirely, human help surfaced.
**D2.** Fail closed. Classifier unavailable or unsure → free-text AI path disabled, route to human support. Never fail open.
**D3.** Tested in every supported language and in code-mixed input (Hinglish, Telugu-English). Crisis language does not arrive in clean English.
**D4.** Response is fixed reviewed content, never model-generated: Tele-MANAS 14416, campus counsellor, option to alert a pre-designated contact, offer to book a human. Static means it cannot drift.
**D5.** Adversarial red-team is a release blocker, before launch and before every model change. This path will be tested by real distress, not by QA.
**D6.** No engagement mechanics near mental health — no points, streaks, reminders or re-engagement notifications on any M11 surface. The points service has no read access to mental health events, enforced at the database role level.

### 3.5 Output rules

**E1.** Every clinical claim cites its source record: "Hb 11.2 on 14 March, SRL report." No unsourced numbers.
**E2.** No fabricated or derived values. The model reports what's in the record — never computes, estimates or fills gaps. Low OCR confidence → show the image, ask the student to confirm.
**E3.** Reference ranges come from the lab's own printout. Ranges vary by lab, method, age and sex; a model-supplied range is a fabricated clinical claim.
**E4.** Body metrics are not gamified. M8 measures BMI on hundreds of students a day, and this population carries real disordered-eating risk. No calorie targets, no weight goals, no "ideal weight", no BMI as a score or colour gauge, no leaderboards or comparisons on body metrics, no points for weight change. Out-of-range → private, neutral clinician referral. A student asking the AI for a diet or weight-loss plan gets a booking offer, not a plan.
**E5.** Never red for an out-of-range value. Amber.
**E6.** Always disclose the AI. No clinical title, no "Dr", no "I think you have". Persona is warm and administrative, never medical.
**E7.** Answer in the student's language; preserve the clinical term so they can say it to a doctor.
**E8.** Uncertainty is stated. "I can't tell from this report" is a required output, not a failure.

### 3.6 Data rules

**F1.** No training on user health data. Inference only — contractually, architecturally, and stated plainly in the privacy policy.
**F2.** Zero data retention with model providers. ZDR endpoints, no provider-side prompt logging. In the contract.
**F3.** Minimise before inference. Strip name, phone, address, ABHA number, institution, roll number. The model needs values, not identity.
**F4.** Per-user vector namespace enforced at the retrieval layer — cross-user retrieval impossible, not merely disallowed.
**F5.** Region-locked inference. Indian users processed in Indian regions or the provider isn't a candidate.
**F6.** Log every clinical-adjacent output: model version, prompt version, input, output, user, timestamp, source records retrieved. Append-only. For M18, add the reviewing RMP and their action.

### 3.7 Evaluation and release

**G1.** Every AI feature has a medical-advisor-signed eval set before shipping. Versioned, scored.
**G2.** Evaluate in representative populations. CDSCO expects AI-enabled medical device software to demonstrate performance evaluated in at-risk populations, healthcare settings and operational environments representative of the intended use. Adopt this even outside SaMD — your users are 18–24 and largely Indian-language-first. An eval built from English US clinical text tells you nothing.
**G3.** Multilingual eval per shipped language. Degradation in Telugu is invisible if you only measure English.
**G4.** Bias eval across sex and age — anaemia, thyroid and PCOS under-recognition patterns are documented. Measure them. This matters most for M18, where a miscalibrated flag threshold systematically under-refers a whole group.
**G5.** No model version reaches production without eval pass + advisor sign-off. Provider updates count. Pin versions; never auto-upgrade.
**G6.** Maintain an Algorithm Change Protocol from now — CDSCO's framework contemplates one as required documentation. What may change without re-review, what triggers re-evaluation, who approves. You will need this on day one of the Phase 8 licensing path.
**G7.** Degrade safely. Software should maintain safe operation during cybersecurity incidents including partial connectivity loss, denial-of-service, or integrity compromise. Offline camp stations, ambulance dispatch and the crisis gate need defined degraded-mode behaviour. Degraded mode never means "AI answers anyway."

### 3.8 Incidents

**H1.** One-tap "this was wrong or harmful" on every AI surface, student and clinician.
**H2.** Triage within 24 hours. Clinical or crisis-related → medical advisor.
**H3.** Every incident produces a logged resolution: prompt fix, classifier update, threshold change, or feature disable. Disabling is always acceptable.
**H4.** Quarterly advisor review of all clinical-adjacent logs, including M18 flag precision and dismissal rates. Post-market surveillance mindset.

---

## 4. M17 — Awareness Library

The student-facing home for everything prediction can't say. Build it properly; it carries more perceived value than the vault.

- RMP-reviewed articles and short video, in English + Hindi + Telugu at minimum, expanding by campus footprint
- Organised by: what tests mean · common student health topics (sleep, hostel nutrition, screen strain, seasonal illness, vaccination schedules, exam-period stress, substance awareness) · when to see a doctor · how the health system works (what an ABHA is, what a referral is, how insurance works)
- Surfaced by campus, year of study, season, and stated interest — **never by clinical data** (Rule B2)
- Term-triggered from the student's own report vocabulary (Rule B1)
- Points for reading are allowed and are a good mechanic — it's a completed health action with no utilisation risk

**Content rule:** every article is general and third-person. The moment a piece of content addresses the reader's own clinical state, it's left M17 and become a regulated claim.

---

## 5. Points ledger

Confirmed: **points for health-positive actions, plus coupons and prizes in the same place. No money.**

Not a PPI because nothing is loaded (points are issued for actions, not purchased), nothing is withdrawable, nothing is transferable. Enforce in the schema: `points_txn` has no `payment_id` column and never will; no debit path to cash, bank, UPI or any external instrument; no user-to-user transfer; no stated INR equivalent anywhere in the product; expiry defined and disclosed.

**Earn on completed health actions, never on visit or spend volume** — rewarding utilisation induces unnecessary care, poisons your trend data, and edges toward inducement. TPG 2020 prohibits RMPs from soliciting patients through advertisements or inducements, and NMC rules bar commissions for referrals.

| ✅ | ❌ |
|---|---|
| Completing the annual checkup | Number of consults booked |
| Completing a vaccination | Number of tests ordered |
| Uploading and verifying a record | Any spend amount |
| Camp registration + attendance | Visiting a specific paid provider |
| Reading an M17 article | Any M11 interaction (D6) |
| **Closing a doctor-flagged referral** | Any body-metric change (E4) |
| Emergency-card completeness | Streaks that penalise a missed day |

Referral closure is the best mechanic in the product — it aligns the student, the clinical outcome, and the college's compliance reporting simultaneously, and it's the loop that makes M18 worth paying for.

Redemption is a **discount at checkout**, never a stored balance paying a bill. Partner coupons issue as codes redeemed at the partner. No offer targeting on clinical data — the offers service has no read grant on the clinical schema.

**Track:** RBI's draft Master Direction on PPIs of 22 April 2026 replaces the 2021 framework, and marketplaces would lose the closed-system PPI exemption. A pure non-purchasable points programme should stay outside PPI scope, but confirm with counsel before M13 ships.

---

## 6. Build sequence

**Phase 0 — Validate (4 weeks, no code).** Three administrators: what would you pay for, from which budget line? Thirty students: would you upload a report? Appoint the medical advisor here.

**Phase 1 — Camps + Vault + Awareness (12 weeks).** M1, M2, M4, M8, M17. One campus, one camp, end to end. AI limited to §3.2a's ✅ column. M17 launching with Phase 1 gives the app content value before the vault fills.

**Phase 2 — Student AI + ABDM HIU (8 weeks).** M3, M5. Full AI Constitution implemented, crisis gate tested adversarially, before any conversational surface is exposed.

**Phase 3 — Clinical Intelligence + Care delivery + HIP (12 weeks).** M18, M6, M7, M10, M11. Campus clinic registers in HFR; you become a HIP. M18 ships against real camp data with the medical advisor tuning thresholds. Diagnostics first — it's the margin and the only clean structured-data source.

**Phase 4 — Emergency (6 weeks + legal).** M9. Operator vetting and ToS take longer than the code. 108 stays above paid dispatch.

**Phase 5 — Points & rewards (6 weeks).** M12, M14.

**Phase 6 — Commerce (8 weeks).** M13, wellness SKUs, marketplace model.

**Phase 7 — Global.** Only if India is working.

**Phase 8 — Consumer-facing prediction, licensed.** The real moat, and the reason M18 is built early. Requires: intended-use statement and classification determination (likely Class B or C), clinical validation in representative populations using your own camp dataset, a quality management system, technical documentation per the CDSCO guidance, licensing via the State Licensing Authority (A/B) or CDSCO (C/D), and post-market surveillance. Budget 12–18 months and real money. Do not start until Phases 1–3 have produced a validation dataset worth submitting.

---

## 7. Still open

1. **Which college is the design partner?** Everything above is theory until one commits.
2. **Agent name.** Short, warm, non-clinical. No title, no implied authority (E6).
3. **Model provider** meeting F1/F2/F5 — no training, ZDR, Indian region. Confirm before Phase 2.
4. **Counsel review** on: M9 terms of service, the M13 marketplace/PPI position once the final RBI direction is notified, and the intended-use statements under A2 — one for the student product, one for M18.
5. **M18 threshold ownership.** Who tunes flag sensitivity, and against what outcome measure? Needs answering before Phase 3, not during.
6. **Insurance vendors** — conversations open, no exclusivity.

---

*Draft v0.4. §3 is load-bearing; the medical advisor signs it before Phase 1 code starts. §3.2a/§3.2b is the split that keeps the product legal — treat any request to move a capability across that line as a regulatory change, not a feature request.*
