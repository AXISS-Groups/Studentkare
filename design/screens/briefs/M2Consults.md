# M2Consults — Mobile 2.0 — Doctor consults (concern chips, doctors, follow-up)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1640 |
| Tier | 2 |
| Ticket(s) | SK-037, SK-038 |
| Picture | `design/screens/screenshots/09-mobile-2/M2Consults.jpg` |
| Design source | `design/screens/source/09-mobile-2/M2Consults.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (12):** `arrow-left`, `arrow-right`, `box`, `chevron-down`, `chevron-right`, `file-check`, `heart-3`, `home`, `refresh`, `shield`, `user-5`, `video-2`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Insights`, `M2Orders`, `M2Profile`

## States shown in the design's preview switcher

Concern chip (12); Stress or anxiety · Sleep trouble · Low mood add the counsellor / Tele-MANAS note; FAQ: one open at a time, or none

Stress or anxiety / Sleep trouble / Low mood: a green note "The campus counsellor is free and private. Need someone right now? Call Tele-MANAS 14416, any time." appears under the chips.

## Tier

Tier 2 (consult booking). Tier 1 part: the counsellor / Tele-MANAS note shown for stress, sleep and low mood (crisis route, DESIGN.md §2.4).

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb

## Icon matching notes

Same object as the manifest icon, drawn a little differently on this board:

- `refresh`: two-arc refresh drawn with one arrowhead; `refresh` is a single arc

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Consults`.
