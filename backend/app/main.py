"""Studentkare: persistent, authenticated healthcare application API."""
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

APP_ENV = os.getenv("APP_ENV", "development")
APP_VERSION = os.getenv("APP_VERSION", "dev")


def _production_startup_guard():
    """Fail closed when required production secrets are missing.

    Postgres is the only database format in every environment (dev included).
    A missing DATABASE_URL or a non-Postgres scheme is a startup error, never
    a silent SQLite fallback.
    """
    if APP_ENV != "production":
        url = os.getenv("DATABASE_URL", "")
        if not url or not url.startswith(("postgresql://", "postgresql+psycopg://", "postgresql+psycopg2://")):
            raise RuntimeError("Postgres-only: set DATABASE_URL to a postgresql:// URL.")
        return
    if not os.getenv("OTP_HASH_SECRET") and not os.getenv("JWT_SECRET"):
        raise RuntimeError("Set OTP_HASH_SECRET (or JWT_SECRET) before starting the production service.")
    if not os.getenv("DATABASE_URL") or not os.getenv("DATABASE_URL", "").startswith(("postgresql://", "postgresql+psycopg://", "postgresql+psycopg2://")):
        raise RuntimeError("Postgres-only: production requires a postgresql:// DATABASE_URL.")


_production_startup_guard()

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.rate_limiter import GlobalRateLimitMiddleware
from services.activity_telemetry import ActivityTelemetryMiddleware
from services.apilayer import router as apilayer_router
from services.billing import router as billing_router
from services.clinical_api import router as clinical_router
from services.db_sql import SessionLocal, create_all_tables, is_persistent
from services.integrations import router as integrations_router
from services.member_profile_api import router as member_profile_router
from services.otp_delivery import available_channels
from services.preventive_care import router as preventive_router
from services.workflow_api import router as workflow_router
from services.workflow_auth import require_super_admin, workflow_db
from services.workflow_auth import router as auth_router


@asynccontextmanager
async def lifespan(app):
    # Postgres-only. Production applies versioned migrations (create_all_tables
    # cannot alter an existing schema). Development uses create_all_tables
    # against Postgres for a zero-friction local start.
    if APP_ENV == "production":
        from services.migrations import run_migrations
        run_migrations()
        print("[DB] Applied migrations to head.", flush=True)
    else:
        create_all_tables()
    # Load persisted integrations config from database
    try:
        from services.integration_config import load_from_db
        load_from_db()
    except Exception as e:
        print(f"[CONFIG] Could not load integrations: {e}")
    # Ensure durable periodic jobs exist and run anything that is already due.
    try:
        from services.db_sql import SessionLocal as _SL
        from services.workflow_scheduler import ensure_scheduled_jobs, workflow_scheduler
        with _SL() as db:
            ensure_scheduled_jobs(db)
            results = workflow_scheduler.run_due_jobs(db)
            if results:
                print(f"[SCHEDULER] Ran due jobs: {results}", flush=True)
    except Exception as e:
        print(f"[SCHEDULER] Could not run due jobs: {e}")
    # Seed demo accounts only when explicitly enabled; never in production.
    try:
        from services.demo_seed import seed_demo_data
        app_env = os.getenv("APP_ENV", "development")
        if app_env != "production":
            with SessionLocal() as db:
                result = seed_demo_data(db)
                if result.get("accounts", 0):
                    print(f"[SEED] Created {result['accounts']} demo accounts (including phone-based superadmin)")
        else:
            print("[SEED] Skipped: demo seeding is disabled in production.")
    except Exception as e:
        print(f"[SEED] Skipped: {e}")
    yield


app = FastAPI(title="Studentkare Care API", version=APP_VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=[value.strip() for value in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173").split(',')],
    allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
)


class BodyLimitExceeded(Exception):
    pass


class BodyLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            declared_size = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"detail": "Invalid Content-Length."}, status_code=400)(scope, receive, send)
        if declared_size > 12 * 1024 * 1024:
            return await JSONResponse({"detail": "Request exceeds the 12 MB limit."}, status_code=413)(scope, receive, send)
        size = 0
        async def limited_receive():
            nonlocal size
            message = await receive()
            size += len(message.get("body", b""))
            if size > 12 * 1024 * 1024:
                raise BodyLimitExceeded()
            return message
        try:
            await self.app(scope, limited_receive, send)
        except BodyLimitExceeded:
            await JSONResponse({"detail": "Request exceeds the 12 MB limit."}, status_code=413)(scope, receive, send)


app.add_middleware(BodyLimitMiddleware)
app.add_middleware(GlobalRateLimitMiddleware)
# Counts every endpoint automatically, so telemetry coverage cannot drift as
# routes are added. Registered after auth so the caller's role is known.
app.add_middleware(ActivityTelemetryMiddleware)


@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_unavailable(request, exc):
    try:
        from services.slack_notifier import bump_counter, post_ops_alert
        bump_counter("http_5xx")
        path = str(getattr(request.url, "path", "/"))[:120]
        post_ops_alert(f":rotating_light: Studentkare Care API 503 — data service unavailable ({path}). No user data included.",
                       kind="http_5xx", purpose="ops")
    except Exception:
        pass
    return JSONResponse(status_code=503, content={"detail": "The data service is unavailable. Please try again shortly."})


@app.exception_handler(Exception)
async def unhandled_error(request, exc):
    """Generic 5xx guard: safe error shape + best-effort non-PHI Slack alert. Never leaks internals."""
    try:
        from services.slack_notifier import bump_counter, post_ops_alert
        bump_counter("http_5xx")
        path = str(getattr(request.url, "path", "/"))[:120]
        method = str(getattr(request, "method", "GET"))[:10]
        post_ops_alert(f":rotating_light: Studentkare Care API 500 — unhandled error on {method} {path}. No user data included.",
                       kind="http_5xx", purpose="ops")
    except Exception:
        pass
    return JSONResponse(status_code=500, content={"detail": "Internal error. Please try again shortly."})


@app.get("/api/health")
def health(db=Depends(workflow_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "persistent": is_persistent(), "integrations": {
        "otpChannels": available_channels(), "payments": False, "insurer": False,
        "deviceSync": False, "prescriptionReview": False,
    }}


@app.get("/api/info")
def info():
    """Return lightweight service info for monitoring/diagnostics."""
    return {
        "name": "Studentkare Care API",
        "version": APP_VERSION,
        "environment": APP_ENV,
        "commit": os.getenv("GIT_COMMIT", "unknown"),
    }


@app.get("/api/persistence/status")
def persistence(user=Depends(require_super_admin), db=Depends(workflow_db)):
    db.execute(text("SELECT 1"))
    return {"persistent": is_persistent()}


app.include_router(auth_router)
app.include_router(workflow_router)
app.include_router(member_profile_router)
app.include_router(preventive_router)
app.include_router(integrations_router)
app.include_router(billing_router)
app.include_router(clinical_router)
app.include_router(apilayer_router, dependencies=[Depends(require_super_admin)])
