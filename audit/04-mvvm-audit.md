# 04 — MVVM Architecture Audit

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

| Original violation | Status | Evidence |
|---|---|---|
| 1. Hardcoded data in operational views | PARTIALLY RESOLVED (TD-09) | `/lab-queue` → `LabSampleToReportScreen`, `/dispensing` → `PharmacyDispensingScreen` (live `/work/dispenses` via `FulfilmentQueuePanel`), `/returns` → `PartnerRequestsPanel` (live). ~15 vendor screens still local demo state; all now role-gated |
| 2. API calls from UI components | OPEN | `PaymentCheckoutModal.tsx` fake webhook still present (unreferenced); 2 raw `fetch(` remain under `src/features` |
| 3. `RecordsStore.addRecord` awards points | OPEN | `src/features/health/store/RecordsStore.tsx:19` |
| 4. Parallel unused MVVM tree | OPEN (TD-06) | `src/modules` minus m18; scaffolder still targets it |
| 5. Global navigator | OPEN | unchanged |
| 6. Route policy duplicated in `App.tsx` | OPEN (TD-25) | `App.tsx:80+` vendor list still present |
| Live stores seeded from mockData | PARTIALLY RESOLVED (TD-20) | only `FabricStore`, `RecordsStore` remain |

New features (`src/features/{account,campus,requests,reminders}`) follow viewmodel + views with message keys (`Said`) returned from ViewModels — the live MVVM pattern is consolidating. Native screens share ViewModels/`http` with web (report 29).

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## Verdict

**MVVM is defined well and followed partially.** A good contract exists (`src/core/store/ViewModel.ts`) and ~62 MobX ViewModels under `src/features/*/viewmodel` follow it. But most of the UI that users actually see — ≈190 files under `src/screens/` and ~60 large widgets in `src/components/` — is "fat view" React: local `useState`, hardcoded data, and in some cases direct `fetch`. A second, complete MVVM architecture (`src/modules/m01..m20`) was built in parallel and is not used by the running app.

Rough proportion (by file count, non-test):

| UI code | Files | Uses a ViewModel |
|---|---|---|
| `src/features/*/views` + `screens` | ~150 | majority (feature views bind to ViewModels) |
| `src/screens/**` | ~190 | **4** files reference a ViewModel |
| `src/components/*.tsx` top level | ~60 | effectively none; self-contained demo widgets |
| `src/modules/*/view` | 20 | yes, but dead code |

## Model

- **API / transport models:** hand-written TS types in `src/data/workflowTypes.ts` → `src/data/types/*`. Not generated from the backend. Acceptable short-term; see 15.
- **Domain models:** `src/modules/*/domain/entities.ts` (20 copies, dead). Live features mostly use the transport types directly as domain types.
- **Data access:** `src/data/services/api.ts` is a 658-line object-of-functions per backend area (`authApi`, `aiApi`, `adminApi`…). A *second* copy `src/data/api.ts` (670 lines) still exists and differs (`ingestVitals` exists only in the old one). Knip marks `src/data/services/api.ts` as unused while `src/data/api.ts` is the live one — the "moved" file is the dead one.
- **Mock data inside the model layer:** live MobX stores are initialised from `src/data/datasets/mockData.ts`:
  - `src/features/health/store/RecordsStore.tsx:11` `records: HealthRecord[] = initialRecords;`
  - `src/features/health/store/StudentStore.tsx` (`initialStudent = mockStudents[0]`)
  - `src/features/clinician/store/ClinicianStore.tsx`, `claims/store/ClaimsStore.tsx`, `care/store/FabricStore.tsx`, `camp/store/CampStore.tsx`

## View

Typical vendor screen (`src/screens/vendor/LabQueueScreen.tsx`, 1,280 lines): 13 `useState` hooks, `DEMO_SAMPLES` array at line 51, view-state machine (`'data' | 'loading' | 'empty' | 'error'`) set locally, inline style objects with raw hex. No ViewModel, no repository, no backend call. The same pattern repeats in `VendorRxReviewScreen.tsx` (`INITIAL_PRESCRIPTIONS`, line 65), `DispenseRegisterScreen.tsx` (`DEMO_DISPENSE_ENTRIES`, line 48) and the other vendor screens.

## ViewModel

The live ViewModels are reasonably sized (largest `src/features/auth/viewmodel/AuthViewModel.ts` 270 lines; total 4,396 lines across feature ViewModels). No god-ViewModel was found. Issues are about *coverage*, not ViewModel quality.

## MVVM violations

**1. Hardcoded data and workflow logic inside Views (operational screens)**
- Location: `src/screens/vendor/*.tsx` (12 files, 800–1,280 lines each)
- Problem: Prescription review, dispensing sign-off, lab queue, settlements and staff roles are implemented as local component state over demo arrays.
- Why it violates MVVM: The View is acting as Model and ViewModel. There is no data source to swap for a real API.
- Impact: These screens look finished but persist nothing. Turning them real means rewriting, not wiring. Combined with `public: true` routes (see 17), they are publicly reachable.
- Direction: One `VendorQueueViewModel` per workflow backed by the existing backend endpoints (`/api/work/prescriptions`, `/api/work/dispenses`, `/api/work/lab-orders`, `/api/v1/pharmacy/rx-reviews` already exist in `clinical_api.py` / `workflow_api.py`).

**2. API calls directly from UI components**
- Location: `src/components/health/HITLApprovalConsole.tsx:15,56` (`fetch('/api/ops/approvals')`, `fetch('/api/ops/approve-action')`), `src/components/marketplace/PaymentCheckoutModal.tsx:31,49`, `src/components/AgentSystemLogDrawer.tsx`, `src/components/GenoTraceSection.tsx`, `src/components/health/{AIAgentsStatusModal,TriageCouncilModal,PharmacyRxReviewModal,SOAPNotesGeneratorModal}.tsx`, `src/native/{LandingScreen,PreventiveCareScreen}.tsx`; 21 view files import `@/data/api` directly (e.g. `src/screens/auth/Flow01SignupScreen.tsx`, `src/components/N8NWorkflowAutomationPanel.tsx`).
- Why it violates MVVM: Views own transport, error handling and state transitions; bypasses `http.ts` CSRF handling where raw `fetch` is used.
- Impact: Inconsistent error handling; endpoints renamed on the backend break silently. `PaymentCheckoutModal.tsx:49-60` posts a fake signed webhook (`'x-webhook-signature': 'test-secret-simulated'`) and shows a payment receipt regardless of the response — a View faking a server-side state transition. (The component currently has no importer; it is still shipped source that a developer could wire in.)
- Direction: All network access through `src/data/services/*` repositories, consumed only by ViewModels. Add an ESLint `no-restricted-imports`/`no-restricted-globals` rule banning `fetch` and `@/data/api` under `screens/`, `components/`, `features/*/views`.

**3. Business rules in the store layer that couple domains**
- Location: `src/features/health/store/RecordsStore.tsx:18-20`
- Evidence: `addRecord()` calls `this.studentStore.addPoints(50)` — adding a health record awards points.
- Why it matters: Cross-store side effect hidden in a model mutator; also conflicts with AGENTS.md guardrail 4 (no gamification of body metrics / health data).
- Direction: Remove, or move reward rules to an explicit, reviewed rewards service that never keys off clinical data.

**4. Parallel, unused MVVM implementation**
- Location: `src/modules/m01..m20` (≈260 files incl. tests), referenced only from `src/features/*/index.ts` barrels that are themselves unused (Knip: 175 unused files, 110 of them in `src/modules`).
- Why it matters: Two MVVM conventions (MobX classes in `features`, `useSyncExternalStore` stores in `modules`) for the same domains. Duplicate files inside single modules (`m01-auth/state/AuthStore.ts` + `auth.store.ts`, `data/AuthRepository.ts` + `auth.repository.ts`, `domain/Auth.ts` + `entities.ts`).
- Impact: A new developer following `src/modules/m01-auth/README.md` (which says "`import { useAuthViewModel } from '@/modules/m01-auth'`") writes code nobody runs.
- Direction: Delete `src/modules`. Keep the `features/*` MobX pattern, which is the one in production.

**5. Shared mutable singletons / global navigation**
- Location: `src/App.tsx:41` `registerGlobalNavigator((to) => routerNav(to))`; screens call `navigate(...)` from `@/lib/workflowRouting` (e.g. `LabQueueScreen.tsx:31`).
- Why it matters: Global imperative navigation makes ViewModels and screens depend on a module-level mutable function, which complicates testing and native parity.
- Direction: Acceptable short-term; inject a navigator into ViewModels when touching them.

**6. Route policy duplicated in the View shell**
- Location: `src/App.tsx:85-155` (two hardcoded arrays of ~35 vendor paths) vs `src/features/health/module.ts:36-68`.
- Why it matters: The shell decides chrome visibility by string lists that must be kept in sync with the registry; adding a route requires editing two files.
- Direction: Put `chrome: 'public' | 'workspace'` on `FeatureRoute` metadata and derive it in `App.tsx`.

## What is good and should be kept

- `src/core/store/ViewModel.ts` documents the contract and the MobX constraint clearly.
- `src/core/routing/Router.tsx:51-75` `RouteGuard` fails closed: loading → spinner, error → explicit retry, no user → redirect to login, wrong role → redirect home.
- Feature ViewModels are small and testable; `src/features/*/views/__tests__` exist.
