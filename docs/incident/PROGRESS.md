# Incident Subsystem Implementation Progress

## Task Tracking & Verification Log

### Setup & Repo Map
- **Date**: 2026-09-17
- **Files Created**:
  - [`docs/incident/REPO_MAP.md`](file:///Users/avks/Desktop/Projects%20/SA%20Care/docs/incident/REPO_MAP.md)
  - [`docs/incident/PROGRESS.md`](file:///Users/avks/Desktop/Projects%20/SA%20Care/docs/incident/PROGRESS.md)
- **Status**: Completed repo mapping of entry points, `crisisGate.ts` callers, auth flow, AI call sites, Constitution, migrations, and test runners.

---

### G0.1 — Crisis Gate Fails Closed
- **Date**: 2026-09-17
- **Status**: COMPLETED
- **Changes**:
  - Refactored `evaluateCrisisGate()` to return discriminated union `{ status: 'crisis' | 'clear' | 'error', isCrisis: boolean, kind, message, teleManasPrimary, teleManasTollFree, emergencyNumber, counsellorContact }`.
  - Added `evaluateCrisisGateAsync()` wrapping execution in a 1500ms timeout guarantee. Timeouts or classifier failures return `status: 'error'` with `isCrisis: true` (fail closed).
  - Enforced deterministic phrase floor mapping (English, Hindi, Telugu, Hinglish) marked `TODO(clinical-review)`. Secondary classifiers may ONLY escalate to crisis, never demote.
  - Standardized crisis card emergency resource links: Tele-MANAS (`14416` & `1-800-891-4416`), `112`, and Campus Counsellor (`1800-599-0019`).
- **Files Touched**:
  - [`src/ai/crisisGate.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/crisisGate.ts)
  - [`src/ai/__tests__/crisisGate.test.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/__tests__/crisisGate.test.ts)
- **Test Evidence**:
  - `npx vitest run src/ai/__tests__/crisisGate.test.ts` -> 10/10 tests passed (100% recall, exception fault-injection, timeout >1500ms fail-closed, floor protection, multilingual phrases).

---

### G0.2 — OTP Auth Bypass Removal & Rate Limiting
- **Date**: 2026-09-17
- **Status**: COMPLETED
- **Changes**:
  - Completely removed offline mock token fallback from `src/data/api.ts` `verifyOtp()` and `signup()`. All failed authentication requests fail cleanly with `success: false`.
  - Updated backend `/api/auth/otp/verify` to return HTTP 401 Unauthorized on invalid, expired, or replayed OTP challenges.
  - Implemented rate limiting on OTP verification per phone identifier (5 attempts max per 300s window) and per IP address (20 attempts max per 900s window).
- **Files Touched**:
  - [`src/data/api.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/data/api.ts)
  - [`backend/services/workflow_auth.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/workflow_auth.py)
  - [`backend/tests/test_otp_security.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/tests/test_otp_security.py)
  - [`backend/tests/test_api_endpoints_unit.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/tests/test_api_endpoints_unit.py)
  - [`backend/tests/test_workflow_api.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/tests/test_workflow_api.py)
- **Test Evidence**:
  - `PYTHONPATH=backend ./backend/.venv/bin/pytest backend/tests/test_otp_security.py` -> 4/4 tests passed (rejected 401, replayed 401, expired 401, rate-limit threshold).
  - Full backend test suite `PYTHONPATH=backend ./backend/.venv/bin/pytest backend/tests/` -> 258/258 tests passed cleanly.

---

### G0.3 — AI Constitution Enforced Wrapper
- **Date**: 2026-09-17
- **Status**: COMPLETED
- **Changes**:
  - Created centralized AI Constitution wrappers for frontend ([`src/ai/client.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/client.ts)) and backend ([`backend/services/ai_client.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/ai_client.py)).
  - Implemented fail-closed assertion: AI model execution throws an error if Constitution rules fail to load or invalid rule IDs are specified.
- **Files Touched**:
  - [`src/ai/client.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/client.ts)
  - [`src/ai/__tests__/ai_constitution_wrapper.test.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/__tests__/ai_constitution_wrapper.test.ts)
  - [`backend/services/ai_client.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/ai_client.py)
  - [`backend/tests/test_ai_constitution.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/tests/test_ai_constitution.py)
- **Test Evidence**:
  - `npx vitest run src/ai/__tests__/ai_constitution_wrapper.test.ts` -> 3/3 tests passed.
  - `PYTHONPATH=backend ./backend/.venv/bin/pytest backend/tests/test_ai_constitution.py` -> 3/3 tests passed.

---

### G0.4 — Own-Domain Readiness
- **Date**: 2026-09-17
- **Status**: COMPLETED
- **Changes**:
  - Removed all hardcoded `care.studentalumni.ai` domain strings across email services, templates, and marketing agents.
  - Replaced hardcoded links with `APP_BASE_URL` environment configuration (`os.environ.get("APP_BASE_URL", "http://localhost:3000")`).
  - Authored comprehensive cutover runbook [`docs/incident/DOMAIN_CUTOVER.md`](file:///Users/avks/Desktop/Projects%20/SA%20Care/docs/incident/DOMAIN_CUTOVER.md).
- **Files Touched**:
  - [`backend/core/email.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/core/email.py)
  - [`backend/core/email_templates.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/core/email_templates.py)
  - [`backend/services/agents/ambassador_kit_agent.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/agents/ambassador_kit_agent.py)
  - [`docs/incident/DOMAIN_CUTOVER.md`](file:///Users/avks/Desktop/Projects%20/SA%20Care/docs/incident/DOMAIN_CUTOVER.md)

---

### G0.5 — Medical Advisor Sign-Off Workflow
- **Date**: 2026-09-17
- **Status**: COMPLETED
- **Changes**:
  - Created [`docs/incident/CLINICAL_SIGNOFF.md`](file:///Users/avks/Desktop/Projects%20/SA%20Care/docs/incident/CLINICAL_SIGNOFF.md) matrix tracking clinical artifacts (`RED_FLAG_LIST_V1`, `CAL_TIMERS_V1`, `FIRST_AID_CARDS_V1`, `CRISIS_PHRASES_V1`, `IMMINENT_RISK_V1`).
  - Implemented runtime check [`src/lib/clinicalSignoff.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/lib/clinicalSignoff.ts): displays a warning banner in non-production environments and throws a fatal error blocking application startup in production (`APP_ENV=production`) if unsigned.
- **Files Touched**:
  - [`docs/incident/CLINICAL_SIGNOFF.md`](file:///Users/avks/Desktop/Projects%20/SA%20Care/docs/incident/CLINICAL_SIGNOFF.md)
  - [`src/lib/clinicalSignoff.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/lib/clinicalSignoff.ts)
  - [`src/lib/__tests__/clinicalSignoff.test.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/lib/__tests__/clinicalSignoff.test.ts)
- **Test Evidence**:
  - `npx vitest run src/lib/__tests__/clinicalSignoff.test.ts` -> 2/2 tests passed (non-prod banner rendering & production startup block assertion).

---

### G0.6 — Accessibility Baseline & Touch Target Hardening
- **Date**: 2026-09-17
- **Status**: COMPLETED
- **Changes**:
  - Added `minHeight: 44, minWidth: 44` to `Button.tsx` base styles to guarantee 44pt minimum touch target sizing.
  - Ensured `accessibilityLabel` and `accessibilityRole="button"` props are set across shared controls in `Header.tsx` and `Button.tsx`.
  - Created automated vitest a11y test suite [`src/lib/__tests__/accessibility_baseline.test.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/lib/__tests__/accessibility_baseline.test.ts).
- **Files Touched**:
  - [`src/components/Button.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/components/Button.tsx)
  - [`src/components/Header.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/components/Header.tsx)
  - [`src/lib/__tests__/accessibility_baseline.test.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/lib/__tests__/accessibility_baseline.test.ts)
- **Test Evidence**:
  - `npx vitest run src/lib/__tests__/accessibility_baseline.test.ts` -> 3/3 tests passed.
