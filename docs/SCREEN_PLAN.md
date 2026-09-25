# Screen implementation — audit and plan

Companion to `DESIGN.md`. Written 2026-09-26. Counts are computed from
`design/screens/screens.json`, endpoint coverage from the 206 routes declared
in `backend/services/*.py`.

---

## 1. Audit of the design pack

### 1.1 There are two copies of the pack

| Path | Tracked | Size | Verdict |
|---|---|---|---|
| `design/screens/` | yes | 34 MB | the source of truth |
| `studentkare-screens/` | **no** | 34 MB | byte-identical duplicate |

`diff -rq` between them reports only `.DS_Store` files, plus `DESIGN.md` and
`studentkare.tokens.json` — and both of those were already extracted to their
real homes (`/DESIGN.md`, `design/tokens/studentkare.tokens.json`).

The root copy is redundant. It is now in `.gitignore` so it cannot be
committed by accident; deleting it is safe but is left to a human, because it
is a file someone put there deliberately.

### 1.2 The photographs are gone, and cannot be sent

The pack references **32 images** as `/_blob/<hash>`. None are on disk, in
either copy.

A separate re-render found at `~/Downloads/.../studentkare_screens_3x` states
why, in its own INDEX:

> Photos that Stitch hosted on Google's CDN are replaced with grey placeholders.

So the images were never files in the pack — they were hot-linked to a CDN
that no longer serves them, and the highest-fidelity re-render available
already substitutes grey boxes. `Main.jpg` in the pack shows this directly:
the splash renders a broken-image box with its alt text, "A small clinic
building", showing through.

**Consequence: no zip can supply them.** They have to be re-shot, bought, or
replaced with illustration. Until then, screens that framed a photo are built
with the frame and without the photo.

Where they are missing:

| Page | Missing images |
|---|---:|
| 8 · Design system & flow map | 28 |
| 3 · Student web | 18 |
| 1 · Launch & onboarding | 9 |
| 2 · Student app (mobile) | 5 |
| 4 · Campus, 6 · Partner | 1 each |
| 5 · Doctor, 7 · Super admin | 0 |

Pages 5 and 7 need no photography at all, which is one reason they rank high
in the build order below.

### 1.3 A third, older design generation exists

`~/Downloads/.../studentkare_screens_3x` holds 36 PNGs under a different
naming scheme (`studentkare_mobile_create_account_auth_03`). These are Stitch
output from an earlier exploration, not part of the 238-screen pack. They are
reference only and are **not** authoritative; `design/screens/` is.

---

## 2. What is actually left

238 screens in the pack. Not all of them are work:

| State | Count | Meaning |
|---|---:|---|
| Built | 7 | SignIn, CreateAccount, Onboarding 1–3, LoggedOut, Main |
| Alternatives | 2 | `SplashPulse`/`SplashVault` are "Splash option B/C" — choices for `Main`, not extra screens |
| Dropped | 2 | `GuardianConsent`, `GuardianApprove` — decision D4, 18+ only |
| **Tier 1 — blocked** | **55** | needs a named design reviewer *and* clinical/legal sign-off |
| **Open** | **172** | Tier 2 and 3, buildable subject to backend |

| Page | built | alt | dropped | tier 1 | open |
|---|---:|---:|---:|---:|---:|
| 1 · Launch & onboarding | 7 | 2 | 2 | 7 | 5 |
| 2 · Student app (mobile) | 0 | 0 | 0 | 21 | 41 |
| 3 · Student web | 0 | 0 | 0 | 12 | 29 |
| 4 · Campus / hostel admin | 0 | 0 | 0 | 2 | 24 |
| 5 · Doctor | 0 | 0 | 0 | 2 | 17 |
| 6 · Partner | 0 | 0 | 0 | 7 | 18 |
| 7 · Super admin | 0 | 0 | 0 | 4 | 26 |
| 8 · Design system | 0 | 0 | 0 | 0 | 12 |

**Tier 1 is 24% of the pack and cannot be started by anyone until a reviewer
is named.** It covers the whole identity-verification spine, crisis and SOS,
consent, results and report explainers, and e-prescriptions — the screens
where being wrong costs the most.

### 2.1 This is not 227 screens from zero

`src/screens/` and `src/features/*/screens/` already hold **146 components**:
22 workspace, 21 institution, 16 admin, 15 clinician, 14 vendor, 7 vault.

For pages 4, 5 and 7 the job is largely *reconciling working screens with the
approved design* — tokens, states, accessibility — not building from nothing.
For pages 2 and 3 it is closer to true construction, and several areas have no
API at all.

---

## 3. Backend coverage — the real constraint

Endpoints matching each area, across all 206 routes:

| Area | Endpoints | Consequence for screens |
|---|---:|---|
| orders, appointments, camps | 10 each | ready to build against |
| lab, notifications, documents, catalog, dispensing | 5–7 | ready |
| insurance, campus, ayush, prescriptions | 2–4 | thin; check per screen |
| **vault, chat, emergency, rewards, community, ABHA** | **0** | **API must be built first** |

Vendor and clinician show 0 on a name match but are served under `/work/*`;
they are covered.

The zero rows fall mostly on pages 2 and 3 — which is why those pages are
last in the order below despite being the largest.

---

## 4. Open decisions that gate work

| # | Decision | Blocks | Recommendation |
|---|---|---|---|
| **A** | Name a Tier 1 design reviewer + clinical/legal sign-off | **55 screens** | Required. Nothing else unblocks these. |
| **B** | May `AuthRouteScreen`'s redirect be changed so a just-signed-up student can see a confirmation? | `AccountReady`, `SignOut` | Yes — a post-signup screen cannot exist otherwise. |
| **C** | Is "Crisis alerts and SOS" a toggle? | `Permissions` | **No.** Urgent events bypass preferences by design. Render it as a statement: "Always on. Crisis alerts cannot be turned off." |
| **D** | ABHA / ABDM integration | `AbhaLink`, plus ABHA claims on several screens | Needs real ABDM sandbox credentials and spec. Will not be faked. |
| **E** | Photography | every screen in §1.2 | Re-shoot, licence, or switch to illustration. |
| **F** | Should the splash replace `/`? | entry to `/welcome` | Currently `/` → `/shop`; `/welcome` has no inbound link. |

---

## 5. Build order

Ranked by *screens delivered per unit of work*, which means: existing
component to reconcile, endpoints present, no photography, not Tier 1.

**Phase 1 — finish page 1 (5 open screens).**
`ProfileSetup` and `Permissions` need new columns (§6). `AccountReady` and
`SignOut` need decision B. `AbhaLink` needs decision D.

**Phase 2 — page 5, Doctor (17 open).** Best ratio in the pack: 15 existing
clinician components, `/work/*` endpoints in place, **zero missing photos**,
only 2 Tier 1.

**Phase 3 — page 7, Super admin (26 open).** 16 existing admin components,
15 admin endpoints, zero missing photos, 4 Tier 1.

**Phase 4 — page 4, Campus admin (24 open).** 21 existing institution
components, 1 missing photo, 2 Tier 1.

**Phase 5 — page 6, Partner (18 open).** 14 existing vendor components; the
lab and dispensing endpoints are already exercised by the awaiting-collection
work.

**Phase 6 — page 8, Design system (12 open).** Wants Storybook, which does not
exist yet; 28 missing images, though most are diagrams rather than photos.

**Phase 7 — pages 2 and 3 (70 open).** Largest and least supported. Build the
missing APIs first: vault, chat, emergency, rewards, community.

---

## 6. Schema work this plan requires

Small, and each unblocks a screen that is otherwise honest-but-empty.

| Screen | Missing | Shape |
|---|---|---|
| `ProfileSetup` | hostel block, room | two columns on the account profile, both optional; the screen already offers "I'll add this later" |
| `Permissions` | dorm-pickup location consent, Ayush history retention | two booleans on `care_notification_preferences`, both **off** by default |

`Permissions` also needs decision C. Its fourth toggle, reminders, already
exists as `remindersEnabled` — and already has a UI in the appointments
panel, so that screen must not become a second, diverging place to set it.

---

## 7. Standing rules for every screen built from here

From `DESIGN.md` §6, plus what the last few screens taught:

1. Tokens only. No raw hex. Overlays via `color-mix` off a token.
2. Every state: data, loading, empty, error, offline where reachable offline.
3. Accessibility is asserted, not assumed — accessible name on every control,
   decorative icons `aria-hidden`, ≥44 px targets, visible focus.
4. **If the design claims something the backend cannot prove, it does not get
   built** — and a test asserts the absence, so restoring the copy without
   building the thing behind it fails. This has already caught: a fabricated
   verified identity, a device-minted QR pass, "Doctor online now", an
   invented blood group, and four ABHA claims.
5. A screen nothing routes to is not done. Check for an existing component
   before building a second one.
