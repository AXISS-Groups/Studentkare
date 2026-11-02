# WebPost — Public site — one post (/blog/:slug, /news/:slug), in its SK template

| | |
|---|---|
| Canvas page | New · Newsroom: News and Blog (2026-10-23, no canvas board) |
| Platform / frame | Web · 1440 and 1024 (public header and footer); 390 inside the same frame |
| Tier | 3 (health tips carry a clinician's review, enforced by the server; no student data) |
| Ticket(s) | Newsroom: News and Blog in SK templates (founder ticket, 2026-10-23); Content module, series, share kit, precision-gated aggregator (founder ticket, 2026-10-23, feat/newsroom-2) |
| Picture | none on the canvas: screenshots at `/home/claude/navy-shots/newsroom2/` and earlier at `/home/claude/navy-shots/newsroom/` (one per template) |
| Design source | none; designed in code (`src/features/newsroom/views/PostPage.tsx`, `PostBody.tsx`, `PostCover.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (41):** `alert-circle`, `alert-triangle`, `align-left`, `align-left-2`, `arrow-left`, `arrow-right`, `arrow-up-right`, `bar-chart`, `book`, `brand-linkedin`, `calendar`, `camera`, `check`, `check-circle`, `clipboard`, `clock`, `copy`, `file-text`, `graduation-cap`, `grid`, `heart-pulse`, `help-circle`, `image-off`, `info`, `mail`, `megaphone`, `message-circle-2`, `message-square-text`, `mic`, `phone-call`, `question-mark`, `repeat`, `rows-split`, `share`, `shield-check`, `sparkles`, `star`, `sun`, `user`, `x-2`, `x-square`
- **3D icon tiles (17):** `bell--p2`, `brain-alt--p3`, `calendar-alt--p4`, `chart-alt--p4`, `chat-alt--p4`, `doc--p4`, `heart--p1`, `home-alt--p4`, `idcard-alt--p4`, `lab-alt--p5`, `search--p4`, `settings-alt--p4`, `shield--p5`, `thermo-alt--p1`, `user--p4`, `vault-alt--p4`, `wellness-alt--p5`
- **Brand mark:** the SK shield on the cover
- **Text symbols to replace with icons:** —

## Layout

1. Back link (`arrow-left`, "All blog posts" / "All news").
2. **Hero cover** in the template (as WebNewsroom): category chip, the h1 title, summary, meta. Its alt text is the author's cover description. The 1200×630 share image (`/api/posts/{section}/{slug}/og.png`) is drawn on our server from the same cover (gradient, rings, shield, label, title, domain).
3. Health tip: `shield-check` "Reviewed by {clinician} on {date}" (only while the approval matches the content).
4. **Body blocks** (each template allows its own set; the server refuses others): heading, paragraph, list, quote (`message-square-text`), callout (`info` information or `alert-triangle` amber "needs attention"; never red), image with alt text (`image-off` when missing), key facts (`clipboard`, `check` per line), button to an app page (`arrow-right`).
5. Health tip footer (template-fixed, not authored): "General information, not advice for you … In an emergency, call 112." with a link to /crisis.
6. Auto posts (content autopilot): a source box, template-fixed: `sparkles` "Summary by StudentKare from {publisher}.", `arrow-up-right`
   "Source: {publisher}" linking the original (new tab, nofollow) with its date, and "A short summary, not medical advice". The tag
   `auto` is in the tags.
7. Tags; "Updated {date}".
8. **Share** (`share`): Copy link (`copy` then `check`), the phone's share sheet (`share`, only where the Web Share API or React
   Native Share exists), LinkedIn (`brand-linkedin`), WhatsApp (`message-circle-2`), X (`x-2`), Facebook and Telegram (the
   network's name: the manifest has no mark for them), email (`mail`). Plain URLs with UTM tags from the settings, no
   third-party script; a share is counted as a number only.
10. **Series line** (`repeat`): "Episode N of {series}" linking to /series/{slug}; the cover takes the series' colour.
11. **Crisis lines** (Mental health, or any category marked so; template-fixed): `phone-call` "If you are struggling, talk to
    someone now", Tele-MANAS 14416 (`tel:`), Emergency 112 (`tel:`), Crisis support link. Danger tokens (a crisis link).
12. **New blocks:** Myth and fact (`x-square` myth on surface-2, `check-circle` fact on positive-bg) and Big figure (value in
    action colour, label). An Event, Explainer or Myth vs fact hero shows its animated icon (`anim-calendar`, `anim-book-open`,
    `anim-message`; still under reduced motion).
9. **Related posts** (same template first, then the section).

## SEO

Link previews: nginx sends LinkedIn, WhatsApp, X, Facebook, Telegram, Slack and Discord crawlers (by user agent) to
`/api/posts/{section}/{slug}/preview.html`, which carries this post's title, summary, canonical address and 1200×630 image as
Open Graph and Twitter tags (people get the app shell as before).


Title, description, canonical, Open Graph and Twitter tags, and JSON-LD (`Article` for health tips and stories, `NewsArticle` for campus news, product updates and press releases) set from the published post. Posts are listed in `/sitemap-posts.xml` (nginx → `/api/posts/sitemap.xml`); RSS and Atom per section.

## States

Loading (hero skeleton) · not published / wrong address (`file-text`, "This post isn't published") · error (`alert-circle`, Try again) · sample note in development builds.

> Verify with `node scripts/icons/check-icons.mjs --screen WebPost`.
