# M2Home — Mobile 2.0 — Home · For You (service tabs, highlights, today, shop by concern)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1640 |
| Tier | 2 |
| Ticket(s) | SK-034 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Home.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Home.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (40):** `arrow-right`, `ayush-spark`, `book`, `bottle`, `box`, `calendar-2`, `card-lines`, `cart`, `chevron-down`, `doc`, `doc-upload`, `droplet`, `eye`, `first-aid-kit`, `heart-3`, `heart-pulse`, `home`, `home-2`, `lab`, `map-pin-2`, `med-bottle`, `mic`, `moon-2`, `phone`, `pill-3`, `pill-alt`, `plus`, `plus-slash`, `qr-code-2`, `refresh`, `search`, `shield`, `shield-alert`, `shield-check`, `star`, `stetho`, `syringe`, `thermo`, `trend-arrow`, `user-5`
- **3D icon tiles (4):** `brain-alt--p3`, `heart--p1`, `thermo-alt--p1`, `wellness-alt--p5` (the health tip cover art on the blog card)
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** `chart-medicines-today-ring`

## Where it links to

`M2AskAyush`, `M2Consults`, `M2Insights`, `M2Insurance`, `M2Labs`, `M2Medicines`, `M2Orders`, `M2Product`, `M2Profile`, `M2ReportUpload`, `M2Vaccines` · also: SOS (href `#` on the canvas; the app opens the existing SOS flow, SosBeacon); phone call (`tel:`)

## States shown in the design's preview switcher

Service tab: For You · Medicines · Lab tests · Consults · Vaccines · Insurance · Campus; Highlight 1 · 2 · 3 (auto-advances every 4.2 s; dots switch)

Default picture: For You tab, highlight 1 ("Three checks, one visit"). Highlight 2 is the green GENERICS card ("Same medicine, a lower price" → M2Product); highlight 3 the orange "Upload a report from any lab" (→ M2ReportUpload). The source cycles the highlight with a timer; respect reduced motion.

## Tier

Tier 2 (home, like HomeDiscover). Tier 1 parts inside it: the "Medicines today" card (the student's own medicine and dose), the SOS button and the emergency-card tile — build those from reviewed components, not new code.

## Design changes (founder, 2026-10-21)

- Trust strip removed ("Licensed partner pharmacies", "Every Rx checked by a pharmacist", "Price shown before you pay"): AGENTS.md rule 6, no claim without an evidence source. Put a line back only when partner verification records can prove it.
- "Medicines today" stays (founder, 2026-10-21): it is the student's own schedule, read from the clinical endpoints only, never passed into catalogue or commerce queries.
- Highlights 2 and 3 run `service-green-deep` → `service-green-shade` and `service-orange-deep` → `service-orange-shade`; the eyebrow chip is a dark veil and the body line is solid white, so every line is AA across the whole card.
- "Sexual health" tile uses the rose family (`service-rose-soft` + `service-rose-ink`), not red.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `doc-upload` — document with an upload arrow (upload a prescription / report) — at: search row "Upload a prescription" button; highlight 3 card
- `card-lines` — card with text lines, no portrait (emergency card / insurance e-card) — at: On campus: Emergency card tile
- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- `med-bottle` — medicine bottle with a cross — at: Shop by concern: Vitamins
- `tray-open` — open tray / till (price shown before you pay) — at: trust strip: "Price shown before you pay" (the trust strip is gone, so the board no longer draws it)
- `plus-slash` — plus with one diagonal stroke (generics highlight) — at: highlight 2 (GENERICS) card
- `trend-arrow` — trend line with an up-right arrow — at: Shop by concern: Sports injury

## Icon matching notes

Same object as the manifest icon, drawn a little differently on this board:

- `bottle`: skin-care tube/bottle with shoulders; same object as `bottle`
- `calendar-2`: calendar with a short dash; `calendar-2` is the plain calendar
- `heart-3`: plain heart outline
- `pill-alt`: tablet strip drawn as a flat rectangle with a divider; `pill-alt` is the rounded capsule
- `refresh`: two-arc refresh (both arrowheads); `refresh` is a single arc

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Home`.

## Added 2026-10-23: From the StudentKare blog

After Today: "From the StudentKare blog" (See all opens /blog) with the latest `newsroom.home_teasers` (2) published health tips as phone cards: the health tip's green cover (`heart-pulse` label, its art), title, summary, date, reading time and `shield-check` "Reviewed by {clinician}". Loading: a card skeleton; none: "No posts yet" (`book`); failed: tap to try again (`refresh`). Editorial only (Rule L): no health data is mixed in and no post is about a student. Built in `src/features/newsroom/views/M2PostParts.tsx`.
