# 29 — Mobile (Expo / React Native) & Offline Behaviour

**New dimension, created 2026-10-17** (`main` @ `ad01230`).

## Why this needs its own report
The original audit treated mobile only in passing. It noted that native code was excluded from `tsc` and that there was no mobile documentation. Since the baseline:
- `src/native/` has become a signed-in student app of about 1.8K LOC: session handling, home, record capture, medicine reminders, camp and preventive screens, and hardware wrappers for camera and notifications.
- Permissions were reworked: Face ID and biometrics were dropped, camera and notifications are each tied to a real feature, and the microphone permission was kept for planned calls.
- A web service worker (`public/sw.js`) now provides an offline shell.
- The check-in pass works through weak signal using a server-signed window held in memory.

Platform-specific code, offline behaviour and app-store constraints carry their own risks.

## Current state (verified)

| Area | Evidence | Assessment |
|---|---|---|
| Entry | `package.json` `"main": "src/native/index.ts"`; `npm run start:native*` | — |
| Session | `src/native/session.tsx`: signed in only on a well-formed `/auth/session` answer; network failure, timeout, malformed answer or 401 → signed out; "Nothing is cached on the device, so offline means signed out." | Good. Meets guardrails 1–2. |
| API base | `EXPO_PUBLIC_API_BASE_URL`, HTTPS required except loopback in dev, no silent fallback (`src/native/README.md`) | Good |
| Shared code | Native screens use `@/data/services/http`, `useT()`, `<Icon>` from the shared design system (12 usages in `src/native`) | Good reuse |
| Type-check | `tsconfig.json` excludes `src/native/**`; `config/tsconfig.native.json` exists but CI does not run it | Gap — TD-45 |
| Tests | `src/native/__tests__/{homeDestinations,nativeSafeImports,osPermissions,session}` run under Vitest/jsdom with RN aliased to RN-web | Logic covered; no device or Expo test |
| Device verification | Team's plan: notifications and camera flows "Neither has been run on a device" | NOT VERIFIED |
| Web offline | `public/sw.js` (53 lines): caches the app shell only, never `/api/*` or private data; registered in `src/main.tsx:36` | Good. Matches guardrail 9. |
| Pass offline | `services/check_in_pass.py`: server pre-signs 10 minutes of 30 s steps; app keeps them in memory only | Good design |
| Push | No device-token endpoint, so no server push (team plan) | Not implemented; reminders are local only |

## Findings

### Finding: MOB-01 — Native app not type-checked in CI
**TD-45** (authoritative). Medium.

### Finding: MOB-02 — Unused microphone permission
- **Severity:** Low
- **Status:** OPEN (decision recorded by the team, 2026-10-13)
- **Location:** `config/mobile/app.json` / `app.json` (`RECORD_AUDIO`, `NSMicrophoneUsageDescription`)
- **Evidence:** Kept for planned consult calls, which have no media service yet (`docs/remediation-plan-2026-10-09.md`, "Still open").
- **Impact:** App-store review may reject an unused permission.
- **Recommendation:** Remove the permission before submission unless calls ship first.

### Finding: MOB-03 — No device/E2E verification of native flows
- **Severity:** Medium
- **Status:** OPEN
- **Evidence:** No Detox, Maestro or Expo E2E setup. Hardware flows are documented as never run on a device.
- **Recommendation:** Run a short manual device checklist per release (sign-in, record capture, reminders, pass offline), and automate it later with Maestro.

### Finding: MOB-04 — Native build configuration split across root and `config/`
- **Severity:** Low
- **Status:** OPEN
- **Evidence:** There is a root `app.json` and a `config/mobile/app.json`; Knip reports `expo-updates`/`expo-system-ui` referenced in `app.json` but not listed in `package.json` (baseline finding, not re-verified in detail).
- **Recommendation:** Keep one Expo config and list its plugins in `package.json`.

## What is good
- Offline was designed deliberately: the shell is cached, private data never is, offline means signed out, and the pass window lives in memory.
- Permissions were pruned to features that exist. The honesty about what has not been device-tested is useful.

Related: 08/24 (onboarding — mobile setup still not in README), 13 (testing), 25 (env).
