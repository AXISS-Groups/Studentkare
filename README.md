# Studentkare — health records and care workflows

Studentkare now uses an authenticated, persistent application flow rather than
preview-role switching or automatically populated demo data. The responsive web
interface includes a provider catalog, personal health workspace, and role-scoped
operational workspaces.

## What works

- Contact verification through a configured email or WhatsApp provider.
- Signup grants that are separate from login sessions; verifying a signup code
  does not prematurely create an account.
- Revocable HTTP-only sessions, CSRF checks, session restoration, and server-assigned roles.
- Private PDF/PNG/JPEG uploads and downloads, scoped to the account holder.
- Manually recorded health measurements, dated charts, and empty/error states.
- Persisted insurance-policy information, explicitly labelled user-recorded.
- Source-linked exercise guides, saved movements, and persisted timer-session history.
- Administrator-created provider accounts and catalog entries.
- Server-priced, stock-reserving order/service requests with idempotent submission.
- Assigned-provider updates, customer cancellation before acceptance, and audit events.
- Persisted support requests and administrator resolution.
- Mobile layouts, shared controls, gradients, page transitions, and reduced-motion settings.

**Order requests are not online payments.** Providers confirm service times and
arrangements. Payments, insurer APIs, device sync, and prescription review are not
connected, and the application does not report simulated success for them.

See [Implementation status and remaining work](docs/implementation-status.md).

## Start locally

Frontend:

```sh
npm install
npm run dev
```

Backend, using a Python environment with the project requirements:

```sh
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
backend/.venv/bin/uvicorn main:app --app-dir backend --reload --port 8000
```

Open **http://localhost:3000**. The frontend proxies `/api` to the backend on port
8000, allowing cookies and CSRF checks to use one browser origin. Keep
`VITE_API_BASE_URL` unset or set to `/api` for this deployment arrangement.

### Configure real verification delivery

Use `backend/.env.workflow.example` as a template for a local
`backend/.env.workflow` file. Supply actual SMTP, Postal, or OpenWA settings.
Then start the backend with the file explicitly loaded:

```sh
backend/.venv/bin/uvicorn main:app --app-dir backend --env-file backend/.env.workflow --reload --port 8000
```

There is **no master verification code, automatic login, or console OTP fallback**.
Without a configured delivery provider, the UI reports verification as unavailable.

### Provision the first administrator

Run this with the same `DATABASE_URL` environment used by the backend, replacing
the contact and name with details controlled by the intended administrator:

```sh
backend/.venv/bin/python backend/scripts/provision_account.py \
  --identifier YOUR_EMAIL_ADDRESS \
  --channel EMAIL \
  --name "YOUR NAME" \
  --role SUPER_ADMIN
```

The script does not overwrite an existing account. The account holder must still
verify their contact details through the normal login flow. Other staff accounts
can be created from **Accounts & roles** after the administrator signs in.

Create a vendor or clinician account before publishing catalog entries. The
public catalog is intentionally empty until real entries are configured.

## Storage and deployment

- Default local storage: persistent SQLite at `backend/studentkare.db`.
- `DATABASE_URL` can select PostgreSQL through SQLAlchemy/psycopg.
- Active workflows use `care_*` tables. Legacy prototype tables and fixture users
  are not automatically imported or used as real accounts.
- Database or provider failures are surfaced; there is no in-memory success fallback.
- Docker Compose includes a persistent database volume and a same-origin nginx
  `/api` proxy. Supply provider variables through the deployment environment.
- Production requires HTTPS, `APP_ENV=production`, a stable `OTP_HASH_SECRET`, and
  an explicit `ALLOWED_ORIGINS` setting for the public site.

Existing prototype screens and AI modules remain in the repository for reference,
but `src/App.tsx` and `backend/main.py` mount only the current workflow. The second
navigator delegates to the canonical application instead of exposing preview routes.

## Verification

```sh
npm test
npm run lint
npm run build
PYTHONPATH=backend backend/.venv/bin/python -m pytest \
  backend/tests/test_workflow_api.py \
  backend/tests/test_api_endpoints_unit.py \
  backend/tests/test_data_security_pattern.py -q
```

With Playwright and Chromium available:

```sh
node tests/workflow.smoke.mjs
```

The browser suite starts an isolated API on port 8011 and frontend on port 3001.
It uses actual HTTP requests and a temporary database, replacing only the external
OTP-delivery boundary. Test users/catalog entries never enter the application's
database. `PLAYWRIGHT_MODULE` can point to an existing `playwright/index.mjs`;
`PYTHON` overrides the Python executable, `WORKFLOW_TEST_TMP` selects a temporary
parent directory, and `SCREENSHOT_DIR` saves screenshots to an existing directory.
