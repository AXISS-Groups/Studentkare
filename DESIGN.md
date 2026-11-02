# DESIGN.md — Student Kare design system

**Read this before building or changing any screen.** It applies to people and to AI coding agents equally. `AGENTS.md` (the house constitution) still wins on safety, privacy and architecture; this file governs how the product looks, reads and behaves.

> **Principle.** Figma defines design intent. The design system defines consistency. Code defines implementation. Storybook defines reusable UI states. The browser defines the actual product experience.

---

## 1. Sources of truth

| What | Where | Rule |
|---|---|---|
| Design tokens (colour, type, space, radius, size, shadow, motion) | `design/tokens/studentkare.tokens.json` | **Edit only here**, then `npm run tokens:build`. W3C DTCG format — imports into Figma via Tokens Studio or a DTCG variables importer. |
| Generated tokens for code | `src/theme/tokens/generated/skTokens.ts`, `sk-tokens.css` | Generated. Never hand-edit. `npm run tokens:check` fails CI if stale. |
| Approved screen designs | Design canvas (claude.ai artifact *StudentKare — Onboarding & Auth Flows*, 8 pages, ~240 boards; plus *StudentKare Mobile 2.0*, 13 phone boards approved 2026-10-21, kit page 9) and, later, Figma | Design intent for every core flow, including loading / empty / error / offline states. |
| Reusable components | `src/components/` (target: `src/design-system/`) + Storybook (to be added) | A component is "real" only when it has stories for every state. |
| Product behaviour and safety rules | `AGENTS.md`, `docs/standards/CODING_STANDARDS.md` | Non-negotiable. |

The token test (`src/theme/tokens/__tests__/skTokens.test.ts`) checks that the generated file matches the JSON, that light and dark define the same roles, that every declared text/background pair meets **WCAG 2.1 AA**, and that touch targets are ≥ 44 px.

---

## 2. Product principles (the "why" behind the rules)

1. **Calm and clinical, never alarming.** Students open this app when they're unwell or worried. Plain words, one clear next step, no clutter.
2. **Never celebrate the body.** Confetti and success animation only for commerce and bookings. Never for a result, vital, diagnosis or anything about the body.
3. **Rule L commerce firewall is visible in the UI.** No health data on commercial surfaces, no ads, no sponsored placement, no score about the body, and every price shown before the student commits.
4. **Help is always one tap away.** Crisis support, SOS, the emergency card and 112 are never behind a login, verification gate, paywall or loading state.
5. **Fail closed, visibly.** When something can't be checked (consent, identity, network), the screen says so and denies. It never quietly lets the action through.
6. **The student owns their records.** Every share shows who, what and until when, and can be revoked.
7. **Honest states.** No invented numbers, no fake "AI diagnosis", no demo data outside demo builds. If data doesn't exist, show the empty state.

---

## 3. Tokens — how to use them

Use the **semantic role**, never a raw hex value. `color.action`, not `#0C0494`. Two shrink-only checks enforce it: ESLint for TS/TSX (`config/hex-colour-legacy.json`) and `npm run lint:css-colours` for hex / `rgb()` / `hsl()` in `src/**/*.css` (`config/css-colour-legacy.json`; the generated token CSS is the only exemption). For a tint, use `color-mix()` of a token.

**One navy.** The founder's navy `#0C0494` (2026-10-20) is the brand, action and navigation colour: `brand-navy`, `action` (light), `nav-bg`, `sidebar` and `hero-bg` all carry it, so every token-driven screen turns navy from the token file alone.
- **On navy, the white pill is the only selected state:** `hero-current` (white) with `on-hero-current` (navy text), 14.4:1. `#4F46E5` is 2.3:1 on the navy and is never an indicator there. The console sidebars use the same white pill: `nav-current` / `sidebar-active` are white and the current label and icon are `on-nav-current` (navy) in both schemes. They mean only that: text, buttons, markers, avatars and tabs on light surfaces use `action`; brand titles and hover text on the navy use `sidebar-ink` (a test fails any other use). The focus ring (`focus`) is ≥ 3:1 on the navy, on the white pill and on every surface, in both schemes.
- **Dark mode keeps a light action on the dark canvas.** Dark `action` stays `#A5B4FC` with dark `on-action` text: a navy button would vanish on the `#0E1428` canvas. The navy surfaces (`brand-navy`, `nav-bg`, `sidebar`, `hero-bg`) stay navy in dark too, and only light-on-dark text is drawn on them (`on-hero*`, `sidebar-ink*`, `nav-text`, `nav-label`), never dark `on-action`.
- The `focus` ring is ≥ 3:1 on light surfaces **and** on the navy, so one ring works everywhere.
- Status colours (`positive`, `attention`, `danger`, `info`) do not change with the navy.

### Colour roles

| Role | Use for | Never |
|---|---|---|
| `canvas`, `surface`, `surface-2`, `surface-3` | Backgrounds, cards, grouped areas, selected rows | Text |
| `text`, `text-2`, `text-3` | Headings, body, meta (in that order) | Anything lighter than `text-3` for readable text |
| `brand-navy` | Brand navy `#0C0494` (both schemes): landing heroes, footers, dark panels, toasts, splash | Body text on light backgrounds; dark-scheme `on-action` on top of it |
| `action`, `action-hover`, `on-action`, `action-soft` | Primary buttons, links, selection; disabled fill. Light: navy `#0C0494`, hover `#1D10D6`. Dark: light `#A5B4FC` on the dark canvas | Status meaning; a navy button in dark mode |
| `nav-bg`, `sidebar`, `nav-text`, `nav-label`, `sidebar-ink*` | Console sidebars and the student workspace sidebar, in the navy, with their light text (tints on the navy are `sidebar-ink` mixed into `sidebar`; an error there is `danger-fill` + `on-danger-fill`) | Dark text on the navy |
| `nav-current`, `sidebar-active`, `hero-current` + `on-nav-current`, `on-hero-current` | The current page / selected item on a navy surface: white pill + navy label | Anything that is not the selected item on the navy (use `action`); `sidebar-ink` on the pill |
| `positive*` | Verified, success, in range | Celebrating a health result |
| `attention*` | Needs attention, pending, outside the lab's range | — **a result outside range is amber, never red** |
| `danger*` | Errors, destructive actions, photo mismatch, SOS, crisis links | Lab or vital values |
| `info` on `surface-3` | Explanatory notes | — |
| `clinical-value` + mono font | Lab values, vitals, codes, IDs | Marketing copy |
| `focus` | 3 px keyboard focus ring, 3 px offset; ≥ 3:1 on light surfaces and on the navy | Decoration |
| `chart-categorical-1…8` | Data series in charts, in order (series 1 is the navy family). Each is ≥ 3:1 as a mark on `canvas`, `surface` and `surface-2` in both schemes, and any two stay apart under deuteranopia, protanopia and tritanopia (lightness carries the difference, not hue alone) | Status meaning (use `positive` / `attention` / `danger`); more than 4 series without direct labels or marker shapes |
| `illustration-{indigo,mint,gold,peach,rose,sky}` + `-soft` / `-deep`, `illustration-ink`, `illustration-ink-light`, `illustration-highlight` | Landing and marketing illustrations. `illustration-indigo-deep` is the brand navy. Dark mode turns the soft tints into muted deep tones and dims the highlight so nothing glares | UI chrome, text, status; `illustration-rose*` for errors |
| `art-tint-1…8` | Decorative fills in marketplace product art and category tiles (indigo, lavender, mauve, rose clay, amber, khaki, sage, teal); dimmed in dark | Text, status, or the only cue for a category (always label it) |
| `service-{violet,blue,sky,teal,green,amber,orange,rose}` + `-deep` / `-soft` / `-ink`, `service-{green,orange,violet,amber,rose}-shade`, `service-indigo`, `brand-navy-light`, `ayush-orb-glint` | Mobile 2.0 (canvas page 9) glossy service tiles, concern/category tiles and hero gradients: gradient `service-<hue>` → `service-<hue>-deep` (white glyphs and text sit on the deep end, AA). A hero or card with white text runs `service-<hue>-deep` → `service-<hue>-shade` so the text is AA across the whole gradient — never white text on the light stop (founder, 2026-10-21); an icon on a `-soft` tile uses `-ink` (AA, light in dark). The indigo set is `service-indigo` → `brand-navy`, on `surface-3` with `action`. Navy gradients (primary buttons, pill nav, chat bubbles) run `brand-navy-light` → `brand-navy`; the Ayush orb is `ayush-orb-glint` → `service-indigo` → `brand-navy-light`. Board-by-board mapping: `design/screens/mobile-2-supersedes.md` | Text or the only icon contrast on a light stop (white on a light stop is 1.7–2.7:1); status meaning (in range / outside range stay `positive` / `attention`); the only cue for a category (always label it) |
| `decor-1…5` | Confetti and celebration accents, `aria-hidden` | Anything about the body: no celebration on results, vitals or diagnoses (§2) |
| `scrim`, `scrim-strong` | Overlay behind modals, sheets and drawers; `scrim-strong` for blocking gates where the page behind must not be read. Darker in dark mode | Tinting a surface |
| `on-hero-veil`, `on-hero-track`, `on-hero-rule` | Translucent white on the navy: subtle chip/tile fill (on-hero and on-hero-2 stay AA on it), unfilled progress track (on-hero fill ≥ 3:1 against it), hairline divider | The only boundary of a control |
| `on-hero-attention`, `nav-danger` | Amber text/icon on the navy; red sign-out / destructive link on the navy sidebar. Both AA on every navy surface in both schemes | Light surfaces (use `attention` / `danger`) |
| `on-action-2` | Muted secondary text on an `action` fill; AA on `action` and `action-hover` in both schemes | Light surfaces |
| `action-highlight` | The inset top highlight on primary buttons | Text, borders |
| `paper`, `paper-rule`, `paper-ink`, `paper-ink-2` | The paper-prescription sheet. It stays a light sheet in dark mode (dimmed slightly): it pictures a physical document, and dark ink on light paper is what a pharmacist compares with the real slip; the ink never changes | Any other card |
| `qr-foreground`, `qr-background` | QR codes: black modules on white in both schemes. Never inverted (Tier 1 review: an inverted QR is a scan risk) | Anything but a QR code |
| `camera-bg`, `camera-accent`, `on-camera` | Camera viewfinders and face-capture frames: the dark frame, the reticle / laser / detection boxes, and hint text or the shutter ring on it. Fixed in both schemes (a camera frame is dark whatever the theme); `on-camera` and `on-hero` are AA on `camera-bg`, `camera-accent` ≥ 3:1 | Any surface that is not a camera frame |

Translucent tokens (`scrim*`, `on-hero-veil/track/rule`, `on-action-2`, `action-highlight`) are 8-digit hex (`#RRGGBBAA`) in the token source, because native has no `color-mix()`; their contrast is tested on the composite over the surface they sit on (`src/theme/tokens/__tests__/expressiveContrast.test.ts`). `shadow-hairline` is the small lift (under 12 px blur) under chips, pills, small buttons and rows; `card`, `float` and `sheet` cover the rest.

### Type
- **Plus Jakarta Sans** for all UI text (weights 500 / 700 / 800). **IBM Plex Mono** for clinical values, codes, IDs and times in logs. **Georgia italic** only for "Kare" in the wordmark.
- **Noto Sans Telugu / Noto Sans Devanagari** when the language is తెలుగు / हिंदी. Names, phone numbers, "WhatsApp", "ABHA" and helpline names stay in English.
- Sizes: `caption 12 · body-sm 13.5 · body 15 · title-sm 17 · title 20 · heading 26 · display 32`. Eyebrow labels: caption, weight 800, 1 px letter-spacing, uppercase.

### Space, shape, size
- Spacing steps: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40. Phone gutter 20 px (never below 16), web gutter 40 px.
- Radius: chips 8 · notes 12 · inputs and buttons 14 · cards 20 · sheets 28 (top corners) · pills 999.
- **Every tappable element has a ≥ 44 × 44 px hit area.** Inputs and buttons 50 px; primary CTA 54 px.

### Motion
- 160 ms for taps and toggles, 320 ms for entrances, 420 ms for sheets and drawers; `standard` easing `cubic-bezier(.16, 1, .3, 1)`.
- Mobile 2.0 (canvas page 9): `carousel` 4200 ms per highlight (stops on hover, focus, a dot tap, off-screen), `ambient` 4000 ms for slow decorative loops (tile shine, floating art, live dots), `orbit` 12 s for the Ayush orb's spark. Built once in `src/design-system/m2` (`useLoop`, `useAutoAdvance`, `useAmbientMotion`); every loop rests at its drawn state under reduced motion, while its screen is not in front, and when unmounted. Never on clinical content.
- **Everything stops under `prefers-reduced-motion`.** Motion explains a change; it is never decoration on clinical content.
- **Animated icons and illustrations** (Lottie) come only from the animated set through `<AnimatedIcon>` / `<AnimatedIllustration>` (`design/icons/animated/README.md`): recoloured to tokens, still under reduced motion (system or the app's setting), stopped off screen. Failures and errors stay still; chart loops are decoration in empty states only.

---

## 4. Components

**Search before you build.** Reuse an existing component; if none fits, extend one with a new variant before creating something new. A new component needs a reason in the PR.

### Core set (build these first, each with Storybook stories for every state)

| Component | Variants / states that must have stories |
|---|---|
| Button | primary, secondary, ghost, danger · default, hover, focus, busy, disabled |
| Input, Select, Code input (6-digit), Phone input (+91) | empty, filled, invalid with message, disabled |
| Checkbox, Switch, Radio, Chip | off, on, disabled, focus |
| Card, List row, Section header (eyebrow) | default, selected, with action |
| Note / Banner | info, positive, attention, danger |
| Toast | neutral, success, error (wraps on phone) |
| Bottom sheet (phone) / Drawer + Dialog (web) | open, busy, done · `aria-modal`, focus trap |
| Confirm dialog | logout, destructive, cancel booking |
| Empty state · Loading skeleton · Error state · Offline banner | per role (student, doctor, partner, campus, admin) |
| Result moment | success (commerce only), failure, pending |
| Sidebar navigation (web) | student, doctor, partner, campus, super admin · current page |
| Table (consoles) | data, loading, empty, error, row actions |
| Stepper / progress | step n of m, locked continue |
| Check-in pass, Verified badge, Source badge ("Typed by you" / device) | — |

Existing primitives to consolidate into this set: `Button`, `Input`, `Card`, `Badge`, `Modal` (`src/components/`) and `WorkflowUI` (`src/components/interface/`).

**Mobile 2.0 at every width.** Web and phone draw the same `src/design-system/m2` pieces (cards, bento cells, rows, rail, heroes, product cards, empty states); the web never redraws them in CSS. Wrap a region in `<M2Responsive>` and the pieces lay out for the width that region really has: `phone` up to `size.phone-frame-max`, `tablet` between, `desktop` from `size.desktop-min`. Use `M2Grid` for columns. Outside `<M2Responsive>` everything stays exactly as the phone boards draw it. Stories: *Design system / Mobile 2.0 (phone and desktop)*.

### When a pattern becomes a design-system component
Promote it (Figma **and** code **and** Storybook) when it appears on **3 or more screens**, or when it carries a safety or legal rule (for example the price-before-booking row, the consent share card, the crisis card). Otherwise it can live inside the screen.

---

## 5. Screen tiers — what needs full design

| Tier | Screens | Process |
|---|---|---|
| **1 · Safety-critical** | Crisis support, SOS and after-SOS, emergency card, consent and sharing, identity verification and the gate, guardian consent, results and report explainer, e-prescription and visit summary, delete account, check-in pass and staff scanner, anything showing a clinical value | Full design first. Named design reviewer **and** clinical/legal sign-off. **Never generated by AI without that review.** |
| **2 · Core flows** | Sign-in and onboarding, home, search and results, booking and checkout, orders and tracking, doctor and lab consoles' main queues | Designed on the canvas/Figma, including edge cases and states. Built from components. |
| **3 · Composable** | Settings, lists, history pages, admin tables, help pages, most console sub-pages | Built directly in code from components (people or AI), reviewed in Storybook and the browser. No full mock-up needed. |

---

## 6. Definition of done — every screen, any tier, any builder

- [ ] Uses tokens and components only — **no raw hex values, no one-off inline styles** outside `src/design-system/`.
- [ ] Nothing hard-coded ([AGENTS.md](AGENTS.md) rule 11): copy only from the i18n catalogues (`src/i18n`, en/te/hi), colours only from tokens, business numbers only from `getSetting()` (`src/data/services/config.ts`).
- [ ] All states: data · loading (skeleton) · empty (message + one next step) · error (calm copy, retry, reference code) · offline where the screen can be opened offline · first-time where relevant.
- [ ] Works at 320–390 px (phone) and 1440 px (web); no horizontal scroll.
- [ ] Accessibility: roles and labels on every control, ≥ 44 px hit areas, visible focus, dialogs `aria-modal` with focus trap, images have alt text, contrast AA, reduced motion respected.
- [ ] Language: English, తెలుగు and हिंदी strings fit without truncation.
- [ ] Safety: crisis/SOS reachable where the screen could be used by a student in distress; no health data on commerce surfaces; prices shown before commitment.
- [ ] Honest data: no invented numbers, no demo content in production builds.
- [ ] Stories exist for any new or changed component.

---

## 7. Writing (UX copy)

- Plain, short, second person. "Your report is ready", not "Report generation completed successfully".
- Say what happens next and when: "Support will call within 2 hours."
- Errors: what went wrong, whose side it's on, what to do. "This is on our side, not yours. Try again."
- No dark patterns: no pre-ticked consent, no guilt copy, cancel is as easy as confirm.
- Notifications never contain result values, medicine names or diagnoses; never ask for codes or passwords (see the canvas board *Notification templates*).

---

## 8. Workflow

`Product → UX → Design system → Core designs → Build (people + AI) → Storybook + browser review → Production → Iterate`

- **Figma ↔ code sync only for the design system**, not every screen. Tier 3 screens can live in code only.
- **Figma MCP + Code Connect** map Figma components to the real React components, so AI agents reuse them instead of inventing UI.
- **Review** happens in Storybook (states, visual regression, accessibility checks) and the browser (real data, responsiveness).

### Instructions for AI coding agents
1. Read `AGENTS.md`, then this file.
2. Before creating UI, list the existing components you will use. If one is missing, say so and propose a variant — do not silently create a near-duplicate.
3. Import tokens from `src/theme/tokens/generated/skTokens` (TS) or use `var(--sk-…)` (CSS). **Never write a hex value.**
4. Build every state in §6. If you cannot, stop and report which state is missing.
5. Do not build or change a **Tier 1** screen without being told a named reviewer has approved the design.
6. Add or update Storybook stories for any component you create or change.
7. End with: components used, states covered, anything not done.

---

## 9. Current state and migration

| Item | Status |
|---|---|
| Token source + generator + contrast test | ✅ this PR |
| Runtime tokens (`src/theme/tokens/tokens.ts`) | Still the older "Impilo Pearl" palette — see decision D1 |
| Storybook | Not set up yet (next step) |
| Hard-coded colours in components | **~3,090 raw hex values in 171 `.tsx` files** — migrate screen by screen when touched; a lint rule will block new ones |
| Visual regression + axe in CI | Not set up yet |
| Code Connect | After the first components exist in Figma and code |

### Open decisions

**D1 — One palette.** The repo currently has three competing palettes:

| Source | Primary action | Font | Problems |
|---|---|---|---|
| `design/tokens/studentkare.tokens.json` (from the approved canvas) | `#3525CD` | Plus Jakarta Sans | — all pairs pass AA |
| `src/theme/tokens/tokens.ts` (runtime today) | `#4f46e5` | Manrope | `attention #C97A10` on white is **3.35:1 — fails AA** |
| `docs/standards/CODING_STANDARDS.md` | `#7c5cfc` | — | success `#10b981` 2.54:1, warning `#f59e0b` 2.15:1, danger `#ef4444` 3.76:1 on white — **all fail AA as text** |

Proposal: adopt the token file as the only palette, then point `tokens.ts` and `workflows.css` at the generated values in one follow-up PR (visual change across the app — needs product sign-off).

**D2 — Font.** `index.html` already loads Plus Jakarta Sans as the body font; `tokens.ts` says Manrope. Proposal: Plus Jakarta Sans everywhere, Manrope as fallback only.

**D4 — Under-18 screens are out of scope. (Resolved 2026-09-26.)** Guardrail 8
says 18+ only, and `Signup` has always enforced `18 <= age <= 120`. Where a
design assumes a student under 18 registering with a guardian's approval, the
design is the side that is wrong. Anyone reopening this is changing the
constitution, not a screen.

Corrected 2026-09-26, having looked at each screen rather than at its name:

| Screen | Status |
|---|---|
| `GuardianConsent` | Dropped. Its whole purpose is under-18 registration. |
| `GuardianApprove` | Dropped. The guardian's side of the same flow. |
| `OnboardingConsent` | **Still needed** — it is the DPDP consent screen, required for every student. Only its "I am 18 or older / ask a parent or guardian" branch goes; the checkbox becomes a plain 18+ attestation. Tier 1, so it needs a design review regardless. |
| `ProfileSetup` | **Unrelated** — it collects hostel block, room, blood group and an emergency contact. "Parent or guardian number" is placeholder text in an emergency-contact field, nothing more. It was wrongly listed here. |

A related gap is now closed: `PATCH /profile` accepted any birth date from 1900
to today, so an account created at 18 could edit itself into a minor's. Both
paths now share `adult_birth_date`.

**D3 — Dark mode.** The canvas designs are light-first. The dark values in the token file are carried over from the current runtime theme and pass AA, but haven't been designed screen-by-screen. Decide whether dark mode is in scope for launch.
