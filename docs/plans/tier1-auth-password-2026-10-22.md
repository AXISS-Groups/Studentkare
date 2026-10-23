# Password, PIN and two contacts at sign-up (Tier 1): plan, approved 2026-10-22

**Approved by:** Krishna Chintakayala (founder, named Tier 1 reviewer), 2026-10-22 ("approve all"),
with the team-account amendment below. Every decision D-1 to D-8 is taken as recommended.
**Status:** approved. Build order: (1) team-account password (PR open), (2) contacts, (3) student password and
sign-up screens, (4) B2B invites (amendment b).
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

**As built (part 2, feat/account-contacts):** `services/contact_store.py` is the one lookup every sign-in
path uses (codes, passcode, sign-up), and `services/account_contacts.py` is Sign-in & security's
"Your email and WhatsApp" card (`GET/DELETE /auth/contacts`, `POST /auth/contacts/send-code`,
`POST /auth/contacts/verify`). A verification code is bound to the signed-in account and is refused by
`/auth/otp/verify`. An account with no contact row of its sign-in ID's kind (made by a path that writes
none, e.g. the demo seed) still signs in with that ID. The sign-in ID itself can't be changed or removed
yet. Erasure takes the contacts and their in-flight codes.

### B. Sign-up order
1. Name, email, WhatsApp number.
2. A code to **each** contact, verified on its own (see D-2). One code proves the account. Both are needed before that contact can be used to sign in.
3. Date of birth (18+, fail closed), university, roll number, blood group: unchanged.
4. **Create a password** (D-3).
5. Consent: unchanged, versioned wording, no session without it.
6. Account ready → **Set a PIN** (the existing passcode flow, skippable) → optional authenticator.

**As built (part 3, feat/student-password-signup):** sign-up asks for the other contact right after the
first code (`POST /auth/signup/contact/send-code` and `/verify`, bound to the sign-up grant) and a password
before consent; `POST /auth/signup` refuses without the password, and without the second contact
**whenever its channel can deliver a code** (so a WhatsApp outage never blocks sign-up; the contact can be
added later in Sign-in & security). Students sign in with `POST /auth/password/sign-in` (either verified
contact); a password sign-in on a device the account hasn't used sends a notice to both contacts. Sign-in &
security has a Password card (`GET/POST /auth/password`; changing needs the current one or a code sign-in
in the last `auth.passcode_reset_window_minutes`). Web and Expo.

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

## Amendment 2026-10-22 (b): B2B invites and B2C sign-up (approved 2026-10-22)

Asked for and approved by the founder (Krishna Chintakayala, named Tier 1 reviewer) on 2026-10-22
("approve"). D-B1, D-B2, D-B3, D-B5 and D-B6 are taken as recommended. D-B4 had no answer, so the smaller
option is taken: **one student at a time first, CSV upload in a later PR**. The founder's answers: B2B means **students of a partner college**; **super admins and campus admins** create the accounts;
the first sign-in is a **link plus a temporary password**.

### Two ways an account starts

| | B2B (partner college) | B2C (student on their own) |
|---|---|---|
| Who creates it | A campus admin (their own campus only) or a super admin | The student, on Create account |
| Details | Name, email, WhatsApp number, roll number, typed by the admin (one at a time, or a CSV) | Name, email, WhatsApp number, typed by the student |
| First sign-in | One-time link + temporary password, then a forced new password | Code to each contact (section B) |
| Contacts verified | Later, by the student (see B4) | At sign-up, by the code (automatic) |
| After that | Same for both: set a PIN (optional), sign in with a code, password or PIN, optional authenticator | |

### B1. Creating B2B accounts
- New: Campus admin → Students → **Invite students** (one form; CSV upload with a preview and a per-row
  result follows in a later PR, D-B4). Super admin gets the same screen for any partner campus.
- A campus admin can create **students only, on their own campus only**. They can never create staff and
  can never pick another campus (server-enforced, fail closed).
- An email or number already on an account is refused per row, with "already has an account" and nothing
  else. The admin never learns whose it is.
- The account is created **pending**: no consent, no confirmed date of birth, no verified contact. It
  can't be used for anything until the student claims it (B2).
- Admins never see a student's health records because of this. Creating the account gives no access
  (Rule L and the consent rules are unchanged).

### B2. The link and the temporary password
- The server makes a **one-time link** (random token, only its hash stored, expires after
  `auth.invite_link_hours`, proposed 72) and a **temporary password** (random, 12 characters, hashed like
  any password, expires with the link, works once).
- The link goes to the student's email or WhatsApp. The temporary password is **shown once to the admin**
  to hand over in class or send by the *other* channel, so one leaked message isn't enough to get in.
- The admin can **resend** (a new link and a new temporary password; the old ones stop working) or
  **cancel** an invite. Every create, send, resend, cancel and claim is audited, never the password or token.
- Wrong temporary passwords lock the invite like any password. An expired or used link gets one answer,
  "This link has expired. Ask your college to send a new one", whatever the reason.

### B3. Claiming the account (first sign-in)
The link opens a claim page, all in one sitting, and nothing gives a session until the end:
1. Enter the temporary password.
2. **Set your own password** (section C rules). The temporary one stops working.
3. **Confirm your date of birth** (18+, fail closed). The college's date is never taken as the student's word.
4. **Consent**, by the student themselves (the same versioned consent as B2C). A college can't consent for
   a student.
5. Account ready → **Set a PIN** (optional, common flow) → optional authenticator.

### B4. Verifying a B2B student's email or WhatsApp
- Contacts the admin typed start **unverified**, and **a code is never sent to an unverified contact to sign
  in**. If the admin mistyped a number, a stranger holding that number must not get a sign-in code.
- Verifying happens **while signed in**: Profile → Sign-in & security → "Verify" beside each contact sends a
  code to it. Once it's verified, codes on that contact work for sign-in.
- **D-B5 (recommended: yes):** claiming through the link counts as proof of the contact the link was sent
  to, so that one is verified at claim. The other stays to verify later. If no, both start unverified.
- Until at least one contact is verified, the student sees a banner asking them to verify one, and
  "Forgot password" only works through a verified contact.

**As built (part 4, feat/b2b-invites):** `services/student_invites.py`. Campus admin (own campus) or super
admin: `POST/GET /campus/invites`, `POST /campus/invites/{id}/resend` and `/cancel`, on Students ("Invite
students", one at a time; the CSV drawer's invite step stays off until a later PR, D-B4). The link is
`/claim#token=…` (the token never reaches a server log); the claim page (`/claim`) calls
`POST /auth/invite/lookup` and `POST /auth/invite/claim`. Cancelling removes the pending account so the
student can sign up on their own. Link lifetime: `auth.invite_link_hours` (72). Migration f6c4a2e81d37.

### B5. B2C
- Unchanged from sections B to D: name, email and WhatsApp; a code to each, which **verifies each
  automatically**; password; date of birth; consent; then the common PIN flow.
- A B2C student whose email or number was already invited by a college gets "already has an account"
  and the option to ask the college to resend the link. Two accounts are never created.

### Decisions for the reviewer (this amendment)
- **D-B1** Approve B1 to B4 as written (campus admin: own campus, students only).
- **D-B2** Link life 72 hours (`auth.invite_link_hours`), and the temporary password works once and expires with it.
- **D-B3** The temporary password is shown once to the admin and handed over separately, never in the same message as the link.
- **D-B4** CSV upload in the first version, or one-at-a-time first and CSV later?
- **D-B5** Claiming through the link verifies the contact it was sent to (recommended yes).
- **D-B6** The college's date of birth and roll number are kept as the college's record, and the student must confirm their own date of birth at claim (recommended).

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
