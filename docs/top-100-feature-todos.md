# Top 100 implementation TODOs

Priority-ordered backlog for Studentkare, combining new capabilities with fixes
and extensions identified in the application audit. Unchecked items are planned;
the presence of a prototype or partial implementation does not mean an item is complete.

Routine agent checks and reconciliation run on the backend every two hours.
User questions, new uploads, and due reminders run when triggered rather than
waiting for the next two-hour cycle. Camera, microphone, location, and motion
capture are user-initiated sessions, never scheduled background agent actions.

Mobile browser/PWA support depends on browser capabilities. HealthKit, Health
Connect, and OS-managed background activity tracking require a native app target.
Camera pulse and motion-derived counts are estimates until validated; they must
not be presented as medically validated readings or replaced with random values.

## 1. Release-blocking identity and data foundations

- [x] F001 — Restrict fallback login to previously verified recovery contacts.
- [x] F002 — Persist encrypted 2FA factors and enforce privileged-role enrollment.
- [x] F003 — Enforce clinician role, case assignment, and valid states for approvals.
- [x] F004 — Protect donor information with consent and campus-scoped access.
- [x] F005 — Replace shared medication state with account-owned records.
- [x] F006 — Replace embedded credentials with managed configuration and coordinate rotation.
- [x] F007 — Enforce production startup checks and explicit demo-mode isolation.
- [x] F008 — Separate measured, estimated, manual, and demo data throughout the application.
- [x] F009 — Repair registration handoff, valid routes, refresh, and browser history behavior.
- [x] F010 — Unify authenticated API access and reset account-specific client state on account changes.

## 2. Durable workflow runtime and two-hour operations

- [x] F011 — Build the durable workflow foundation with persisted jobs, runs, and steps.
- [x] F012 — Add configurable two-hour backend schedules with saved last/next-run times.
- [x] F013 — Prevent duplicate execution using worker leases and idempotency keys.
- [x] F014 — Add bounded retries, backoff, and a dead-letter queue for failed jobs.
- [x] F015 — Enforce maximum steps, deadlines, token limits, and cost budgets.
- [x] F016 — Add job cancellation, pause/resume, and an administrative kill switch.
- [x] F017 — Display real run history, progress, errors, and execution receipts.
- [x] F018 — Bind human approvals to a specific payload version, reviewer, and expiry.
- [x] F019 — Create a typed, role-scoped tool registry with validated inputs and outputs.
- [x] F020 — Implement the integration health monitor with two-hour checks and “Check now.”

## 3. Useful assistants, reminders, and knowledge workflows

- [ ] F021 — Implement the notification/reminder worker with durable outbox delivery.
- [x] F022 — Add reminder preferences, verified destinations, timezones, and quiet hours.
- [x] F023 — Track actual notification delivery, retry attempts, failures, and read states.
- [x] F024 — Implement document intake with OCR, classification, and source-linked draft extraction.
- [x] F025 — Provide a review/correction queue for uncertain document and prescription fields.
- [x] F026 — Store approved knowledge sources with versions, ownership, citations, and expiry.
- [x] F027 — Implement the read-only care/support navigator with authorized retrieval.
- [x] F028 — Refresh approved knowledge sources and reconcile index jobs every two hours.
- [x] F029 — Add a care-request follow-up worker for overdue requests and assigned tasks.
- [x] F030 — Evaluate agents for grounding, refusal, isolation, latency, cost, and recovery.

## 4. Camera, microphone, and device-access experience

- [x] F031 — Build a Devices & Sensors page with supported, denied, active, and unavailable states.
- [x] F032 — Add explicit permissions, actionable errors, and reliable resource cleanup.
- [x] F033 — Support front/rear camera switching and available-device selection.
- [x] F034 — Add live camera preview, still capture, retake, and save controls.
- [x] F035 — Add document crop, rotation, and perspective correction.
- [x] F036 — Check document blur, glare, framing, and readability before upload.
- [x] F037 — Support image/PDF upload and manual alternatives when camera access is unavailable.
- [x] F038 — Add QR/barcode scanning for check-in, document identification, and catalog lookup.
- [x] F039 — Add a consent-controlled, dated photo journal for clinician review.
- [x] F040 — Add voice-note recording, transcription, review, correction, and deletion.

## 5. Mobile movement, pulse, and external sensors

- [x] F041 — Read available accelerometer and orientation data during explicit sessions.
- [x] F042 — Implement a foreground motion-based pedometer with labelled step estimates.
- [x] F043 — Save movement-session history with duration, source, interruptions, and quality.
- [x] F044 — Add optional on-device posture guidance with confidence thresholds.
- [x] F045 — Add camera-assisted exercise repetition estimates for supported movements.
- [x] F046 — Add user-paced breathing exercises with optional accessible haptic/audio cues.
- [x] F047 — Implement experimental camera pulse estimation using actual PPG/rPPG signal processing.
- [x] F048 — Reject poor pulse signals and show motion/lighting/framing quality feedback.
- [x] F049 — Connect compatible Bluetooth heart-rate monitors on supported platforms.
- [x] F050 — Add documented external-device adapters with timestamps, reconnection, and stale-data handling.

## 6. Mental-wellbeing games and improvements

- [x] F051 — Rebuild guided breathing with explicit start/pause/finish, adjustable pacing, and a no-hold option.
- [x] F052 — Improve bubble-pop with responsive targets, keyboard/touch access, and a calm untimed mode.
- [x] F053 — Add an optional five-senses grounding activity with skip and accessibility alternatives.
- [x] F054 — Add gentle memory/pattern games with optional difficulty and no diagnostic scoring.
- [x] F055 — Add attention/visual-tracing activities with low-motion and nonvisual alternatives.
- [x] F056 — Add mindful drawing/coloring with local-first drafts and an explicit save action.
- [x] F057 — Add optional self-reported mood check-ins and private reflective journaling.
- [x] F058 — Add a screen-light sleep wind-down routine with optional audio and configurable timers.
- [x] F059 — Persist separate game sessions and user-reported outcomes; remove fixed cohort stress and assumed mood results.
- [x] F060 — Make participation rewards optional, server-validated, idempotent, and independent of reported mood or clinical improvement.

## 7. Vision, hearing, and voice-check improvements

- [x] F061 — Add vision-screen setup for display scaling, viewing distance, lighting, and glasses/contact use.
- [x] F062 — Replace static eye-chart results with randomized optotype answers recorded separately for each eye.
- [x] F063 — Add licensed/approved color-vision screening material with recorded answers and display limitations.
- [x] F064 — Add near-reading/contrast comfort checks with recorded setup and no automatic eye-disease diagnosis.
- [x] F065 — Improve the eye-break coach with start/pause/snooze, visible break sessions, and background-aware elapsed time.
- [x] F066 — Add hearing-check setup, comfortable low-volume confirmation, gentle tone envelopes, and an immediate stop control.
- [x] F067 — Add explicit left/right audio-channel checks on compatible stereo headphones.
- [x] F068 — Separate tone playback from heard/not-heard/skipped responses; save actual trial history without invented dB HL thresholds.
- [x] F069 — Replace fabricated voice biomarkers with opt-in recording, playback, waveform, and quality-gated nonclinical pitch estimates.
- [x] F070 — Store screening outcomes as incomplete/limited/self-reported as appropriate, with retest history and clinician referral options.

## 8. Personal records, appointments, and consultations

- [x] F071 — Create a unified care timeline and metric trends with provenance, source filters, and correction history.
- [x] F072 — Add owner-scoped document search/tags, export/deletion workflows, and retention controls.
- [x] F073 — Add time-limited record sharing, consent revocation, and access history.
- [x] F074 — Add an emergency profile, verified contact updates, and session/recovery-contact management.
- [x] F075 — Build clinician/provider onboarding with verified credentials and service descriptions.
- [x] F076 — Publish genuine availability and implement transactional appointment-capacity reservation.
- [x] F077 — Track actual appointment confirmation, rescheduling, cancellation, and waitlists.
- [x] F078 — Implement teleconsultation device checks, waiting room, secure video, and connection recovery.
- [x] F079 — Add source-grounded encounter drafts, clinician-reviewed notes, referrals, and follow-up tasks.
- [x] F080 — Add a notification inbox and support conversations with ownership, attachments, deadlines, and escalation.

## 9. Campus operations, medication, commerce, and insurance

- [x] F081 — Verify campus membership and enforce campus-specific administrative permissions.
- [x] F082 — Implement health-camp registration, check-in, station progress, and records.
- [x] F083 — Persist clinician-reviewed medication plans and account-owned dose logs.
- [x] F084 — Add refill reminders and deduplicated adherence rewards based on verified plans and user reports.
- [ ] F085 — Build pharmacy prescription review and authorized substitution workflows.
- [x] F086 — Connect inventory, serviceability, cross-device carts, and actual provider fulfilment updates.
- [ ] F087 — Implement payments, signed webhooks, reconciliation, receipts, refunds, and returns.
- [x] F088 — Add insurer-backed policy eligibility and verified network-hospital/service directories.
- [x] F089 — Submit claims/documents through actual integrations and track settlements/disputes from real events.
- [x] F090 — Manage reviewed health content, verified support contacts, and scoped operational reports with source/revision dates.

## 10. Native mobile, accessibility, and release reliability

- [x] F091 — Add an installable PWA with an offline application shell and clear connectivity states.
- [x] F092 — Add a native iOS integration layer for permission-scoped Apple HealthKit data.
- [x] F093 — Add a native Android integration layer for permission-scoped Health Connect data.
- [ ] F094 — Add native pedometer history and OS-managed background activity synchronization.
- [x] F095 — Complete keyboard, screen-reader, indigo-theme, responsive, and reduced-motion support.
- [x] F096 — Optimize route bundles, long lists, image delivery, and device-session battery use.
- [x] F097 — Gate releases on end-to-end, isolation, recovery, accessibility, and real-device tests.
- [x] F098 — Add secret/dependency scanning and reproducible dependency versions across CI/containers.
- [x] F099 — Add active-schema migrations, private-storage protection, backups, and restore drills.
- [x] F100 — Add production readiness checks, redacted observability, load tests, and incident alerts.

## Implementation dependencies

Complete the identity/data foundation before enabling connected agents or sensitive
sensor-record persistence. Deliver the five core components through F011–F030;
start camera and permission work in parallel where independent. Native integrations
and external providers require their respective app targets, hardware, credentials,
and verification. Use explicit unavailable states when those dependencies are absent.

Related plans:
- [Existing games, vision, hearing, and sensor review](existing-wellbeing-sensor-review.md)
- [Detailed five-component and sensor plan](implementation-todo.md)
- [Application audit and evidence](application-audit-2026-09-13.md)
