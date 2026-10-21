# M2ReportUpload — Mobile 2.0 — Upload a report from any lab

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1250 |
| Tier | 1 |
| Ticket(s) | SK-046, SK-047 |
| Picture | `design/screens/screenshots/10-mobile-2/M2ReportUpload.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2ReportUpload.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (5):** `arrow-left`, `camera-2`, `check`, `chevron-right`, `flask`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2Insights`, `M2Trends`

## States shown in the design's preview switcher

Add (pick a source); Read (reading your report…); Check (confirm 8 values, untick any); Saved (added to your record)

Read: a report sheet with a scanning line, "Reading your report…", progress bar and a "Continue (preview)" button (the canvas preview advances on its own after 2.6 s). Check: 8 values with ticks and range chips, "Save 8 values to my record". Saved: green tick in a pulsing ring, "Added to your record", "Ask a doctor to explain it" (→ M2Insights) and "See my trends" (→ M2Trends).

## Tier

Tier 1: values read from a report, confirmed by the student before saving.

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- document with an upload arrow (upload a prescription / report) — at: source "Upload a PDF"

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2ReportUpload`.
