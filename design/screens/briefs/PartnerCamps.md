# PartnerCamps — Partner console — Health camps

| | |
|---|---|
| Canvas page | 6 · Partner — new page, no canvas board (feat/health-camps, 2026-10-23) |
| Platform / frame | Web · 1440×1024 (partner console shell, `/partner-camps`; clinics and labs) |
| Tier | 3 (a console table). Staff check-in and results are Tier 1: `docs/plans/tier1-health-camps-2026-10-23.md` |
| Ticket(s) | Health camps (feat/health-camps) |
| Picture | none on the canvas; it is the CampusCamps board (canvas page 4) in partner mode — screenshots in `/home/claude/navy-shots/camps/` |
| Design source | `src/features/camp/host/CampsHostBoard.tsx` (shared with CampusCamps) |

## Icons this screen must show (all of them)

- **Line / solid icons (7):** `alert-triangle`, `check`, `check-2`, `chevron-down`, `download`, `plus`, `x`
- **3D icon tiles (1):** `chart-alt--p4` (empty state, as CampusCamps)
- **Small glyphs (0):** —
- **Brand mark:** — (the partner shell draws it)
- **Text symbols to replace with icons:** —

Sidebar item: "Health camps" (`calendar`), partner kinds CLINIC, LAB and WELLNESS (a wellness centre gets what a clinic gets).

## What it does

- Lists the camps this partner proposed, with the campus, services, who can book and price, a status (Waiting for approval, Scheduled, Today, Past, Declined, Called off), and totals: places, booked, waitlist, checked in.
- "Bookings by slot" shows a table per slot (places, booked, waitlist, checked in, cancelled). Exact counts: the partner runs the camp. Never names.
- Export CSV of the same table (formula cells defused).
- Create a camp for a partner campus (a campus with an active campus administrator): name, date, place, services (vaccination and blood donation shown, held for review), who can book, slots with places, price (free while `camps.paid_camps_enabled` is off), what to bring. It waits for the campus to approve it.
- Call a camp off with a reason students see; every booking and waitlist place is cancelled and each student is told in the app.

## States

Loading · data · empty (create a camp) · error (403 says who can run camps; retry; reference) · create: options failed, refusal from the server, busy · action failed with reference.

> Verify with `node scripts/icons/check-icons.mjs --screen PartnerCamps`.
