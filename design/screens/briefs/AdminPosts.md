# AdminPosts — Super admin → Content (News, Blog, series, autopilot), and the clinician's health post reviews

| | |
|---|---|
| Canvas page | New · Newsroom: News and Blog (2026-10-23, no canvas board). Console frame of canvas page 7 (and the clinician console, page 5) |
| Platform / frame | Web · 1440 and 1024 |
| Tier | 3 (editorial tools); the health tip review gate is enforced by the server |
| Ticket(s) | Newsroom: News and Blog in SK templates (founder ticket, 2026-10-23); Content autopilot (founder ticket, 2026-10-23); Content module, series, share kit, precision-gated aggregator (founder ticket, 2026-10-23, feat/newsroom-2) |
| Picture | none on the canvas: screenshots at `/home/claude/navy-shots/newsroom2/` and earlier at `/home/claude/navy-shots/newsroom/` and `/home/claude/navy-shots/autopilot/` |
| Design source | none; designed in code (`src/features/newsroom/admin/PostsAdminView.tsx`, `AutopilotView.tsx`) |

## Icons this screen must show (all of them)

- **Line / solid icons (62):** `activity`, `alert-circle`, `alert-triangle`, `align-left`, `align-left-2`, `arrow-left`, `arrow-up`, `arrow-up-right`, `bar-chart`, `book`, `brand-linkedin`, `calendar`, `camera`, `check`, `check-circle`, `chevron-down`, `clipboard`, `clock`, `copy`, `download`, `eye`, `eye-off`, `file-text`, `filter`, `graduation-cap`, `grid`, `heart-pulse`, `help-circle`, `inbox`, `info`, `lock`, `mail`, `megaphone`, `message-circle-2`, `message-square-text`, `mic`, `monitor`, `pause`, `pencil`, `phone`, `phone-call`, `play`, `plus`, `question-mark`, `refresh`, `repeat`, `rotate-ccw`, `rows-split`, `search`, `settings`, `share`, `shield-alert`, `shield-check`, `sparkles`, `star`, `stethoscope`, `sun`, `trash`, `upload`, `wifi-off`, `x-2`, `zap`
- **3D icon tiles (17):** `bell--p2`, `brain-alt--p3`, `calendar-alt--p4`, `chart-alt--p4`, `chat-alt--p4`, `doc--p4`, `heart--p1`, `home-alt--p4`, `idcard-alt--p4`, `lab-alt--p5`, `search--p4`, `settings-alt--p4`, `shield--p5`, `thermo-alt--p1`, `user--p4`, `vault-alt--p4`, `wellness-alt--p5` (the cover art picker)
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

**Autopilot tab** (`admin/posts`, super admin; tabs Posts `file-text` | Autopilot `zap` above the list):
toolbar Run now (`refresh`, through the scheduler), Check sources (`activity`, reads feeds, posts nothing), Stop the autopilot
(`shield-alert`, danger: reason required, optionally take every live and scheduled auto post down) or Restart (`play`).
Notes: kill switch on (`shield-alert`, amber); development build, everything is a sample (`info`).
1. **News** card (`zap`): On/Off pill and Turn on/off (`play` / `pause`); "Up to N a day … window (IST)" (`clock`); auto-publish,
   posts a day, window start/end, each with Change (`pencil`); today's count and new items waiting.
2. **Blog** card (`calendar`): On/Off; posts a week, days, hour (`clock`); amber `stethoscope` note "Health tips always wait for a
   clinician's approval"; auto-publish (stories only), topic plan; next slots (`calendar`).
3. **Change a setting** (`settings`): the value and a reason (kept in the settings history); every switch above is a settings-registry
   value written through `PATCH /ops/settings/{key}`.
4. **Writing** (`sparkles`): model in use or not (AI kill switch respected), and `shield-check` "never invents facts, numbers, quotes or
   names; never medical advice".
5. **Sources** table: publisher and feed address, Feed verified / To verify, reading on/off, health (`check-circle` working, `wifi-off`
   failing with the error class and count, `activity` not checked), last checked; Read it / Stop reading (`play` / `pause`). `lock` "only
   these official publishers".
6. **Queue** (`inbox`): drafts waiting for an editor (Publish `upload`) or a clinician (amber), and scheduled posts (Unpublish `eye-off`).
7. **Log** (`file-text`): what was posted, skipped or failed and why, with how it was written; Unpublish (`eye-off`), Open (`arrow-up-right`).
Every auto post is tagged Auto in the list (template · Auto) and its history shows "Drafted / Published / Scheduled by the autopilot".

**Content module (2026-10-23, feat/newsroom-2).** The nav item is **Content**; tabs (`role=tab`) above the page:
All posts `file-text` · Review `inbox` · Series `repeat` · Categories `filter` · Sources `activity` · Autopilot `zap` ·
Share kit `share` · Analytics `bar-chart`.
1. **All posts:** every post, typed or Auto. Filters: status tabs, type, category, series, source, Typed / Auto, search. Row actions:
   Edit (`pencil`), Unpublish (`eye-off`, one click, live or scheduled only), Share kit (`share`). The row's second line names the
   path, category, "Episode N of {series}" and the source.
2. **Review:** auto drafts held for the super admin (not precise enough, or auto-publish off) and posts waiting for a clinician.
   Each card: pill (Not precise enough / Waiting for a clinician / Waiting for you), the **precision report** (score vs threshold,
   source checks, and every sentence with `check-circle` or amber `alert-triangle` and the reasons: not in the source, a new
   number or date, a new name, medical advice, a claim the source does not make), Open and edit (`pencil`), Publish as it is
   (`upload`, not for a post a clinician must approve), Unpublish (`eye-off`).
3. **Series:** table (swatch, `repeat`, name, path, category, schedule: Monday Motivation / Health series / by hand, episodes,
   status) with Edit / Archive / Bring back; the form: name, category, template, cover colour, summary, and for Monday Motivation
   the **library** (`sun`): the team's own words, or a quote with who said it, an https public-domain source and the
   public-domain box (the server refuses a quote without all three). `stethoscope` note: health episodes need a clinician.
4. **Categories:** table (swatch, icon, name, id, rules: Clinician / Crisis lines, hashtags, posts, status) with Edit / Archive /
   Bring back; the form: name, colour (service-palette hue), icon (a radio grid of the allow-listed manifest icons), hashtags,
   aggregator keywords, series topics, "health advice" and "crisis lines" boxes. Mental health is protected (`lock`).
5. **Sources:** the autopilot's sources table and Check sources (`activity`).
6. **Autopilot:** as before, plus the series cards (`sun` Monday Motivation, `repeat` Health series: on/off, days, hour, rota,
   library size, next slots) and the **Precision gate** card (`shield-check`: threshold, "Health posts need a clinician" switch,
   feed interval; `phone-call` "Mental health posts always carry Tele-MANAS 14416 and 112").
7. **Share kit:** pick a post; LinkedIn caption (`brand-linkedin`) with Copy (`copy`); share links (`brand-linkedin`,
   `message-circle-2`, `x-2`, Facebook and Telegram by name, `mail`), `lock` "plain links with UTM tags"; share cards
   (`download`): 1200×630 and 1080×1350 with Download links.
8. **Analytics:** views, shares and shares by network per post (`lock` counts only, no reader kept).

**Composer additions:** category and series pickers (`phone-call` crisis-lines note, `stethoscope` clinician note); **Writing
help** card (`check-circle`): words vs the template's guide, accessibility checks (cover alt, image alt, headings, link labels,
summary) each `check-circle` or `alert-triangle`, and an amber duplicate-topic note listing similar recent posts; the precision
report on an auto post; "Publish later ({zone})" read in the platform's time zone (IST); preview as Desktop (`monitor`), Phone
(`phone`) or LinkedIn card (`brand-linkedin`); Share kit button. Seven new templates in the picker (Motivation `sun`, Series
episode `repeat`, Event `calendar`, Campus spotlight `star`, Explainer `book`, Myth vs fact `question-mark`, Quick card `grid`) and
two new blocks (Myth and fact `help-circle`, Big figure `bar-chart`).

## Rules

- Super admin edits and publishes (there is no separate editor role). Only an `NMC_DOCTOR` approves a health tip; the super admin cannot. An edit after approval voids it and takes the post off the site.
- Posts typed here are never written by AI. Autopilot posts are `origin=AUTO`, tagged Auto, name and link their source, and are
  written only from it (or from approved knowledge); a health tip still needs a clinician. Never name or describe a student.
- Every action is audited (`care_post_events` and the workflow audit).

> Verify with `node scripts/icons/check-icons.mjs --screen AdminPosts`.
