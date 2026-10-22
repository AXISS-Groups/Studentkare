# SetPasscode — Add, change or reset your passcode

| | |
|---|---|
| Canvas page | New · Sign-in passcode (2026-10-22) · **no canvas board**: designed in code in the Mobile 2.0 language, inside the sign-in frame (founder decision approved by Krishna Chintakayala, 2026-10-22) |
| Platform / frame | Phone · 390×844 (and the web sign-in frame at 1024 / 1440: navy hero with the slides on the left, the form card on the right). Web only: the Expo app has no set-passcode screen yet |
| Tier | 1 (identity: a way to sign in). Follows `docs/plans/tier1-canvas-wp03-2026-10-20.md`, amendment 2026-10-22 (b), "Student passcode (D-P)" |
| Ticket(s) | Student passcode (`feat/auth-passcode`, PR #211) |
| Picture | none on the canvas; review screenshots at 390 / 1024 / 1440, light and dark, are attached to the PR |
| Design source | none (no board). Copy: `src/i18n/areas/authPasscode.ts` (`authpc.set.*`, `authpc.strength.*`, `authpc.enter.show`) |

`/set-passcode`, students only (`routeRoles`: `STUDENT_ONLY`). Opened from Account ready ("Add a passcode"), Profile → Sign-in & security (the Secret passcode card) and after "Forgot your passcode?" (a fresh code sign-in lands here). Drawn in `SignInFrame`, so the logo, the language switch and the emergency strip (112, Tele-MANAS) stay in view; it has no tabs.

## Layout (top to bottom)

1. **Frame**: phone header with back (`arrow-left`, to the student's home), the logo (`studentkare-logo`, links to the public home), EN / తె / हि; on the web the navy hero with the four slides (kit art only) and their pause / play control (`pause`, `play`), and the promise line (`check`).
2. **Head**: eyebrow "Optional" (`key`), title by mode ("Add a secret passcode" / "Change your passcode" / "Set a new passcode"), lead "Next time on this device, sign in with your passcode instead of waiting for a code. A code always works too."
3. **Done note** (positive, `check-2`): "Your passcode is saved…" or "Passcode turned off…".
4. **Pick a length**: 4 (the weakest), 6 (better), 8 (recommended), each row toned weak / fair / strong; the mix line (no phone number, email, name or birthday).
5. **Current passcode** (only when the server says it is needed) with the "Forgot it?" hint.
6. **New passcode** and **Type it again** fields (`lock-keyhole`), each with a show / hide button (`eye` while hidden, `eye-off` while shown; `aria-pressed`, 44 px), a strength hint under the first, a mismatch line (`alert-circle-4`).
7. **Problem note** (attention, `alert-circle-4`): shape (length, characters), weak (server's reason), proof needed, save failed.
8. **Save passcode** (`check`), then **Not now** / **Continue** and, when one is set, **Turn off passcode**.
9. "We never ask for your passcode by phone, email or WhatsApp."

## Icons this screen must show (all of them)

- **Line / solid icons (12):** `alert-circle-4`, `arrow-left`, `arrow-right`, `check`, `check-2`, `eye`, `eye-off`, `info`, `key`, `lock-keyhole`, `pause`, `play`
- **3D icon tiles (10):** `doctor-alt--p4`, `heart--p1`, `lab-alt--p5`, `phone--p5`, `pill-alt--p3`, `shield--p5`, `sos-alt--p1`, `stetho-alt--p4`, `vault-alt--p4`, `video-alt--p4` (the sign-in frame's slides)
- **Small glyphs (0):** —
- **Brand mark:** `studentkare-logo`
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (2):** `illustration-phones-dashboard`, `illustration-test-tubes` (the slides, drawn `withoutText`)
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`AccountReady` and `WebSecurity` (where it is opened from), the student's home (back, Not now, Continue), `SignIn` / `WebSignIn` (signed out: back goes to sign in)

## States

Loading ("Loading your passcode settings") · load failed (retry, Not now) · passcodes off (`auth.passcode_login_enabled`) or not a student account (`info`, Continue) · add · change (current passcode needed) · reset after a code sign-in (no current passcode) · typing (strength empty / weak / fair / strong) · mismatch · shape problem · weak (server: common, repeated, sequence, personal) · proof needed · saving (busy) · save failed · saved · turned off.

## Data

`GET /auth/passcode` (on, length, available, whether the current one is needed), `PUT /auth/passcode` (set or change), `POST /auth/passcode/remove` (turn off) (`backend/services/student_passcode.py`). The view model (`PasscodeViewModel`) drops what was typed when the screen unmounts.

## Rules (amendment b, D-P)

Exactly 4, 6 or 8 printable characters; the screen says 4 is the weakest and 8 is recommended. The server decides weakness and whether the current passcode is needed; the client never stores the passcode. No celebration on save. No red on this screen: every problem is attention (amber).

## Missing icons

`eye-off`, `pause` and `play` were not in the kit. They were drawn on 2026-10-22 in the house line style (24 px grid, 2 px stroke, round caps and joins; `eye-off` is the kit `eye` with a slash, as `bell-off` is `bell` with one) and added to the manifest, the gallery and `skIconData`.

> Verify with `node scripts/icons/check-icons.mjs --screen SetPasscode`.
