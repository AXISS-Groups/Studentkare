# App Review notes: HealthKit and permissions (draft)

**Status:** draft for App Store Connect → App Review Information → Notes. Product confirms; replace
the bracketed demo-account placeholders before submitting. Never commit real credentials here.

## Paste-ready notes

> Studentkare is a personal health record for university students aged 18+ in India.
>
> **HealthKit (read only).** The app reads two types: step count and walking + running distance. It
> never writes to Apple Health (`NSHealthUpdateUsageDescription` says so; no write type is requested).
> HealthKit is used only on the Steps screen: sign in, open My health → Steps, read the explainer and
> tap Continue. The Health permission sheet appears then, never at launch. The day's total is shown to
> the student and saved as one number per day to their own account. It is not used for advertising,
> scores, rankings or any shop screen, and is not shared with third parties.
>
> **Clinical records:** the app does not use HealthKit clinical records.
>
> **Camera:** used only when the student taps "Take a photo" to add a prescription, lab report or
> health document to their records, or to look up a medicine strip (that photo is read once and not
> kept).
>
> **Location:** approximate, while using the app, only when the student taps "Use my location" in
> Find care, to sort nearby places by distance on the phone. The location is never sent to our server.
>
> **Motion:** counts steps with the phone's motion sensor after the student connects it on the Steps
> screen.
>
> **Demo account:** [phone or e-mail] / [one-time code or password] (a test student with sample
> records). Find care and Medicine information work without signing in.
>
> **Privacy policy:** https://studentkare.co/privacy (also linked in the app on Sign in, Create account
> and More).
>
> **Medical disclaimer:** the app shows the student's own records and reviewed general information; it
> does not diagnose. In an emergency the SOS screen links to 112 and Tele-MANAS 14416.

## Checklist before submitting

- [ ] The App ID has the HealthKit capability (EAS syncs it from the `react-native-health` plugin's
      entitlement on the first `eas build -p ios`).
- [ ] Associated Domains capability is on (universal links: `applinks:studentkare.co`), and
      `https://studentkare.co/.well-known/apple-app-site-association` is served
      (`deploy/well-known/README.md`).
- [ ] A demo account exists in production with sample (not real) records.
- [ ] Screenshots include the iPad sizes (`supportsTablet: true` in `app.json`), or set it to false.
- [ ] Privacy labels entered from `docs/store/apple-privacy-labels.md`.
- [ ] The `aps-environment` entitlement comes from `expo-notifications`; the app sends only local
      reminders. If review asks, say no remote push is used.

Code evidence: `app.json` (`infoPlist`, `react-native-health` plugin), `src/native/stepConnectors.ts`
(read types `StepCount` and `DistanceWalkingRunning`, `includeManuallyAdded: false`, no write types),
`src/features/steps/sources/healthSources.ts` (the daily sync), `src/native/__tests__/osPermissions.test.ts`.
