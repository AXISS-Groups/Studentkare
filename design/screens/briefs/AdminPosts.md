# AdminPosts — Super admin → Posts, and the clinician's Health tip reviews

| | |
|---|---|
| Canvas page | New · Newsroom: News and Blog (2026-10-23, no canvas board). Console frame of canvas page 7 (and the clinician console, page 5) |
| Platform / frame | Web · 1440 and 1024 |
| Tier | 3 (editorial tools); the health tip review gate is enforced by the server |
| Ticket(s) | Newsroom: News and Blog in SK templates (founder ticket, 2026-10-23) |
| Picture | none on the canvas: screenshots at `/home/claude/navy-shots/newsroom/` |
| Design source | none; designed in code (`src/features/newsroom/admin/PostsAdminView.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (32):** `alert-triangle`, `align-left`, `align-left-2`, `arrow-left`, `arrow-up`, `arrow-up-right`, `calendar`, `camera`, `check`, `check-circle`, `chevron-down`, `clipboard`, `eye`, `eye-off`, `file-text`, `graduation-cap`, `heart-pulse`, `info`, `lock`, `megaphone`, `message-square-text`, `mic`, `pencil`, `plus`, `rotate-ccw`, `rows-split`, `search`, `shield-check`, `sparkles`, `stethoscope`, `trash`, `upload`
- **3D icon tiles (13):** `bell--p2`, `brain-alt--p3`, `calendar-alt--p4`, `chat-alt--p4`, `doc--p4`, `heart--p1`, `home-alt--p4`, `idcard-alt--p4`, `settings-alt--p4`, `thermo-alt--p1`, `user--p4`, `vault-alt--p4`, `wellness-alt--p5` (the cover art picker)
- **Brand mark:** the SK shield on the template thumbnails and the preview cover

## Layout

**List** (`admin/posts`, super admin): header with **New post** (`plus`); status tabs (All, Draft, Scheduled, Published, Unpublished); template filter and search (`search`); table (post + path, template, status pill — "Needs clinical review" amber for a health tip without a current approval — updated, Edit `pencil`); "No posts yet" empty row; `alert-triangle` "never written by AI".

**Editor** (two columns; stacked under 1100 px): left form, right sticky **Live preview** (`eye`) drawing the post exactly as WebPost does, in its template.
1. Template picker: five cards with the mini cover and what the template is for; health tip shows `stethoscope` "needs a clinician's approval of exactly this version".
2. Title and address: title, slug (`/blog/…` or `/news/…`, auto from the title until edited), summary, author (team member: staff accounts only), tags, featured.
3. Cover: art picker (the template's 3D tiles, or none), cover alt text (required to publish), `lock` "fonts, colours and layout come from the template".
4. Body: one fieldset per block (icons per type: `align-left` heading, `align-left-2` paragraph, `rows-split` list, `message-square-text` quote, `info` callout, `camera` image, `clipboard` key facts, `arrow-up-right` button), move up / down (`arrow-up`, `chevron-down`), remove (`trash`); add buttons only for the template's blocks (`plus`). Images upload after the draft exists, are checked by their bytes and virus-scanned, then stored.
5. Search and sharing: SEO title (70) and description (160) with counters.
6. Publishing: status pill, on the site or not (`eye` / `eye-off`), review state, what is missing, "publish later" date-time; Publish now (`upload`) / Schedule (`calendar`), Unpublish (`eye-off`), Delete draft (`trash`, never-published drafts only).
7. History (`file-text`): the server's trail (created, edited, review voided, published, scheduled, unpublished, image added, reviewed, approval withdrawn) with who and when.

**Review** (`clinician/post-reviews`, NMC doctors): tabs To review / Reviewed / All; open (`stethoscope`) shows the preview and **Approve this version** (`check-circle`; sends the content hash, a change meanwhile is refused) or **Withdraw approval** (`rotate-ccw`), and the history.

## Rules

- Super admin edits and publishes (there is no separate editor role). Only an `NMC_DOCTOR` approves a health tip; the super admin cannot. An edit after approval voids it and takes the post off the site.
- No AI: nothing writes post text. Never name or describe a student.
- Every action is audited (`care_post_events` and the workflow audit).

> Verify with `node scripts/icons/check-icons.mjs --screen AdminPosts`.
