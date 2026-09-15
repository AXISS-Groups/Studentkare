"""Studentkare: persistent, authenticated healthcare application API."""
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

APP_ENV = os.getenv("APP_ENV", "development")


def _production_startup_guard():
    """Fail closed when required production secrets are missing.

    Production must provide a stable OTP hashing secret and a real database URL.
    Missing credentials are a startup error, not a silent SQLite fallback.
    """
    if APP_ENV != "production":
        return
    if not os.getenv("OTP_HASH_SECRET") and not os.getenv("JWT_SECRET"):
        raise RuntimeError("Set OTP_HASH_SECRET (or JWT_SECRET) before starting the production service.")
    if not os.getenv("DATABASE_URL") or "sqlite" in os.getenv("DATABASE_URL", ""):
        raise RuntimeError("Production requires a configured non-SQLite DATABASE_URL.")


_production_startup_guard()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from services.db_sql import create_all_tables, is_persistent
from services.workflow_auth import router as auth_router, workflow_db, require_super_admin
from services.workflow_api import router as workflow_router
from services.member_profile_api import router as member_profile_router
from services.preventive_care import router as preventive_router
from services.integrations import router as integrations_router
from services.billing import router as billing_router
from services.otp_delivery import available_channels
from services.db_sql import SessionLocal


@asynccontextmanager
async def lifespan(app):
    # In production, apply schema via versioned migrations (create_all_tables
    # cannot alter an existing schema). In development, fall back to create_all
    # for a zero-friction local start.
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
        from services.workflow_scheduler import ensure_scheduled_jobs, workflow_scheduler
        from services.db_sql import SessionLocal as _SL
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


app = FastAPI(title="Studentkare Care API", version="1.0.0", lifespan=lifespan)
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


@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_unavailable(request, exc):
    return JSONResponse(status_code=503, content={"detail": "The data service is unavailable. Please try again shortly."})


@app.get("/api/health")
def health(db=Depends(workflow_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "persistent": is_persistent(), "integrations": {
        "otpChannels": available_channels(), "payments": False, "insurer": False,
        "deviceSync": False, "prescriptionReview": False,
    }}


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
