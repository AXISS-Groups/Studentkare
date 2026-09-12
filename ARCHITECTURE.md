# Studentkare Architecture Specification

## Overview

**Studentkare** is an enterprise-grade Student Health & Care Management Platform integrated with Tata 1mg healthcare catalog services, ABDM (Ayushman Bharat Digital Mission) health vault standard, autonomous AI agents, and a multi-role operational workspace for students, administrators, vendors, and clinicians.

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
     │  SQLAlchemy ORM + DB  │   │  Autonomous AI Agents │   │  Tata 1mg Catalog &   │
     │ (SQLite / PostgreSQL) │   │ (Triage, SOAP, HITL)  │   │   Care Services API   │
     └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

---

## 1. System Layers & Subsystems

### 1.1 Frontend Presentation Layer (`src/`)
- **Core Technology**: React 18, Vite, TypeScript 5.7, Lucide React icons.
- **Design System**: Vanilla CSS tokens in `src/theme/workflows.css` featuring Impilo Pearl light aesthetics, dark mode cards, custom micro-animations, glassmorphism headers, and high-contrast accessibility tags.
- **Key Modules**:
  - **Student Health Workspace**: Health Overview, ABDM Health Vault, Medication Streak Tracker, Posture & Eye Strain Coach, Campus Blood Donor Directory, Support & Rewards.
  - **Tata 1mg Storefront & Lab Portal**: 30+ curated healthcare items, 6 lab package categories, Phlebotomist Fasting Slot Picker, Digital Rx Prescription Extractor.
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
- `care_catalog_items`: Tata 1mg health products, lab packages, pricing, stock levels, and provider mappings.
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

## 4. Environment & Deployment Topology

- **Docker Containerization**: Multi-stage build using Dockerfile & Docker Compose with Nginx reverse proxy routing `/api` requests to backend on port 8000.
- **Nixpacks / Dokploy Support**: Production deployments build using Nixpacks (Node 18 + Python 3.11/3.14).
- **Environment Variables**:
  - `APP_ENV`: `production` or `development`.
  - `DATABASE_URL`: SQLite file path or PostgreSQL connection string (`postgresql://...`).
  - `OTP_HASH_SECRET`: Secret key for hashing OTP challenge tokens.
  - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g. `https://studentkare.in`).
  - `DEV_OTP_CONSOLE`: Set to `true` in local development to print OTP codes to stdout.
