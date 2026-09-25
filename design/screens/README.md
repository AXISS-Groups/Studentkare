# Student Kare — screens for implementation

This pack turns the design canvas into something Claude (in VS Code, Antigravity or Claude Code) can build from, screen by screen, inside the real repo.

## What's inside

| Path | What it is |
|---|---|
| `INDEX.md` | Every screen: page, what it is, phone/web, size, tier. Start here. |
| `screens/<page>/<Screen>.jpg` | A picture of each screen — the **visual reference**. |
| `source/<Screen>.html` | The design markup — exact copy, spacing, states and interaction logic. **Reference only**: it uses the canvas runtime (`<sc-if>`, `<sc-for>`, `{{ … }}`), so never copy it into the app as-is. |
| `screens.json` | The same index as data (for scripts or agents). |
| `DESIGN.md` | Design rules: tokens, components, screen tiers, definition of done, AI-agent rules. |
| `studentkare.tokens.json` | Design tokens (colour, type, space, radius, motion). |

Pictures were rendered without web fonts and without some uploaded 3D images, so fonts and a few illustrations look different from the canvas. Layout, copy and states are exact.

## Set-up (once)

1. Apply `studentkare-design-system-foundations.patch` in the repo (adds `DESIGN.md` + tokens).
2. Copy this folder into the repo as `design/screens/` (add `design/screens/source/` to your review, not to the app build).
3. Open the repo in VS Code or Antigravity with Claude. Claude reads `AGENTS.md` → `DESIGN.md` automatically when you point it there.

## How to build a screen

Use the prompt in `prompts/IMPLEMENT_SCREEN.md`. One screen (or one small flow) per task, one pull request per task.

**Order that works:**
1. **Components first** (DESIGN.md §4): Button, inputs, card, note, sheet/dialog, empty/loading/error states, sidebar. Everything after this gets faster.
2. **Tier 2 core flows**: sign-in → home → search → lab booking → checkout → order tracking.
3. **Tier 1 safety screens**: only after the design owner confirms the picture is final; each needs a named reviewer.
4. **Tier 3 screens**: let Claude compose them from components; review in the browser.

## Review checklist (paste into the PR)

- [ ] Matches the picture in `screens/` (layout, copy, hierarchy)
- [ ] Tokens and components only — no hex values, no new one-off styles
- [ ] All states from the source file: data, loading, empty, error, offline/first-time where relevant
- [ ] 44 px touch targets, labels on controls, focus visible, reduced motion
- [ ] Phone (390 px) and web (1440 px) both checked in the browser
- [ ] Tier 1? Named reviewer approved

## About Figma

Figma is optional here. The current Figma account is a **Starter plan with a View seat**, which can't create or edit files through the Figma connection, so the screens couldn't be pushed there. If the team wants Figma for the design system, a Professional plan with a Full (or Dev) seat is needed; then only the design system and the Tier 1/2 flows need to live in Figma — not all ~240 screens.
