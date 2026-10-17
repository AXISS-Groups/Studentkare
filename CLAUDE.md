# CLAUDE.md — Student Kare

Claude reads this file at the start of every session in this repo.

## Read first, in this order
1. `AGENTS.md`: house rules. These win on safety, privacy and architecture.
2. `DESIGN.md`: tokens, components, screen tiers, definition of done.
3. `design/README.md`: the design kit (screens, icons, assets, scripts).

## Building screens: the non-negotiables
- **The canvas is the source of truth.** For every screen, read `design/screens/briefs/<Screen>.md`, look at `design/screens/screenshots/<page>/<Screen>.jpg`, and read `design/screens/source/<page>/<Screen>.html` for exact copy, states and logic. The source is reference only: never copy its runtime (`<sc-if>`, `<sc-for>`, `{{ }}`) into the app.
- **Every icon in the brief must be in the screen.** Draw icons only with `<Icon>`, `<Icon3d>`, `<Glyph>`, `<Illustration>` and `<BrandLogo>` from `src/design-system/icons`, using the exact names in the brief. No raw `<svg>` in screen code, no `lucide-react` in new screens, no emoji or text arrows (✓ → ← ✕ 🔒 …) standing in for icons. `skTextGlyphIcons` says which icon replaces each symbol.
- **Never invent an icon.** If a design needs one that is not in `design/icons/icon-manifest.json`, stop and say so. Don't substitute a look-alike.
- **Two icons that look alike can be merged** only by adding `"variant": "base"` to `design/icons/aliases.json` in the same PR, never silently.
- **Prove it before saying done:** `node scripts/icons/check-icons.mjs --screen <Screen>` must pass, and the screen's files must be listed in `design/screens/implementation-map.json`.
- **Images and videos** come from `design/assets/` with the same file name. Copy what a screen needs into `src/assets/`. Never hot-link a canvas URL.
- **Colours, type, spacing and radius** come only from tokens (`skTokens` / `var(--sk-…)`). No hex values.
- **Tier 1 screens** (safety, consent, identity, clinical values): plan first, then wait for a named reviewer's approval before writing code.
- **One ticket per branch and PR.** Finish with: files changed, icons used (count vs brief), states covered, check-icons output, anything that differs from the picture and why.
