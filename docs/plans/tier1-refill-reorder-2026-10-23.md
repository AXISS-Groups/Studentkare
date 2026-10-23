# Refill reminders and one-tap reorder: the Tier 1 parts (plan, not built)

**Approved by:** _(design reviewer, date)_ · _(clinical lead, date)_ · _(pharmacist / legal on Schedule H, date)_

**Status:** plan for Krishna Chintakayala, 2026-10-23. Nothing in this file is built. The Tier 2 part of
the feature shipped in `feat/refill-reorder` (M2Refills, M2Reorder; briefs in `design/screens/briefs/`).
**Builds on:** `tier1-canvas-wp07-2026-10-20.md` (Medications), `tier1-mobile2-health-2026-10-21.md`
(M2Reminders, M2Product), `tier1-medicine-info-2026-10-22.md` (prescription-only listings).

## What was built, and why it is not Tier 1

The run-out date is arithmetic on numbers the student typed: units on hand ÷ (units each time × times a
day). The screen never proposes, checks or corrects a dose, never says "you should take", and shows no
clinical value. The prescription gate only asks the clinical side *whether* an unexpired e-prescription
exists (`GET /api/refill-tracker/rx-status`: a count and the latest expiry; status `ISSUED`, `valid_until`
in the future, and a prescription with no recorded expiry is **not** counted — fail closed). It decides
nothing: shop orders still refuse every prescription item (`POST /api/orders`, unchanged), and a student
with a valid prescription is sent to the existing pharmacist dispense path, where a pharmacist verifies it.

## Decisions needed (each one is Tier 1)

| # | Question | Options | Recommended | Routed to |
|---|---|---|---|---|
| R1 | Should a reorder of a prescription-only item go straight to checkout when a valid prescription is on file? | (a) No — always via a pharmacist's dispense review (today). (b) Yes, if a pharmacist matched this prescription to this product before. (c) Yes, by automatic name/salt match. | (a) for launch. (b) needs a stored, pharmacist-signed match; (c) is never safe (strength, form, brand substitution rules). | Clinical lead + pharmacist + legal (Schedule H / H1 / X record keeping) |
| R2 | Should the run-out date use the prescription's own dose and duration (`care_prescription_items.dose`, `frequency`, `duration_days`) instead of the student's entry? | (a) Never; student's entry only (today). (b) Prefill from a signed e-prescription, student confirms. | (b) is useful but is reading a clinical instruction into a count; the copy must say "as your doctor wrote". | Clinical lead (copy marked [CL copy]) |
| R3 | Warn when the typed schedule differs from the prescription (e.g. "you entered 3 a day, your prescription says 2")? | (a) No warning (today). (b) A neutral note, no advice. | (a) until R2 is decided. Any such comparison is a clinical message. | Clinical lead |
| R4 | Uploaded prescriptions (`care_documents` + `care_rx_upload_reviews`) carry no expiry. Count an `RX_VERIFIED` upload as "valid"? | (a) No (today; fail closed). (b) Pharmacist enters a validity date at review. | (b): add `valid_until` to the review, set by the pharmacist. | Pharmacist workflow owner |
| R5 | Substitution when out of stock. | (a) Never, notify-when-back or ask a pharmacist (today). (b) Pharmacist-offered substitute through `care_substitution_requests`, student accepts. | (b) is the only acceptable form; never automatic. | Clinical lead + pharmacist |
| R6 | Push reminders for a plan-sourced refill on the phone (local notifications) in addition to the server's reminder. | (a) Server reminder only (today). (b) Also local. | (a): one reminder source avoids double alerts; the server path honours quiet hours and the reminders switch. | Design reviewer |

## Rules any build of R1–R6 keeps

- Rule L: the commerce side never reads `care_refill_trackers`, `care_prescriptions` or a plan. A
  pharmacist-signed match (R1b) would live in the clinical plane and be read only by the clinical path.
- Notifications never name a medicine outside the app (`REMINDER_MESSAGES`), and refill reminders never feed
  offers, promotions, rewards or a "you might also need" surface (`tests/test_refill_reorder.py` checks the
  offers and rewards modules).
- Red stays for SOS, safety and clinical alerts; a refill running out is amber.
