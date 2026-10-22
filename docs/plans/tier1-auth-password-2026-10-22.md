# Password, PIN and two contacts at sign-up (Tier 1): plan, approved 2026-10-22

**Approved by:** Krishna Chintakayala (founder, named Tier 1 reviewer), 2026-10-22 ("approve all"),
with the team-account amendment below. Every decision D-1 to D-8 is taken as recommended.
**Status:** approved. Build order: (1) team-account password, (2) contacts, (3) student password and screens.
**Asked for by:** the founder, 2026-10-22.
**Amends:** `docs/plans/tier1-canvas-wp03-2026-10-20.md` (WP-03, both 2026-10-22 amendments).

## The request

1. Creating an account asks for **name, email and WhatsApp number**.
2. The student **creates a password** and **sets a PIN** while creating the account.
3. Signing in works with any of: **PIN**, a **code by email**, a **code by WhatsApp**, or **password**.
4. **Two-step sign-in (authenticator) is optional.**

## What exists today (read on `main` at 5babd5e0)

| Area | Today | Where |
|---|---|---|
| Account contact | **One** sign-in ID per account: an email *or* a WhatsApp number (`account.identifier` + `account.channel`). | `core/workflow_models.py`, `services/workflow_auth.py:56,138` |
| Sign-up | Verify one contact with a code, then full name, date of birth (18+), university, roll number, blood group, consent. | `services/workflow_auth.py:392` (`Signup`) |
| Codes | Email and WhatsApp (OpenWA). WhatsApp is offered only while its session is connected. | `services/otp_delivery.py`, `auth.whatsapp_*` settings |
| PIN | The **student passcode** (D-P): optional, 4, 6 or 8 characters, salted and peppered scrypt hash, lockout, and accepted **only on a device that has already signed in with a code**. Offered on Account ready and in Sign-in & security. | `services/student_passcode.py`, WP-03 amendment (b) |
| Password | **None.** No password column, endpoint or screen. Only an unused reset-email template. | `core/email_templates.py:292` |
| Two-step | Optional for students. **Required for SUPER_ADMIN and COUNSELLOR** (fails closed to those two if the policy is missing). | `services/workflow_auth.py:160-183` |
| Designs | No board in `design/screens/briefs` has a password field. | — |

So the PIN half of the request mostly exists. What's new is **two contacts per account**, **passwords**, and putting both into sign-up.

## Proposed design

### A. Two contacts per account
- New table `care_account_contacts` (account id, kind `EMAIL` | `WHATSAPP`, normalised value, `verified_at`). Each value is unique across accounts. Both are kept in the platform plane, never in logs (rule 9).
- `account.identifier` stays as the primary contact, so nothing that reads it breaks. The migration copies every existing account's identifier into the table as verified.
- A code is sent only to a **verified** contact. An unverified number is never a way in.
- Existing students add the missing contact from Profile → Sign-in & security, which verifies it with a code.

### B. Sign-up order
1. Name, email, WhatsApp number.
2. A code to **each** contact, verified on its own (see D-2). One code proves the account. Both are needed before that contact can be used to sign in.
3. Date of birth (18+, fail closed), university, roll number, blood group: unchanged.
4. **Create a password** (D-3).
5. Consent: unchanged, versioned wording, no session without it.
6. Account ready → **Set a PIN** (the existing passcode flow, skippable) → optional authenticator.

### C. Password
- New table `care_account_passwords`, hashed with the same salted, peppered scrypt as the PIN (`OTP_HASH_SECRET`). Never logged, never sent back, never stored on the device.
- Rules: at least `auth.password_min_length` (proposed 10), at most 128, no spaces only. Refused: common passwords (local list, no outside service), and the student's own email name, phone digits, name or date of birth. Strength hint on screen.
- Lockout after `auth.password_max_attempts` wrong tries for `auth.password_lockout_minutes`, plus rate limits per address and per account. This reuses `count_wrong_attempt` in `services/team_accounts.py`.
- Master switch `auth.password_login_enabled` (public). Off hides every password option and the server refuses it.
- **Forgot password** = sign in with a code (email or WhatsApp), then set a new one inside the passcode reset window. Changing it needs the current password, or a code sign-in within `auth.passcode_reset_window_minutes`. No reset links by email, because a code proves the same thing with one less path.
- Setting, changing or resetting a password signs out every other session.
- Every attempt, set, change and reset is audited, never the password.

### D. Sign-in page
- The student picks how: **Send a code** (email or WhatsApp, as today), **Password**, or **Use my PIN** (only where the device qualifies, as today).
- The ID box accepts either the email or the WhatsApp number.
- One answer for every password failure (unknown ID, wrong password, locked, no password set, switched off), so the page never reveals which accounts exist.
- An authenticator, where the account has one, is still asked for after any of the four methods.
- The staff page (`/staff-sign-in`) does not change in this plan.

### E. Two-step stays optional
- Students: optional, as today. Nothing changes.
- **SUPER_ADMIN and COUNSELLOR stay required** (D-5). The super admin sees every student's records and the counsellor sees the crisis queue. A password or PIN alone isn't enough for those.

## Decisions for the reviewer

- **D-1 Contacts.** Approve the second-contact table (A), with `account.identifier` kept as the primary.
- **D-2 Verify both contacts at sign-up?** Recommended: **yes, both**. A mistyped or someone else's WhatsApp number would otherwise become a way to sign in to, or reset, the account. Alternative: verify one and leave the other unverified and unusable until verified later.
- **D-3 Is a password required at sign-up?** Recommended: **required**, since that is what was asked. Alternative: optional like the PIN (fewer drop-offs, since a code always works).
- **D-4 Password on a brand-new device.** The PIN only works on a device that has already used a code. Recommended: a password **does** work on a new device (that is its point), and each new-device password sign-in sends a "new sign-in" notice to both contacts. Alternative: same new-device rule as the PIN, which makes the password nearly redundant.
- **D-5 "2FA optional" for staff.** Recommended: keep it required for SUPER_ADMIN and COUNSELLOR (no change). The list is already a server policy (`INTEGRATIONS_DB["twofa"]["enforced_roles"]`), so changing it later needs no code. Confirm that "optional" means students only.
- **D-6 Icons.** A show/hide-password button needs an "eye-off" icon. The manifest has `eye` and `eye-outline` but no eye-off. Options: add `eye-off` to the kit (design task, before build), or use a text toggle ("Show" / "Hide") from i18n. No look-alike substitute.
- **D-7 Designs.** No board has a password field. Approve building the password step and sign-in option in the existing sign-in frame's components, or wait for a design board.
- **D-8 PIN at sign-up.** The existing passcode stays optional and is offered on Account ready (no change). Confirm it does **not** become required.

## Amendment 2026-10-22: team accounts get a password too (founder decision)

The founder chose "students + team accounts" on 2026-10-22: the reason for passwords is to give the
team accounts one. Built first, because it's what gets the team into the consoles.

- Each of the 8 team accounts can have a password **beside** its PIN. Same hash, rules, lockout and
  one-answer failure as section C. `auth.password_login_enabled` switches it off for staff too.
- `/staff-sign-in` gains "Password" beside "Team PIN" and the emailed code.
- Set on the server with `python -m scripts.team_accounts set-password <id>` (typed in, never echoed,
  never printed or logged), or by a super admin from Platform → Team accounts. Setting it signs the
  account out everywhere. Setting the password of the account you're signed in with needs its current
  password or PIN.
- Super admin and counsellor are still held to the authenticator after a password (D-5).
- Individual staff accounts keep the emailed code; their passwords are not in this plan.
- `docs/guides/team-accounts.md` gains the command.

## Not in this plan
- Passwords for individual staff accounts (team accounts are in, see the amendment above).
- Checking passwords against outside breach services (no vendor is approved).
- Email reset links.
- Any change to consent wording, the 18+ gate or crisis links.

## Tests to add (when approved)
- Sign-up refuses without both contacts verified (if D-2 = yes) and without a valid password (if D-3 = required).
- One answer for every password failure; lockout and rate limits; no session on any failure, including a network or database error (rules 1–2).
- A code is never sent to an unverified contact; contact values are unique across accounts.
- A password change signs out other sessions; a reset needs a recent code sign-in.
- An account with an authenticator is always asked for it after password or PIN.
- SUPER_ADMIN and COUNSELLOR are still held to two-step (D-5).
- The migration copies every existing identifier as a verified contact.
- Nothing logs a password, PIN, code or contact value.

## Rough size
Backend: 2 tables + migration, contacts and password services, 5 to 6 endpoints, settings, around 40 tests. Web and Expo: sign-up steps, password step, sign-in option, Sign-in & security rows, i18n in en/te/hi. About 3 PRs: contacts, password, screens.
