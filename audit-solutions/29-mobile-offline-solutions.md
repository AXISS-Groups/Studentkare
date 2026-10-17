# 29 — Mobile & Offline: Solutions

Answers [audit/29-mobile-native-and-offline.md](../audit/29-mobile-native-and-offline.md). Owns **MOB-02** (microphone permission), **MOB-03** (no device verification) and **MOB-04** (split Expo config). **MOB-01** (native type-check in CI, TD-45) is solved in [18](18-cicd-deployment-solutions.md).

---

## MOB-02 — Microphone permission before store submission
**Decision needed** (ADR-0007, [10](10-documentation-solutions.md)): consult calls ship before submission, or they don't.
- **If they don't:** remove `RECORD_AUDIO` (Android) and `NSMicrophoneUsageDescription` (iOS) from **both** `app.json` and `config/mobile/app.json`, after MOB-04 there is only one. Re-add them in the PR that ships calls.
- **If they do:** the permission request happens only when a call starts, never at launch, and the usage string names the feature.

**Verify:** the built `AndroidManifest.xml` and `Info.plist` contain only the camera and notifications permissions, plus the microphone only if calls ship. **Effort:** S.

---

## MOB-04 — One Expo config
- Keep a single source, either root `app.json` or `app.config.ts`, and delete `config/mobile/app.json`, or make one import the other.
- List every plugin referenced by the config in `package.json`. Knip reported `expo-updates` and `expo-system-ui` as unlisted. Install them with `npx expo install` so versions match SDK 52, or remove them from the config.
- Run `npx expo-doctor` in the native CI job.

**Effort:** S.

---

## MOB-03 — Device verification

**Short term: a manual release checklist** (`docs/runbooks/MOBILE_RELEASE_CHECKLIST.md`), run on one Android and one iOS device per release:
- [ ] Fresh install. The first launch asks for no permissions.
- [ ] Sign in with OTP. Kill the app, reopen: the session is restored only if the server confirms it. In airplane mode: signed out, with an honest message.
- [ ] Record capture: camera permission is asked at first use; the upload succeeds; the record appears on web.
- [ ] Medicine reminder: notification permission is asked at first use; the notification fires at the set time with the device locked.
- [ ] Check-in pass: the code rotates every 30 s. With a weak signal or airplane mode after opening the pass, codes keep working for up to 10 minutes and then stop. A screenshot older than 60 s fails at the counter.
- [ ] Language switch (en/te/hi) persists. Tier 1 screens follow the [27](27-i18n-accessibility-solutions.md) rules.
- [ ] TalkBack and VoiceOver: every interactive element on home and sign-in is announced with a role and label.

**Medium term: automation**
- Maestro flows (`.maestro/*.yaml`) for sign-in, record capture and the pass, run nightly on an Android emulator in CI (`reactivecircus/android-emulator-runner`) against a staging backend with demo mode.
- EAS Build profiles (`eas.json`) for `development`, `preview` (internal distribution to testers) and `production`, so testers install real builds.

**Effort:** S (checklist), M (Maestro and EAS).

---

## Push notifications (not implemented today)
When server push is needed, for example for lab results ready or appointment changes:
- Add `POST /api/devices` to register an Expo push token, stored per account and device, and deleted on sign-out and on erasure (add it to the erasure FK walk).
- The notification body carries **no health data** ("You have a new update in Studentkare"), the same rule SOS follows.
- The sender runs in the worker using the outbox ([19](19-scalability-solutions.md)).

**Effort:** M.

---

## Offline: keep the current design
- Web service worker: caches the shell only, never `/api/*`. Add a test that loads `public/sw.js` in a worker mock and asserts `/api/` requests are not intercepted, so this guarantee can't regress.
- Pass offline window: keep it in memory only. Add a native unit test that the pass module never calls `CrossPlatformStorage`.
- Version the service-worker cache name with `APP_VERSION` ([18](18-cicd-deployment-solutions.md)), so deploys evict old shells reliably.

## Native config hygiene
- `EXPO_PUBLIC_*` values are public: add a lint/CI check that no `EXPO_PUBLIC_` variable name contains `KEY`, `SECRET` or `TOKEN` ([25](25-environment-configuration-solutions.md)).
- Link `src/native/README.md` from the root README ([09](09-installation-solutions.md)).
