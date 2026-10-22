# App Store privacy labels ("App Privacy"): draft answers

**Status:** draft from the code at `fix/native-build`; product and legal confirm before entering
them in App Store Connect. Same evidence as `docs/store/play-data-safety.md` (file citations there).

- **Tracking:** No. The app does not link data with third-party data for advertising and has no
  advertising or analytics SDK (AGENTS.md guardrail 4; PostHog is web only).
- **Privacy Policy URL:** `https://studentkare.co/privacy` (in-app link on Sign in, Create account and
  More: `src/features/auth/views/LegalLinksNative.tsx`, needs `EXPO_PUBLIC_SITE_URL`, set in `eas.json`).

## Data linked to the user (used for App Functionality, not tracking)

| Apple category | Data type | Notes |
|---|---|---|
| Contact Info | Name, Email Address, Phone Number | Account and one-time sign-in codes |
| Contact Info | Physical Address | Only when an order is delivered |
| Health & Fitness | Health | Records and lab reports the student adds, medicine doses, water, appointments, consults, requests |
| Health & Fitness | Fitness | Daily steps and walking distance (Apple Health or motion sensor), after the student connects them |
| Sensitive Info | — | Not collected as such. Confirm with legal whether health records should also be declared here |
| User Content | Photos or Videos | Record and lab-report photos the student takes (kept in their vault). Medicine-strip photos are read once and not kept: still declare as collected |
| User Content | Other User Content | Questions typed to Ask Ayush; request notes |
| Identifiers | User ID | Studentkare account id |
| Search History | Search History | Medicine and shop searches |
| Other Data | Other Data Types | Date of birth (18+ check), university, roll number |

## Data not linked to the user

| Apple category | Data type | Notes |
|---|---|---|
| Diagnostics | Crash Data | Only if the build sets `EXPO_PUBLIC_SENTRY_DSN`. No user id is attached and events are PHI-scrubbed (`src/native/crashReporting.ts`) |

## Not collected

Location (Find care uses approximate location on the phone only; it is never sent:
`src/native/deviceLocation.ts`), Financial Info (no payment on the phone), Contacts, Browsing History,
Audio (no microphone permission), Purchases, Usage Data / Product Interaction, Advertising Data,
Device ID.

## Usage strings shown by iOS (from `app.json`)

| Key | Shown when |
|---|---|
| `NSCameraUsageDescription` | The student taps "Take a photo" |
| `NSLocationWhenInUseUsageDescription` (+ `NSLocationDefaultAccuracyReduced`) | "Use my location" in Find care |
| `NSMotionUsageDescription` | Connecting the motion sensor on the Steps screen |
| `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription` | Connecting Apple Health on the Steps screen (read only) |
