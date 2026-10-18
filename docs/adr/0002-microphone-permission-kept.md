# 0002. Microphone permission stays in the app for planned calls

- **Status:** Accepted
- **Date:** 2026-10-13
- **Deciders:** product owner (`docs/remediation-plan-2026-10-09.md`, mobile section)

## Context
The native app declares `RECORD_AUDIO` / `NSMicrophoneUsageDescription`. No shipped feature
uses the microphone yet.

## Decision
Keep the permission for the planned clinician calls instead of removing it and adding it back later.

## Consequences
- App store review may ask why an unused permission is declared. Before every store
  submission, either ship the calls feature or remove the permission.
- The permission is requested only when a feature needs it, never at launch.
