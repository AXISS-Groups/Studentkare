# 07 — Collaboration Readiness: Solutions

Answers [audit/07-collaboration-readiness.md](../audit/07-collaboration-readiness.md). Owns **TD-25** (central routing hotspots) and **TD-46** (bus factor). Branch protection and CODEOWNERS are in [11](11-git-workflow-solutions.md); the backend split (TD-07) is in [03](03-architecture-solutions.md); CI job split in [18](18-cicd-deployment-solutions.md).

---

## TD-25 — Each feature owns its routes

**Problem:** Adding a screen requires edits in `src/features/health/module.ts` (route table for about 120 paths across all roles), `src/screens/workspace/WorkspaceScreen.tsx` (string `if` chain), `src/lib/utils/workflowRouting.ts`, and `src/App.tsx` (vendor and public path lists).

**Target:** a feature adds one entry in its own `module.ts`. Nothing central changes.

**Steps**
1. **Extend route metadata** in `src/core/routing/registry.ts`:
   ```ts
   export interface FeatureRoute {
     path: string;
     load: () => Promise<{ default: React.ComponentType }>;
     access?: (role: AccountRole | null) => boolean;
     public?: boolean;
     chrome?: 'public' | 'workspace';   // replaces App.tsx isVendorRoute / isPublicView lists
     section?: MessageKey;              // replaces App.tsx section string logic
   }
   ```
2. **`App.tsx`:** derive `isPublicView` and `section` from the matched route's metadata (`resolveRoute(location.pathname)`). Delete the two hardcoded path arrays (`App.tsx:80+`).
3. **Split `features/health/module.ts`** into per-domain modules: `features/partner/module.ts` (vendor and lab), `features/clinician/module.ts`, `features/admin/module.ts`, `features/campus/module.ts`, `features/health/module.ts` (student only). Each calls `registerModule` and is imported once from a tiny `src/app/modules.ts`, the only central file left, with one line per feature.
4. **Retire the `WorkspaceScreen` switch:** each route's `load` points at its own screen component. Shared workspace chrome becomes a layout route (`<Route element={<WorkspaceLayout/>}>` with children), which keeps the sidebar mounted. That is the reason the single shared loader exists today (`loadWorkspace` comment in `module.ts`).
5. **`workflowRouting.ts`:** keep `homeForRole`; derive `RoutePath` types from the registry.

**Verify**
- A new screen PR touches only `src/features/<domain>/**` and at most one line in `src/app/modules.ts`.
- The routing tests in `src/core/routing/__tests__` still pass; add one per role for the default home.

**Effort:** M (two or three PRs). **Risk:** route regressions like the "restore missing super admin routes" commits. Mitigate with a snapshot test of the full route list (path, access, public) before and after.

---

## TD-46 — Bus factor (all commits since the baseline came from one author)

This is an organisational fix supported by tooling. It cannot be solved by code alone.

| Action | Detail | Effort |
|---|---|---|
| CODEOWNERS with ≥ 2 owners per area | see [11](11-git-workflow-solutions.md); the primary author plus one other per area | S |
| Required review by someone other than the author | branch protection | S |
| Review rotation | each week a different engineer owns review for one hotspot area (auth, DB, CI) | ongoing |
| ADRs | extract the decisions in `docs/remediation-plan-2026-10-09.md` ("Decisions needed from a human", owner approvals) into `docs/adr/` ([10](10-documentation-solutions.md)) | S |
| Pairing on the truth pass | new hires do the dead-code deletion ([02](02-repository-structure-solutions.md)) with the primary author. It's the fastest way to learn what is real | M |
| Runbooks for one-person knowledge | deploy, rollback, secret rotation, erasure archive key custody ([28](28-privacy-solutions.md)) | S each |

**Measure:** the share of merged PRs authored by the top contributor, and the share reviewed by someone else. Target under 60% / 100% within a quarter.

---

## Other hotspot mitigations
- **i18n catalogues:** add new keys to `src/i18n/areas/<area>.ts`, not the monolithic `en.ts`/`te.ts`/`hi.ts`. Document this in `src/i18n/README.md`.
- **Ratchet lists** (`config/*-legacy.json`): one path per line, sorted, so concurrent removals merge cleanly.
- **`package-lock.json` conflicts:** document "resolve by `git checkout --theirs package-lock.json && npm install`, then re-apply your dep". Consider Renovate to batch dependency updates.
