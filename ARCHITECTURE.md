# Studentkare Architecture Specification

> **Implementation review — 13 September 2026:** Some integration and autonomous-agent
> claims below describe intended capabilities rather than verified execution.
> See the [application audit](docs/application-audit-2026-09-13.md) for the current
> implementation, release blockers, and recommended architecture improvements.

> **Frontend architecture — 14 September 2026:** The React layer is now organised as
> **feature modules** (`src/features/*`) using an **MVVM pattern** (MobX
> observable stores + ViewModels + `observer` views), with **react-router** behind a
> **platform navigation facade** so the same code runs on web and React Native.
> See `src/core/store`, `src/core/routing`, `src/core/navigation`, and `src/store`.

## Overview

**Studentkare** is an enterprise-grade Student Health & Care Management Platform integrated with Studentkare healthcare catalog services, ABDM (Ayushman Bharat Digital Mission) health vault standard, autonomous AI agents, and a multi-role operational workspace for students, administrators, vendors, and clinicians.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │              React 18 + Vite Frontend App              │
                  │   (Impilo Pearl Design, Lucide React, Workflow Routing)  │
                  └────────────────────────────┬────────────────────────────┘
                                               │ HTTP / REST / JSON + CSRF
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                 FastAPI Python Backend                  │
                  │       (Session Auth, Role Guard, CORS Middleware)       │
                  └──────┬─────────────────────┬────────────────────┬───────┘
                         │                     │                    │
                         ▼                     ▼                    ▼
     ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
     │  SQLAlchemy ORM + DB  │   │  Autonomous AI Agents │   │  Studentkare Catalog  │
     │ (SQLite / PostgreSQL) │   │ (Triage, SOAP, HITL)  │   │   Care Services API   │
     └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

---

## 1. System Layers & Subsystems

### 1.1 Frontend Presentation Layer (`src/`)
- **Core Technology**: React 18, Vite, TypeScript 5.7, Lucide React icons.
- **Architecture**: **Feature-based modules + MVVM**.
  - `src/features/<domain>/` — each domain is self-contained: `store/` (MobX model),
    `viewmodel/` (observable ViewModel with computed + actions), `screens/` (`observer`
    view), `module.ts` (route registration), `index.ts`.
  - `src/store/` — composes all feature stores, wires cross-store dependencies.
  - `src/core/store/` — ViewModel base classes + MobX helpers.
  - `src/core/routing/` — `FeatureModule`/`FeatureRoute` registry + `AppRouter` (route tree + guards).
  - `src/core/navigation/` — **platform navigation facade**; the only place that imports
    `react-router-dom`, so native can swap in React Navigation without touching features.
- **Design System**: Vanilla CSS tokens in `src/theme/workflows.css` featuring Impilo Pearl light aesthetics, dark mode cards, custom micro-animations, glassmorphism headers, and high-contrast accessibility tags.
- **Key Modules**:
  - **Student Health Workspace**: Health Overview, ABDM Health Vault, Medication Streak Tracker, Posture & Eye Strain Coach, Campus Blood Donor Directory, Support & Rewards.
  - **Studentkare Storefront & Lab Portal**: 50+ curated healthcare items, 12 lab package categories, adult vaccination services, health-concern shelves, Phlebotomist Fasting Slot Picker, Digital Rx Prescription Extractor.
  - **AI Clinical Hub**: Multi-Doctor Clinical Triage Council Modal, Automatic Clinical SOAP Notes Generator, Human-in-the-Loop Clinician Sign-off Console.
  - **Operations Workspace**: Super-Admin Console, Vendor Supply Request Console, Clinician Management Console, Integrations & Telemetry Settings Module.

### 1.2 Backend API Services (`backend/`)
- **Core Technology**: Python 3.11 / 3.14, FastAPI, Pydantic V2, Starlette Middleware.
- **Security & Authentication**:
  - Dual-channel OTP verification (Email / WhatsApp with automatic fallback).
  - CSRF token validation header (`X-CSRF-Token`) on state-mutating requests.
  - HTTP-only signed session cookies (`sacare_session`).
  - Role-based Access Control (RBAC): `STUDENT`, `SUPER_ADMIN`, `VENDOR`, `CLINICIAN`.
- **Integrations**: Optional Firebase Client Sync, PostHog Analytics relay, OpenWA/Postal/SMTP email & messaging adapters.

### 1.3 Autonomous AI Agents Subsystem (`backend/services/agents/`)
The platform includes 8 specialized autonomous AI agents & loop execution engines:

| AI Agent | Module Path | Purpose |
| --- | --- | --- |
| **Multi-Doctor Clinical Triage Council** | `triage_council_agent.py` | Multi-perspective differential diagnostic synthesis combining General Physician, Mental Health Specialist, and Pharmacist insights. |
| **Clinical SOAP Notes Generator** | `soap_notes_agent.py` | Formats patient symptoms and vitals into ABDM-compliant Subjective, Objective, Assessment, and Plan health records. |
| **Human-in-the-Loop Approval Console** | `hitl_approval_agent.py` | Clinician sign-off workflow safety gate for AI generated treatment plans and prescription dispatch. |
| **Phlebotomist AI Dispatch Agent** | `phlebotomist_dispatch_agent.py` | Automated technician scheduling and lab sample home-collection routing. |
| **Digital Rx Prescription Extractor** | `rx_extractor_ai_agent.py` | OCR/AI parsing of prescription images into 1-click cart orders with dosage instructions. |
| **Campus Blood SOS Broadcast Agent** | `blood_emergency_agent.py` | Blood group donor matching and emergency alert broadcast for urgent requirements. |
| **Medication Adherence Loop Agent** | `medication_adherence_loop_agent.py` | Autonomous reminder loop tracking daily medication intake and awarding Care Points. |
| **Study Posture & Eye Strain Coach** | `StudyPostureCoachWidget.tsx` | Real-time posture reminders and 20-20-20 rule timer loop for student ergonomics. |

---

## 2. Data Model & Storage Schema

Database access is managed via SQLAlchemy ORM supporting both SQLite (`backend/studentkare.db`) and PostgreSQL.

### Core Tables (`care_*` prefix):
- `care_users`: User identities, hashed verification state, role assignments (`STUDENT`, `SUPER_ADMIN`, `VENDOR`, `CLINICIAN`).
- `care_otp_challenges`: Hashed OTP verification attempts, expiry timestamps, and delivery channel logs.
- `care_sessions`: Active user session tokens, CSRF seeds, and expiration metadata.
- `care_health_records`: User health records, vitals, lab reports, and ABDM SOAP notes.
- `care_catalog_items`: Studentkare health products, lab packages, adult vaccination services, pricing, stock levels, and provider mappings.
- `care_orders`: Customer orders, item line items, delivery addresses, and fulfillment status (`PENDING`, `ACCEPTED`, `COMPLETED`, `CANCELLED`).
- `care_support_tickets`: Support requests, priority levels, resolution notes, and +50 Care Points rewards.
- `care_hitl_approvals`: Pending AI clinical recommendations awaiting licensed clinician review and digital signature.

---

## 3. Request Lifecycle & Security Boundary

```
[Browser Client] --(1) POST Request + X-CSRF-Token--> [FastAPI App]
                                                           │
                                            (2) Validate Session Cookie
                                                           │
                                            (3) Check RBAC Role & Origin Header
                                                           │
                                            (4) Execute Handler / AI Agent
                                                           │
                                            (5) Commit to DB Transaction
                                                           │
[Browser Client] <--(6) JSON Response + Updated Cookie ----┘
```

1. **Origin Verification**: CORS middleware validates request origins against `ALLOWED_ORIGINS` whitelist.
2. **Session & Role Authentication**: `get_current_user` extracts and decrypts `sacare_session` cookie; rejects unauthorized roles with HTTP 403.
3. **CSRF Protection**: Non-GET endpoints enforce matching `X-CSRF-Token` headers.
4. **Data Isolation**: All student health records and order details are strictly scoped to `user_id`.

---

## 4. Frontend Feature-Module & MVVM Architecture

The React layer follows a **feature-module + MVVM** structure. Each domain is a
self-contained package under `src/features/<domain>/`, and state is
**platform-agnostic** (no DOM / no React) so it runs unchanged on web and native.

### 4.1 Feature module layout

```
src/features/<domain>/
  store/        MobX model: observable state + actions (DOM-free)
  viewmodel/    ViewModel: wraps a store, exposes computed projections + actions
  screens/      observer() views bound to the ViewModel
  module.ts     registers routes with the module registry
  index.ts      public exports
```

### 4.2 MVVM layers

| Layer | Where | Responsibility |
| --- | --- | --- |
| **Model** | `features/<domain>/store/*Store.tsx` | Observable domain state + mutating actions (e.g. `CampStore`, `ClaimsStore`). |
| **ViewModel** | `features/<domain>/viewmodel/*ViewModel.ts` | Owns presentation state, computed projections (`progressPercent`, `bubbles`, `nextState`), and view actions. |
| **View** | `features/<domain>/screens/*.tsx` | `observer()` React components binding to the ViewModel; no local state for domain data. |

### 4.3 Store composition & dependency wiring

All stores are instantiated and wired in `src/store/AppStores.tsx`:

- `AppStores` composes `StudentStore`, `RecordsStore`, `EmergencyStore`, `CampStore`,
  `FabricStore`, `ClaimsStore`, `ClinicianStore`, `ChatStore`.
- Cross-store dependencies are injected at construction (e.g. `RecordsStore`/`CampStore`/
  `ChatStore` award or read points from `StudentStore`).
- Granular hooks: `useStudentStore()`, `useCampStore()`, `useClaimsStore()`, etc.

### 4.4 Routing & module registry

- `src/core/routing/registry.ts` — `FeatureModule`/`FeatureRoute` types + `registerModule()`.
- `src/core/routing/Router.tsx` — `AppRouter` builds a react-router `<Routes>` tree from
  the registry, applying `RouteGuard` (anonymous → `/login`, unauthorized role → home).
- Role-based access is declared per route via the `access` field (e.g. `/admin` → `SUPER_ADMIN`).

### 4.5 Platform navigation facade

- `src/core/navigation/` is the **only** module importing `react-router-dom`.
- Feature screens use `useRoutePath()` / `useNavigate()` from the facade, never the router
  directly. Swapping web → native means replacing the facade with React Navigation.

### 4.6 Cross-platform principle

Because Models and ViewModels contain no DOM or React imports, the same `store/` and
`viewmodel/` code serves both the web app and a future React Native target. Only the
`navigation` facade and the `screens/` (which use `react-native-web` primitives) are
platform-specific.

### 4.7 React Native target (`src/native/`)

The web and native apps share one codebase. Only the bootstrap and the navigation
implementation differ; business logic lives entirely in the shared, DOM-free
store/ViewModel layer (verified by `src/core/store/__tests__/crossPlatform.test.ts`,
which instantiates `AppStores` and the feature ViewModels in a non-DOM Node env).

| Concern | Web | Native |
| --- | --- | --- |
| Router | `src/core/navigation/index.ts` (react-router, `HashRouter`) | `src/native/navigation.tsx` (React Navigation) |
| Entry | `src/main.tsx` → `src/App.tsx` | `src/native/index.ts` → `src/native/App.tsx` |
| `react-native` resolution | Vite alias → `react-native-web` | Metro resolves `react-native` (native) |
| Typecheck | `tsconfig.json` (excludes `*.native.*`) | `tsconfig.native.json` (excludes `*.web.*`) |

- **Facade**: feature code never imports a router; it uses `useRoutePath()` / `useNavigate()`
  from `core/navigation` (web) or `native/navigation` (native). Swapping platforms changes
  only the facade + entry.
- **Build tooling**: `metro.config.js` + `babel.config.js` (Expo) for native; `vite.config.ts`
  for web. The `@ → src` alias is mirrored in both so imports resolve identically.
- **Stack**: Expo 52 / React Native 0.76 / React 18.3 (aligned with the web React version).
  Run with `npm run start:native:ios` or `:android` (needs a simulator/device).
- **Verified**: `npx expo export --platform ios` bundles the native entry through the shared
  layer + native facade to a Hermes bytecode bundle. Shared code is Vite-free (env access is
  platform-split via `src/core/env.ts` / `env.web.ts`).

---

## 5. Environment & Deployment Topology

- **Docker Containerization**: Multi-stage build using Dockerfile & Docker Compose with Nginx reverse proxy routing `/api` requests to backend on port 8000.
- **Nixpacks / Dokploy Support**: Production deployments build using Nixpacks (Node 18 + Python 3.11/3.14).
- **Environment Variables**:
  - `APP_ENV`: `production` or `development`.
  - `DATABASE_URL`: SQLite file path or PostgreSQL connection string (`postgresql://...`).
  - `OTP_HASH_SECRET`: Secret key for hashing OTP challenge tokens.
  - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g. `https://studentkare.in`).
  - `DEV_OTP_CONSOLE`: Set to `true` in local development to print OTP codes to stdout.
