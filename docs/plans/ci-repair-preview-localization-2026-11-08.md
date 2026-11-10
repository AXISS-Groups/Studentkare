# CI repair: preview localization approval

The user confirmed approval from **Tejas Krishna** in this task on **2026-11-08** for version 1.1 of the two-page CI repair proposal.

The approved change extracts existing user-facing preview text into typed English, Telugu and Hindi catalogues using the existing `useT()` / `t(key)` interface. The audited lint scope is 398 occurrences across 38 files in `src/features/redesignPreview`; 19 files reference Tier 1 in source comments.

Reuse existing components, design tokens, icons, styles, fixtures and stories. Preserve rendered English wording, interpolation, safety/consent statements, clinical values, navigation and layout. Previews stay static and unwired. Keep the literal-copy ratchet and exemption lists intact.

This records the named approval required by `CLAUDE.md:18` and `DESIGN.md:174`. It does not assert clinical/legal or language release sign-off. Telugu and Hindi retain their existing `unreviewed` status; medical and consent translations require review before release.

Validate catalogue keys and placeholders, compare the English render before and after, inspect representative Storybook previews at phone and desktop widths in all three languages, then run lint, types, tests, builds and required PR CI. Deliver one CI repair PR targeting `development`, separate from Rule L PR #303.
