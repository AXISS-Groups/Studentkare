# Prompt 3 — build or fix one screen

Use this for a single screen, for example when a reviewer asks for changes. Replace `<Screen>` with a name from `design/screens/INDEX.md`.

---

Build the **<Screen>** screen for Student Kare, matching the design exactly and without missing any icon.

**Read first:** `CLAUDE.md`, then `design/screens/briefs/<Screen>.md`. Then look at the picture and read the source file named in the brief.

1. **Inventory.** Make a table of every icon, 3D tile, glyph, illustration, image and text symbol in the brief, and how you'll draw each one. Confirm "Brief lists N, table has N". List the states and links.
2. **Tier check.** If the brief says Tier 1, stop after the inventory and plan, and wait for my approval.
3. **Build or fix it.** Use the design-system icon components with exact names, tokens only, every state, and 44 px targets.
4. **Prove it.**
   - Add the files to `design/screens/implementation-map.json`.
   - `node scripts/icons/check-icons.mjs --screen <Screen>` must print ✓.
   - Compare with the picture at the right width (390 px phone, 1440 px web) and fix differences.
5. **Finish with:** files changed, icons N/N, the check-icons output, states built, and any differences with reasons.
