# M2Reminders — Mobile 2.0 — My health · Medicines today and reminders

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) · **no canvas board yet**: designed in code in the Mobile 2.0 language (ticket approved by Krishna Chintakayala, 2026-10-21). It is the Mobile 2.0 form of the page 2 *Medications* board |
| Platform / frame | Phone · 390×1400 (web phone frame, the desktop page column, Expo) |
| Tier | 1 (medicine names and doses). Follows `docs/plans/tier1-canvas-wp07-2026-10-20.md` § Medications and `docs/plans/tier1-mobile2-health-2026-10-21.md` (approved 2026-10-21) |
| Ticket(s) | Water and pill reminders on Mobile 2.0 (`feat/reminders-m2`) |
| Picture | none on the canvas; review screenshots at 390 / 1024 / 1440, light and dark, are attached to the PR |
| Design source | none (no board). Copy: `src/i18n/areas/m2reminders.ts`; the Medications board's lines "Nothing here is scored, and no one is told if you miss one" and the two-step empty state |

Opened from the Medicines today card on M2Insights and from M2Home's Medicines today ring (`/health/medicines` on the web, `MedicineReminders` in the Expo app). Nav: My health is current.

## Layout (top to bottom)

1. **Header**: back (`arrow-left`, to My health), eyebrow "My health", title "Medicines today", SOS (`shield-alert`).
2. **Hero** (teal, `service-teal-deep`, white text AA): "{n} doses left today" / "Every dose for today is logged" / "Your medicines don't say how many a day" (no count is invented), and "Nothing here is scored, and no one is told if you miss one."
3. **Offline banner** when offline: marking a dose needs a connection; nothing is queued or kept on the device.
4. **Each medicine** (`pill-3` tile): name and dose exactly as the server has them (the student's entry or the prescription); "{taken} of {planned} taken today" (plus "· {skipped} skipped"), or, when the plan gives no count, "Not marked yet today" / "Taken today" / "Skipped today". Buttons **Taken** (`check`) and **Skip** (`skip-forward`) while doses remain; **Undo** (`undo`) while the server's `undoUntil` (setting `meds.dose_undo_minutes`) is open. Below it, on Expo, **Remind me** chips: Off (`bell-off`) and the four slots (`bell`) at the times from `meds.reminder_minute_*`; on the web, one note that reminders need the phone app.
5. **Water reminders** link row (`glass`, `chevron-right`) → M2Water.
6. **Empty** (no medicines): "No medicines here yet" with two next steps: **Upload a prescription** (`doc-upload`) and, on the web, **Add a medicine** (`plus`, the existing medicine form). Expo has no add-medicine screen, so only the upload is offered.

## Icons this screen must show (all of them)

- **Line / solid icons (17):** `arrow-left`, `ayush-spark`, `bell`, `bell-off`, `box`, `check`, `chevron-right`, `doc-upload`, `glass`, `heart-3`, `home`, `pill-3`, `plus`, `shield-alert`, `skip-forward`, `undo`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** — (the Medications board's `video-379108.mp4` is not used: the M2 hero is a gradient)
- **Data-driven graphics (build as components):** —

## Where it links to

`M2Insights` (back), `M2Water`, the prescription upload (records), the medicine form (web), SOS, the pill nav

## States

Loading · data · all logged · plan without a count · busy per row · undo open / closed · server refusal (coded message) · error with retry · empty (first time) · offline · reminders off / slot / permission denied / failed (Expo) · web (reminders note).

## Data

`GET /meds/today` (now with `dosesSkipped` and `undo.outcome`), `POST /meds/log-dose`, `POST /meds/skip-dose` (new), `DELETE /meds/doses/{id}`, `GET /meds/schedule` (reminder list). Local notifications only (`expo-notifications`, already a dependency).

## Rules (WP-07 Medications, unchanged)

Names and doses only from the server; no generated advice, no invented schedule, free-text frequency never counted. No adherence score or streak; nobody is told about a missed or skipped dose; a skip is never counted as taken. A reminder never names the medicine (lock screen). Rule L: M2Home shows dose **counts** only; no name, dose or link carrying one reaches a store page. No PHI cached on the device (D7-1).

## Missing icons

`skip-forward` (a play triangle against a bar: skip this dose) and `bell-off` (reminder off) were not in the kit. Both were drawn on 2026-10-21 in the house line style and added to the manifest, the gallery and `skIconData`.

> Verify with `node scripts/icons/check-icons.mjs --screen M2Reminders`.
