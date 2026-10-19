# Studentkare — student-owned health records platform for Indian campuses

React 18 + Vite frontend, FastAPI backend, Postgres (see `docs/architecture/ARCHITECTURE.md`).
Docker is the recommended setup. Native Node/Python is a secondary option
(see `docs/guides/CONTRIBUTING.md`).

## Quick start (Docker)

Root `docker-compose.yml` is the development default: Postgres 16 (the
`postgres` service, data on the `postgres-data` volume), the backend, the
scheduled-jobs `worker`, the web app and a local monitoring stack.
Production stays separate via `docker-compose.prod.yml` with vault-injected
secrets (see `.env.prod.example`). Never use the dev `.env` in production.

**macOS / Linux / Git Bash** (WSL optional, not required):

```bash
git clone https://github.com/AXISS-Groups/Studentkare.git
cd Studentkare
cp .env.dev.example .env
docker compose up --build
```

**Windows PowerShell** (Docker Desktop):

```powershell
git clone https://github.com/AXISS-Groups/Studentkare.git
cd Studentkare
Copy-Item .env.dev.example .env
docker compose up --build
```

**Windows CMD** (Docker Desktop):

```cmd
git clone https://github.com/AXISS-Groups/Studentkare.git
cd Studentkare
copy .env.dev.example .env
docker compose up --build
```

Then open **http://localhost:3000** and check
**http://localhost:8000/api/health**.
Teardown keeps the database volume: `docker compose down`.

### Sign in locally

`.env.dev.example` turns on demo accounts (`SEED_DEMO_DATA=true`,
`DEV_OTP_CONSOLE=true`; both are ignored outside development and testing).
Sign in with any of these and the code **`123456`**:

| Role | Email | WhatsApp |
|---|---|---|
| Student | `demo.student@studentkare.test` | `9876543210` |
| Super admin | `demo.admin@studentkare.test` | `9876543211` |
| Partner (vendor) | `demo.vendor@studentkare.test` | `9876543212` |
| Doctor | `demo.doctor@studentkare.test` | `9876543213` |
| Campus admin | `demo.campus@studentkare.test` | `9876543214` |

The super admin must set up two-step sign-in on first use, as in production:
scan the QR code with any authenticator app.

## Docs

- Setup details (Docker + native), testing, branching: `docs/guides/CONTRIBUTING.md`
- Mobile app (Expo): `src/native/README.md`
- Deployment, including the worker and required secrets: `docs/DEPLOYMENT_GUIDE.md`
- Environment reference: `docs/integration-guide.md`
- Backend config schema: `backend/config/.env.example` (production reference only)
- Architecture audit and its finding register: `audit/README.md`
