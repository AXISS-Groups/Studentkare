# Prompt: implement a screen

Copy this into Claude in VS Code / Antigravity. Replace the `<…>` parts.

---

Implement the **<ScreenName>** screen for Student Kare.

**Read first:** `AGENTS.md`, then `DESIGN.md`.

**Design reference:**
- Picture: `design/screens/screens/<page-folder>/<ScreenName>.jpg`
- Markup (copy, states, logic): `design/screens/source/<page-folder>/<ScreenName>.html` — reference only; it uses a canvas runtime (`<sc-if>`, `<sc-for>`, `{{ }}`), do not copy it into the app.
- Tier: <1 | 2 | 3> (from `design/screens/INDEX.md`)

**Where it goes:** `<src/features/<module>/…>` — follow the existing MVVM structure (view + viewmodel + data), shared between web and native via react-native-web.

**Rules:**
1. Before writing code, list the existing components you'll reuse and any that are missing. If one is missing, propose it as a design-system component with Storybook stories — don't make a one-off.
2. Colours, type, spacing, radius and motion come only from `src/theme/tokens/generated/skTokens` or `var(--sk-…)`. No hex values.
3. Build every state that appears in the source file: data, loading, empty, error, and offline / first-time where shown.
4. Accessibility: role + label on every control, 44 px hit areas, visible focus, dialogs `aria-modal` with focus trap, reduced motion.
5. Use real API data where the endpoint exists; otherwise a typed placeholder behind the viewmodel — never invented clinical numbers in the view.
6. Tier 1 screen: stop after the plan and wait for approval before writing code.
7. Add or update tests for the viewmodel, and stories for any component you create or change.

**Finish with:** files changed, components used, states covered, what you didn't do, and anything that differs from the picture and why.
