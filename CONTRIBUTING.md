# Contributing to Studentkare

Thank you for contributing to **Studentkare**! We welcome contributions to help improve campus healthcare access, student medical vault management, AI agent triage workflows, and Tata 1mg care integrations.

---

## 1. Getting Started

### 1.1 Prerequisites
- Node.js 18+ and npm 9+
- Python 3.11 or Python 3.14
- Git

### 1.2 Setup Repository
```bash
git clone https://github.com/kktejas07/Studentkare.git
cd Studentkare
```

### 1.3 Install Dependencies & Run Locally
```bash
# Frontend
npm install
npm run dev

# Backend (in a separate terminal tab)
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
DEV_OTP_CONSOLE=true backend/.venv/bin/uvicorn main:app --app-dir backend --reload --port 8000
```
Open **http://localhost:3000** in your browser.

---

## 2. Quick Demo Logins

For testing in local development environment (with `DEV_OTP_CONSOLE=true` or seeded demo accounts):
- **OTP Code**: `123456`
- **Student**: `demo.student@studentkare.test` (Email) or `9876543210` (WhatsApp)
- **Admin**: `demo.admin@studentkare.test` (Email) or `9876543211` (WhatsApp)
- **Vendor**: `demo.vendor@studentkare.test` (Email) or `9876543212` (WhatsApp)

---

## 3. Pull Request Guidelines

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Make Small, Atomic Commits**: Write clear commit messages following Conventional Commits syntax (`feat: ...`, `fix: ...`, `docs: ...`).
3. **Verify Build & Tests**:
   ```bash
   npm run build
   PYTHONPATH=backend backend/.venv/bin/pytest
   ```
4. **Push Branch & Open PR**:
   ```bash
   git push origin feat/your-feature-name
   ```
   Fill out the Pull Request template completely.
