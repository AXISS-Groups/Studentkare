# M2WhatsNew — Mobile 2.0 — What's new (product update posts), from Profile

| | |
|---|---|
| Canvas page | New · Newsroom: News and Blog (2026-10-23, no canvas board); Mobile 2.0 language |
| Platform / frame | Phone · 390 (web phone frame); above phone width in the student web shell's page column |
| Tier | 3 |
| Ticket(s) | Newsroom: News and Blog in SK templates (founder ticket, 2026-10-23) |
| Picture | none on the canvas: screenshots at `/home/claude/navy-shots/newsroom/` |
| Design source | none; designed in code (`src/features/newsroom/views/M2WhatsNewView.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (5):** `alert-circle`, `chevron-right`, `megaphone`, `shield-check`, `sparkles`
- **3D icon tiles (3):** `bell--p2`, `settings-alt--p4`, `vault-alt--p4` (the product update template's art)

## Layout

Header (back, "StudentKare", "What's new"), one line, then the published product update posts as phone cards (navy cover with the template label `sparkles` and its art, title, summary, date and reading time). "All StudentKare news" (`megaphone`, `chevron-right`) opens /news. A card opens the post page.

## States

Data · loading (card skeleton) · empty ("No posts yet", `sparkles`) · error (`alert-circle`, tap to try again).

Reached from: the "What's new" row on `M2Profile` (`sparkles`). Rule L: editorial only; nothing about the student is read or shown.

> Verify with `node scripts/icons/check-icons.mjs --screen M2WhatsNew`.
