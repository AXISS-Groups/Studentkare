# Existing mental-wellbeing, vision, hearing, and sensor features

Source review: 13 September 2026. This extends the application audit and informs
the revised [top-100 backlog](top-100-feature-todos.md). Items described as present
are source implementations, not claims of clinical validation or physical-device testing.

“Hearing impulse” is interpreted here as hearing/audio checks; pulse/heartbeat is
tracked separately. Use gentle user-controlled tones, not sudden loud impulses.

## What exists and how it should improve

| Feature | Current implementation | Required improvement | Backlog |
| --- | --- | --- | --- |
| Guided breathing | A working phase timer cycles through 4/7/8 seconds while its tab is open. No explicit session start/pause/finish; returning to the tab can leave display state out of step with the restarted timer. The UI says its ring expands, but no phase-dependent size is applied. | Explicit lifecycle, elapsed-time timing, phase reset, adjustable/no-hold pacing, finite sessions, reduced-motion alternatives, and no guaranteed pulse-lowering claim. | F051 |
| Thought bubble pop | Clickable bubbles and score increments exist. Targets use fixed percentage positions and labels may overlap or clip on small screens. | Responsive target placement, keyboard/touch support, calm optional scoring, restart/reset per session, and neutral completion language rather than claiming stress is cured. | F052 |
| Stress radar | Three fixed cohort stress values are shown as protected telemetry. | Replace with optional individual self-report and consent-controlled history. Only add cohort reporting if actual data and independently enforced aggregation thresholds exist. | F057, F059 |
| Game session saving | Sends a fixed `mood: relaxed` and client-chosen reward amount; backend creates a document and echoes points without a verified reward ledger. | Save actual chosen outcome/duration/game identity, completion/abandon state, account ownership, and idempotent rewards; keep game points separate from clinical outcomes. | F059, F060 |
| Eye acuity screen | Displays fixed letter rows and a preset acuity result without collecting answers or calibrating screen size/distance. | Calibrated setup, randomized symbols, left/right-eye answers, and explicitly limited screening results. No result until the relevant task is completed. | F061, F062, F070 |
| Color-vision score | Displays a score without a plate-response interaction. | Approved/licensed test material, user responses, display limitations, and a non-diagnostic result. | F063 |
| Eye-break/posture coach | A 20-minute interval and stretch instructions exist. Pause state has no setter/control; posture checkmarks are static instructions, not camera observations. | Start/pause/snooze, clock-based elapsed time, real break duration, explicit reminder-vs-detection labels, and optional separately validated camera posture guidance. | F044, F065 |
| Hearing tones | Real browser audio oscillators play frequencies. Clicking a playback button also marks the tone heard. Each playback creates an audio context without closing it. | Separate playback from responses, comfortable-level setup, bounded tone durations, left/right trials, reusable/closed audio resources, and cancellation on tab change/close. | F066–F068 |
| ENT automatic sweep | After timed playback it randomizes hearing, vision, and voice metrics, independently of responses or microphone capture. Timers are not cancelled on modal close. | Independent task state machines, actual response capture, unknown/incomplete states, no fabricated thresholds, and complete resource cleanup. | F032, F068–F070 |
| Voice acoustics | Preset or randomized fundamental frequency/jitter/shimmer and healthy-status text; no microphone analysis in the reviewed ENT module. | Opt-in real recording, playback, waveform and quality-gated descriptive pitch; do not claim vocal-fold health or disease exclusion from this feature. | F040, F069 |
| rPPG scanner panel | Its start handler only sets scanning/progress to 10%; no camera acquisition or signal-processing completion exists. | Consolidate pulse panels into one real experimental acquisition/processing pipeline with progress based on acquired usable signal, cancellation, quality rejection, and device validation. | F047, F048 |
| Camera/skin scanner modal | Camera preview exists, but reported physiological/skin results are randomized and can be submitted to the records endpoint. | Keep capture; replace synthetic measurement claims with supported acquisition paths. Store photos for review or validated observations with source/quality. | F008, F034, F039, F047, F048 |
| Mobile pedometer | Starts at 7,420 and adds random steps every two seconds; no motion sensor listener. | Start from an empty/new session; use real available sensor data, label estimates, support permissions/stop/pause, and handle unavailable sensors honestly. | F041–F043 |
| Acoustic respiratory panel | Returns a fixed cough/breathing/wheezing string after a timeout without recording. | Reuse the voice-note pipeline for clinician review; remove simulated disease classification. The source exists; its availability in the active route tree was not established in this review. | F008, F040, F069 |

## Source evidence

- `src/components/health/MentalHealthGameSuiteModal.tsx:23–47`: breathing timer.
- Same file, `65–82`: fixed mood and client-provided reward request.
- Same file, `144–205`: breathing/bubble presentation.
- Same file, `209–237`: hard-coded cohort stress and privacy claims.
- `backend/services/workflow_api.py:817–840`: mental-game save/points response.
- `src/components/health/ENTHearingVisionScannerModal.tsx:15–25`: preset results.
- Same file, `27–83`: audio playback and randomized sweep results.
- Same file, `175–180`: playback automatically records a heard response.
- Same file, `225–260`: static acuity/color and voice result displays.
- `backend/services/workflow_api.py:843–874`: ENT result persistence endpoint.
- `src/components/health/StudyPostureCoachWidget.tsx:5–23,71–99`: reminder and stretch state.
- `src/components/RPPGVitalsCameraScanner.tsx:25–33`: incomplete scan handler.
- `src/components/health/CameraSkinAndVitalsScannerModal.tsx:46–61,71–139`: camera acquisition, random results, save flow.
- `src/components/MobileStepCounterSensor.tsx:16–36`: seeded/random steps and legacy identity-based synchronization.
- `src/components/CameraAcousticRespiratoryScanner.tsx:16–23`: fixed timeout result.

## New mental-wellbeing activities to add

The revised backlog includes grounding, gentle memory/pattern activities,
attention/tracing alternatives, mindful drawing/coloring, private optional mood
check-ins/journaling, and sleep wind-down routines. These are wellbeing activities;
scores do not diagnose a condition or demonstrate treatment effectiveness.

Each activity should offer a short session, explicit exit, optional scoring,
accessible controls, and user-chosen outcomes. Rewards must not pressure users to
report feeling better or expose their mental-health information.

## Screening design boundaries

- Vision needs display scaling and viewing-distance setup; ordinary phone pixels
  and unverified distance do not establish clinical Snellen/LogMAR accuracy.
- Digital audio gain is not calibrated dB HL. Headphone type, OS volume, device
  output, and ambient noise affect perceived tones. Avoid automatic volume
  escalation; provide comfortable-volume setup and immediate stop.
- Camera estimates must reject unusable signal, distinguish estimates from
  device measurements, and never manufacture a normal result on failure.
- Save results only for tasks actually performed, including device/setup,
  completion, source, timestamp, and limitations. Model/API defaults must not
  create reassuring measurements when input is missing.
- Screen for urgent self-reported symptoms through appropriate care escalation;
  do not use a game, image, or uncalibrated audio test to rule out emergencies.

## Improvement sequence

1. Remove synthetic measurement/result persistence and repair incomplete/blocked flows.
2. Consolidate shared modal, permission, capture, audio, timer, and session-storage primitives.
3. Upgrade existing breathing/bubble/eye-break features and add actual hearing/vision responses.
4. Add the new games and privacy-respecting self-report history.
5. Implement sensor acquisition and experimental pulse processing with quality gating.
6. Validate on physical devices and compare measurement estimates with suitable references.

The two-hour backend jobs may reconcile saved sessions, check service availability,
or refresh approved support information. They do not initiate games, hearing tones,
vision tests, camera capture, or mental-state assessment without user action.
