# M2Water — Mobile 2.0 — My health · Water

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) · **no canvas board yet**: designed in code in the Mobile 2.0 language (ticket approved by Krishna Chintakayala, 2026-10-21) |
| Platform / frame | Phone · 390×1400 (web phone frame, the desktop page column, Expo) |
| Tier | 2 |
| Ticket(s) | Water and pill reminders on Mobile 2.0 (`feat/reminders-m2`) |
| Picture | none on the canvas; review screenshots at 390 / 1024 / 1440, light and dark, are attached to the PR |
| Design source | none (no board). Copy: `src/i18n/areas/m2reminders.ts` |

Opened from the Water card on M2Insights (`/health/water` on the web, `Water` in the Expo app). Nav: My health is current.

## Layout (top to bottom)

1. **Header**: back (`arrow-left`, to My health), eyebrow "My health", title "Water", SOS (`shield-alert`, opens the existing SOS flow).
2. **Hero** (sky, `service-sky-deep` → `service-sky-deep`, white text AA): today's total in ml, "of your {goal} ml goal" (or "of the suggested {goal} ml" when the student has not set one), a capped fill bar (`on-hero-track` / `on-hero`), and two buttons: **+ Glass · {ml} ml** (`plus`, `glass`; the white `hero-current` pill) and **Undo last** (`undo`, veil). Rise-in on entry, nothing loops.
3. **Offline banner** when offline: logging, undo and the goal need a connection; nothing is queued or kept on the device.
4. **Today**: each entry today (time, amount), newest first. Empty: "Nothing logged yet today."
5. **Daily goal**: the goal and its source; **Change** opens a stepper (`minus` / `plus`, one glass per step) bounded by the server's min and max, **Save** / **Cancel**. A refusal shows the server's coded message.
6. **Last {n} days** (`wellness.water_history_days`): one bar per day with its ml; a day with nothing logged is drawn as an empty track with "—" and read as "Nothing logged" (unknown, never 0). No goal line, no "met" marks: goals are not kept per day. A list is the text alternative.
7. **Reminders**: Expo: off (`bell-off`) or on (`bell`) with the gap (`wellness.water_reminder_interval_minutes_*`, step `…_step_minutes`), from and to hours, the times they give (at most `wellness.water_reminders_per_day_max`), **Turn on** / **Save** / **Turn off**; permission asked only on Turn on; refused → "Open settings". Web: an honest note that reminders need the phone app (a browser can remind only while the page is open, so it is not offered).
8. **Note**: "Water isn't scored here: no streaks, no medals, no comparisons."

## Icons this screen must show (all of them)

- **Line / solid icons (13):** `arrow-left`, `ayush-spark`, `bell`, `bell-off`, `box`, `glass`, `heart-3`, `home`, `minus`, `plus`, `shield-alert`, `undo`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** the fill bar and the week bars (plain views, text alternative beside them)

## Where it links to

`M2Insights` (back), SOS (SosBeacon), the pill nav (`M2Home`, `M2Orders`, `M2AskAyush`, `M2Insights`, `M2Profile`)

## States

Loading (skeletons) · data · first time (nothing logged today, default goal) · over the goal (bar full, no celebration) · busy (button says what it is doing) · server refusal (coded message) · per-section error with retry · offline · reminders off / on / changed / permission denied / failed · web (reminders note).

## Data

`GET /wellness/water/today`, `POST /wellness/water`, `DELETE /wellness/water/latest`, `GET` / `PUT /wellness/water/goal`, `GET /wellness/water/days` (new). Settings: `wellness.water_glass_ml`, `wellness.water_history_days`, `wellness.water_goal_ml_*`, `wellness.water_reminder_*`.

## Rules

No streak, medal, score, percentile or comparison (AGENTS.md guardrail 4). A reminder never carries an amount or the goal (DESIGN.md §7). Not reachable from a store page.

## Missing icons

`bell-off` (a bell with a slash: reminders off) was not in the kit. It was drawn on 2026-10-21 in the house line style (24 px grid, 2 px stroke, round caps and joins) from the existing `bell`, and added to the manifest, the gallery and `skIconData`.

> Verify with `node scripts/icons/check-icons.mjs --screen M2Water`.
