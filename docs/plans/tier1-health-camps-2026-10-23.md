# Tier 1 plan — health camps: pass, staff check-in, results, vaccination and blood drives, paid camps

**Status:** waiting for review. Nothing in this plan is built. Reviewer: Krishna Chintakayala (product), plus the
clinical lead for §3–§4 and legal for §4–§5.
**Branch that built the rest:** `feat/health-camps` (booking, waitlist, change and cancel, reminders, host consoles).
**Why this is Tier 1:** DESIGN.md §5 lists "check-in pass and staff scanner", "consent", "identity" and "anything
showing a clinical value" as safety-critical. Each section below touches one of them.

## What exists after feat/health-camps (for context)
- A student books one slot per camp, joins a waitlist, changes or cancels until `camps.change_cutoff_hours` before the
  slot. The booking carries an 8-character **booking reference** shown as text (not a scannable code).
- A reminder goes `camps.reminder_hours_before` the slot through the reminder outbox with fixed text that names no
  camp or service.
- Hosts (campus admin, clinic/lab partner, super admin) see counts per slot only: never who booked.
- On the camp day the **student checks themself in** and marks stations done (`POST /camps/{id}/check-in`,
  `/stations/{id}`): this predates the branch and is unchanged. Station rows hold no values.
- Service codes `VACCINATION` and `BLOOD_DONATION` exist but `POST /ops/camps` refuses them (`SERVICE_HELD`).
- `price_paise` exists; a host can set it only when `camps.paid_camps_enabled` is on (off), and a paid camp is never
  booked (`PAYMENT_NOT_AVAILABLE`).

## 1. Booking pass with a scannable code (student) — needs design + review
**Proposal.** Reuse the identity pass's rotating QR (`services/check_in_pass.py`, MyPass / WebPass) rather than a second
static code: the camp desk scans the student's existing pass and the server finds their booking for today's camp. A
static QR of the booking reference would be photographable and replayable.
- Pass tokens rotate; no booking reference is encoded. QR colours `qr-foreground` / `qr-background` only.
- Works offline for an already-signed-in student (guardrail 2), as MyPass does.
**Decisions for the reviewer.** D-HC-1: reuse MyPass (recommended) or a camp-specific pass? D-HC-2: may the desk also
type the 8-character reference when a phone is dead (needs a photo-ID check, §2)?

## 2. Staff check-in at the desk — needs design + review
**Proposal.** A host-scoped endpoint `POST /ops/camps/{id}/check-in` taking a scanned pass token (or the reference plus
a staff attestation that photo ID was checked). It sets `checked_in` on a BOOKED row for that camp only.
- Staff see the student's **first name and photo** (identity match, as ScanVerify does), never their records.
- Only staff of the host (partner `PartnerStaff` with a camp role) or the campus admin; every check-in is audited.
- `StaffCampFast` (canvas page 6) becomes the live scanner; the "—" counts become real per the same counts endpoint.
- Student self check-in: keep, remove, or keep only when the host has no desk? (D-HC-3)
**Not decided.** Whether a host may see a list of names for the day (needed for a paper fallback). Today no endpoint
lists a student; adding one changes the privacy promise on the student screen ("never who").

## 3. Results from a camp — needs clinical sign-off
**Proposal.** A camp result is a record the camp's clinician (NMC doctor) or lab files, released to the student through
the **existing** lab-result path (`services/lab_results.py`: filed → doctor release → student), never typed by desk
staff, never shown on the host console, never in a notification (DESIGN.md §7).
- Station "done" stays a progress mark only; no values on stations.
- Out-of-range values are amber; a critical value follows the existing critical-value path.
**Decisions.** D-HC-4: which stations produce a record (vitals? eye acuity? dental notes?) and in what FHIR shape.
D-HC-5: who is the responsible clinician for a partner's camp.

## 4. Vaccination drives and blood donation drives — clinical + legal
- **Vaccination:** informed consent at the point of care, contraindication screening, batch/lot recording, AEFI
  follow-up, and the record in the student's vaccine history (M2Vaccines "your vaccine record"). Booking alone could be
  enabled first, but only with a consent step designed and reviewed.
- **Blood donation:** donor eligibility questions are clinical (weight, haemoglobin, recent illness, medicines); the
  answers are clinical data and must stay on the clinical plane. Link to the existing blood-donor registry
  (`care_blood_donors`) is a separate decision.
- Until signed off, `HELD_SERVICES` in `backend/services/health_camps.py` keeps both refused.

## 5. Paid camps — Rule L decision (product + legal)
A payment for "Dental check camp" reveals care sought, so the commerce plane must never hold the camp or its services.
**Proposal.** A generic commerce order line ("Campus camp booking", amount only) whose id the clinical-plane booking
references; the commerce role never reads `care_camp_attendances`. Refunds on cancel follow the order refund flow;
payment never changes who sees the booking (guardrail 4: payment confers no access). Price always shown before
booking (DESIGN.md §2.3). Turn on with `camps.paid_camps_enabled` only after this ships.

## Out of scope here (Tier 2/3, can follow without this plan)
- Push/WhatsApp for "a place opened up" (today: in-app notice + the slot reminder).
- A host editing a published camp's slots (today: create, approve/decline, call off).

## Sign-off
| Section | Reviewer | Decision | Date |
|---|---|---|---|
| §1 Pass | Krishna Chintakayala | | |
| §2 Staff check-in | Krishna Chintakayala | | |
| §3 Results | Clinical lead | | |
| §4 Vaccination / blood drives | Clinical lead + legal | | |
| §5 Paid camps | Krishna Chintakayala + legal | | |
