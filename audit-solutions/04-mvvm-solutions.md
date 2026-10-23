# 04 — MVVM: Solutions

Answers [audit/04-mvvm-audit.md](../audit/04-mvvm-audit.md). Owns **TD-09** (demo vendor screens), **TD-20** (mockData-seeded stores), API calls from views, the `addPoints` side effect, and the global navigator. The parallel `src/modules` tree (TD-06) is owned by [02](02-repository-structure-solutions.md); route duplication (TD-25) by [07](07-collaboration-solutions.md).

---

## The target contract (write it down once)

Add `src/features/README.md`:
```text
View (screens/, views/)      → renders ViewModel state, calls ViewModel actions. No fetch, no api import, no business rules.
ViewModel (viewmodel/)       → MobX class implementing core/store/ViewModel; owns state, computed, actions; returns Said/message keys.
Repository (api.ts)          → typed calls through data/services/http (later: the generated client, see 15). No UI types.
Model (types from the API)   → generated from OpenAPI (15); domain helpers in model/.
```
Enforce it with lint ([05](05-code-quality-solutions.md)):
```js
{ files: ['src/**/views/**/*.tsx', 'src/**/screens/**/*.tsx', 'src/screens/**/*.tsx', 'src/components/**/*.tsx'],
  rules: {
    'no-restricted-globals': ['error', { name: 'fetch', message: 'Views call ViewModels; ViewModels call repositories.' }],
    'no-restricted-imports': ['error', { paths: [
      { name: '@/data/api', message: 'Import a feature repository via its ViewModel.' },
      { name: '@/data/services/http', message: 'Only repositories use http.' }] }] } }
```
Start as `warn` with a legacy-file list (same ratchet pattern as `config/hex-colour-legacy.json`), then switch to `error`.

---

## TD-09 — The remaining demo vendor screens

**Goal:** No routed screen shows invented operational data as if it were real.

**Inventory** (from the audit): about 15 screens in `src/screens/vendor/` still keep local demo state, including `VendorRxReviewScreen`, `DispenseRegisterScreen`, `VendorSettlementScreen`, `VendorReorderScreen`, `VendorCatalogueScreen`, `PartnerStaffScreen`, `LabColdChainScreen`, `LabCollectionScreen`, `VendorHandoverScreen`, `VendorSubstitutionScreen`, `VendorCampIntakeScreen`, `VendorReturnsScreen`, `VendorOrdersScreen` and `VendorConsoleScreen`. All are already role-gated.

**Decide per screen** (one table in an issue):
| Option | When | How |
|---|---|---|
| **Connect** | a backend endpoint exists (`/api/work/prescriptions`, `/api/work/dispenses`, `/api/work/lab-orders`, `/api/dispenses/{id}/substitutions`, `/api/v1/pharmacy/rx-reviews`, …) | `features/partner/<x>/{viewmodel,views}` calling a repository; empty, error and loading states from `design-system/States` |
| **Honest not-connected state** | no backend yet (register, cold chain, run sheet, settlement, staff) | Replace the demo arrays with `<NotConnected>` ("This register isn't connected yet; nothing here is saved"). Keep the layout if the design is approved |
| **Remove route** | not planned | delete the screen, its route and the `WorkspaceScreen` branch |

**Clinical-logic cautions** (from the team's own notes; they need clinical sign-off before connecting):
- The handover accepts any 6 digits.
- Rx review starts pre-ticked.
- Substitution has no allergy check.

The **Connect** option must fix these, and these screens are Tier 1 (named reviewer).

**Verify:** `git grep -nE "DEMO_|INITIAL_[A-Z_]+ *[:=]" -- src/screens src/features` returns no hits outside tests and Storybook.
**Effort:** M (not-connected states) / L (connecting everything).

---

## TD-20 — Stores seeded from `mockData`
- `src/features/health/store/RecordsStore.tsx:11`: start with `records: HealthRecord[] = []` and load through the records repository (`GET /api/health/documents`). Render an empty state.
- `src/features/care/store/FabricStore.tsx`: same, or delete if the feature is unreachable (check the dead-code list).
- Delete `src/data/datasets/mockData.ts` from production code. Move the fixtures to `src/test/fixtures/` for tests and Storybook only.
- Lint: ban `@/data/mockData` and `datasets/mockData` imports outside `__tests__` and `*.stories.tsx`.

**Verify:** a production build contains none of the `mockData` strings. Check with `grep "Dr. Lal PathLabs" dist/assets/*.js`. **Effort:** S.

---

## `RecordsStore.addRecord` awards points (guardrail 4: no gamification of health data)
Delete `this.studentStore.addPoints(50)` (`RecordsStore.tsx:19`) and the cross-store constructor dependency. If rewards exist, they must come from a server-side rewards service with an allow-list of non-clinical triggers, reviewed against Rule L.
**Verify:** a unit test that adding a record doesn't change points. **Effort:** S.

---

## API calls from components
Files to fix (from the audit): `components/health/HITLApprovalConsole.tsx`, `components/AgentSystemLogDrawer.tsx`, `components/GenoTraceSection.tsx`, `components/health/{AIAgentsStatusModal,TriageCouncilModal,PharmacyRxReviewModal,SOAPNotesGeneratorModal}.tsx`, `native/{LandingScreen,PreventiveCareScreen}.tsx`, plus 2 raw `fetch(` calls in `src/features`.
- **Unreferenced:** delete. `PaymentCheckoutModal.tsx` is in this group; see [14](14-error-handling-logging-solutions.md).
- **Live:** extract a ViewModel + repository.

The lint rule above stops new ones.

---

## Global navigator (LOW)
Keep `registerGlobalNavigator` for now. In new ViewModels, accept a `navigate: (to: RoutePath) => void` constructor argument (injected by the screen) instead of importing `navigate`. This makes them testable and native-safe. No big-bang change.
