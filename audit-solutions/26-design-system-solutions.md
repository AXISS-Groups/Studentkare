# 26 — Design System, Design Kit & Icon Pipeline: Solutions

Answers [audit/26-design-system-and-icon-pipeline.md](../audit/26-design-system-and-icon-pipeline.md). Owns **TD-43** (proof of done unreachable), **TD-24** (raw hex), **TD-33 / DS-03** (archive size), **DS-04** (icon bundle size) and **DS-05** (Storybook in CI). TD-39 (the CI blocking itself) is solved in [18](18-cicd-deployment-solutions.md), with the ratchet below as its prerequisite for making the gate blocking again.

---

## TD-43 — Make design coverage a ratchet, not a wall

**Problem:** `check-icons.mjs --all` fails unless all 239 screens pass. Only 1 screen is mapped in `design/screens/implementation-map.json`, and that one fails too.

**Approach:** Use the same ratchet pattern as the lint legacy lists:
- a screen enters the map only when it is built to the brief;
- once mapped, it must stay green;
- unmapped screens are reported, not failed.

**Steps**
1. Add a `--mapped` mode to `scripts/icons/check-icons.mjs`. It checks only screens whose map entry is non-empty, and exits non-zero only if one of those fails. `--all` keeps producing the full coverage report.
2. Fix or unmap `WebSecurity`. It is mapped to `src/features/account/views/SignInSecurityView.tsx` and `TwoFactorViewModel.ts`, and is missing 17 icons plus the brand logo. Either add the icons per its brief (Tier 1 screen: identity and security, so it needs a named reviewer), or clear its map entry until it is done.
3. CI: `npm run icons:check && node scripts/icons/check-icons.mjs --mapped` is **blocking**; `--all` runs in the non-blocking `design-coverage` job ([18](18-cicd-deployment-solutions.md)).
4. Add a guard so the map cannot shrink: CI fails if a screen with a non-empty entry on `main` becomes empty, unless the PR has a `design-unmap` label with a reason.
5. Report progress: post the "N/239 screens pass" line from `icon-coverage.md` as a PR comment, or as the job summary (`$GITHUB_STEP_SUMMARY`).

**Verify:**
- CI is green with `WebSecurity` either fixed or unmapped.
- Mapping a new screen with a missing icon fails CI.

**Effort:** S. **Depends on:** none. Unblocks TD-39.

---

## TD-24 — Finish the hex-to-token migration
The ratchet is already in place: `config/hex-colour-legacy.json` (170 files) and the ESLint `noRawHex` rule. Speed it up:
- Write a codemod (`scripts/tokens/hex-to-token.mjs`) that replaces exact hex values matching a token in `design/tokens/studentkare.tokens.json` with `var(--sk-…)` or `skTokens.…`, then removes the file from the legacy list when it reaches 0. Run it per directory; screens need a visual check. Tier 1 screens need a reviewer.
- Leave SVG illustration colours as they are, but move them into `src/design-system/icons/generated` or `illustrations/`, which are excluded by design.
- Then switch the default theme to System (ADR-0005 in [10](10-documentation-solutions.md)). Dark mode is only safe when the legacy list is empty for reachable screens.

**Metric:** the legacy list goes from 170 to 0. Raw hex in TSX goes from 2,040 to under 100 (illustrations only).
**Effort:** M (spread over PRs).

---

## TD-33 / DS-03 — Shrink the design archive in Git
Keep what code reads; move the rest.

| Path | Read by code? | Action |
|---|---|---|
| `design/tokens/*.json`, `design/icons/icon-manifest.json`, `design/icons/{line,3d,glyphs}/`, `design/icons/aliases.json`, `design/illustrations/`, `design/screens/briefs/*.md`, `design/screens/implementation-map.json`, `design/screens/INDEX.md` | yes (build-icons, check-icons, CLAUDE.md workflow) | keep in Git |
| `design/screens/screenshots/**` (`.jpg`), `design/assets/**` (images, video) | humans only | **Git LFS** (`git lfs track "design/**/*.jpg" "design/assets/**" "public/assets/*.mp4"`) |
| `design/screens/source/**` (HTML exports, 272+ files) | humans only | LFS, or an artifact bucket fetched by `scripts/design/fetch-sources.mjs` |
| `design/backlog/*.xlsx/.csv` | no | move to Drive or the issue tracker |

Migrating existing history to LFS (`git lfs migrate import`) rewrites history. Do it only with team agreement. Otherwise track new files in LFS from now on and accept the existing history.
**Verify:** the clone size (`git count-objects -vH`) stops growing with design updates. **Effort:** S (new files) / M (history migration).

---

## DS-04 — Icon bundle size
1. Measure: `npx vite build --mode production` with `rollup-plugin-visualizer`. Check whether `skIconData.ts` (270 KB of source) ends up whole in the main chunk.
2. If it does, change `build-icons.mjs` to emit one module per icon (`generated/icons/<name>.ts`) plus a typed name map, and have `<Icon name>` resolve through `import.meta.glob('./generated/icons/*.ts')`. Only used icons are bundled, and native gets a static map.
3. Add a `size-limit` budget on the student shell chunk ([19](19-scalability-solutions.md)).

**Effort:** S to measure; M if a change is needed.

---

## DS-05 — Storybook in CI
- Add a non-blocking job: `npm run build-storybook`. Upload `storybook-static` as an artifact, or deploy previews.
- Run axe through Storybook test-runner + Playwright for real contrast and target-size checks ([27](27-i18n-accessibility-solutions.md) A11Y-01).
- Fix the three story files that fail `tsc` once `node_modules` is fresh, and include `src/design-system/stories` in the `tsc` run.

**Effort:** S.

---

## Governance
- `CLAUDE.md` rules stay as they are. Add one line: "A screen counts as done when it is mapped **and** `check-icons --mapped` is green in CI."
- Shared Sidebar navigation (noted missing in the team's plan §3.2) should be a design-system component, not per-screen code. Add it before more console screens are built.
