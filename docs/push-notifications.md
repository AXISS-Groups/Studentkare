# Push notifications

Phones get pushes through the **Expo push service** (it forwards to APNs and FCM with the credentials EAS
holds for the app). Browsers get **Web Push** (VAPID, RFC 8030/8291/8292), shown by `public/sw.js`. Both
are fed by one dispatcher, `backend/services/push_dispatch.py`.

Why Expo push rather than FCM/APNs direct: one token format and one HTTP API for both platforms, APNs and
FCM credentials stay in EAS (`eas credentials`) instead of in our servers, receipts tell us when a token
is dead, and no Firebase SDK goes into the app. The cost is a dependency on Expo's service; moving to FCM
direct later only changes `services/push_providers.py` and the token the app registers.

## What Krishna sets up (once)

| What | Where | Then |
|---|---|---|
| **Expo access token** | expo.dev → Account settings → Access tokens. Turn on **Enhanced push security** for the project, so only requests with this token can push to the app's tokens. | `EXPO_ACCESS_TOKEN` in the backend secret (Helm `backend.secrets`, compose `.env`). Unset: no phone push; the admin page says "not set up". |
| **EAS project id** | `eas init` (see `src/native/README.md`) | `EAS_PROJECT_ID` as an EAS environment variable. The app needs it to ask Expo for a push token; without it the phone shows "Push isn't set up". |
| **APNs key** (iOS) | Apple Developer → Keys → Apple Push Notifications service | `eas credentials -p ios` → Push Notifications → upload the .p8 (or let EAS create one). |
| **FCM v1 service account** (Android) | Firebase console → project for `co.studentkare.app` → Service accounts → generate key | `eas credentials -p android` → Google Service Account → FCM V1. Add `google-services.json` only if EAS asks for it. |
| **VAPID keys** (browsers) | `npx web-push generate-vapid-keys` | `VAPID_PRIVATE_KEY` (secret), `VAPID_PUBLIC_KEY` and `VAPID_SUBJECT` (`mailto:ops@studentkare.co`) in the backend env. A public key that doesn't match the private key turns Web Push off. |

All four backend variables are passed through `docker-compose.prod.yml` and the Helm chart
(`scripts/ops/check-env-passthrough.py`). Rebuild the phone app after adding the EAS credentials.

## How a notification travels

1. Something happens (`ops_feed.notify`, a reminder `enqueue`, an SOS answer). It is a row in
   `care_outbox_events` — the in-app inbox — as before.
2. The outbox pass (`workflow_scheduler._process_outbox`, every 45 s) asks `push_dispatch.fan_out_event` to
   queue one `care_push_deliveries` row per active device, if the student's channels for that category
   include push. Reminders also go to WhatsApp/email if the student chose one (`external_route`).
3. The `push_dispatch` job (every 45 s, urgent) sends due rows: quiet hours, the hourly cap
   (`push.rate_cap_per_hour`), coalescing (`push.coalesce_seconds`), retries (`push.max_attempts`), and
   dead-token pruning. `push_receipts` (every 15 min) reads Expo receipts and retires devices unused for
   `push.inactive_device_days`.
4. A tap opens the category's path (`/notifications`, `/orders`, `/medications`, `/health-camp`) — on the
   phone through `src/native/linking.ts`, on the web through the service worker. Signed out → Sign in.

## Privacy rules (tested in `backend/tests/test_push_notifications.py`)

- The text is built at send time from the **category and the device language only**
  (`core/push_copy.LOCK_SCREEN`). The outbox payload is never read for it. No medicine, test, condition,
  result, clinician or camp service ever reaches a lock screen.
- Safety (SOS answers, account security) is always on, ignores quiet hours and the cap.
- **Rule L**: outbox events are clinical-plane, so `rule_l.assert_push_allowed` refuses any of them as a
  marketing push. Partner offers come only from a super admin's announcement, reach only students who opted
  in (`marketing_opt_in`, off by default; every change audited), and every send is audited with its count.
- Announcements pass `core/push_copy.check_announcement`: no health terms, no request for a code or
  password, no links. Public-health alerts are refused until the Tier 1 plan
  `docs/plans/tier1-push-clinical-alerts-2026-10-23.md` is approved.
- Devices are tied to the sign-in that registered them; signing out revokes them on the server.

## Settings (registry `push.*`)

`rate_cap_per_hour`, `coalesce_seconds`, `max_attempts`, `retry_base_seconds`, `receipt_delay_seconds`,
`batch_max`, `ttl_seconds`, `devices_per_account_max`, `inactive_device_days`,
`announcement_title_max`, `announcement_body_max`, `announcement_schedule_max_days`.
