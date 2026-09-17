# Repository Map — Studentkare Incident & Emergency Subsystem

## 1. Frontend Entry Points
- **Main React Entry**: [`src/main.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/main.tsx)
- **App Shell & Routing**: [`src/App.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/App.tsx)
- **Workflow Router**: [`src/lib/workflowRouting.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/lib/workflowRouting.ts)
- **Care Feature Module**: [`src/features/care/module.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/features/care/module.ts)
- **Store Container**: [`src/store/AppStores.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/store/AppStores.tsx)

## 2. Backend Entry Points
- **FastAPI Core App**: [`backend/main.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/main.py)
- **Auth & Session Service**: [`backend/services/workflow_auth.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/workflow_auth.py)
- **Workflow API Router**: [`backend/services/workflow_api.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/workflow_api.py)
- **Member Profile Router**: [`backend/services/member_profile_api.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/member_profile_api.py)
- **Preventive Care Router**: [`backend/services/preventive_care.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/preventive_care.py)
- **Integrations Config**: [`backend/services/integration_config.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/integration_config.py)

## 3. `crisisGate.ts` Location & Callers
- **Location**: [`src/ai/crisisGate.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/crisisGate.ts)
- **Callers**:
  1. [`src/ai/careCopilot.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/careCopilot.ts)
  2. [`src/ai/departments/d1ServiceDesk.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/departments/d1ServiceDesk.ts)
  3. [`src/screens/medical/MedicalIncidentScreen.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/screens/medical/MedicalIncidentScreen.tsx)
  4. [`src/screens/wellbeing/WellbeingScreen.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/screens/wellbeing/WellbeingScreen.tsx)
  5. [`src/screens/vault/MedicationInfoScreen.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/screens/vault/MedicationInfoScreen.tsx)
  6. [`src/ai/__tests__/crisisGate.test.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/__tests__/crisisGate.test.ts)
  7. [`src/ai/__tests__/medication_safety.test.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/__tests__/medication_safety.test.ts)

## 4. OTP / Auth Flow & Offline Fallbacks
- **Frontend Auth API**: [`src/data/api.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/data/api.ts) (`verifyOtp()` - lines 73–106 contained `ALLOW_OFFLINE_AUTH` mock token fallback)
- **Auth ViewModels & Screens**:
  - [`src/features/auth/viewmodel/AuthViewModel.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/features/auth/viewmodel/AuthViewModel.ts)
  - [`src/screens/auth/Flow01SignupScreen.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/screens/auth/Flow01SignupScreen.tsx)
  - [`src/screens/auth/Flow03LoginScreen.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/screens/auth/Flow03LoginScreen.tsx)
  - [`src/screens/auth/AuthenticatedFlowScreen.tsx`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/screens/auth/AuthenticatedFlowScreen.tsx)
- **Backend OTP Router**: [`backend/services/workflow_auth.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/workflow_auth.py) (`/api/auth/otp/send`, `/api/auth/otp/verify`)
- **OTP Dispatch**: [`backend/services/otp_delivery.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/otp_delivery.py)

## 5. AI / Model Call Sites
- [`src/ai/careCopilot.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/careCopilot.ts)
- [`src/ai/claimsReviewer.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/claimsReviewer.ts)
- [`src/ai/departments/d1ServiceDesk.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/departments/d1ServiceDesk.ts)
- [`backend/services/agents/qa_agent.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/agents/qa_agent.py)
- [`backend/services/agents/daily_audit_agents.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/agents/daily_audit_agents.py)
- [`backend/services/agents/specialized.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/agents/specialized.py)
- [`backend/services/claims_engine.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/claims_engine.py)

## 6. AI Constitution Location
- **Path**: [`src/ai/constitution.ts`](file:///Users/avks/Desktop/Projects%20/SA%20Care/src/ai/constitution.ts) (Contains `CONSTITUTION_RULES` Rule-A to Rule-D, Rule-J1 to Rule-J4, Rule-K1 to Rule-K10)

## 7. Database Migration Tool
- **Alembic Engine**: Configuration in [`alembic.ini`](file:///Users/avks/Desktop/Projects%20/SA%20Care/alembic.ini) and migrations in [`backend/alembic/`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/alembic)
- **Programmatic Startup Runner**: [`backend/services/migrations.py`](file:///Users/avks/Desktop/Projects%20/SA%20Care/backend/services/migrations.py)

## 8. Test Runners & Suites
- **Frontend Test Suite**: `npm test` (vitest)
- **Backend Test Suite**: `pytest` (runs Python tests under `backend/tests/`)
