# M2Refills — Mobile 2.0 — My health · Refills (refill reminders)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 — new screen, no canvas board (ticket "medicine refill reminders with one-tap reorder", `feat/refill-reorder`, 2026-10-23) |
| Platform / frame | Phone · 390×1600 (web phone frame `/health/refills`, desktop page column, Expo `Refills`) |
| Tier | 2 for what is built: the counts are the student's own entry and the screen only divides pills on hand by pills a day; it gives no dosing advice and shows no clinical value. Anything Tier 1 (dose advice, matching a prescription to a product) is planned in `docs/plans/tier1-refill-reorder-2026-10-23.md` and not built |
| Ticket(s) | Refill reminders + one-tap reorder (`feat/refill-reorder`) |
| Picture | none on the canvas; review screenshots at 390 and 1440, light and dark, in `/home/claude/navy-shots/refill/` |
| Design source | none; designed in code in the Mobile 2.0 language (`src/features/refills/views/M2RefillsView.tsx`). Copy: `src/i18n/areas/refills.ts` |

Opened from Medicines today (M2Reminders, "Refill reminders" row), from a past order on Orders ("Remind me to refill", `?order=&item=`), and from a refill reminder in the inbox (`?id=`). Nav: My health is current.

## Icons this screen must show (all of them)

- **Line / solid icons (15):** `arrow-left`, `bell`, `bell-off`, `box`, `calendar`, `chevron-right`, `clock`, `info`, `pencil`, `pill-3`, `plus`, `repeat`, `shield-alert`, `stethoscope`, `trash`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

All are in `design/icons/icon-manifest.json`; none was added.

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Layout (top to bottom)

1. **Header**: back (`arrow-left`, to Medicines today), eyebrow "My health", title "Refills", SOS (`shield-alert`).
2. **Teal hero** (`service-teal-deep`, white text AA): "Know before a medicine runs out" / "N medicines run out soon" / "Nothing runs out soon", and "Counted from the pack size and schedule you enter. It is a count, never dosing advice."
3. **Offline banner** when offline: every change needs a connection; nothing is kept on the device.
4. **Each tracked medicine** (`pill-3` tile): name (from the order line or the plan), source ("From your order" / "From Medicines today"), a days-left pill (amber when inside the reminder window — never red); `box` "About N left · Runs out {date}" (or "May have run out"); `clock` "{n} each time · {n} times a day · pack of {n}"; `calendar` "Reminder on {date} ({n} days before)", or `bell-off` "Reminder off", or "Snoozed until {date}". A **Remind me** switch. Actions: **Reorder** (`repeat`, order-sourced: opens M2Reorder) or **Ask a pharmacy** (`stethoscope`, plan-sourced: the existing Refill request), **Snooze** (`bell-off`), **I still have some** (`pencil`), **I got a new pack** (`plus`), **Stop tracking** (`trash`).
5. **Track a refill** (`plus`) → sheet: pick a medicine (past order product lines, then Medicines today plans; `chevron-right` rows), then the counts — pack size, packs (their own order quantity prefilled), how many each time, times a day (the plan's own count prefilled), reminder days before (`refill.remind_days_before_default`), count from Today / The order date. An `info` note: "We only count; we never suggest a dose." Limits come from the settings registry.
6. **Sheets**: I still have some (units in hand), I got a new pack (packs), Stop tracking (confirm; calm secondary button, not red).
7. **Note** (`bell`): outside the app a reminder says only "You have a medicine reminder", never the medicine, and waits for quiet hours.
8. **Empty**: "No refills tracked yet" with **Track a refill**.

## Where it links to

`M2Reminders` (back), `M2Reorder`, `RefillRequest` (plan-sourced), SOS, the pill nav.

## States

Loading · data · empty (first time) · error with retry · offline (changes refused) · focused row (from a reminder) · busy per row · snoozed · reminder off · ran out · setup: loading / nothing to pick / pick / counts with range errors / server refusal (coded `refill.msg.*`) · sheets busy / invalid.

## Data

Clinical: `GET/POST /api/refill-tracker`, `GET /api/refill-tracker/plans`, `PATCH /api/refill-tracker/{id}`, `POST …/{id}/snooze|adjust|restock`, `DELETE …/{id}`. The pick list's past orders come from `GET /api/orders` (the student's own; commerce → health is allowed, never the reverse). Reminders are queued by the `refill_reminders` job as `medication_refill` outbox events carrying the refill id only.

## Rules

No dose suggested, checked or corrected; no score or streak. Rule L: nothing on this screen is sent to a commerce endpoint except the order id and item id when the student taps Reorder; no price, offer or product promotion appears here.

> Verify with `node scripts/icons/check-icons.mjs --screen M2Refills`.
