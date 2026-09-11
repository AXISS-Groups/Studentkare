# Application-wide interface system

## Coverage

The shared visual and motion layer is mounted inside `ThemeProvider`, so both the
active `App.tsx` and the additional `AppNavigator.tsx` use the same foundation.

- Login and all six signup steps use `AuthLayout`: responsive story/form columns,
  a shared step indicator, lighter cards, and step transitions.
- Student-dashboard modules use `PageTransition` and updated shell styling.
- Super-admin sections use a shared console introduction, navigation treatment,
  card/metric styling, and responsive table/form layouts.
- The vendor dashboard shares the console system with a mint accent.
- Reusable `Card`, `Button`, `Input`, and `Modal` components carry consistent
  styling and motion into the other clinical, claims, records, and campus screens.
- The secondary navigator uses a height-preserving page-transition wrapper for
  its desktop and mobile screen containers.

This is a shared-system rollout, not a rewrite of the application's business logic.

## Motion and accessibility

`InterfaceProvider` combines the operating system's motion preference with an
optional user preference. The **Display settings** menu is available on every
top-level page. Its **Reduce interface motion** control:

- Disables decorative CSS animations and transitions across the application,
  including earlier inline animation styles.
- Applies to new and existing pages, cards, diagrams, and modal surfaces.
- Uses `animationType="none"` for the shared React Native Web modal.
- Remembers the user preference under `sa-care-reduced-motion` in local storage.
- Continues working in memory when browser storage is unavailable.
- Always respects the device's reduced-motion preference.

Page changes use a short opacity transition to avoid creating transformed
containing blocks for fixed-position overlays. Interactive controls have shared
focus-visible treatment. Inputs expose errors through accessible descriptions;
buttons retain their accessible labels while busy.

The shared loading overlay is now an indeterminate, state-driven surface. It
displays only while its caller is loading and no longer simulates a five-second
percentage countdown.

## Authentication presentation

The login/signup screens retain their existing API calls and callback contracts.
Browser tests stub authentication responses rather than sending codes or creating
real accounts. Delivery/registration failures are shown consistently above the
form, with existing retry actions. Sample student-account controls remain
available in a collapsible demo section on login.

## Local workspace previews

The **Demo workspaces** menu is enabled only when `import.meta.env.DEV` is true.
It links existing student, super-admin, vendor, login, and signup views for local
design review. It does not write authentication tokens, grant roles, modify
backend authorization, or assert that a user is signed in. Operational service
actions retain their existing authorization requirements.

Production pages retain **Display settings** but do not render this preview menu.

## Files

- `src/theme/InterfaceProvider.tsx`: system/user preference and global scope.
- `src/theme/interface.css`: shared controls, auth layouts, console styles,
  responsive behavior, and app-wide reduced-motion rules.
- `src/components/interface/InterfaceBar.tsx`: display settings and dev-only previews.
- `src/components/interface/AuthLayout.tsx`: common authentication frame.
- `src/components/interface/ConsoleIntro.tsx`: shared enterprise introductions.
- `src/components/interface/PageTransition.tsx`: page and module transitions.

## Verification

```sh
npm test
npm run lint
npm run build
node tests/interface.smoke.mjs
```

The browser check needs a running local dev server and Playwright/Chromium.
`PLAYWRIGHT_MODULE` can point at an existing `playwright/index.mjs` installation.
`SCREENSHOT_DIR` saves screenshots into an existing directory. `BASE_URL` selects
the dev server; optional `PRODUCTION_URL` verifies that workspace previews are
absent from an actual production preview.

Covered journeys include login modes, all signup steps, mocked OTP and registration
failures/retries, all eight super-admin tabs, vendor layout, existing student tabs,
mobile overflow, motion persistence, device preferences, and blocked-storage
fallback. Earlier marketplace, exercise, and health/insurance smoke checks remain
available as regression checks.
