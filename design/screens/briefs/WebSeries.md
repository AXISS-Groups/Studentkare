# WebSeries — Public site — series (/series and /series/:slug)

| | |
|---|---|
| Canvas page | New · Newsroom: News and Blog (2026-10-23, no canvas board) |
| Platform / frame | Web · 1440 and 1024 (public header and footer); 390 inside the same frame |
| Tier | 3 (editorial lists; no clinical value, no student data) |
| Ticket(s) | Content module, series, share kit, precision-gated aggregator (founder ticket, 2026-10-23, feat/newsroom-2) |
| Picture | none on the canvas: screenshots at `/home/claude/navy-shots/newsroom2/` |
| Design source | none; designed in code (`src/features/newsroom/views/SeriesPages.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (38):** `alert-circle`, `align-left`, `align-left-2`, `arrow-left`, `arrow-up-right`, `bar-chart`, `book`, `brand-linkedin`, `calendar`, `camera`, `check`, `chevron-left`, `chevron-right`, `clipboard`, `clock`, `copy`, `file-text`, `graduation-cap`, `grid`, `heart-pulse`, `help-circle`, `info`, `mail`, `megaphone`, `message-circle-2`, `message-square-text`, `mic`, `question-mark`, `refresh`, `repeat`, `rows-split`, `share`, `shield-check`, `sparkles`, `star`, `sun`, `user`, `x-2`
- **3D icon tiles (17):** `bell--p2`, `brain-alt--p3`, `calendar-alt--p4`, `chart-alt--p4`, `chat-alt--p4`, `doc--p4`, `heart--p1`, `home-alt--p4`, `idcard-alt--p4`, `lab-alt--p5`, `search--p4`, `settings-alt--p4`, `shield--p5`, `thermo-alt--p1`, `user--p4`, `vault-alt--p4`, `wellness-alt--p5` — the covers' art (a template's own set)
- **Small glyphs (0):** —
- **Brand mark:** the SK shield on every cover
- **Text symbols to replace with icons:** —

All are in `design/icons/icon-manifest.json`; no icon was added.

## Layout

**/series:** hero (eyebrow "StudentKare series", h1 "Series", what they are), then a grid of series cards: the cover in the
series' own colour, `repeat` "Series" chip and the category chip, the name (one link), its summary and `file-text` "N episodes".
Only series with a published episode are listed.

**/series/:slug:** back link (`arrow-left` "Series"), the hero cover in the series' colour with chips, the name as h1, the
summary and the episode count, then "Latest episodes" as post cards (each with its own Share button) and pages
(`chevron-left` / `chevron-right`).

## States

Loading (skeleton) · empty ("No series yet", link to the Blog) · not published / wrong address (`file-text`) · error
(`alert-circle`, Try again with `refresh`) · sample chip in development builds.

## Rules

Published episodes only (the server applies the same clinician and publish rules as /blog). Nothing about a reader is read or kept.

> Verify with `node scripts/icons/check-icons.mjs --screen WebSeries`.
