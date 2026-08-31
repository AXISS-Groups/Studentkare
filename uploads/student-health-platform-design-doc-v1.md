# Student Health Platform — Design Document

**DD v1.0** · for mockup production
**Implements:** Build Doc v0.4 · TID v1.0
**Date:** August 2026

---

## 1. The brief, pinned

**Product:** a health record and campus care app for Indian students aged 18–24, plus three operator surfaces (camp station, clinician console, institution console).

**Audience:** students who do not think about their health, have never organised a medical document in their life, and are opening this app because their college ran a camp or a friend showed them the emergency card. Second audience: a campus administrator who needs to prove checkup compliance, and a doctor reviewing 400 screenings.

**The single job of the student app:** make a scattered, paper-based, half-lost medical history feel held and legible.

Not: motivate. Not: score. Not: engage daily. A health app that a 20-year-old opens four times a year and finds instantly useful is a success. One they open daily is probably doing something harmful.

---

## 2. Design principles

These come from the clinical and regulatory constraints in Build Doc §3. They are rules, not preferences.

**1. Paper is the source of truth.** Every clinical number in this product came off a document. The design never lets the student forget that — the source is always one tap away, and the interface presents itself as an *index of their documents*, not as an authority that knows things about them.

**2. Never alarm.** Amber for out-of-range, never red. Red is reserved for genuine emergencies only — the emergency screen and nothing else. A 19-year-old alone at 2am is the design target for every out-of-range state.

**3. No scores, no gauges, no comparison.** No health score, no BMI dial, no percentile, no leaderboard, no ring to close. Body metrics are recorded and referred, never rated (Rule E4).

**4. Money is never next to the body.** Points, offers and rewards live in their own tab and never appear on a screen containing a clinical value. The adjacency is what makes a health app feel like it's monetising your body.

**5. Every clinical view ends in a human.** Book, escalate, or see a doctor. A screen showing a value and offering no next step is unfinished (Rule C1).

**6. Quiet by default, loud once.** One element in this product is allowed to be visually loud: the emergency card. Everything else is restrained.

---

## 3. Visual direction

### 3.1 The idea: the spine

Indian medical history is a physical archive — an OPD slip, a lab report on tinted paper, a prescription pad page, a vaccination card in a drawer. The app's job is to run a thread through it.

So the organising device is a **continuous vertical spine** down the timeline: a 1px rule with mono-set dates sitting on it and document entries hanging off it. Records are not cards floating in whitespace; they are things filed on a line. The spine is unbroken across scroll, across years, across gaps — the gaps themselves are visible and meaningful, because a two-year gap in someone's records is information.

This is the structural device, and it encodes something true: order, continuity, and the fact that the record is the student's own archive rather than the app's database.

### 3.2 Palette

Blue, per brief — but ink blue, not SaaS blue. The reference is stamp-pad and fountain-pen ink on clinical paper, not a dashboard.

```css
--ink-900:    #0E2A45;   /* deep ink — headings, spine, emphasis */
--ink-700:    #17466F;   /* primary actions, active nav */
--ink-500:    #2E6FA8;   /* links, secondary actions */
--ink-300:    #7FA9CC;   /* dividers on ink surfaces, disabled */
--ink-050:    #E8F0F7;   /* selected rows, subtle fills */

--paper:      #FBFCFD;   /* app background — cool paper, not cream */
--paper-alt:  #F2F5F8;   /* recessed surfaces, station rows */
--rule:       #DCE4EC;   /* hairlines, the spine */

--text-900:   #10202D;   /* body */
--text-600:   #4C6172;   /* secondary */
--text-400:   #8598A6;   /* captions, timestamps */

--in-range:   #0E8C7F;   /* teal — within the lab's own range */
--attention:  #C97A10;   /* amber — outside range. NEVER red. */
--emergency:  #B32318;   /* emergency surfaces ONLY */
--reward:     #6A4FB6;   /* points/offers — deliberately off-palette */
```

Two deliberate choices worth defending:

**`--reward` is violet, and it does not belong to the health palette.** That is the point. When a student crosses into the points tab, the colour changes register entirely. The visual system itself enforces Principle 4 — you cannot accidentally design an offer onto a health screen without it looking wrong.

**`--emergency` red appears on exactly one surface.** If red shows up anywhere else in a mockup, that mockup is wrong.

### 3.3 Typography

```
Display / headings:  Anek Latin        (Ek Type, Mumbai)
Body / UI:           Inter
Clinical values:     IBM Plex Mono
```

**Anek** is the grounded choice: a family designed by an Indian foundry with Anek Devanagari, Anek Telugu, Anek Tamil, Anek Bangla and more drawn as one system. Telugu and Hindi are not a fallback that breaks the layout — they're the same design at the same optical weight. For a product whose users are Indian-language-first, a typeface where the Indic scripts are the origin rather than an afterthought is the correct call, and it's a choice no generic health app makes.

**IBM Plex Mono** carries every clinical value, date, unit and reference range. This is the texture that makes the product feel like it's reporting what a machine printed rather than telling you something. `11.2 g/dL` set in mono, `13.0–17.0` beside it in mono at 400 weight. It reads as transcription, which is exactly the legal and ethical posture (Rule E1/E2).

**Scale** (mobile, 4pt base):

| Role | Face | Size / line | Weight |
|---|---|---|---|
| Display | Anek | 28 / 34 | 600 |
| Title | Anek | 22 / 28 | 600 |
| Section | Anek | 17 / 24 | 600 |
| Body | Inter | 15 / 22 | 400 |
| Body strong | Inter | 15 / 22 | 600 |
| Caption | Inter | 13 / 18 | 400 |
| Value | Plex Mono | 20 / 24 | 500 |
| Value small | Plex Mono | 13 / 18 | 400 |
| Date on spine | Plex Mono | 12 / 16 | 500, tracking +0.04em, uppercase |

### 3.4 Space, radius, elevation

4pt grid. Spacing scale: `4 · 8 · 12 · 16 · 24 · 32 · 48`.

Radius: `4` for inputs and chips, `8` for entries and sheets, `0` for the spine and hairlines. Nothing rounder than 8 — the product should feel filed, not bubbly.

**Elevation: almost none.** One shadow token, for the bottom sheet and the emergency card only:
`0 8px 24px rgba(14,42,69,0.12)`. Everything else separates with hairlines and background tone. Floating cards undercut the spine metaphor.

### 3.5 Signature element: the emergency card

The one loud thing. Full-bleed, high contrast, designed to be read **by a stranger, at arm's length, under stress, on a locked phone**.

```
┌────────────────────────────────────────┐
│                                        │  ← --emergency red, full bleed
│   EMERGENCY                            │     Anek 600, white
│                                        │
│   ARJUN MEHTA              22          │     Anek 600, 32pt
│   ────────────────────────────────     │
│                                        │
│   BLOOD          B+                    │     labels: Inter 13 / 60% white
│   ALLERGIES      Penicillin            │     values: Plex Mono 20, white
│                  Sulfa drugs           │
│   CONDITIONS     Asthma                │
│   MEDICATIONS    Salbutamol inhaler    │
│                                        │
│   ┌──────────┐   IN EMERGENCY CALL     │
│   │ ▪▪  ▪ ▪▪ │   108                   │     108 in Plex Mono 28
│   │ ▪ ▪▪▪  ▪ │                         │
│   │ ▪▪  ▪ ▪▪ │   Amma  +91 98xxx xxxxx │
│   └──────────┘   Campus  +91 40xxx xxx │
│                                        │
└────────────────────────────────────────┘
```

Rules: no app chrome, no logo lockup competing for attention, no scroll — everything fits one screen at 375px width. Screen brightness forced to maximum on open. Reachable from the lock screen and from a printed/scanned QR without login. Contents are the student's own stated facts, never inferred.

This is the screen students will show each other. It carries the brand.

---

## 4. Screen inventory — student app

### 4.1 Home / Timeline

The spine, and nothing else competing with it.

```
┌─────────────────────────────────────┐
│  Arjun            [profile switch ▾]│   Anek 22
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ⚑  Emergency card       →     │  │   single --emergency accent bar,
│  └───────────────────────────────┘  │   otherwise quiet
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Campus camp · Thu 21 Aug      │  │   contextual, dismissible
│  │ You're registered      Details│  │
│  └───────────────────────────────┘  │
│                                     │
│  YOUR RECORDS                    ⊕  │   Anek 17
│                                     │
│  │                                  │   ← the spine, 1px --rule
│  ● 14 MAR 2026                      │   Plex Mono 12, --text-400
│  │  ┌─────────────────────────────┐ │
│  │  │ Blood test · SRL Diagnostics│ │   Inter 15/600
│  │  │ 8 values     1 needs review │ │   Inter 13 --text-600
│  │  └─────────────────────────────┘ │
│  │                                  │
│  ● 02 JAN 2026                      │
│  │  ┌─────────────────────────────┐ │
│  │  │ Prescription · Dr K. Rao    │ │
│  │  │ 3 medicines                 │ │
│  │  └─────────────────────────────┘ │
│  │                                  │
│  ┆        no records for 9 months   │   dotted spine = a real gap.
│  ┆                                  │   Stated, never scolded.
│  ● 18 APR 2025                      │
│  │  ┌─────────────────────────────┐ │
│  │  │ Vaccination · Hepatitis B   │ │
│  │  └─────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  Records   Learn   Care   Points    │   Points tab in --reward violet
└─────────────────────────────────────┘
```

The dotted-spine gap is a real design decision: it shows absence honestly without a nudge, a badge, or a guilt mechanic. Tapping it offers "add an older record", not "you're falling behind".

### 4.2 Record detail

```
┌─────────────────────────────────────┐
│  ←   Blood test                   ⋮ │
│      SRL Diagnostics · 14 Mar 2026  │   Inter 13 --text-600
│                                     │
│  ┌───────────────────────────────┐  │
│  │  [ view original document ]   │  │   ALWAYS present. Principle 1.
│  └───────────────────────────────┘  │
│                                     │
│  Haemoglobin                        │   Inter 15
│  11.2 g/dL          13.0–17.0       │   Plex Mono 20 / Plex Mono 13
│  ▬▬▬▬▬▬▬▬▬○──────────────           │   position marker, --attention
│  Below the range printed on this    │   Inter 13. Sourced, not judged.
│  report.                            │
│                                     │
│  Vitamin B12                        │
│  384 pg/mL          200–900         │
│  ─────────○▬▬▬▬▬▬▬▬▬▬▬▬             │   --in-range
│                                     │
│  Ferritin                     ⚠     │
│  — · couldn't read this value       │   needs_review state
│  [ check against original ]         │   never a guess. Rule E2.
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Explain this report          │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Book a doctor consultation   │  │   Rule C1: terminal action
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

The range bar shows position within the lab's own printed range. It never extrapolates, never labels a severity, never colours the whole screen.

### 4.3 Explainer sheet

Bottom sheet, not a chat. A chat interface invites the questions the AI must refuse.

```
┌─────────────────────────────────────┐
│  ─────                              │
│  About this report      ⓘ AI-written│   disclosure always visible, Rule E6
│                                     │
│  Haemoglobin carries oxygen around  │
│  your body. Your report shows 11.2, │
│  and the lab's own range on that    │
│  page is 13.0 to 17.0.              │
│                                     │
│  From: SRL report, 14 Mar 2026 →    │   Rule E1: every claim cites source
│                                     │
│  What this means for you is a       │
│  question for a doctor — I can only │
│  read what's printed here.          │   Rule E8: uncertainty stated
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Book a consultation          │  │
│  └───────────────────────────────┘  │
│  Read about haemoglobin →           │   M17, term-triggered (Rule B1)
│                                     │
│  Something wrong here? Tell us      │   Rule H1, on every AI surface
└─────────────────────────────────────┘
```

**Language rules for every AI surface:** no second person plus a clinical claim; no "you may have", "risk of", "suggests"; no title, no "Dr"; sentence case; plain verbs. The voice is a careful librarian, not a clinician.

### 4.4 Learn (M17)

Editorial, not clinical. This is the tab that earns daily-ish use without gamifying health.

Grid of topic cards under Anek section headings — *Living in hostel*, *Before exams*, *What tests mean*, *Vaccines you may be due*, *How the system works*. Language switcher is prominent and persistent, not buried in settings. Content is general and third-person, always (Rule B2).

### 4.5 Care

Booking surfaces: teleconsult, lab test, campus clinic, counsellor. Counsellor entry is visually equal to the others — not hidden, not highlighted, no badge, no streak, no reminder (Rule D6).

### 4.6 Points

Violet register throughout. Deliberately unlike every other screen.

```
┌─────────────────────────────────────┐
│  Points                      1,240  │   Anek 28, --reward
│                                     │
│  HOW YOU EARNED                     │
│  ● Closed Dr Rao's referral    +300 │   the best mechanic — top billing
│  ● Attended campus camp        +200 │
│  ● Added a health record       +50  │
│                                     │
│  USE THEM                           │
│  ┌────────────┐ ┌────────────┐      │
│  │ 20% off    │ │ Free       │      │
│  │ lab panel  │ │ dental chk │      │
│  └────────────┘ └────────────┘      │
└─────────────────────────────────────┘
```

No INR equivalent anywhere on this screen or in its copy. No clinical data visible. No offer segmented on a health value — offers segment on campus, year, stated interest only.

---

## 5. Camp station app — a different design problem

Auditorium, glare, four hours, 400 students, a volunteer operating it, possibly gloved hands, no wifi. Delight is irrelevant; **speed and error-resistance** are everything.

```
┌──────────────────────────────────────────────┐
│  VITALS · Station 2        ▣ 47 queued  ⚡off │  sync state always visible
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  [ SCAN ]     or enter roll number     │  │  56pt tap targets minimum
│  └────────────────────────────────────────┘  │
│                                              │
│  ARJUN MEHTA · CSE 3rd yr · 21               │  Anek 22, confirm identity
│                                              │
│   HEIGHT            WEIGHT                   │
│  ┌──────────┐      ┌──────────┐              │
│  │   172    │ cm   │    64    │ kg           │  Plex Mono 32
│  └──────────┘      └──────────┘              │  numeric keypad only
│                                              │
│   BP SYS      BP DIA       PULSE             │
│  ┌───────┐   ┌───────┐   ┌───────┐           │
│  │  118  │   │   76  │   │   72  │           │
│  └───────┘   └───────┘   └───────┘           │
│                                              │
│  ┌──────────────────┐ ┌───────────────────┐  │
│  │   SKIP STATION   │ │   SAVE & NEXT  →  │  │
│  └──────────────────┘ └───────────────────┘  │
└──────────────────────────────────────────────┘
```

**No BMI is computed or displayed at any station.** Height and weight are recorded; interpretation happens on the clinician side (Rule E4). This is the single most likely place for a well-meaning developer to add a BMI badge — call it out explicitly in the handoff.

High contrast throughout (minimum 7:1), no thin type, no colour-only signals, offline state permanently visible rather than a transient toast.

---

## 6. Clinician console (M18)

Density over delight. A doctor triaging 400 screenings wants a work queue, not a dashboard.

```
┌───────────────────────────────────────────────────────────┐
│  Camp review · Osmania CSE · 21 Aug        412 screened   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ● P1  Mehta, A.    Hb 8.4 ↓ trending down 3 reports │  │
│  │       source: 14 Mar SRL · 02 Jan Apollo · camp     │  │  rationale
│  │       [ acknowledge ]  [ refer ]  [ dismiss ]       │  │  always cited
│  ├─────────────────────────────────────────────────────┤  │
│  │ ● P1  Reddy, S.    BP 152/98 · repeat elevated      │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ○ P2  Khan, F.     BMI 16.2 · below range           │  │
│  └─────────────────────────────────────────────────────┘  │
│  38 unreviewed · oldest 2 days  ⚠ 1 past SLA              │  Rule B4
└───────────────────────────────────────────────────────────┘
```

Every flag shows its source records and dates. Every action requires the reviewing RMP's registration number, captured at session start. Dismissal requires a reason — that's the data that retunes thresholds (Rule B5).

Visually distinct from the student app: tighter grid, `--paper-alt` base, no illustration, no rounded corners beyond 4.

---

## 7. States

| State | Treatment |
|---|---|
| Empty timeline | The spine still renders, with one prompt: "Add your first record". Not an illustration of a sad folder. |
| Loading | Skeleton on the spine. Never a full-screen spinner. |
| OCR pending | Entry appears immediately, marked "reading this…". The record exists the moment it's uploaded. |
| Needs review | Amber marker, source image one tap away, "check against original". Never a guessed value. |
| Failed | "We couldn't read this. Your original is safe — here it is." Never a dead end, never an apology. |
| Offline (student) | Cached records readable, upload queued with a visible count. |
| Offline (camp) | Persistent banner with queue depth. Never blocks input. |
| Crisis | Full-screen takeover, static content, `--emergency`. Tele-MANAS 14416, campus counsellor, alert my contact, book a human. No AI, no chrome, no dismissal into an AI surface. |

---

## 8. Multilingual and script

English, Hindi, Telugu at launch; Tamil, Bengali, Kannada, Marathi next. Anek covers all of these as one designed system.

- **Design every screen in Telugu first, then English.** Telugu and Devanagari set roughly 15–25% longer and taller. If the layout survives Telugu, English is free; the reverse is not true.
- Line-height +2pt on Indic scripts to accommodate mātrās and ascenders.
- Clinical terms stay recognisable in Latin alongside the translation, so a student can say the word to a doctor (Rule E7).
- Numbers, units and dates stay Latin/Plex Mono in every language.
- Language switcher is a persistent header control on Learn and in onboarding, not a settings-menu item.

---

## 9. Accessibility floor

Non-negotiable, not a later pass. Contrast 4.5:1 body / 3:1 large / 7:1 camp station. Tap targets 44pt minimum (56pt at camp stations). Every status carries an icon or text label — colour is never the only signal, which also matters because amber/teal is a common confusion pair. Full VoiceOver/TalkBack labelling with clinical values read as "eleven point two grams per decilitre", not "11.2". Dynamic type support to 200% without clipping. `prefers-reduced-motion` respected. Visible keyboard focus on all web surfaces.

---

## 10. Motion

Minimal and purposeful. Spine entries fade+rise 12px over 180ms on first render, staggered 30ms. Bottom sheets spring in at 240ms. Emergency card opens instantly, no transition — it must never animate while someone is waiting to read it. Nothing else animates. Ambient motion, parallax, and celebratory confetti are all out; the last one especially, since a health app celebrating is usually celebrating the wrong thing.

---

## 11. Copy rules

Sentence case everywhere. Active voice. A button names what happens: "Add record", never "Submit". The same word survives the whole flow — "Add record" produces "Record added".

Never: "Don't worry", "Everything looks great!", "Uh oh", "Oops", "You're doing amazing". Never a value judgement on a body. Never "normal" or "abnormal" — use "within the range printed on this report" and "outside the range printed on this report".

Errors state what happened and what to do, without apologising. Empty states invite one specific action.

---

## 12. Explicitly do not design

A list for the handoff, because every one of these is something a good designer would reasonably propose:

- A health score, wellness ring, or streak
- A BMI gauge, dial, or colour band
- Any red on a clinical value
- Any offer, point, or reward on a screen containing a clinical value
- Any badge, count, or reminder on a mental health surface
- A chat interface for the AI (invites questions it must refuse)
- Comparison to peers, cohort averages, or "students like you"
- Anything addressing the student in second person with a clinical claim
- A splash screen or animation ahead of the emergency card

---

## 13. Mockup deliverables, in order

**Round 1 — prove the direction (5 screens)**
1. Emergency card — the signature, do this first
2. Home / timeline, populated
3. Record detail with one out-of-range value
4. Explainer sheet
5. Camp station · vitals

**Round 2 — the system (8 screens)**
6. Home, empty state · 7. Upload → needs-review flow · 8. Learn index and article · 9. Care booking · 10. Points · 11. Crisis takeover · 12. Camp station registration + offline banner · 13. Clinician review queue

**Round 3 — breadth**
Onboarding and age verification · profile switching · consent notice (the DPDP itemised screen — design it properly, it's read more than you'd think) · institution console · settings, export, erasure.

Deliver Round 1 in Telugu and English side by side. If the direction survives that, it survives everything.

---

*DD v1.0. §3.5 is the signature; §12 is the section that prevents well-intentioned harm. Both should survive review intact.*
