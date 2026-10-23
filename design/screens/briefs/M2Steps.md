# M2Steps — Mobile 2.0 — Steps · today, this week, where the number came from

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 — new screen, no canvas board (ticket "automatic step counting", approved by Krishna Chintakayala 2026-10-21) |
| Platform / frame | Phone · 390×1500 (web phone frame, desktop page column, Expo) |
| Tier | 2 (wellness, not a clinical value; an OS permission is asked only after a plain explainer) |
| Ticket(s) | Steps (feat/steps) |
| Picture | none on the canvas; screenshots of the build in `/home/claude/navy-shots/steps/` |
| Design source | none; designed in code in the Mobile 2.0 language (`src/features/steps/views/M2StepsView.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (8):** `arrow-left`, `check`, `devices`, `heart-plus`, `info`, `pencil`, `refresh`, `walk`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

All eight are in `design/icons/icon-manifest.json`; no icon was added. Apple Health and Health Connect are named in words with the neutral `heart-plus` icon, not their logos (no brand marks in the kit).

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** `chart-steps-week` — one bar per day from Monday to today (`GET /activity/trends?period=this_week`); a day without a number is an empty dashed track, never a zero bar; each bar is a list item with a spoken label (day, steps, source).

## Layout (top to bottom)

1. **Teal hero** (`service-teal-deep` → `service-teal-deep`, white text AA; two soft rings; the `walk` glyph floats while motion is allowed): round back button (`arrow-left`, on-hero), "My health" eyebrow, title "Steps"; "Steps today" label, today's number from the server in display size, and a white source chip (`heart-plus` From Apple Health / From Health Connect, `devices` From this phone's motion sensor, `pencil` Typed by you). No number for today: "No steps for today yet" and one next step. Footnote: "Steps are here for you to look at. No goals, scores or streaks."
2. **Live card** (only while the phone's motion sensor is connected and the screen is open): `walk` tile, "Counting while this screen is open", "N steps since you opened this screen". On Android the sensor counts only live, and the card says it is not saved as the day's total.
3. **This week** card: the bar chart, "Average on the days with a number: N steps" (the server's average over days that have a number) or "No steps this week yet." Under it, when a source is connected: the sync state (reading / couldn't save / no steps read yet; for Apple Health a hint where to check sharing) and "Read now" (`refresh`).
4. **Count steps automatically** (phone): one row per source, most trusted first — Apple Health (iOS) or Health Connect (Android), then the phone's motion sensor: `heart-plus` / `devices` tile, name, what it reads ("Never writes"), state (`check` Connected, Not connected, Permission not given, Turned off in settings, Not on this phone, Update Health Connect first), and Connect / Stop / Settings. An `info` note says the order and that numbers are never added together.
   **Web**: a single card (`devices`): "Open the phone app to count steps automatically" and why a browser can't.
5. **Add today's steps yourself** (`pencil`): number field (whole number up to `wellness.activity_steps_max`), Save; the hint says a connected source's number is shown instead when it has one.
6. **Explainer sheet** (before any OS prompt): "Before you connect {name}", what is read and that nothing is written, that steps stay in the student's record and are never a goal, score, streak, reward or shown on shop pages, that the phone asks next and it can be turned off in settings. Continue / Not now.

## Where it links to

`M2Insights` (back) · the phone's own settings (Settings for a refused permission; Health Connect's settings on Android).

Reached from: the Steps card on `M2Insights` (My health), the web Devices & sensors "Steps" tab, `/health/steps`.

## States

Data (today with source) · today without a number · loading (hero line + week skeleton) · week failed (hero says so, retry) · offline banner (typed save disabled) · web (no sources) · each source state above · explainer open · connecting ("Waiting for permission…") · live counting · Android live only · sync reading / failed / no data · typed: invalid (registry max), server refusal (`wellness.msg.*`), saving, saved.

## Rules

- Every number comes from the server (`/activity/trends`) or, for the live count, from the phone's own sensor since the screen opened, and says where it came from.
- Sources are never added: Apple Health / Health Connect, then the phone sensor, then typed (`SOURCE_PRIORITY`, server and app); the server keeps one total per day per source.
- No goals, rings, streaks, medals, scores or praise on steps (AGENTS.md guardrail 4; DESIGN.md §2.2). Not on any shop page (Rule L).
- No permission is asked when the screen opens; only Continue in the explainer shows the platform prompt. Read only: no write permission is declared.
- Motion: rise-in and the floating glyph stop under reduced motion and when the screen is not in front; live counting and the re-sync (`wellness.steps_live_sync_seconds`) stop when it closes.

> Verify with `node scripts/icons/check-icons.mjs --screen M2Steps`.
