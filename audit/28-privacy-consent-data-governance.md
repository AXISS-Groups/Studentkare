# 28 — Privacy, Consent & Data Governance (DPDP)

**New dimension, created 2026-10-17** (`main` @ `ad01230`).

## Why this needs its own report
The product holds student health data in India, so the DPDP Act 2023 applies. Since the baseline the backend has added:
- consent records at signup
- DPDP account erasure with a sealed, time-limited archive
- rotating check-in passes
- remembered devices
- SOS alerts to third parties
- student requests and campus departure

Each of these creates or destroys personal data, or shares it with a third party (campus security, an emergency contact). The original audit treated privacy only through the security lens. Retention, consent provenance and data-sharing boundaries need independent tracking.

## Current state (verified)

| Capability | Code | Migration | Tests |
|---|---|---|---|
| Consent recorded at signup, versioned, purposes, language; "no account without it" | `workflow_auth.py` signup path; `GET /api/auth/consent`, `GET /api/auth/consents` (`workflow_auth.py:360,527`) | `e5a7b3c90d14_add_consent_records.py` | `test_signup_consent.py` |
| Account erasure: 7-day cancellable request, then delete every row reachable by FK (discovered from metadata), keep a Fernet-sealed archive for `DPDP_ARCHIVE_RETENTION_DAYS`, readable only by a super admin with a recorded reason | `services/erasure.py` (285 lines), router mounted `main.py:260` | `c6a2e4f83b59_add_erasure_archives.py` | `test_erasure.py` |
| Check-in pass: server-signed, rotates every 30 s, single use per step, offline window held in memory only | `services/check_in_pass.py` | — | `test_member_profile.py` (imports `check_in_pass`) |
| Remembered device: opt-in, never creates a session without a code | `workflow_auth.py:644-680` | `a3f9c2d7e815_add_remembered_devices.py` | `test_remembered_device.py` |
| SOS: alert row committed first; each outbound attempt recorded with its real status; no health data in messages | `services/emergency_api.py` | `b5f1d3e72a48_add_sos_alerts.py` | `test_sos.py` |
| Campus departure: ends the campus link only; records untouched | `services/campus_departure.py` | `a4e9c2d61f37_add_campus_departures.py` | `test_campus_departure.py` |
| Ayush chat history kept only with opt-in | commit `0e10f97` | — | — |
| Admin integrations never return plaintext secrets | commit `77979cc` | — | `test_integration_secrets.py` |
| Lab reports held for doctor review before release | commit `97855a3` | `c8d2f4a61e93_hold_lab_reports_for_doctor_review.py` | — |

These are well-designed. The docstrings state the honesty and fail-closed rules each module follows, and each has tests. **None of the tests was executed in this audit**, and CI has not run them since 2026-10-16 (TD-39).

## Findings

### Finding: PRIV-01 — Erasure depends on a key no deploy config provides
**TD-40** (authoritative). Without `DPDP_ARCHIVE_KEY` and `DPDP_ARCHIVE_RETENTION_DAYS`, erasure "stays paused". Any statutory deadline then lapses silently unless someone watches the queue. Add an ops alert for erasure requests that are due but paused.

### Finding: PRIV-02 — Health documents stored as plaintext bytes
**TD-27** (authoritative). Erasure deletes live rows, but database backups keep plaintext documents for as long as backups are retained. That retention is not documented and cannot be verified from the repo.
- **Recommendation:** Document the backup retention period and align it with the erasure promise made to students ("destroyed after N days"), or encrypt document content with per-account keys so erasure can crypto-shred.

### Finding: PRIV-03 — Erasure archive lives in the same database
- **Severity:** Medium
- **Status:** OPEN (new; inference — not traced row by row)
- **Location:** `services/erasure.py` (archive table from `c6a2e4f83b59`)
- **Evidence:** The sealed archive is stored in the main Postgres, encrypted with a single `DPDP_ARCHIVE_KEY`.
- **Impact:** Whoever holds the DB plus that key can read every erased account. Key rotation and destruction are not covered by any visible code or runbook.
- **Recommendation:** Document key custody and rotation in `docs/runbooks`. Consider a per-archive data key wrapped by the master key, so destroying an archive does not depend on deleting rows.

### Finding: PRIV-04 — Campus consoles designed without a consent gate
**TD-47** (team-reported, NOT REVALIDATED). High.

### Finding: PRIV-05 — Translations of consent wording are unreviewed
**TD-44**. Consent given through an unreviewed translation may not be informed consent.

### Finding: PRIV-06 — Third-party disclosure on SOS
- **Severity:** Recommendation
- **Evidence:** SOS sends WhatsApp messages to campus security numbers and the student's emergency contact via OpenWA. Messages carry no health data, per the module docstring.
- **Recommendation:** Record in the privacy notice and DPIA that SOS discloses identity and location to these recipients, and that WhatsApp is the processor.

### Finding: PRIV-07 — Rule L commerce firewall not enforced in the database
**TD-03** (CRITICAL, authoritative). It remains the largest data-governance gap.

## What is good
- Consent is versioned and records language, and signup refuses without it.
- Erasure discovers related rows from metadata, so a new table cannot be missed. The student is told exactly what is kept and for how long.
- Several "honesty" fixes removed fabricated states that would have been misleading data processing: an invented ambulance ETA, a fake refund, invented HITL actions, a pre-filled emergency card.
