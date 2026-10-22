# Native public preventive care

From the repository root, install the locked dependencies with `npm ci`, then:

```sh
EXPO_PUBLIC_API_BASE_URL=https://your-api-host.example/api npm run start:native
```

Replace the example with your reachable backend API base, including `/api` for
this backend. Expo inlines this public value; restart Expo/re-export after changing
it. No secrets belong in `EXPO_PUBLIC_*`. Missing/relative URLs show a configuration
error, with no `/api` fallback. HTTPS is required; development alone allows HTTP
loopback (`localhost`, `127.0.0.1`, `::1`). A physical device needs a reachable HTTPS
host; its localhost is not your computer. Apply the preventive-care backend
migration as described in `docs/preventive-care-api.md`.

The mounted native stack opens the existing **camp proof of concept**. Tap
**Browse public vaccine directory** to search and paginate real public listings;
use the header back button or **Open camp proof of concept** to return.
The directory uses the shared `VaccineDirectoryViewModel` with a native public GET
adapter for `/preventive/vaccines`. It sends no authentication/session headers and
omits cookies. No providers or offerings are seeded or fabricated by the client.
Missing prices/availability remain unknown; timestamps are Unix seconds.

Source, booking, WHO and provider-resource links open external HTTPS websites.
Provider resources are general outbound links, not an integrated catalog feed or
partnership. Native authentication, private patient/report review and personal
preventive preferences are not implemented. Camp demonstration data is still a
PoC, not patient-data parity. Text scales with device settings; the brief native
fade respects Reduce Motion and cleans up its listener/animation.

Bundle check (use a fresh output directory outside the repository):

```sh
npx expo export --platform ios --output-dir /absolute/temporary/path/native-ios-unique
```

Export verifies bundling, not simulator/device rendering or live backend reachability.

## Step counting (needs a development build)

The Steps screen (My health → Steps) reads steps from Apple Health on iOS, from
Google Health Connect on Android, and from the phone's own motion sensor on
both. These are native modules, so they do **not** work in Expo Go: build a
development client once, then run Metro against it.

| Source | Package (exact pin) | Config plugin in `app.json` |
|---|---|---|
| Phone motion sensor (iOS Core Motion, Android step counter) | `expo-sensors` 14.0.2 | `["expo-sensors", { "motionPermission": … }]` |
| Apple Health (read only) | `react-native-health` 1.19.0 | `["react-native-health", { "healthSharePermission": …, "healthUpdatePermission": … }]` (adds the HealthKit entitlement) |
| Health Connect (read only) | `react-native-health-connect` 3.3.3 + `expo-health-connect` 0.1.1 | `"expo-health-connect"` (permission-rationale activity and the permission delegate) |
| Android SDK level for Health Connect | `expo-build-properties` 0.13.3 | `["expo-build-properties", { "android": { "minSdkVersion": 26 } }]` |

These were added with `npm install --save-exact`; the lockfile change is additive
(no existing entry changed). **`minSdkVersion` is now 26 (Android 8.0)**, which
Health Connect requires: Android 7.x phones can no longer install the app.

Declared permissions (all read only; nothing is ever written):
- iOS `Info.plist`: `NSMotionUsageDescription`, `NSHealthShareUsageDescription`,
  and `NSHealthUpdateUsageDescription` (required by the plugin; it says the app
  does not write to Apple Health — no write type is ever requested).
- Android: `ACTIVITY_RECOGNITION`, `android.permission.health.READ_STEPS`,
  `android.permission.health.READ_DISTANCE`.

No permission is asked at launch or when the screen opens. Opening My health
only *looks* at each source and reconnects one the phone already allows; the
platform prompt appears after the student reads the explainer and taps
Continue on the Steps screen.

### Make the development build

From the repository root, after `npm ci`:

```sh
# iOS (macOS with Xcode 16+; a real iPhone for Health and motion data,
# the simulator has neither step counts nor Core Motion)
npx expo prebuild --platform ios --clean
npx expo run:ios --device

# Android (Android Studio, SDK 35, a phone or emulator with Google Play)
npx expo prebuild --platform android --clean
npx expo run:android --device
```

`expo run:*` installs the development client and starts Metro; later runs only
need `EXPO_PUBLIC_API_BASE_URL=… npx expo start --dev-client`. With EAS instead:
`eas build --profile development --platform ios|android` (the profile needs
`"developmentClient": true`); EAS syncs the HealthKit capability to the App ID.

On Android, install **Health Connect** from the Play Store first (it is built
into Android 14+). On iOS, the Health app must have step data from the phone or
a watch.

### What each source can give

- **Apple Health**: the day's step total as the Health app shows it (already
  de-duplicated across iPhone and Apple Watch) and walking distance. Only steps
  the phone or a watch counted are read (`includeManuallyAdded: false`).
  HealthKit never tells an app whether reading was refused; an empty or zero
  read is shown as "no steps read yet", never as 0.
- **Health Connect**: the day's de-duplicated step total and distance
  (`aggregateRecord`); a day no app recorded is "no data", not 0.
- **Phone motion sensor**: on iOS, the day's total from Core Motion (last 7
  days) plus a live count while the screen is open. On Android the step-counter
  sensor only counts while the app is open, so it gives the live count and is
  never sent as a day's total — Health Connect counts whole days.

The app syncs today's total from the most trusted connected source only
(Apple Health / Health Connect, then the motion sensor) to
`POST /api/v1/movement/background-sync`; the server keeps one total per day per
source and shows the most trusted one, never a sum. Re-sync runs every
`wellness.steps_live_sync_seconds` while the Steps screen is in front, and once
when My health opens. There is no background sync while the app is closed.

## Bundling (what Expo reads)

Expo reads `app.json` + `app.config.ts`, `metro.config.cjs` and `babel.config.cjs` from the
repository root. The `@/…` import alias is resolved in `metro.config.cjs` (`@/x` → `src/x`, the same
mapping as `vite.config.ts` and `tsconfig.json`). A `node_modules` that is a symlink (a shared install)
is added to Metro's watch folders automatically. CI's **Expo bundle** job runs both exports below, so a
broken phone bundle fails the pull request:

```sh
npx expo export --platform android --output-dir /absolute/temporary/path/expo-android
npx expo export --platform ios --output-dir /absolute/temporary/path/expo-ios
```

## Versions and build numbers

`package.json` `"version"` (MAJOR.MINOR.PATCH, each part below 100) is the only place to change.
`app.config.ts` derives the store version from it, and the iOS `buildNumber` / Android `versionCode`
as `MAJOR*10000 + MINOR*100 + PATCH` (0.5.0 → 500). The stores refuse a build number they have seen,
so **bump the patch for every store upload**. `runtimeVersion` follows the app version
(`policy: "appVersion"`); there is no over-the-air update (`expo-updates` is not installed).

## Release builds with EAS

Profiles in `eas.json` (all set `EXPO_PUBLIC_API_BASE_URL=https://api.studentkare.co/api` and
`EXPO_PUBLIC_SITE_URL=https://studentkare.co`):

| Profile | What | Use |
|---|---|---|
| `development` | Development client (HealthKit, Health Connect and the motion sensor need it), internal, Android APK | Day-to-day work: `npx expo start --dev-client` |
| `preview` | Release build, internal distribution, Android APK | Testers (TestFlight internal / sideload) |
| `production` | Store build, Android App Bundle | `eas submit` |

Environment read by `app.config.ts` (set as EAS environment variables/secrets, never committed):

| Variable | Needed for | If unset |
|---|---|---|
| `EAS_PROJECT_ID` | Every EAS build (`expo.extra.eas.projectId`) | `eas build` asks to run `eas init` |
| `EXPO_OWNER` | Builds under an Expo organisation | Personal account |
| `EXPO_PUBLIC_SENTRY_DSN` | Crash reporting in the app | Crash reporting is off |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (secret), `SENTRY_URL` (optional) | Uploading source maps during the build | No upload (stack traces stay minified) |

One-time set-up (Krishna / mobile eng):

```sh
npm i -g eas-cli
eas login
eas init                      # creates the project and prints its id (it cannot edit app.config.ts)
export EAS_PROJECT_ID=<id>    # for local eas commands (or an untracked .env.local); never commit it
eas env:create --name EAS_PROJECT_ID --value <id> --environment production --visibility plaintext
# repeat env:create for the preview and development environments
eas credentials -p ios        # Apple distribution certificate + provisioning profile (Apple Developer account)
eas credentials -p android    # upload keystore (EAS-managed); then enable Play App Signing
```

Build and submit:

```sh
eas build --profile development --platform ios|android   # dev client
eas build --profile preview --platform all
eas build --profile production --platform all
eas submit --profile production --platform ios           # App Store Connect (TestFlight first)
eas submit --profile production --platform android       # Play internal track, as a draft
```

`eas submit -p android` needs a Google Play service-account JSON (Play Console → API access), and the
first Android upload must be done by hand in Play Console. `eas submit -p ios` needs the App Store
Connect app record (bundle id `co.studentkare.app`) and an App Store Connect API key.

## Deep links

`src/native/linking.ts` maps `studentkare://…` and `https://studentkare.co/…` to screens:
`/login` and `/claim` → Sign in (Home when signed in), `/orders[/<id>]` → Orders (an order's details),
`/consult` → Consults (signed in) or the public Consult page, `/medicine-info?medicine=<id>|q=<text>`,
`/find-care?segment=…&place=<id>`. The first link waits for the session check. Signed-in screens are
never opened while signed out (the link opens Sign in instead), and the target does not resume after
signing in. `/claim#token=…` invites are **not** redeemed on the phone yet, so `/claim` is excluded from
the universal/App Links and keeps opening the web. There is no blog on the web or the phone, so there
is no blog link. The web must serve `/.well-known/apple-app-site-association` and
`/.well-known/assetlinks.json`: templates and steps in `deploy/well-known/README.md`.

## Permissions

The phone asks only for what a screen uses: camera ("Take a photo"), approximate location while in
use (Find care; Android blocks `ACCESS_FINE_LOCATION`, iOS defaults to reduced accuracy), motion,
Apple Health / Health Connect read (Steps), notifications (local reminders). There is no microphone:
`RECORD_AUDIO`/`MODIFY_AUDIO_SETTINGS` are blocked and `NSMicrophoneUsageDescription` is gone until
phone video consults ship. `src/native/__tests__/osPermissions.test.ts` holds this in place.

## Crash reporting

`src/native/crashReporting.ts` starts Sentry (`@sentry/react-native`, the version Expo SDK 52
expects) from `src/native/index.ts` when `EXPO_PUBLIC_SENTRY_DSN` is set, and does nothing otherwise.
It never attaches a user, request data, screenshots, view hierarchy, traces or breadcrumb payloads;
messages are PHI-scrubbed with the web's keyword list (`src/lib/sentryScrub.ts`) plus e-mail and long
numbers, and an event that still names PHI is dropped.

## Store paperwork

Drafts generated from the code, for product/legal to confirm: `docs/store/play-data-safety.md`,
`docs/store/apple-privacy-labels.md`, `docs/store/health-connect-declaration.md`,
`docs/store/healthkit-review-notes.md`. The app links to the public Terms and Privacy Policy pages
from Sign in, Create account and More (`src/features/auth/views/LegalLinksNative.tsx`).
