# 🎓 Studentkare (SA Care) — Enterprise Student Health & AI Operations Platform

Studentkare is a production-ready, full-stack student health, emergency 108 SOS, ABDM interoperability, and AI Operations control plane platform designed for Indian universities and campus OPD clinics.

---

## 🌟 Key Platform Pillars

- **🛡️ Two-Plane Isolation Architecture**: Strictly separates the **Clinical Plane** (Student Vault, Lab Records, Consults) from the **Operational Plane** (Tickets, SLAs, Invoices, Aggregates). AI agents never access identified clinical data.
- **🔓 Dual-Auth Break-Glass Access**: Human clinical access requires dual administrator authorization, a 60-minute timebox, and a pre-render audit log.
- **k-Anonymity Floor ($k \ge 20$)**: Enforces a minimum cohort floor of 20 students on all aggregate campus health telemetry to prevent re-identification.
- **🤖 AI Operations Departments (D1–D9)**: 9 autonomous AI operations agents with mandatory `RuleId` citations (`Rule-A` through `Rule-L8`).
- **⚡ Multi-Agent ReAct Swarm & n8n**: 5-agent ReAct loop swarm with an interactive n8n workflow execution panel.
- **📱 Mobile Sensors & Smartwatches**: Accelerometer pedometer step counter, camera rPPG pulse/HRV scanner, eye sclera jaundice detector, posture ergonomics checker, smartwatch hub (Apple Watch, WearOS, Noise/BoAt), BLE medical hardware hub (Omron BP, Beurer Pulse Ox, Braun Temp, Accu-Chek Glucometer), and microphone acoustic respiratory analyzer.
- **🌐 Open Source Stack**: Integrated with HAPI FHIR R4, Red Hat Kogito / Drools DMN engine, Harvard OpenDP differential privacy ($arepsilon=0.5$), and Ollama on-prem local LLM runner.

---

## 🔑 Demo Role Credentials

For instant testing, use the 1-Tap Quick Fill credentials box on the Login screen:

| Role | Username / Email | Password | Permissions |
|---|---|---|---|
| 🛡️ **Super Admin & AI Ops** | `admin@studentkare.in` | `SuperAdmin#2026` | Full Control Plane & AI Departments D1–D9 |
| 🎓 **Student Data Principal** | `aarav.sharma@iit.ac.in` | `Student#2026` | Health Vault, ABDM Export, Step Counter |
| 🩺 **Campus OPD Doctor** | `dr.radhika@campusclinic.in` | `Doctor#2026` | OPD Scribe, NMC E-Prescription, Jan Aushadhi |

*🔑 Master Demo Verification Code (2FA / OTP): **`142857`***

---

## 🚀 Quick Start & Testing

### 1. Frontend Development Server
```bash
npm install
npm run dev   # http://localhost:3000
```

### 2. Backend FastAPI Server
```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=. uvicorn main:app --reload --port 8000
```

### 3. Run Automated Unit & Security Test Suites

```bash
# Vitest TypeScript Suite (11 Test Files, 44 / 44 Passed)
npx vitest run

# TypeScript Type Checker (0 Errors)
npx tsc --noEmit

# Python Backend Security Suite (6 / 6 Passed)
PYTHONPATH=backend python3.11 -m pytest backend/tests/test_data_security_pattern.py
```

---

## 🧪 Verification Scorecard

- **Vitest Unit Test Suite**: **44 / 44 Passed** across 11 test files.
- **TypeScript Compiler (`npx tsc`)**: **0 Errors**.
- **Pytest Backend Security Suite**: **6 / 6 Passed**.
- **Git Branch**: `feat/studentkare-enterprise-production-suite` (Clean working tree, up to date with origin).
