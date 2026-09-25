# DESIGN.md — Student Kare design system

**Read this before building or changing any screen.** It applies to people and to AI coding agents equally. `AGENTS.md` (the house constitution) still wins on safety, privacy and architecture; this file governs how the product looks, reads and behaves.

> **Principle.** Figma defines design intent. The design system defines consistency. Code defines implementation. Storybook defines reusable UI states. The browser defines the actual product experience.

---

## 1. Sources of truth

| What | Where | Rule |
|---|---|---|
| Design tokens (colour, type, space, radius, size, shadow, motion) | `design/tokens/studentkare.tokens.json` | **Edit only here**, then `npm run tokens:build`. W3C DTCG format — imports into Figma via Tokens Studio or a DTCG variables importer. |
| Generated tokens for code | `src/theme/tokens/generated/skTokens.ts`, `sk-tokens.css` | Generated. Never hand-edit. `npm run tokens:check` fails CI if stale. |
| Approved screen designs | Design canvas (claude.ai artifact *StudentKare — Onboarding & Auth Flows*, 8 pages, ~240 boards) and, later, Figma | Design intent for every core flow, including loading / empty / error / offline states. |
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

Use the **semantic role**, never a raw hex value. `color.action`, not `#3525CD`.

### Colour roles

| Role | Use for | Never |
|---|---|---|
| `canvas`, `surface`, `surface-2`, `surface-3` | Backgrounds, cards, grouped areas, selected rows | Text |
| `text`, `text-2`, `text-3` | Headings, body, meta (in that order) | Anything lighter than `text-3` for readable text |
| `brand-navy` | Brand headers, dark panels, splash | Body text on light backgrounds |
| `action`, `action-hover`, `on-action`, `action-soft` | Primary buttons, links, selection; disabled fill | Status meaning |
| `positive*` | Verified, success, in range | Celebrating a health result |
| `attention*` | Needs attention, pending, outside the lab's range | — **a result outside range is amber, never red** |
| `danger*` | Errors, destructive actions, photo mismatch, SOS, crisis links | Lab or vital values |
| `info` on `surface-3` | Explanatory notes | — |
| `clinical-value` + mono font | Lab values, vitals, codes, IDs | Marketing copy |
| `focus` | 3 px keyboard focus ring, 3 px offset | Decoration |

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
- **Everything stops under `prefers-reduced-motion`.** Motion explains a change; it is never decoration on clinical content.

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
