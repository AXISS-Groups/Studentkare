# Prompt 1 — one-time set-up (run once, before any screen)

Paste everything below the line into Claude in VS Code, with the repo open.

---

Set up the Student Kare design kit in this repo so every screen can be built from it. Don't build any screens yet.

**Read first:** `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `design/README.md`.

**Do these steps in order and report after each one:**

1. **Check the foundations.** Confirm `DESIGN.md`, `design/tokens/studentkare.tokens.json` and `src/theme/tokens/generated/` exist. If not, tell me. The design-system foundations patch needs applying first, so stop there.
2. **Generate the icon code.** Run `node scripts/icons/build-icons.mjs`. Confirm `src/design-system/icons/generated/skIconData.ts` exists and reports 308 icons, 27 3D tiles, 53 glyphs and 39 illustrations.
3. **Add npm scripts** to `package.json`:
   - `"icons:build": "node scripts/icons/build-icons.mjs"`
   - `"icons:check": "node scripts/icons/build-icons.mjs --check"`
   - `"icons:audit": "node scripts/icons/check-icons.mjs --all"`
   - add `npm run icons:check` to `audit:all`.
4. **Native icons.** The app also runs on Expo, so run `npx expo install react-native-svg`. Confirm Metro picks `Icon.native.tsx` and Vite picks `Icon.tsx`.
5. **Lint guard.** Add an ESLint rule (no-restricted-syntax or a small custom rule) that fails when files under `src/modules/**/view/**` or `src/screens/**` contain a JSX `<svg>` element or import `lucide-react`. Existing files may be allow-listed with a TODO; new files may not.
6. **Tests.** Add `src/design-system/icons/__tests__/icons.test.tsx` (vitest). It should:
   - render every name in `skIcons` and assert an `<svg>` with a 24×24 viewBox and at least one child;
   - render every `skIcons3d`, `skGlyphs` and `skIllustrations` entry;
   - assert an unknown name renders nothing;
   - assert that `label` sets `role="img"` and `aria-label`, and that no label sets `aria-hidden`.
7. **Icon gallery page.** Add a dev-only route `/dev/icons` (not in production builds) that shows every icon by name with a search box, using `<Icon>`, `<Icon3d>`, `<Glyph>` and `<Illustration>`. It must match `design/icons/gallery.html`. Add Storybook stories too if Storybook is set up.
8. **CI.** Make CI run `npm run icons:check` and `npm run icons:audit`. The audit should only fail for screens listed in `design/screens/implementation-map.json`.
9. **Commit** on branch `chore/design-kit` with a clear message. Don't push.

**Finish with:** what you changed, test results, the output of `npm run icons:audit` (it should say 0 / 239 screens built, which is expected), and anything that didn't work.
