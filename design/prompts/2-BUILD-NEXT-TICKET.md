# Prompt 2 — build the next ticket (repeat until every screen is done)

Use this for all web and mobile screens. Start a **new Claude chat for each ticket** so the context stays clean, then paste everything below the line. To build a specific ticket, replace `NEXT` with its ID, e.g. `SK-081`.

---

Build ticket **NEXT** for Student Kare, web and mobile, without missing a single icon.

**Read first:** `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `design/README.md`.

## 1. Pick the ticket
- Tickets are in `design/backlog/studentkare-full-backlog.csv`.
- If I wrote `NEXT`:
  - run `npm run icons:audit` and read `design/screens/icon-coverage.md`;
  - take the first ticket, in this order (Phase 0 Foundations → 1 Launch → 2 Launch month → 3 Later, then by ID), whose screens are not all passing, and whose "Depends on" tickets are done.
- Tell me the ticket ID, title, tier and screens before you start.
- If it is **Tier 1**, do steps 2–3, then stop and wait for my approval.

## 2. Inventory: before writing any code
For **every screen** in the ticket:
- read `design/screens/briefs/<Screen>.md`;
- look at the picture `design/screens/screenshots/<page>/<Screen>.jpg`;
- read the source `design/screens/source/<page>/<Screen>.html`.

Then write me one table per screen with these columns:

| Element on the screen | Icon / glyph / illustration / image (exact name from the brief) | Component you'll use |
|---|---|---|

- Every name listed in the brief must appear in the table. That covers line icons, 3D tiles, glyphs, the brand mark, illustrations and images.
- Text symbols (✓ → ← ✕ …) get their replacement icon.
- Data-driven graphics (rings, sparklines, charts) get a component name.
- Count them and confirm: "Brief lists N, table has N."
- Also list:
  - the **states** to build: everything in the brief's "States" line, plus loading, empty, error and offline per DESIGN.md §6;
  - the **links** to other screens, and whether each route exists yet;
  - the **components** you'll reuse from `src/design-system` / `src/components`, and any that are missing.

## 3. Plan
Say where the files go. Follow the MVVM module structure: view + viewmodel + data. Phone layouts (390 px frames) and web layouts (1440 px frames) share one viewmodel, and `.web.tsx` / `.native.tsx` only where the layout truly differs. Name the API endpoints, or say "typed placeholder behind the viewmodel".

## 4. Build
- Icons only through `<Icon name="…">`, `<Icon3d>`, `<Glyph>`, `<Illustration>` and `<BrandLogo>`, with the exact brief names.
- Icon sizes and colours follow the picture, and colours come from tokens.
- Icon-only buttons get a `label` and a 44 px hit area. Decorative icons get no label.
- Copy any images or videos the screen needs from `design/assets/` into `src/assets/`, keeping the file name.
- Copy text exactly from the source file.
- Build every state from step 2.
- Add or update viewmodel tests, plus stories for any new design-system component.

## 5. Prove it
For each screen:
1. Add its files to `design/screens/implementation-map.json`.
2. Run `node scripts/icons/check-icons.mjs --screen <Screen>`. It must print ✓. Fix and re-run until it does. Never edit the manifest to make the check pass.
3. Run the app at 390 px and 1440 px and compare it with the picture side by side. List every visible difference and fix it, or explain it.
4. Run `npm run lint`, `npx tsc --noEmit` and `npx vitest run` for touched areas.

## 6. Finish
- Commit on branch `feat/<ticket-id>-<short-name>`. Don't push.
- Then tell me:
  - the ticket, screens and files changed;
  - per screen, icons used vs icons in the brief (e.g. 17/17) and the check-icons output;
  - states built;
  - components added;
  - anything not done or different from the picture, and why;
  - the next ticket that `NEXT` would pick.
