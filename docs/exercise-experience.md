# Exercise and movement experience

## Entry points

- Marketplace: **Movement** in desktop navigation, **Exercise & movement** in the
  mobile menu, or **Explore movement** in the page content.
- Student dashboard: **Exercise & Movement** in the sidebar or mobile **More** menu.
- Health overview: **Find your movement** beneath the metric and care-plan cards.
- Wellbeing screen: **Explore exercise & movement**.

## Features

The library has 12 educational guides spanning mobility, strength, balance,
walking, and breathing. Each includes a local SVG pose illustration, instructions,
a technique cue, an adaptation, and a link to its NHS source. The illustrations
are pose references, not clinical assessments or full-motion technique videos.

Search, category/equipment filters, and a saved-items view are available. Three
guided templates demonstrate session pacing, rather than prescribing workouts:
The desk-side reset, A steadier start, and Room to unwind.

The guided player:

- Requires explicit answers to every existing readiness question.
- Reuses `evaluateScreening`; any positive answer blocks the player and routes
  towards care. Completing the check is not medical clearance.
- Uses monotonic elapsed time rather than interval counts.
- Supports start, pause, resume, reset, skip, and manual advancement.
- Pauses when the browser tab becomes hidden; closing it clears the timer.
- Stops at the end of each interval until the user chooses the next move.
- Distinguishes completed intervals from skipped moves in its summary.
- Records session-preview history once, with no claim of verified physical activity.

Saved items, readiness answers, and the latest 20 session summaries stay in React
memory. They survive navigation while the app is open and reset on reload. No
health metrics, records, or medication data drive routine selection. No clinical
sign-off is claimed for the new educational summaries or demo template pacing.

## Interactive metrics and motion

The metric-chart reading selector works with pointer input and arrow keys, with
the selected date/value exposed through `aria-valuetext` and a chart crosshair.
Session previews never modify sample medical readings.

Scroll-reveal enhancement uses a cleaned-up IntersectionObserver. Content remains
readable before an element enters view or if observers are unavailable. Motion
includes short card entrances, hover transitions, illustration entrances, a
running-session halo, and a timer ring. Reduced-motion preferences disable these
effects, including when the preference changes while the page is open.

## Modules

- `src/data/exerciseLibrary.ts`: catalog, source links, filters, templates, readiness gate.
- `src/data/ExerciseStore.tsx`: in-memory saved guides, screening answers, session history.
- `src/lib/exerciseSession.ts`: deterministic timer state transitions.
- `src/screens/wellbeing/ExerciseLibraryScreen.tsx`: exercise discovery and guide dialogs.
- `src/components/health/GuidedExerciseSession.tsx`: session player and timer lifecycle.
- `src/components/health/ExerciseIllustration.tsx`: local pose artwork.
- `src/hooks/useScrollReveal.ts`: shared scroll enhancement.
- `src/theme/exercise.css` and `src/theme/motion.css`: visual system and reduced-motion rules.

## Verification

```sh
npm test
npm run lint
npm run build
```

With the dev server and Playwright/Chromium available:

```sh
node tests/exercise-experience.smoke.mjs
```

`PLAYWRIGHT_MODULE` can point to an existing external `playwright/index.mjs`.
`BASE_URL` selects another local server, and `SCREENSHOT_DIR` enables screenshots
in an existing directory. Browser checks cover discovery, bookmarks, filtering,
readiness blocking, timer/visibility behavior, skipped versus completed intervals,
history, the metric selector, mobile layouts, and reduced motion.
