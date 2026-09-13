# Implementation TODO: five core components and web/mobile sensors

Status: planned, not implemented. Prepared after the 13 September 2026 audit.

## Requested scope

Implement all five items from the audit summary:

1. Durable workflow foundation.
2. Integration health monitor.
3. Notification/reminder worker.
4. Document intake assistant.
5. Read-only care/support navigator.

Run routine maintenance/reconciliation every **two hours (7,200 seconds)** on
the backend. User-triggered work and due reminders must not wait for this interval.
The foundation is shared infrastructure, not a sixth autonomous agent.

The current application is a responsive web application. Mobile browser/PWA
support is in scope for the web implementation. Native Android/iOS sensor and
health-store integrations are a separate delivery track, not provided merely by
installing the website as a PWA.

## Phase 0 — prerequisites from the audit

- [ ] Restrict login fallback to server-stored, verified account recovery contacts.
- [ ] Remove embedded database credentials and require environment configuration;
      the credential owner must rotate/revoke any active exposed credential.
- [ ] Prevent demo administrator seeding and master-code access in production.
- [ ] Persist/encrypt 2FA factors and enforce privileged-role enrollment.
- [ ] Restrict donor access and approval actions by role, ownership, and campus.
- [ ] Replace global medication/approval registries with account-scoped records.
- [ ] Return masked metadata instead of raw integration secrets; surface save failures.
- [ ] Remove fabricated readings, clinical conclusions, and dispatch success from
      connected flows; preserve an explicitly separate demo mode if needed.
- [ ] Fix registration handoff and map legacy dashboard tabs to valid routes.
- [ ] Consolidate requests on the authenticated API client.
- [ ] Add active-schema migrations and negative tests for these boundaries.

Exit: isolated tests prove no recovery-address substitution, unauthorized approval,
public donor disclosure, shared dose state, or simulated measurement persistence.

## Phase 1 — all five components

### 1. Durable workflow foundation

- [ ] Add persistent runs, steps, job schedules, leases, retry state, and outbox events.
- [ ] Create a dedicated backend worker with startup recovery and graceful shutdown.
- [ ] Persist UTC due times and display last/next execution in the user's local time.
- [ ] Default periodic schedules to 7,200 seconds; support administrator pause/resume.
- [ ] Deduplicate scheduled slots and external side effects across workers/restarts.
- [ ] Reconcile overdue jobs every two hours; resume eligible queued work on startup.
- [ ] Add typed tool inputs/results, per-run deadlines, maximum steps, bounded retries,
      configurable token/cost limits, cancellation, and a server-side kill switch.
- [ ] Add real run history with queued/running/waiting-for-approval/succeeded/failed/
      cancelled states and failure reasons.
- [ ] Record redacted action/result metadata and source references, not raw patient
      content or private model reasoning in routine telemetry.
- [ ] Test duplicate delivery, concurrent workers, restart recovery, timeout, and cancellation.

### 2. Integration health monitor

- [ ] Check configured database/storage/messaging/model/provider dependencies every two hours.
- [ ] Add an administrator-triggered “Check now” action.
- [ ] Distinguish configured, reachable, operational, degraded, unavailable, and stale.
- [ ] Use safe health probes rather than sending real patient messages as a test.
- [ ] Save checked-at time, sanitized error, latency, and next check.
- [ ] Deduplicate operational alerts; show actual results in the dashboard.

### 3. Notification and reminder worker

- [ ] Persist notification preferences, verified destinations, timezones, and quiet hours.
- [ ] Create reminder jobs from confirmed appointments and verified medication plans.
- [ ] Deliver at their scheduled due times; perform a two-hour reconciliation sweep.
- [ ] Define late/missed-reminder behavior; do not send a burst of obsolete messages.
- [ ] Support in-app delivery and configured messaging channels with real receipts.
- [ ] Add retry limits, idempotency, unsubscribe/revocation, and delivery history.
- [ ] Keep notification wording separate from proof of appointment acceptance or dose intake.

### 4. Document intake assistant

- [ ] Start immediately on an authorized upload; recheck eligible pending/failed jobs every two hours.
- [ ] Validate type/size, quarantine for scanning, and preserve the original document.
- [ ] Extract document type, date, provider, and draft fields with page/text provenance.
- [ ] Leave missing or unreadable fields unknown; never invent doctor, dosage, or result values.
- [ ] Require review of medication name, strength, dose, frequency, and uncertain matches.
- [ ] Persist draft/reviewed/rejected status and reviewer identity.
- [ ] Return an honest unavailable/manual-review state when OCR/model infrastructure is absent.
- [ ] Test illegible uploads, no-match prescriptions, duplicate uploads, and cross-account access.

### 5. Read-only care/support navigator

- [ ] Answer user questions on demand using authorized, approved information.
- [ ] Recheck knowledge-source freshness and index jobs every two hours.
- [ ] Provide source citations and distinguish account data from general information.
- [ ] Support service discovery, application navigation, and support-request guidance.
- [ ] Escalate urgent concerns or unsupported questions appropriately.
- [ ] Restrict tools to read-only access; no autonomous diagnosis, prescriptions, or order approval.
- [ ] Test unsupported claims, prompt injection, conflicting sources, and permission boundaries.

## Scheduling contract

| Component | Two-hour work | Immediate/event-driven work |
| --- | --- | --- |
| Workflow foundation | Overdue-job reconciliation and scheduler health audit | Queued jobs, retry deadlines, startup recovery |
| Integration monitor | Dependency probes and status refresh | Manual check and failure-triggered alert |
| Reminder worker | Missed-job/delivery reconciliation | Due-time reminders and outbox events |
| Document intake | Eligible pending/failed intake reconciliation | New uploads and reviewer decisions |
| Care/support navigator | Approved-source freshness/index reconciliation | User questions |

Do not run these schedules in browser `setInterval()`. Hidden/suspended tabs are
throttled and do not provide durable execution. The scheduled workers must never
activate a user's camera, microphone, location, or motion sensors in the background.

## Phase 2 — useful camera and mobile sensor capabilities

### Shared device and permissions layer

- [ ] Add a Devices & Sensors page listing supported, unavailable, denied, and active capabilities.
- [ ] Detect capabilities at runtime; do not infer support from a browser name alone.
- [ ] Request camera/microphone/motion/location permissions only from an explicit user action.
- [ ] Require HTTPS in deployed environments and explain actionable permission failures.
- [ ] Stop tracks, listeners, and timers on stop, navigation, unmount, or session end.
- [ ] Label every observation by source, time, unit, quality, and measurement/estimate/manual type.
- [ ] Avoid raw frame/audio storage unless the user explicitly saves or submits it.
- [ ] Keep unsupported hardware and denied permission states functional with manual alternatives.

### Camera: desktop and mobile browser

- [ ] Report/prescription capture with preview, retake, rotation, crop, and readability checks.
- [ ] Front/rear camera selection where supported; image-file upload fallback.
- [ ] OCR routed through the reviewed document intake workflow.
- [ ] QR/barcode reading for check-in/document identification/catalog lookup, with decoding fallback.
- [ ] Progress photo journal for clinician review; no automatic skin diagnosis.
- [ ] Optional on-device posture/exercise guidance after model/browser validation, with confidence
      thresholds and an explicit wellness-only label.
- [ ] Camera/microphone/device preview for future teleconsultation; full calling requires
      separate signalling, TURN infrastructure, booking linkage, and connection recovery.

### Motion and location: mobile browser

- [ ] Foreground movement sessions using available accelerometer/orientation events.
- [ ] Clearly labelled step/activity estimates; do not claim all-day tracking or medical accuracy.
- [ ] Permission handling for browsers requiring a user-gesture motion request.
- [ ] Opt-in nearby care/location sharing with accuracy and timestamp shown.
- [ ] Test absent sensors, screen lock, hidden tabs, interrupted sessions, and denied permissions.

### Microphone: desktop and mobile browser

- [ ] User-recorded notes with start/stop, review, delete, and transcript correction.
- [ ] Route transcription through a configured provider; show unavailable status if absent.
- [ ] Do not infer respiratory disease, calibrated hearing thresholds, or clinical voice findings.

### External devices and native mobile follow-on

- [ ] Add compatible Bluetooth heart-rate devices first, with disconnect/reconnect and stale-data states.
- [ ] Show Web Bluetooth as optional: browser and device support is limited, especially on iOS browsers.
- [ ] Add BP cuffs, scales, and glucose devices only through documented supported protocols/provider SDKs.
- [ ] For a native mobile app: integrate Android Health Connect and Apple HealthKit with scoped permissions.
- [ ] Use native platform APIs for more reliable pedometer/activity history and OS-managed background work.
- [ ] Verify behavior on physical Android and iPhone devices; browser mocks are not hardware validation.

### Explicitly deferred measurements

Do not implement phone-camera estimates as verified blood pressure, blood glucose,
oxygen saturation, body temperature, jaundice/bilirubin, or disease diagnoses.
Camera pulse estimation remains a separate research/validation track; existing
randomized scan values must not be saved as clinical measurements.

## Phase 3 — additional product features

The [top-100 backlog](top-100-feature-todos.md) now includes dedicated mental-wellbeing
games and vision/hearing improvements in F051–F070. See the
[existing-feature review](existing-wellbeing-sensor-review.md) for what is already
present and the defects that must be addressed before treating results as real.

- [ ] Verified campus membership and provider/clinician onboarding.
- [ ] Actual appointment availability, booking confirmation, rescheduling, and cancellation.
- [ ] Persistent care timeline linking requests, appointments, documents, and follow-up tasks.
- [ ] Consent-bound record sharing, export, deletion, and retention.
- [ ] Notification inbox, preferences, read state, and delivery status.
- [ ] Support queue ownership, priority, response SLAs, and escalation.
- [ ] Installable PWA with offline application shell and explicit connectivity state;
      private health records require a separate secure offline-storage design.
- [ ] Accessibility checks, shared dialogs, keyboard navigation, responsive specialist widgets,
      reduced motion, and real-device testing.
- [ ] Genuine partner connections for lab/pharmacy/insurance/ABDM as access becomes available.
- [ ] Payments, verified webhooks, reconciliation, receipts, refunds, and returns if paid commerce is enabled.

## Phase 4 — release verification and operations

- [ ] Make real signup-to-care workflow tests a CI gate.
- [ ] Pin/test the same dependency versions in local development, CI, and containers.
- [ ] Resolve dependency findings and add secret/dependency scanning.
- [ ] Test tenant isolation, MFA restart behavior, approval expiry, and duplicate jobs/webhooks.
- [ ] Add deployment health/readiness checks, migration execution, and worker health monitoring.
- [ ] Configure encrypted private storage, backups, and a demonstrated restore drill.
- [ ] Measure agent grounding/refusal quality, latency/cost, and failure recovery with representative test cases.
- [ ] Update feature labels and documentation from actual execution evidence.

## Definition of complete

Each capability needs its UI, authenticated API, persistent state, configured
execution adapter, error/cancellation handling, and relevant tests. If a third-party
credential, model, native app, or physical device is unavailable, report that
dependency explicitly; do not present a simulated result as a completed integration.

References:
- [Application audit](application-audit-2026-09-13.md)
- [Camera/microphone API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Motion permissions](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static)
- [Background-tab behavior](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
