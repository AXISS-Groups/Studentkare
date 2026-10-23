# Health Connect permissions declaration (Google Play): draft

**Status:** draft for Play Console → App content → Health apps / Health Connect. Product and legal
confirm before submitting. Google reviews this before a build that requests Health Connect
permissions can be released.

## Permissions requested

| Permission | Access | Why | Code |
|---|---|---|---|
| `android.permission.health.READ_STEPS` | Read only | Show the student their daily step total on the Steps screen and save that one total per day to their own account | `app.json` (android.permissions), `src/features/steps/sources/healthSources.ts`, `src/native/stepConnectors.ts` |
| `android.permission.health.READ_DISTANCE` | Read only | Show the day's walking distance next to the steps | same |

No write permission is requested. No other Health Connect data type is read, and nothing is read in
the background: reads happen while the Steps screen is open and once when My health opens
(`src/native/README.md`, "Step counting").

## Answers to the declaration form

- **App category:** Health and fitness (student health record with a steps view).
- **Feature that uses the data:** My health → Steps. The student reads an explainer and taps Continue
  before the Health Connect permission screen appears; nothing is asked at launch
  (`src/native/__tests__/osPermissions.test.ts`, "motion and health access are used by the Steps
  screen, asked only from it").
- **How the data is used:** the day's de-duplicated total (`aggregateRecord`) is shown and sent as one
  number per day to `POST /api/v1/movement/background-sync`; the server keeps the most trusted source,
  never a sum.
- **Not used for:** advertising, sale, credit or insurance decisions, scores, rankings, or any shop
  surface (Rule L, AGENTS.md guardrail 4; the iOS motion string says "Steps are never turned into a
  score or shown on shop pages").
- **Retention and deletion:** daily totals are part of the student's record and are deleted with the
  account (More → Delete account). Product to confirm the retention period in the privacy policy.
- **Privacy policy:** `https://studentkare.co/privacy` must describe the Health Connect data above
  (the Play reviewer checks this). The permission-rationale activity required by Health Connect is
  added by the `expo-health-connect` config plugin.

## Still needed before submission

- The privacy policy section on Health Connect data (legal).
- A short screen recording of the Steps connect flow on Android for the reviewer.
- `minSdkVersion` is 26 (`expo-build-properties` in `app.json`): Android 8.0 and later only.
