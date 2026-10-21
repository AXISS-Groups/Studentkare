# M2FacilityDetail — Mobile 2.0 — One place in the care directory

| | |
|---|---|
| Canvas page | New · Find care near you (2026-10-21, no canvas board). Built in the Mobile 2.0 language (canvas page 9) |
| Platform / frame | Phone · 390×1200 (web phone frame, Expo, and centred above phone width) |
| Tier | 2 |
| Ticket(s) | Find care near you (founder ticket, 2026-10-21) |
| Picture | none yet: screenshots of the build at `/home/claude/navy-shots/care-directory/` |
| Design source | none: the "hospital details" page of the helpcare kit Krishna shared, in Mobile 2.0 |

## Icons this screen must show (all of them)

- **Line / solid icons (13):** `ambulance`, `arrow-left`, `arrow-up-right`, `clock`, `directions`, `droplet`, `hospital`, `info`, `map-pin-2`, `phone`, `pill`, `shield-check`, `stethoscope`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Layout, top to bottom

1. Header: back (`arrow-left`), the type tile (`hospital` / `stethoscope` / `pill` / `ambulance` / `droplet`), name (h1), type · area, chips (24×7, Your campus, StudentKare partner), distance when the student shared their location.
2. Actions: **Call** (`phone`, navy, only with a number) and **Directions** (`directions`, only with coordinates).
3. Cards: **Address** (`map-pin-2`) with "Open in Maps" (`arrow-up-right`); **Hours** (`clock`) as typed, or "Open 24×7"; **Departments** as chips; **Checked** (`shield-check`) "Checked on 12 Oct 2026 · Called the front desk", and the source link (`arrow-up-right`) when there is one.
4. Note (`info`): "Call before you go: hours and services can change."
5. Compact emergency row: Call 112 · Call 108.

## Where it links to

`M2FindCare` (back), device phone and maps apps

## States

Data · loading (opened by id) · not found (taken off the directory or no longer verified: "This place isn't listed any more", back to the list) · error with retry. No phone: no Call. No coordinates: no Directions, no distance.

## Honest data

`GET /api/care-directory/{id}` under the list's rules. No beds, ratings, reviews, wait times or "open now".

> Verify with `node scripts/icons/check-icons.mjs --screen M2FacilityDetail`.
