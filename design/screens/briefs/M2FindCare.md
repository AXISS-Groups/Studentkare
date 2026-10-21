# M2FindCare — Mobile 2.0 — Find care near you (hospitals, pharmacies, ambulance, doctors by department)

| | |
|---|---|
| Canvas page | New · Find care near you (2026-10-21, no canvas board). Built in the Mobile 2.0 language (canvas page 9) |
| Platform / frame | Phone · 390×1700 (web phone frame and Expo); the same view reflows to two columns above phone width (`WebFindCare`) |
| Tier | 2 (directory). Tier 1 parts: the pinned 112 / 108 strip and the campus SOS link (plan `docs/plans/tier1-care-directory-2026-10-21.md`) |
| Ticket(s) | Find care near you (founder ticket, 2026-10-21) |
| Picture | none yet: screenshots of the build at `/home/claude/navy-shots/care-directory/` |
| Design source | none: inspired by the hospital-list / nearest-hospital flows of a COVID helpcare kit Krishna shared (list cards with name, area, open hours, call and directions; a details page; a map view) |

## Icons this screen must show (all of them)

- **Line / solid icons (16):** `ambulance`, `arrow-left`, `chevron-right`, `clock`, `directions`, `doctor`, `droplet`, `hospital`, `info`, `locate`, `map-pin-2`, `phone`, `pill`, `shield-alert`, `shield-check`, `stethoscope`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** — (the 24×7 chip is text plus `clock`; "×" is a multiplication sign in "24×7", not an icon)

New kit icons for this screen (house line style, 24 px grid, 2 px stroke, round caps and joins, added 2026-10-21 the way PR #178 added 20): `hospital` (a building with a cross and a door), `directions` (a turn arrow in a rounded diamond).

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** — (no map: see "Map view" below)

## Layout, top to bottom

1. **Hero** (`service-blue-deep` → `brand-navy`, white text AA): back (`arrow-left`, round on-hero button), eyebrow "Find care", the SOS pill (`shield-alert`), title "Care near you", one line on what is listed. A slow floating pin (`map-pin-2`) in a veil bubble, decorative, stops under reduced motion and off-screen.
2. **Emergency strip, pinned** (white card overlapping the hero): "Call 112" (`phone`, `danger-fill`, "Police, fire and medical emergencies") and "Call 108" (`ambulance`, `danger-fill`, "Ambulance"). Numbers are protocol constants (`EMERGENCY_NUMBER`, `AMBULANCE_NUMBER`), never copy. Shown in every state, before anything loads.
3. **Segment tabs** (role tablist, 44 px): Hospitals (`hospital`), Pharmacies (`pill`), Ambulance (`ambulance`), Doctors (`doctor`). Selected = navy pill with white label.
4. **Location card** (Hospitals, Pharmacies, Ambulance): `locate` + "Sort by distance" + plain explainer "Your location stays on this device. We don't send it or store it." → "Use my location". States: off · finding you · on ("Sorted by distance from where you are now", "Stop") · denied ("Location is off for StudentKare…", list stays by name) · couldn't get it (try again) · not supported. Distance is computed on the device from the place's coordinates only while on.
5. **Ambulance tab only:** the campus SOS card (`shield-alert`, "Alert your campus") above the list, for signed-in students.
6. **List cards** (lift on hover/press, ≥ 44 px targets): type tile (`hospital` · `stethoscope` clinic · `pill` pharmacy · `ambulance` · `droplet` blood bank, on `service-<hue>-soft` + `-ink`), name, type · area (`map-pin-2`), chips (24×7 with `clock`, "Your campus", "StudentKare partner"), hours text (`clock`) as the admin typed it, distance when computed, "Checked 12 Oct 2026" (`shield-check`), then **Call** (`phone`, only with a number) and **Directions** (`directions`, only with coordinates; opens the device maps app / Google Maps URL with the coordinates, no key). The card opens `M2FacilityDetail` (`chevron-right`).
7. **Doctors tab:** consultation listings grouped by department (the catalogue category), each with initials, name, service, catalogue price, and the next open slot when signed in. "Book" opens the existing booking (M2Consults' booking dialog on the web, BookAppointment in Expo); signed out it reads "Sign in to book".
8. **How this list is made** (`info`): every place was checked by StudentKare or your campus; call before you go; no bed availability, ratings or reviews are shown.

## Where it links to

`M2FacilityDetail`, `M2Consults` (booking), `SosBeacon` (campus SOS), `M2Home` (back)

## States

Per tab: loading (skeleton) · data · empty (own copy per tab, with "In an emergency, call 112") · error (calm copy, retry, reference). Location: off · asking · on · denied · unavailable / timed out · unsupported. Signed out vs signed in (campus listings and slots only signed in). Reduced motion: the floating pin rests; rises are instant.

## Honest data

Real listings only (`GET /api/care-directory`, `GET /api/catalog?kind=consultation`, `GET /api/appointments/availability`). Never shown: bed availability, ratings, review counts, wait times, "open now", or a distance the device did not compute. Location is never sent to the server or stored.

## Map view

Not built: no map library is in the lockfile, and OpenStreetMap's public tiles are not meant for app traffic and would tell a third party the student's area. Every place with coordinates has "Directions" (Open in Maps) instead.

## Tier

Tier 2 (a directory). The 112 / 108 strip and the SOS link are the safety parts (Tier 1 plan above).

> Icons, glyphs and illustrations live in `design/icons/` — names match `design/icons/icon-manifest.json`. Verify with `node scripts/icons/check-icons.mjs --screen M2FindCare`.
