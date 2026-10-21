# WP-03 Sign-in, identity and device (Tier 1): canvas plan awaiting review

**Approved by:** _(name, date)_

**Status:** plan only. No screen code is written until a named design reviewer **and** the
security/legal owner sign this file (`DESIGN.md` §5, `CLAUDE.md`). One screen (or one tight pair,
phone + web) per ticket, branch and PR.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` (lane 1 and 3b), each board's brief,
screenshot and `design/screens/source/*/<Screen>.html`, and the code named below.
**Depends on:** S4 phone frame on web, S7 sheets/dialogs, S8 feedback/validation; S1 student web
shell for WebLostPhone, WebVerify and WebVerifyGate.

## Rules every screen in this package keeps

- **Fail closed.** A rejected or expired code, a network error or offline never yields a session
  (`AGENTS.md` 1–2). Every check that can't complete shows that it couldn't and denies.
- **Nothing turns green on the client.** Only the server marks a check verified
  (`IdentityVerifyViewModel` comment). Board demo hints ("try 482913", "type 000000",
  "Demo: approve from phone") are never built.
- **Crisis help is never gated.** 112 and Tele-MANAS 14416 (`design-system/CrisisLinks.tsx`) stay
  reachable on every screen here, signed in or not, verified or not.
- **Colour.** Red only for SOS / emergency calls and clinical alerts (founder, 2026-10-20). The
  boards' rose "Lost your phone?" link and rose chips are drawn in `action` / neutrals. Error and
  mismatch states use `danger` per `DESIGN.md` §3 only if the reviewer confirms (decision D3-1).
- **Icons** only through `src/design-system/icons` with the brief's exact names; lucide, raw
  `<svg>` and text arrows (→ ✓) go. Shell icons on the web boards come from S1, not this package.
- Copy from `src/i18n` (en/te/hi); numbers such as code expiry and attempt limits come from the
  **server response or the settings registry**, never the board.
- 18+ only (`DESIGN.md` D4): no guardian branch on any screen.

## Summary

| Screen | Platform | Today | Board vs today (biggest gaps) | Data today | Blocked on | Key decision |
|---|---|---|---|---|---|---|
| SignIn | Phone | drifted, 0/6 icons | no back, language switch, campus-ID row, logo; extra "Step 1 of 3" | `/auth/options`, `/auth/otp/send` | — | D3-2 campus-ID row |
| OtpVerify | Phone | partial (step in flow), 0/4 | not its own screen; no masked target + Edit, resend timer, WhatsApp fallback | `/auth/otp/verify`, `/auth/otp/send` | — | D3-3 expiry copy |
| OnboardingConsent | Phone | drifted, 0/2 | no plain-words table, language picker, optional switches, record-time line | `/auth/consent`, `/auth/signup` | legal text | D3-4 optional purposes, D3-5 grievance officer |
| VerifyIdentity | Phone | drifted, 0/14 | 4-check list + sheets vs one campus card + "not connected" list | `/identity` (campus only) | selfie, email, gov-ID backends | D3-6 build scope |
| VerifyGate | Phone | drifted, 0/6 | 4-row progress with per-check status vs generic list | `/identity` | same as above | D3-6 |
| LostPhone | Phone | drifted, 0/3 | device picker, confirm sheet, "was it you?" check-in vs one revoke button | `/auth/sessions/revoke-others` | session list, check-in log | D3-7 device list |
| NewDevice | Phone | missing | whole screen | none | selfie match, device transfer | D3-8 build or defer |
| WebSignIn | Web | drifted, 0/5 | wrong shell; no left brand panel, campus-ID row, staff link | same as SignIn | S1 is not needed (own frame) | D3-2 |
| WebLostPhone | Web | drifted, 0/25 | wrong shell; device table, "what someone can't do" card | revoke-others | S1, session list | D3-7 |
| WebVerify | Web | drifted, 0/34 | wrong shell; 4 checks, "who sees what" card | `/identity` | S1, backends | D3-6 |
| WebVerifyGate | Web | drifted, 0/6 | 4-row status in a dialog | `/identity` | backends | D3-6 |
| AdminSignIn | Web | missing | staff use `/login` | `/auth/otp/*`, `/auth/2fa/challenge` | new-device approval | D3-9 separate route |

---

## SignIn (phone) · WebSignIn (web)

**Board vs today.** `features/auth/views/SignInView.tsx` + `AuthenticatedFlowScreen.tsx`.
Rendered at 390 px: adds a "Step 1 of 3" stepper (`AuthLayout`), no back button, no EN/తె/हि
switch, no "Continue with campus ID" row, no logo; lucide `Mail`/`Smartphone`; button reads
"Continue" (deliberately, see the file comment) where the board says "Send verification code";
"Lost your phone?" is a text link with "→". Web board has a brand panel ("Everything you've
tracked, in one place", two benefit points) and "Staff or admin? Sign in here".

**Will change.** Phone header with `arrow-left`; `studentkare-logo`; channel pills with `mail-2` /
`message-circle-3`; the language switcher wired to the existing i18n catalogues (the file's
"no i18n" note is stale: `src/i18n` has en/te/hi); remove the stepper on sign-in; "Lost your
phone? Secure your account" as a link to `/lost-phone` with `chevron-right`, not "→"; web brand
panel and staff link (to AdminSignIn once it exists, else not drawn); terms line links to Legal.

**Will NOT change.** `AuthViewModel` orchestration, CSRF, rate limiting, remembered-device flow,
channel availability from `/auth/options` (an undeliverable channel still shows "not configured"),
the dev-only demo panel gate (`isDev()`; never in production).

**Safety.** No session without a verified code. "Lost your phone?" must work signed out.
Crisis links reachable from the sign-in screen footer (board has none; keep `CrisisLinks` compact).

**Data.** Real: `/auth/options`, `/auth/otp/send`. Campus ID: **no SSO endpoint exists** — not
drawn, or drawn disabled with "Not available for your campus yet" (D3-2).

**Accessibility.** Channel pills `aria-pressed`, language buttons `lang` + full-name label, input
label (not placeholder) and hint tied with `aria-describedby`, 44 px targets, focus ring on the
navy panel.

**Tests.** Vitest: renders brief icons; stepper absent; language switch changes copy;
undeliverable channel disables submit; no demo panel when `isDev()` is false. `check-icons
--screen SignIn` / `WebSignIn`.

## OtpVerify

**Board vs today.** A step inside `AuthenticatedFlowScreen`, no own screen. Board: "Enter your
code", masked target with **Edit**, 6-box code input, resend countdown, "Send on WhatsApp",
"Didn't get the code?" help, `alert-circle-4` error, `refresh`.

**Will change.** Own route/state with phone header; six-cell code input (DESIGN §4 Code input);
masked target from `targetMasked`; Edit returns to SignIn keeping the identifier; resend countdown;
WhatsApp fallback only when `/auth/options` lists it; inline error with `alert-circle-4`.

**Will NOT change.** Verify call, attempts ceiling (server: 5 per challenge) and 429 handling.

**Safety.** Board says "expires in 10 minutes"; the server issues **300 s** and returns
`expiresInSeconds`. Copy must use the server value (D3-3). Wrong-code and too-many-attempts states
never fall back to a session. "We never ask for your code by phone" line kept.

**Data.** `/auth/otp/send`, `/auth/otp/verify`. Resend interval: needs a settings key if not
already in the registry (no literal 29 s).

**Accessibility.** One labelled group for the six cells, paste fills all, `autocomplete=one-time-code`,
countdown announced politely once (not every second).

**Tests.** Wrong code → error, no session; expired → resend; 429 → wait copy; expiry text equals
server seconds.

## OnboardingConsent

**Board vs today.** `features/auth/views/SignupConsent.tsx` (+ Native). Board: "4 of 6", language
picker "Read this in", lead citing DPDP Act 2023, an "In plain words" table (what we keep, never,
your rights, how long), three required ticks, three optional switches (campus totals, research,
partner offers), grievance officer + email + 30 days, "We record the time and version", and an
"Under 18? Ask a parent" link. Today: required ticks only; the file comment lists the deliberate
omissions.

**Will change.** Layout, plain-words table, language picker, "change later in Account → Privacy"
line, "We record the time and version" line (true: `ConsentRecord` stores version + time),
`check-2` ticks, `arrow-left` header; "Continue to verification" with an icon, not "→".

**Will NOT change.** Required purposes `RECORDS_STORAGE`, `CAMPUS_ENROLMENT`, `ADULT_18_PLUS` and
the server version (`/auth/consent`); nothing pre-ticked; continue locked until all three are
ticked; 18+ attestation stays a plain tick (D4, guardian link not built).

**Safety / decisions.** Partner offers switch stays out (Rule L; D3-4). Campus totals and research
switches only if those features and their consent purposes exist server-side; otherwise not drawn.
Grievance officer name/email/30-day reply only when legal supplies them (D3-5). "Withdrawing is as
easy as agreeing" needs a withdraw endpoint — none exists (`/auth/consents` is read-only); copy
must not promise it until built (D3-4).

**Data.** `/auth/consent`, `/auth/signup`. Plain-words text: legal-approved i18n keys.

**Accessibility.** Ticks are real checkboxes with labels; switches `role=switch`; the table is a
definition list; scroll length (1652 px) needs a sticky continue button that stays reachable.

**Tests.** Continue disabled until three ticks; posted version equals `/auth/consent`; no
pre-ticked control; no guardian link; snapshot in te/hi fits.

## VerifyIdentity · WebVerify

**Board vs today.** `IdentityVerifyPanel.tsx`: one campus status card + a "not connected" list of
photo, email, government ID. Board: four check rows (photo, email, college ID, government ID) with
progress `n/4`, a sheet per check (camera with face-oval guide, email + code, roll number + card
photo to the college, DigiLocker / ABHA / licence / passport), five preview states (All good,
Photo unclear, College rejects, Name mismatch, Code locked), "What if I skip this?", privacy line,
crisis banner. Web adds "Who sees what" and "Always open" cards.

**Will change (if D3-6 = build shell now).** The four-row list and progress, each row's status
from the server, the crisis banner and "What if I skip", the "who sees what" card, illustrations
named in the brief. Rows with no backend show **"Not available yet"**, not a sheet that pretends.
Campus row opens `CampusVerify` (exists: `/campus/verification`).

**Will NOT change.** Server is the only source of verified; no client-side face, OCR or Aadhaar
handling; Aadhaar number never entered or stored in full (board's own promise).

**Safety.** Failure states (photo unclear, college rejects, name mismatch, code locked) map only to
server outcomes; "Code locked" must not offer a bypass. Crisis help on the screen, outside any gate.

**Data.** Real: `GET /api/identity` (`campusStatus`), `/campus/verification`. **Not built:**
selfie liveness/match, email verification for identity, DigiLocker/government ID, manual check.
Each needs its own backend ticket (and vendor/legal decision for DigiLocker).

**Accessibility.** Camera sheet: `aria-modal`, focus trap, text alternative ("Upload from gallery"),
checklist items as a list, progress announced as "2 of 4 verified".

**Tests.** Only server-verified rows show `check`; unknown status = not verified; load error shows
retry and still shows crisis links; no demo code in production bundle.

## VerifyGate · WebVerifyGate

**Board vs today.** `VerifyGateView.tsx` (+ Native): dialog with lucide `ShieldAlert`, one generic
list item, hard-coded `rgba` scrim and shadow. Board: "Finish verifying to book", `2/4`, four rows
with Done / In review / Not added + Add, "Always open without verification: Crisis support · SOS ·
Emergency card · Help", Not now.

**Will change.** Four status rows from `/identity`, progress, the "always open" row as real links,
`shield--p5` tile, `scrim-strong` token instead of `rgba`, icons from the brief.

**Will NOT change.** Which actions the gate blocks (book, order, share) and where it is enforced
(server). The gate is never a dead end: Not now always closes it.

**Safety.** Crisis, SOS, emergency card and help links never sit behind the gate or a loading
state; they render before `/identity` resolves.

**Tests.** Gate renders crisis links with `/identity` pending and failed; status rows match server.

## LostPhone · WebLostPhone

**Board vs today.** `LostPhonePanel.tsx` (+ View/Native): sign-in if needed, then one "sign out
everywhere else" button reporting what the server did (`sessionsRevoked`, `passCancelled`). Board:
crisis line in the header, "using a friend's phone is fine" code entry, **device picker** (name,
last active, note), confirm sheet "Secure '<device>'?", progress list, "1 check-in in the last 24
hours — was it you?" with report, "Got a new phone?" link. Web adds "What someone with your phone
can't do".

**Will change.** Layout, header crisis line, confirm sheet (S7) before revoking, result list built
from the server summary, "Got a new phone?" link (only once NewDevice exists), web info card
(copy reviewed: "the app needs your face or PIN" is only true once app lock exists; drop otherwise).

**Will NOT change.** The revoke endpoint and its truthful summary; nothing reported that the
server didn't confirm (the previous fake device list must not return).

**Data.** Real: `POST /auth/sessions/revoke-others`. **No session/device list endpoint and no
check-in log** — the device picker and "was it you?" need backend work (D3-7). Until then: one
"Sign out every other device" action.

**Safety.** Works signed out via code; never asks for the code by phone; failure leaves the student
told it failed and to call support; crisis numbers on screen.

**Tests.** Confirm required before revoke; failure shows failed, not success; summary pluralisation;
signed-out path requires the code.

## NewDevice

**Board vs today.** Missing. Board: "Welcome back", email code confirmed, selfie match against the
verified photo, choose what happens to the old phone (still have it / lost: cancel and wipe offline
card), progress list (offline card downloaded, reminders restored, records synced).

**Plan.** Do not build until selfie match and a device-transfer API exist (D3-8). When built:
nothing moves until the server confirms the match; "wipe the offline card" only if the app actually
holds one; each progress line reflects a real result.

## AdminSignIn

**Board vs today.** Missing; staff use the student `/login`. Board states: Normal (work email →
emailed code, tries left, 5-minute expiry), authenticator code (required for every staff account),
Locked 15 min after five wrong codes (admin told, audit logged), New device awaiting approval,
Signed in (8-hour session).

**Will change.** A separate staff route and frame (no student marketing, no sign-up link), same
OTP endpoints plus `/auth/2fa/challenge`.

**Will NOT change.** 2FA is mandatory for staff (`deny_until_two_factor`); no demo or shared accounts.

**Data / decisions.** Lock length, attempts, session length must come from the server/settings, not
the board's 15 min / 5 / 8 h (D3-9). "Admin has been told" and "new device approval" have **no
backend**; not drawn until they do.

**Tests.** Student account at the staff route is refused without hinting the account exists; 2FA
step can't be skipped; lockout message uses server values.

---

## Decisions for the reviewer

- **D3-1 Colour of failure states.** Founder rule keeps red for SOS and clinical alerts. Should
  verification failures (photo mismatch, college rejects, locked) use `danger` (DESIGN §3 says photo
  mismatch is danger) or `attention`?
- **D3-2 Campus ID / SSO row.** No SSO backend. Omit (today) or draw disabled with an honest note?
- **D3-3 Code expiry copy.** Board says 10 minutes, server issues 5. Confirm copy follows the server.
- **D3-4 Optional consent purposes and withdrawal.** Partner offers stays out (Rule L). Build
  campus-totals / research switches only with server purposes? Add a consent-withdraw endpoint before
  the "withdrawing is as easy" line ships?
- **D3-5 Grievance officer.** Name, email and reply time from legal, or keep omitted.
- **D3-6 Identity checks.** Build the four-row frame now with three rows "not available yet", or wait
  for selfie / email / government-ID backends? DigiLocker vendor and legal review needed either way.
- **D3-7 Device list.** Approve a session-list endpoint (device name, last active, holds pass) and a
  student check-in log, or ship LostPhone as a single "sign out everywhere else".
- **D3-8 NewDevice.** Defer until selfie match and device transfer exist?
- **D3-9 AdminSignIn.** Separate staff route now (reusing OTP + 2FA), new-device approval later?
  Lockout/session values to be added to the settings registry.
