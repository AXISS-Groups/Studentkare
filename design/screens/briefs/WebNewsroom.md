# WebNewsroom — Public site — Blog (/blog) and News (/news) list pages

| | |
|---|---|
| Canvas page | New · Newsroom: News and Blog (2026-10-23, no canvas board). Public site frame of canvas page 3a; covers in the Mobile 2.0 service palette |
| Platform / frame | Web · 1440 and 1024 (public header and footer); 390 inside the same frame |
| Tier | 3 (editorial lists; no clinical value, no student data) |
| Ticket(s) | Newsroom: News and Blog in SK templates (founder ticket, 2026-10-23); Content module, series, share kit, precision-gated aggregator (founder ticket, 2026-10-23, feat/newsroom-2) |
| Picture | none on the canvas: screenshots at `/home/claude/navy-shots/newsroom2/` and earlier of the build at `/home/claude/navy-shots/newsroom/` |
| Design source | none; designed in code (`src/features/newsroom/views/NewsroomListPage.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (38):** `alert-circle`, `align-left`, `align-left-2`, `arrow-up-right`, `bar-chart`, `book`, `brand-linkedin`, `calendar`, `camera`, `check`, `chevron-left`, `chevron-right`, `clipboard`, `clock`, `copy`, `graduation-cap`, `grid`, `heart-pulse`, `help-circle`, `info`, `mail`, `megaphone`, `message-circle-2`, `message-square-text`, `mic`, `question-mark`, `refresh`, `repeat`, `rows-split`, `search`, `share`, `share-nodes`, `shield-check`, `sparkles`, `star`, `sun`, `user`, `x-2`
- **3D icon tiles (17):** `bell--p2`, `brain-alt--p3`, `calendar-alt--p4`, `chart-alt--p4`, `chat-alt--p4`, `doc--p4`, `heart--p1`, `home-alt--p4`, `idcard-alt--p4`, `lab-alt--p5`, `search--p4`, `settings-alt--p4`, `shield--p5`, `thermo-alt--p1`, `user--p4`, `vault-alt--p4`, `wellness-alt--p5` — the covers' art, a template's own set (the author picks one or none)
- **Small glyphs (0):** —
- **Brand mark:** the SK shield on every cover
- **Text symbols to replace with icons:** —

All are in `design/icons/icon-manifest.json`; no icon was added.

## Layout (top to bottom)

1. Public header (compact) with **Blog** and **News** as nav items; the same two links in the footer's StudentKare column.
2. **Hero**: Blog | News tabs (`book`, `megaphone`; each its own address), eyebrow, h1, one line, RSS and Atom feed links (`share-nodes`).
3. **Toolbar**: category filter chips (All + the section's templates: Blog = Health tips, Stories; News = Campus news, What's new, Press releases; each with its template icon) and search (`search`).
4. **Featured** (unfiltered first page only): the newest featured post, or the newest post: cover left, text right (`star` Featured).
5. **Latest / Results** grid (3 · 2 · 1 columns): each card is the template cover (gradient, rings, shield, label, art), category chip, title (the one link), summary, meta (`calendar` date, `clock` reading time, `user` author) and, for a health tip, `shield-check` "Reviewed by …".
6. **Pages**: Newer / Older (`chevron-left`, `chevron-right`), "Page n of m".
7. Footer with the Kare Letter newsletter band.

## The five SK templates (covers)

| Template | Section | Cover gradient (tokens) | Icon | Art set |
|---|---|---|---|---|
| Health tip | Blog | `service-green-deep` to `service-green-shade` | `heart-pulse` | `heart--p1`, `wellness-alt--p5`, `brain-alt--p3`, `thermo-alt--p1` |
| Story / interview | Blog | `service-violet-deep` to `service-violet-shade` | `mic` | `user--p4`, `chat-alt--p4`, `home-alt--p4` |
| Campus news / event | News | `service-amber-deep` to `service-amber-shade` | `graduation-cap` | `calendar-alt--p4`, `home-alt--p4`, `idcard-alt--p4` |
| Product update (What's new) | News | `brand-navy-light` to `brand-navy` | `sparkles` | `bell--p2`, `settings-alt--p4`, `vault-alt--p4` |
| Press release | News | `service-blue-deep` to `brand-navy` | `megaphone` | `doc--p4`, `chat-alt--p4` |

White text sits on the deep end of every gradient (AA across it); the light stop appears only in the decorative rings.

## Content module additions (2026-10-23)

A second filter row: the categories (icon and hue chip each, `aria-pressed`), `?topic=` in the URL. "Series" link next to the
feeds (to /series). Every card has a Share button (`share`, `aria-expanded`) opening the same share set as the post page. Cards
show the category chip (its icon) and "Episode N" for a series episode. Seven new templates add filter chips (`sun`, `repeat`,
`calendar`, `star`, `book`, `question-mark`, `grid`).

## States

Data · featured + grid · filtered (no featured) · loading (skeleton cards) · empty ("No posts yet") · filtered empty ("No posts match", Show all posts) · error (calm copy, Try again, `alert-circle`, `refresh`) · sample chip in development builds only.

## Rules

- Published posts only (`GET /api/posts`); drafts, unpublished and not-yet-due scheduled posts never appear. A health tip appears only while a clinician's approval matches its content.
- No fake posts: production starts empty. Samples (titled "Sample:") exist only in development/test builds.
- Motion: cards lift on hover, cover art floats; both rest under reduced motion.

> Verify with `node scripts/icons/check-icons.mjs --screen WebNewsroom`.
