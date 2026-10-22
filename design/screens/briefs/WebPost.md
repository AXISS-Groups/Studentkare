# WebPost — Public site — one post (/blog/:slug, /news/:slug), in its SK template

| | |
|---|---|
| Canvas page | New · Newsroom: News and Blog (2026-10-23, no canvas board) |
| Platform / frame | Web · 1440 and 1024 (public header and footer); 390 inside the same frame |
| Tier | 3 (health tips carry a clinician's review, enforced by the server; no student data) |
| Ticket(s) | Newsroom: News and Blog in SK templates (founder ticket, 2026-10-23) |
| Picture | none on the canvas: screenshots at `/home/claude/navy-shots/newsroom/` (one per template) |
| Design source | none; designed in code (`src/features/newsroom/views/PostPage.tsx`, `PostBody.tsx`, `PostCover.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (25):** `alert-circle`, `alert-triangle`, `arrow-left`, `arrow-right`, `brand-linkedin`, `calendar`, `check`, `clipboard`, `clock`, `copy`, `file-text`, `graduation-cap`, `heart-pulse`, `image-off`, `info`, `megaphone`, `message-circle-2`, `message-square-text`, `mic`, `share`, `shield-check`, `sparkles`, `star`, `user`, `x-2`
- **3D icon tiles (13):** `bell--p2`, `brain-alt--p3`, `calendar-alt--p4`, `chat-alt--p4`, `doc--p4`, `heart--p1`, `home-alt--p4`, `idcard-alt--p4`, `settings-alt--p4`, `thermo-alt--p1`, `user--p4`, `vault-alt--p4`, `wellness-alt--p5`
- **Brand mark:** the SK shield on the cover
- **Text symbols to replace with icons:** —

## Layout

1. Back link (`arrow-left`, "All blog posts" / "All news").
2. **Hero cover** in the template (as WebNewsroom): category chip, the h1 title, summary, meta. Its alt text is the author's cover description. The 1200×630 share image (`/api/posts/{section}/{slug}/og.png`) is drawn on our server from the same cover (gradient, rings, shield, label, title, domain).
3. Health tip: `shield-check` "Reviewed by {clinician} on {date}" (only while the approval matches the content).
4. **Body blocks** (each template allows its own set; the server refuses others): heading, paragraph, list, quote (`message-square-text`), callout (`info` information or `alert-triangle` amber "needs attention"; never red), image with alt text (`image-off` when missing), key facts (`clipboard`, `check` per line), button to an app page (`arrow-right`).
5. Health tip footer (template-fixed, not authored): "General information, not advice for you … In an emergency, call 112." with a link to /crisis.
6. Tags; "Updated {date}".
7. **Share** (`share`): Copy link (`copy` then `check`), WhatsApp (`message-circle-2`), LinkedIn (`brand-linkedin`), X (`x-2`) — plain URLs, no third-party script.
8. **Related posts** (same template first, then the section).

## SEO

Title, description, canonical, Open Graph and Twitter tags, and JSON-LD (`Article` for health tips and stories, `NewsArticle` for campus news, product updates and press releases) set from the published post. Posts are listed in `/sitemap-posts.xml` (nginx → `/api/posts/sitemap.xml`); RSS and Atom per section.

## States

Loading (hero skeleton) · not published / wrong address (`file-text`, "This post isn't published") · error (`alert-circle`, Try again) · sample note in development builds.

> Verify with `node scripts/icons/check-icons.mjs --screen WebPost`.
