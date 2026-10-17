# Tier 1 review: consent, lab release, check-in pass (2026-10-16)

AGENTS.md and DESIGN.md require a **named** design review for every Tier 1 screen, and these touch clinical and legal ground as well. Nothing below is approved until a person signs it. Branch: `fix/audit-guardrails-2026-10-16`.

## Sign-off

| Area | Reviewer (name) | Role | Date | Decision (approve / changes / reject) | Notes |
|---|---|---|---|---|---|
| Signup consent: design | | Design lead | | | |
| Signup consent: legal (DPDP) | | Legal / privacy | | | |
| Lab report release: clinical | | Clinician | | | |
| Lab report release: design | | Design lead | | | |
| Check-in pass: security | | Security | | | |
| Check-in pass: design | | Design lead | | | |
| Telugu copy | | Native speaker | | | |
| Hindi copy | | Native speaker | | | |

## 1. Signup consent (SK-027, canvas OnboardingConsent)

**Where:** web `/signup` → campus step; phone Create account → after the code. Copy: `member.consent.*` in `src/i18n/areas/member.ts`. Server: `SIGNUP_CONSENT_VERSION` in `backend/services/workflow_auth.py`.

**Built:** three required items, all unticked; no account without all three (server 422, verification not spent); a `care_consent_records` row with version, purposes, language and time, written in the same transaction as the account; `GET /auth/consents` shows the student what they agreed to.

**Left out of the canvas on purpose. Confirm each one:**
- [ ] "Ask a parent or guardian": DESIGN.md D4, 18+ only.
- [ ] Named grievance officer and "reply within 30 days": none is appointed. Once one is, add them to the consent screen and the privacy notice, and **bump the version**.
- [ ] "Partner offers": Rule L.
- [ ] "Count me in campus totals" and "Invite me to health research": neither feature exists yet. Add them as optional, default-off items when it does.
- [ ] "Stored encrypted in India": not verifiable from the code. Add it only with evidence.

**Questions for legal:**
- [ ] Is "To withdraw, delete your account" an acceptable withdrawal route for the three required purposes, or is a per-purpose withdrawal needed?
- [ ] The privacy notice (`/privacy`) still states that no notice is published. Consent before a published notice: acceptable for launch?
- [ ] Erasure is a 7-day grace period plus a job, inside 30 days (`backend/services/erasure.py`). Does "within 30 days" in the copy match the policy?

**Rule:** any change to `member.consent.*` copy means a new `SIGNUP_CONSENT_VERSION` (backend) and `SIGNUP_CONSENT_VERSION` (`src/features/auth/viewmodel/signupConsent.ts`), the same value on both sides.

## 2. Lab report release (SK-108, SK-121)

**Where:** lab: `/lab-queue` → "File the report". Doctor: Doctor console → Today → "Lab reports waiting for your review". Student: Prescriptions → lab tests. Super admin: `GET /work/lab-reviews` and `POST /work/lab-reviews/{id}/assign` (API only, no screen yet).

**Built:** every report is held outside the student's vault until a doctor releases it with a note. Before release the student sees "With a doctor for review" and nothing about the result. The reviewer is the ordering doctor, else a doctor with a confirmed or completed appointment with the student, else one a super admin assigns. An assignment is exclusive.

**Clinical questions:**
- [ ] **All** reports go through a doctor, not only critical ones. Is that the intended policy, or should normal results release automatically?
- [ ] There's no time limit. A report with no available doctor waits indefinitely, which fails closed. Is an escalation SLA needed?
- [ ] The lab self-declares a critical value, and there are no reference ranges. Who owns adding them?
- [ ] Is the doctor's note shown to the student as written? (It is.) Is guidance or a template needed?
- [ ] A super admin can assign any active doctor. Does assignment need the doctor's acceptance?

## 3. Check-in pass (SK-057, SK-085, SK-123)

**Where:** web `/pass` and `/digital-id`; phone Member ID; staff `POST /identity/verify` (web Digital ID → verify).

**Built:** a signed QR and 6-digit code each 30 s (`PASS_SIGNING_SECRET`). A code verifies only in its own step (plus the previous one) and only once. The 6-digit code needs the member number. The server pre-signs the next 10 minutes so a weak signal at the counter doesn't break the pass, and the app holds these **in memory only** (guardrail 9). Closing the app while offline loses them, and then the pass says to show the college ID.

**Security and design questions:**
- [ ] A 10-minute window: right length? Longer means longer offline use, but more codes in memory on a stolen, unlocked phone.
- [ ] Pharmacy, lab and clinic counter staff (VENDOR) can now verify. They see name, campus, roll number and campus status only. Approve?
- [ ] Not built: check-in history, "This wasn't me", receipt with bag photo, live photo match (SK-057/SK-123). Separate tickets?
- [ ] On web, a code drawn from memory is rendered from its cells, not the server's SVG. Check it at 390 px and 1440 px.

## 4. Telugu and Hindi copy

Written by the engineer, then self-checked; **not** reviewed by a native speaker. The whole TE/HI catalogue is already marked unreviewed (`src/i18n/index.tsx`). Keys added on this branch:

- `member.consent.*`, `member.pass.*`
- `partner.core.review.lab*`, `partner.core.review.openReport*`, `partner.core.review.release*`
- `admin.fulfil.fileReport`, `fileHint`, `reportFile`, `criticalCheck`, `criticalNoteLabel`, `sendForReview`, `withDoctor`
- `care.rx.awaitingReview`, `care.rx.reviewNote`, `care.rx.status.REPORT_READY`, `care.meds.completion`

Self-check fixes already made: in Telugu, "enrolled" is now నమోదు (it was చేరాను, "joined"), and the object marker is added in the erasure lines. In Hindi, "पास पर" was ambiguous with "के पास" and is now "चेक-इन पास"; subjects are added to the erasure lines. "Member number" now matches the existing term (మెంబర్ నంబర్ / मेंबर नंबर).

Reviewers: check meaning first (consent and clinical lines must say exactly what the English says), then tone. A change to `member.consent.*` needs a version bump (see §1).
