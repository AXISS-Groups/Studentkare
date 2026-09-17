# Clinical Artifact Sign-Off Ledger (G0.5)

## Overview
This registry tracks formal medical advisor sign-offs for all clinical decision logic, red-flag rules, triage timers, first-aid protocol cards, and crisis phrase lists in accordance with Studentkare Build Doc v0.7.

> [!WARNING]
> Unsigned clinical artifacts render a visible "Pending Clinical Sign-Off" banner in non-production environments and **block application startup** in production (`APP_ENV=production`).

---

## Clinical Artifact Sign-Off Matrix

| Artifact ID | Artifact Description | Code / Data Source | Version | Signed By | Date | Sign-Off Status |
| --- | --- | --- | --- | --- | --- | --- |
| `RED_FLAG_LIST_V1` | Red-flag symptom rules (`evaluateRedFlags`) | `src/screens/medical/MeoDashboardScreen.tsx` | | | | PENDING |
| `CAL_TIMERS_V1` | Clinical Acuity Level (CAL 1–5) response timers | `src/data/medicalIncidentData.ts` | | | | PENDING |
| `FIRST_AID_CARDS_V1` | Pre-hospital AI first-aid guidance protocols | `src/data/medicalIncidentData.ts` | | | | PENDING |
| `CRISIS_PHRASES_V1` | Multilingual crisis phrase floor table | `src/ai/crisisGate.ts` | | | | PENDING |
| `IMMINENT_RISK_V1` | Imminent self-harm risk escalation protocol | `src/ai/crisisGate.ts` | | | | PENDING |

---

## Clinical Reviewer Sign-Off Procedure
1. Review artifact code logic, threshold numbers, and message copy against relevant Indian clinical guidelines (e.g. Tele-MANAS protocols, NMC guidelines).
2. Populate the `Signed By`, `Version`, `Date`, and update `Sign-Off Status` to `SIGNED`.
3. Commit the updated ledger and metadata headers in `src/lib/clinicalSignoff.ts`.
