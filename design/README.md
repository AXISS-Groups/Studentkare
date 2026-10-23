# Student Kare design kit

Everything Claude (or a person) needs to build every canvas screen, web and mobile, without missing an icon. It was generated from the design canvas *StudentKare — Onboarding & Auth Flows* on 16 Oct 2026. Page 9, *StudentKare Mobile 2.0* (13 phone boards, approved by Krishna on 21 Oct 2026), was added from its own canvas; what it replaces is in `screens/mobile-2-supersedes.md`.

## What's here

| Path | What it is |
|---|---|
| `screens/INDEX.md` | All 252 screens by canvas page, with tier, tickets and icon counts. **Start here.** |
| `screens/briefs/<Screen>.md` | One page per screen: every icon, 3D tile, glyph, illustration, image and text symbol it needs, the screens it links to, and its preview states. |
| `screens/screenshots/<page>/<Screen>.jpg` | Picture of each screen (phone 390 px, web 1440 px). |
| `screens/source/<page>/<Screen>.html` | Design source: exact copy, states and logic. Reference only; open it through a local server to click through it. |
| `screens/implementation-map.json` | You fill this in: screen → source files that build it. The icon check reads it. |
| `icons/icon-manifest.json` | Every icon, which screens use it, and the drawing data. |
| `icons/line/` | 308 line and solid icons, 24 px grid, `currentColor`. |
| `icons/3d/` | 27 glossy 3D icon tiles. |
| `icons/glyphs/` | 53 small glyphs and badges (confetti pieces, QR sample, 3D wellness badges, Ayush orb). |
| `icons/gallery.html` | Browse every icon by name; filter by screen. Open it in a browser. |
| `icons/aliases.json` | Optional: merge look-alike variants (`{"lock-3": "lock"}`). |
| `illustrations/` | 39 inline SVG illustrations. |
| `assets/` | 32 images and videos (3D art, splash art, product shots). |
| `brand/studentkare-logo.svg` | The shield logo. |
| `backlog/` | The 147-ticket backlog (spreadsheet + CSV). Ticket IDs in the briefs match it. |
| `prompts/` | The prompts to paste into Claude in VS Code. |

Code that ships with the kit, outside this folder:
- `scripts/icons/build-icons.mjs` writes `src/design-system/icons/generated/skIconData.ts`;
- `scripts/icons/check-icons.mjs` checks a built screen against its brief;
- `src/design-system/icons/` has `<Icon>`, `<Icon3d>`, `<Glyph>`, `<Illustration>` and `<BrandLogo>`, for web and Expo native.

## Screens per page

| Canvas page | Screens |
|---|---|
| 1 · Launch & onboarding | 24 |
| 2 · Student app (mobile) | 62 |
| 3a · Student web — public site | 10 |
| 3b · Student web — signed in | 30 |
| 4 · Campus / hostel admin | 26 |
| 5 · Doctor | 19 |
| 6 · Partner — pharmacy, lab, clinic | 25 |
| 7 · Super admin | 30 |
| 8 · Design system & flow map | 13 |
| 9 · Mobile 2.0 (approved 2026-10-21) | 13 |

## How icon names work
- Names describe the drawing (`bell`, `shield-check`, `stethoscope`). The 27 core icons keep their names from the canvas icon system: `home`, `search`, `calendar`, `doctor`, `stetho`, `lab`, `pill`, `heart`, `shield`, `vault`, `bell`, `chat`, `user`, `ambulance`, `syringe`, `thermo`, `idcard`, `chart`, `cart`, `pin`, `phone`, `video`, `sos`, `doc`, `wellness`, `brain`, `settings`.
- A **numbered name** (`lock-2`, `lock-3`) is a slightly different drawing of the same thing that really appears on some screens. Every one is kept, so nothing goes missing. Merge them deliberately through `aliases.json`.
- **`-alt`** names are the glyph drawn inside the 3D tiles.
- **3D tile names** are `<glyph>--p<palette>`, e.g. `heart--p1` (red), `bell--p2` (amber).

## Text symbols that must become icons

| Symbol | Name | Uses on canvas | Draw with |
|---|---|---|---|
| ✓ | check mark | 121 | `check` |
| → | rightwards arrow | 78 | `arrow-right` |
| ⌘ | place of interest sign | 12 | keep as text (keyboard hint) |
| ✕ | multiplication x | 9 | `x` |
| ← | leftwards arrow | 6 | `arrow-left` |
| 🔒 | lock | 4 | `lock` |
| 🩺 | stethoscope | 3 | `stethoscope` |
| ☀ | black sun with rays | 2 | `sun` |
| 🧪 | test tube | 2 | `flask` |
| 🗂 | card index dividers | 2 | `file` |
| ⬇ | downwards black arrow | 2 | `download` |
| ✗ | ballot x | 2 | `x` |
| ★ | black star | 2 | `star-filled` |
| 🎓 | graduation cap | 2 | `graduation-cap` |
| 🗑 | wastebasket | 2 | `trash` |
| 🌤 | white sun with small cloud | 1 | `sun` |
| 🌙 | crescent moon | 1 | `moon` |
| 📵 | no mobile phones | 1 | `phone-off` |
| 📱 | mobile phone | 1 | `devices` |
| 🩸 | drop of blood | 1 | `droplet` |

## Data-driven graphics to build as components

Rings, timers and sparklines whose shape depends on data. Build them as components; they are not icons.

| Graphic | Screens |
|---|---|
| `chart-jul-aug` | CampusInsights |
| `chart-missing-none` | FlowMap |
| `chart-refreshes` | MyPass |
| `chart-verifyidentity` | VerifyIdentity |
| `chart-refreshes-2` | WebPass |
| `chart-webverify` | WebVerify |
| `chart-medicines-today-ring` | M2Home |
| `chart-order-route` | M2Orders |
| `chart-profile-complete-ring` | M2Profile |
| `chart-test-trend` | M2Trends |
| `chart-steps-week` | M2Steps (new screen, no canvas board) |

## Commands
```
node scripts/icons/build-icons.mjs            # regenerate icon code after any icon change
node scripts/icons/build-icons.mjs --check    # CI: fail if the generated code is stale
node scripts/icons/check-icons.mjs --screen WebHome   # check one screen
node scripts/icons/check-icons.mjs --all      # check every mapped screen, write screens/icon-coverage.md
```

## What the check does and doesn't prove
- **It proves:** every icon, 3D tile, glyph, illustration, image and replacement icon named in a screen's brief is referenced in that screen's files; no raw `<svg>`, `lucide-react` or text symbols are standing in for icons.
- **It doesn't prove:** that each icon is in the right place, at the right size and colour. Compare with the picture for that.
- **Limits of the source data:** icons that appear only in states not shown by default (an error banner, a "done" tick) are still listed, because they were read from the design source, not the picture. Screenshots show the default state only. Pictures use web fonts but not Telugu or Hindi fonts.
