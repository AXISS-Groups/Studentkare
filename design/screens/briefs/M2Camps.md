# M2Camps — Mobile 2.0 — Health camps: book a slot, waitlist, change or cancel

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 — new screen, no canvas board (feat/health-camps, 2026-10-23) |
| Platform / frame | Phone · 390×1600 (web phone frame, desktop page column, Expo `Camps`) |
| Tier | 2 (a booking). The pass, staff check-in, results, vaccination and blood drives are Tier 1 and not here: `docs/plans/tier1-health-camps-2026-10-23.md` |
| Ticket(s) | Health camps (feat/health-camps) |
| Picture | none on the canvas; screenshots of the build in `/home/claude/navy-shots/camps/` |
| Design source | none; designed in code in the Mobile 2.0 language (`src/features/camp/views/M2CampsView.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (8):** `arrow-left`, `calendar`, `calendar-x`, `chevron-right`, `info`, `lock`, `map-pin`, `users`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Animated (1):** `anim-calendar` (empty state, on a 3D tile; still under reduced motion)
- **Brand mark:** —
- **Text symbols to replace with icons:** —

All in `design/icons/icon-manifest.json`; no icon was added. There is no tooth icon in the kit, so services are text chips with no per-service icon.

## Layout (top to bottom)

1. **Sky hero** (`service-sky-deep`, white text AA; soft ring; the `calendar` glyph floats while motion is allowed): round back button, "Campus health" eyebrow, "Health camps", and a line that says slots can be changed or cancelled up to `camps.change_cutoff_hours` before.
2. **Offline banner** when there is no connection (every action is disabled; nothing is cached).
3. **Your bookings**: one card per booking or waitlist place still ahead — sky date tile, camp name, date and slot, place (`map-pin`), a status pill (Booked `positive`, Waitlist · n `attention`), the 8-character **booking reference** in mono (`clinical-value`, read out letter by letter), Change slot / Cancel booking (or Leave the waitlist) until the cutoff, "You can change or cancel until …", else "tell the camp desk", and "Open camp day" (`chevron-right`) for a booked place.
4. **Upcoming camps** for the student's campus (and every-campus camps): date tile, name, date, place, price ("Free", or ₹ from the server), service chips (sky soft), places left (`users`; amber "Every slot is full" when full). Not bookable: an `info` note with the reason, and "Verify your campus" when the camp is for verified students. "See slots" opens the slot picker inline: what to bring, a radio group of slots ("n left", "Full · join the waitlist", "Already started", "Your slot"), and Book this slot / Join the waitlist / Move to this slot, plus Not now.
5. **Cancelled**: bookings the student cancelled and camps that were called off (`calendar-x`, the host's reason).
6. **Privacy line** (`lock`): the campus and the partner see counts per slot, never who.
7. **Confirm dialog** before cancelling (`cancel-booking`, the safe choice is "Keep it"); a toast after each action.

## Where it links to

`M2Home` (back) · `CampDay` (Open camp day) · `ResultCampBooked` (after booking) · `VerifyIdentity` (Verify your campus) · `M2FindCare` (empty state).

Reached from: the camp card on `M2Home`, the camp link on `M2Vaccines`, `/health-camp` (web, phone and desktop), Expo `Camps` (and the CampDay empty state).

## States

Data · loading (two skeletons) · camps failed / bookings failed (each with retry, independent) · no camps (empty with one next step) · no bookings · offline · slots loading / failed / none · slot full with waitlist / without · started · not eligible (not verified, other campus) · paid camp (not bookable yet) · already booked · inside the cutoff · checked in · waitlisted with position · camp called off · refusals from the server (`camps.err.*`).

## Rules

- Every number is the server's (`/camps`, `/camps/{id}/slots`, `/camps/bookings/me`); hours from the settings registry.
- No scannable code: the reference is text. No result, value or clinical detail on this screen.
- Booking may be confirmed warmly (ResultCampBooked); nothing about the body is celebrated.
- Motion: rise-in and the floating glyph stop under reduced motion and off screen.

> Verify with `node scripts/icons/check-icons.mjs --screen M2Camps`.
