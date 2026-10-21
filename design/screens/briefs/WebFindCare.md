# WebFindCare — Student web — public "Find care near you" page (/find-care)

| | |
|---|---|
| Canvas page | New · Find care near you (2026-10-21, no canvas board). Public site frame of canvas page 3a; body in the Mobile 2.0 language |
| Platform / frame | Web · 1440 and 1024 (public header and footer); 390 inside the same frame |
| Tier | 2 |
| Ticket(s) | Find care near you (founder ticket, 2026-10-21) |
| Picture | none yet: screenshots of the build at `/home/claude/navy-shots/care-directory/` |
| Design source | none |

## Icons this screen must show (all of them)

- **Line / solid icons (16):** `ambulance`, `arrow-left`, `chevron-right`, `clock`, `directions`, `doctor`, `droplet`, `hospital`, `info`, `locate`, `map-pin-2`, `phone`, `pill`, `shield-alert`, `shield-check`, `stethoscope`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** — (the public header draws it)
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## What it is

The `M2FindCare` view (and `M2FacilityDetail`) inside `PublicSitePage` with the public header ("Find care" is a header and footer link) and footer. Above phone width the list reflows into two columns and the hero widens. Signed out: every-campus listings and partners only, doctors without slots ("Sign in to book"), the 112 / 108 strip, and no campus SOS card (SOS needs a student session; `/sos` still offers Call 112). No location is stored: distance, when the visitor shares location, is computed in the browser.

A signed-in student opening `/find-care` gets the same view inside the student web shell (above phone width) or the phone frame (phone width), with their campus listings and booking.

## Where it links to

`M2FacilityDetail`, `SignIn` (to book), `M2Consults` booking (signed in)

## States

As `M2FindCare`.

> Verify with `node scripts/icons/check-icons.mjs --screen WebFindCare`.
