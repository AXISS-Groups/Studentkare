# Build rules for every ticket (read before writing code)

These are the rules every StudentKare build ticket follows, human or agent. They sit on top of
`CLAUDE.md`, `AGENTS.md` and `DESIGN.md`, which win on any conflict.

## Before code
1. Read `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `design/README.md`.
2. For every screen: its brief `design/screens/briefs/<Screen>.md`, its picture
   `design/screens/screenshots/<page>/<Screen>.jpg`, its source `design/screens/source/<page>/<Screen>.html`
   (reference only: never copy `<sc-if>`, `<sc-for>`, `{{ }}`). Mobile 2.0 screens live in `10-mobile-2`
   and `design/screens/mobile-2-supersedes.md` maps them to old boards, tokens and backends.
3. Read the existing code you will extend and match its patterns: routers `backend/services/*.py`, models
   `backend/core/workflow_models.py`, migrations `backend/alembic/versions/`, Rule L planes
   `backend/core/rule_l.py`, API client `src/data/services/http.ts`, view models in `src/features/*`,
   shared UI in `src/design-system/` (Mobile 2.0 pieces in `src/design-system/m2/`).

## Non-negotiables
- No hard-coding: copy in i18n (en/te/hi; te/hi may be drafts), values in the settings registry
  (`backend/core/settings_registry.py` → `npm run settings:build`), colours/type/spacing from tokens only.
- Icons only via `<Icon>`, `<Icon3d>`, `<Glyph>`, `<Illustration>`, `<BrandLogo>` with the brief's exact names.
  Missing from `design/icons/icon-manifest.json` → stop and say so.
- Honesty: real data from real APIs. No backend → an honest "not available yet" (or leave it out). Never
  fake rows, names, prices, ratings, counts, timelines or claims. Prices come from the billing catalogue /
  registry (Student Plus ₹149/month, 3-month ₹2,199, Premium from ₹499; doctors' commission is NOT set).
- Red (`danger*`) only for SOS, safety and clinical alerts (critical values, allergies, deletion, failed
  verification). Out-of-range lab values are amber (`attention`), never red.
- Rule L commerce firewall: no health data on shop screens (only "Medicines today" dose counts on Home).
- Tier 1 screens (safety, consent, identity, clinical values) need an approved plan in `docs/plans/`.
  Approved so far: every `tier1-canvas-wp*.md`, `tier1-ayush-container-2026-10-20.md`,
  `tier1-mobile2-health-2026-10-21.md`, `tier1-care-directory-2026-10-21.md`. Anything a plan routes to the clinical lead, legal or the
  AI-constitution owner stays unavailable until they sign.
- Keep every existing feature reachable (SOS, emergency card, check-in pass, crisis lines 112 / Tele-MANAS 14416).
- Motion respects reduced motion and stops off-screen/unmounted.
- Accessibility: roles, labels, 44 px targets, keyboard and screen reader; axe-clean tests.

## Database
- Alembic only. Find the single head first (`cd backend && alembic -c config/alembic.ini heads`) and branch
  from it. Every new table gets a Rule L plane. Commerce code never reads clinical tables.

## Parallel branches
Several branches are built at once, and most tickets add to the same registries. They are kept
one entry per line and sorted, so two branches adding different entries touch different lines:
- Routes: `src/lib/utils/routes/routePaths.ts`, `publicRoutes.ts`, and the role gate in `routeRoles.ts`
  (only for a route not open to every signed-in role). i18n: a new area is one line in each of
  `src/i18n/areas{En,Hi,Te}.ts`; no key may live in two areas.
- Lists between `// keep-sorted start` and `// keep-sorted end` (nav sets, phone boards, native param
  list, …): add your line in sorted order. Order-sensitive lists (switch cases, `Stack.Screen`, sidebar
  links) are one entry per line too; add yours where it belongs.
- Don't reformat these lists or put two entries on one line.

Before the PR:
1. `git fetch origin && git rebase origin/main` (or merge `origin/main` into your branch).
2. On a conflict: `npm run merge:resolve`. It resolves the implementation map, the `config/*legacy*.json`
   lists (shrink-only), generated files (settings, tokens, icons, `icon-coverage.md`) and one-line list
   hunks, re-sorts every list, and stages what it fixed. Whatever it prints as "Not resolved" is a real
   conflict: fix it by hand, `git add` it, run `npm run merge:resolve` again, then continue
   (`git rebase --continue` / `git commit`).
3. Run the checks under "Done means". The union merge driver (`.gitattributes`) can bring back a line one
   branch deleted next to a line the other added: look over deletions.

## Done means
- `node scripts/icons/check-icons.mjs --screen <Screen>` passes for each screen, and its files are listed under
  `screens` in `design/screens/implementation-map.json` (moved out of `inProgress`).
- Checks: `npx tsc --noEmit`, `npx tsc --noEmit -p config/tsconfig.native.json`, `npm run lint`,
  `npm run lint:ratchet`, `npm run lint:css-colours`, `npm run tokens:check`, `npm run settings:check`,
  `npm run icons:check`, `npm run icons:ratchet`, `npx vitest run`; backend changes also
  `cd backend && python -m pytest tests/ -q -p no:cacheprovider` (6 known failures in
  `tests/test_campus_departure.py` only) and `ruff check .`.
- Screenshots light + dark (390 px for phone screens, 1440 and 1024 for web) — look at them and fix overlaps.
- One ticket per branch and PR. PR body: files changed, icons used vs brief, states covered, check-icons
  output, what differs from the picture and why, anything shown "not available yet".
