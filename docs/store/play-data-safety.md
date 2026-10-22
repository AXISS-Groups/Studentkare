# Google Play Data safety: draft answers

**Status:** draft from the code at `fix/native-build`. Product and legal must confirm the answers
before they go into Play Console (App content → Data safety). Re-check this file whenever a phone
screen starts sending something new.

Scope: the Expo app (`src/native/**` and the shared view models it mounts). The web app is out of scope.

## Overview answers

| Question | Answer | Evidence |
|---|---|---|
| Does the app collect or share any required user data types? | Yes (collects). | Sections below |
| Is all user data encrypted in transit? | Yes. HTTPS only; cleartext is off. | `app.json` (`usesCleartextTraffic: false`, `NSAllowsArbitraryLoads: false`), `config/mobile/network_security_config.xml`, `src/core/env.ts` |
| Do you provide a way for users to request deletion? | Yes, in the app (More → Delete account) and on the web. | `src/native/App.tsx` (`DeleteAccount` screen), `src/features/account/views/DeleteAccountView.tsx` |
| Is data shared with third parties? | No sale and no advertising. Processors acting for Studentkare (hosting, Sentry if enabled) are "service providers", which Play does not count as sharing. Confirm the list of processors with legal. | AGENTS.md guardrail 4 (Rule L: no advertising) |
| Committed to the Play Families policy? | No. The app is for students aged 18+. | AGENTS.md guardrail 8 |

## Data types collected

Every item is collected only when the student uses the feature; none is collected at launch
(`src/native/App.tsx` comment "Nothing is asked for at launch", `src/native/__tests__/osPermissions.test.ts`).

| Play category → type | Collected | Shared | Optional? | Purpose | Where in code |
|---|---|---|---|---|---|
| Personal info → Name | Yes | No | Required for an account | Account management | `src/features/auth/views/CreateAccountNativeView.tsx` (`fullName`) |
| Personal info → Email address / Phone number | Yes | No | Required (one sign-in channel) | Account management (one-time codes) | `src/features/auth/views/CreateAccountNativeView.tsx`, `src/features/auth/viewmodel/AuthViewModel.ts` (`/auth/signup/contact/verify`) |
| Personal info → Other info (date of birth, university, roll number) | Yes | No | Required | Account management; 18+ check; campus verification | `CreateAccountNativeView.tsx` (`dob`, `university`, `rollNumber`) |
| Personal info → Address | Yes, when ordering with delivery | No | Optional | App functionality (delivery) | `src/modules/m16-checkout/data/CheckoutRepository.ts` (`delivery.address`, `pincode`) |
| Health and fitness → Health info | Yes | No | Optional | App functionality (the student's own health record) | Lab/health documents `src/native/recordUpload.ts` (`POST /health/documents`); medicine doses `src/features/reminders/viewmodel/MedsTodayViewModel.ts`; water `/health/water`; appointments and consults `src/features/appointments`, `src/features/m2store`; refill and hostel-visit requests `src/features/requests` |
| Health and fitness → Fitness info | Yes (daily step total and walking distance) | No | Optional | App functionality (Steps screen) | `src/features/steps/sources/healthSources.ts` (`POST /v1/movement/background-sync`), `src/native/stepConnectors.ts` |
| Messages → Other in-app messages | Yes (questions to Ask Ayush, the AI assistant) | No | Optional | App functionality | `src/features/ayush/useAyushConversation.ts` (`/agents/ayush/ask`) |
| Photos and videos → Photos | Yes, when the student takes a photo | No | Optional | App functionality: a record photo is stored in the student's vault; a medicine-strip photo is read once and **not kept** | `src/native/RecordCaptureScreen.tsx`, `src/native/M2HealthScreens.tsx` (`ReportCamera`), `src/native/MedicineInfoScreens.tsx` (`StripCamera`) |
| Location → Approximate location | **No (not collected).** Used on the phone only to sort Find care by distance; never sent. Play counts on-device-only use as not collected. | No | Optional | App functionality | `src/native/deviceLocation.ts`, `src/features/careDirectory/model/geo.ts` |
| App activity → In-app search history | Yes (medicine and shop searches are sent to the server to answer them) | No | Optional | App functionality | `src/features/medicineInfo`, `src/features/discover` |
| App info and performance → Crash logs, Diagnostics | Yes, **only if** the build sets `EXPO_PUBLIC_SENTRY_DSN` | No (Sentry is a processor) | Not user-optional | Analytics (crash diagnosis) | `src/native/crashReporting.ts` (no user, no request data, PHI-scrubbed) |
| Device or other IDs | Only Sentry's anonymous install id, and only when crash reporting is on | No | — | Crash diagnosis | `src/native/crashReporting.ts` |

Not collected by the phone app: financial info (no payment is taken on the phone,
`src/modules/m16-checkout/view/CartCheckoutNativeView.tsx`), contacts, calendar, audio (no
microphone permission, `app.json` `blockedPermissions`), files and docs other than the photos above,
web browsing, advertising ID, precise location.

## Notes for the reviewer

- No analytics SDK ships in the phone app (PostHog is web only: `src/App.tsx`).
- Notifications are local reminders scheduled on the phone; there is no push token.
- If crash reporting stays off in the store build, remove the "Crash logs / Diagnostics" row.
