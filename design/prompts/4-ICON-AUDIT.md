# Prompt 4 — icon audit (run after every few tickets, and before launch)

---

Audit every built Student Kare screen for missing or wrong icons, and fix what you find.

1. Run `npm run icons:audit` and read `design/screens/icon-coverage.md`.
2. For every screen marked **gaps**, fix it so the check passes: add missing icons, replace raw `<svg>`, `lucide-react` or text symbols. Work through each screen with the steps in `design/prompts/3-BUILD-ONE-SCREEN.md`.
3. For every passing screen, spot-check 10 at random against their pictures in `design/screens/screenshots/`:
   - the right icon in the right place;
   - the right size (±2 px) and colour token;
   - 3D tiles where the design has 3D, flat where it has flat.
   List any mismatch.
4. Search the codebase for icons drawn outside the design system:
   - `<svg` in `src/modules` / `src/screens`;
   - `from 'lucide-react'`;
   - the symbols ✓ → ← ✕ ✗ 🔒 ★ in JSX text.
   List each file and whether it is a built canvas screen or older code.
5. Re-run `npm run icons:audit`.
6. Report: screens passing before vs after, every fix, and anything left with a reason.
