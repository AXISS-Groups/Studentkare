# Studentkare — Student Health Platform & Tata 1mg AI Ecosystem

[![Build Status](https://img.shields.io/badge/Build-Passing-10b981?style=for-the-badge&logo=vite)](https://github.com/kktejas07/Studentkare)
[![Python Version](https://img.shields.io/badge/Python-3.11%20%7C%203.14-3776ab?style=for-the-badge&logo=python)](https://fastapi.tiangolo.com)
[![React Version](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![Deployment](https://img.shields.io/badge/Dokploy-Nixpacks-7c5cfc?style=for-the-badge)](https://dokploy.com)

**Studentkare** is an end-to-end, authenticated Student Health & Medical Care Management Platform. Built on top of the **Tata 1mg healthcare catalog ecosystem**, **ABDM (Ayushman Bharat Digital Mission) health vault standard**, and **autonomous AI clinical agents**, it bridges student care, campus emergency services, phlebotomist dispatch, and institutional health operations.

---

## 🌟 Key Features & Ecosystem

### 🏥 Tata 1mg Storefront & Emergency Directory
- **30+ Curated Healthcare Catalog Items**: Pharmaceuticals, supplements, wellness items, and diagnostic lab packages.
- **24x7 Emergency Contact Directory & SOS Bar**: Sticky header SOS broadcast button, campus helpline, and national emergency contacts.
- **Phlebotomist AI Dispatch Agent**: Autonomous lab fasting slot picker and technician home/hostel sample collection routing.
- **Digital Rx Prescription Extractor**: AI parsing of prescription images into 1-click cart items with automated dosage warnings.
- **Campus Blood & Plasma SOS Directory**: Real-time blood group donor matching and urgent emergency broadcast alerts.

### 🤖 Autonomous AI & Loop Agents
- **Multi-Doctor Clinical Triage Council**: Multi-perspective differential diagnostic synthesis combining General Physician, Mental Health Specialist, and Pharmacist insights.
- **Automatic Clinical SOAP Notes Generator**: Formats symptoms and vitals into ABDM-compliant Subjective, Objective, Assessment, and Plan health records.
- **Human-in-the-Loop Clinician Sign-off Console**: Safety gate for AI-generated treatment plans requiring clinician verification before dispatch.
- **Study Desk Posture & Eye Strain Coach**: Real-time posture tracking widget with interactive 20-20-20 rule eye strain timer loop.
- **Medication Adherence Loop Agent**: Daily reminder tracker with +10 PTS streak rewards.
- **Support & Care Rewards**: +50 Care Points awarded upon ticket submission.

---

## 🚀 Quick Start (Local Development)

### 1. Frontend Setup
```bash
npm install
npm run dev
```

### 2. Backend Setup
```bash
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
DEV_OTP_CONSOLE=true backend/.venv/bin/uvicorn main:app --app-dir backend --reload --port 8000
```
Open **http://localhost:3000** in your browser.

---

## ⚡ Quick Demo Logins (OTP: `123456`)

In local development (`DEV_OTP_CONSOLE=true` or seeded demo database), use the Quick Demo Login buttons or enter OTP code **`123456`**:

| Role | Contact (Email / Phone) | Default Workspace |
| --- | --- | --- |
| 🎓 **Student** | `demo.student@studentkare.test` / `9876543210` | Student Health Workspace & ABDM Vault |
| 🛠️ **Super-Admin** | `demo.admin@studentkare.test` / `9876543211` | Operations & Integrations Console |
| 🏪 **Vendor** | `demo.vendor@studentkare.test` / `9876543212` | Supplier Requests Workspace |

To seed initial catalog entries and demo accounts:
```bash
backend/.venv/bin/python backend/scripts/seed_demo.py
```

---

## 🧪 Testing & Verification

Run the full verification suite before committing:

```bash
# Frontend Compilation & Type Checks
npm run build

# Backend Pytest Suite (79 Tests)
PYTHONPATH=backend backend/.venv/bin/pytest

# Lint Checks
npm run lint
```

---

## 🏗️ Documentation & Standards

- 📐 **[ARCHITECTURE.md](ARCHITECTURE.md)**: Detailed system architecture, data models, AI agent specs, and security boundaries.
- 📜 **[CODING_STANDARDS.md](CODING_STANDARDS.md)**: Mandatory coding conventions, TypeScript strictness, and FastAPI rules.
- 🤝 **[CONTRIBUTING.md](CONTRIBUTING.md)**: Contribution guidelines and setup procedures.
- 📋 **[.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)**: Standardized PR template.
- 🤖 **[.cursorrules](.cursorrules)**: AI pair programming & Cursor rule specifications.
- 🔌 **[docs/integration-guide.md](docs/integration-guide.md)**: Environment variables, endpoints, and verification tests to activate payments, live teleconsultation (WebRTC), native health integrations, and pharmacy review.
- 🗂️ **[docs/top-100-feature-todos.md](docs/top-100-feature-todos.md)**: The prioritized 100-feature implementation backlog (81/100 complete) with the remaining externally-gated items.
- 📊 **[docs/application-audit-2026-09-13.md](docs/application-audit-2026-09-13.md)**: Evidence-backed architecture audit with security findings and remediation priorities.

---

## 🚢 Dokploy Deployment

Studentkare is pre-configured for automated Docker and Nixpacks deployment via Dokploy / Railway:

```bash
# To populate catalog entries on a fresh deployed database
DATABASE_URL="postgresql://user:pass@host:5432/studentkare" \
backend/.venv/bin/python backend/scripts/seed_catalog.py --confirm
```

---

## 🔒 Security & Privacy

- **Session Management**: Revocable HTTP-only signed session cookies (`sacare_session`).
- **CSRF Defense**: Strict `X-CSRF-Token` header checks on state-mutating HTTP methods.
- **Origin Protection**: Whitelisted CORS handling via `ALLOWED_ORIGINS`.
- **ABDM Vault Compliance**: Encrypted local storage for student medical records and clinician sign-offs.
