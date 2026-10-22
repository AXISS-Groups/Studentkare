"""Studentkare: persistent, authenticated healthcare application API."""
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Configure logging early so all modules (including sentry init) can log properly
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.app_env import app_env  # noqa: E402 — needs the sys.path entry above

# Unset or unknown APP_ENV is production (core/app_env.py, audit ENV-01).
APP_ENV = app_env()
APP_VERSION = os.getenv("APP_VERSION", "dev")


def _production_startup_guard():
    """Fail closed when required production secrets are missing.

    Postgres is the only database format in production and development.
    In testing environment (APP_ENV=testing), local mock/sqlite is permitted
    so that unit test suites can run offline.
    """
    if APP_ENV == "testing":
        return
    # Unknown PAYMENT_PROVIDER, or the mock (no real money) in production without
    # the explicit PAYMENT_ALLOW_MOCK_IN_PRODUCTION opt-in: refuse to start.
    from services.payment_gateway import assert_provider_allowed
    assert_provider_allowed()
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
from core.sentry import init_sentry
from core.telemetry import (
    get_prometheus_app,
    init_telemetry,
    shutdown_telemetry,
    update_db_pool_metrics,
    update_job_metrics,
)
from services.account_contacts import router as account_contacts_router
from services.account_password import router as account_password_router
from services.activity_telemetry import ActivityTelemetryMiddleware
from services.alerts import router as alerts_router
from services.apilayer import router as apilayer_router
from services.billing import router as billing_router
from services.campus_departure import router as campus_departure_router
from services.care_directory import router as care_directory_router
from services.clinical_api import router as clinical_router
from services.db_sql import SessionLocal, create_all_tables, is_persistent
from services.emergency_api import router as emergency_router
from services.erasure import router as erasure_router
from services.integrations import router as integrations_router
from services.lab_booking import router as lab_booking_router
from services.lab_results import router as lab_results_router
from services.medicine_master import router as medicine_master_router
from services.member_profile_api import router as member_profile_router
from services.otp_delivery import available_channels, whatsapp_status
from services.preventive_care import router as preventive_router
from services.rewards_api import router as rewards_router
from services.rx_uploads import router as rx_uploads_router
from services.settings_api import router as settings_router
from services.signup_contacts import router as signup_contacts_router
from services.student_invites import router as student_invites_router
from services.student_passcode import router as student_passcode_router
from services.student_requests import router as student_requests_router
from services.team_accounts import router as team_accounts_router
from services.wellness_api import router as wellness_router
from services.workflow_api import router as workflow_router
from services.workflow_auth import require_super_admin, workflow_db
from services.workflow_auth import router as auth_router


@asynccontextmanager
async def lifespan(app):
    # Postgres-only. Production applies versioned migrations (create_all_tables
    # cannot alter an existing schema), one replica at a time (advisory lock).
    # Development does the same where it is safe (an empty or Alembic-tracked
    # database); tests keep create_all on their own engines.
    if APP_ENV == "production":
        from services.migrations import run_migrations
        run_migrations()
        print("[DB] Applied migrations to head.", flush=True)
        # Rule L at the database: computed now, CRITICAL ops-feed alert if not enforced.
        try:
            from services.commerce_session import rule_l_alert
            from services.db_sql import SessionLocal as _RuleLSession
            with _RuleLSession() as db:
                rule_l = rule_l_alert(db)
            print(f"[RULE L] enforced={rule_l['enforced']} reasons={rule_l['reasons']}", flush=True)
        except Exception as e:  # noqa: BLE001 — reported; the integration health job retries and alerts
            print(f"[RULE L] status could not be computed at startup: {type(e).__name__}", flush=True)
    elif APP_ENV == "development":
        from services.migrations import prepare_development_schema
        print(f"[DB] Development schema via {prepare_development_schema()}.", flush=True)
    else:
        create_all_tables()
    # Load persisted integrations config from database
    try:
        from services.integration_config import load_from_db
        load_from_db()
    except Exception as e:
        print(f"[CONFIG] Could not load integrations: {e}")
    # Name every fail-closed feature that is off for want of its key (TD-40):
    # logged here, and a CRITICAL ops-feed alert in production.
    try:
        from services.feature_keys import report_disabled_features
        with SessionLocal() as db:
            report_disabled_features(db)
    except Exception as e:  # noqa: BLE001 — reporting must never stop startup
        print(f"[FEATURES] status could not be computed at startup: {type(e).__name__}", flush=True)
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
    # Single-container deploys only: poll due jobs in this process too. Off by
    # default; the dedicated worker service is the normal path. Safe alongside
    # it and other replicas because every run takes the job's lease.
    scheduler_stop = None
    if os.getenv("SCHEDULER_IN_PROCESS", "").strip().lower() in {"1", "true", "yes"}:
        import threading

        from services.db_sql import SessionLocal as _worker_sessions
        from services.workflow_scheduler import run_worker_loop
        scheduler_stop = threading.Event()
        threading.Thread(target=run_worker_loop, args=(_worker_sessions, scheduler_stop),
                         name="workflow-scheduler", daemon=True).start()
        print("[SCHEDULER] In-process worker loop started.", flush=True)
    # Seed demo accounts only when explicitly enabled; never in production.
    try:
        from services.demo_seed import demo_accounts_enabled, seed_demo_data
        if demo_accounts_enabled():
            with SessionLocal() as db:
                result = seed_demo_data(db)
                if result.get("accounts", 0):
                    print(f"[SEED] Created {result['accounts']} demo accounts (including phone-based superadmin)")
        else:
            print("[SEED] Skipped: demo accounts need APP_ENV=development or testing and SEED_DEMO_DATA=true.")
    except Exception as e:
        print(f"[SEED] Skipped: {e}")
    # Initialize OpenTelemetry (fail-closed: never breaks startup)
    init_telemetry()
    # Initialize Sentry (fail-closed: no DSN = no Sentry)
    init_sentry()
    # Mount Prometheus metrics endpoint
    app.mount("/metrics", get_prometheus_app())
    # Periodic DB pool metrics update
    import asyncio
    async def update_pool_metrics():
        while True:
            try:
                update_db_pool_metrics()
            except Exception:
                pass
            # A database read: off the event loop.
            await asyncio.to_thread(update_job_metrics)
            await asyncio.sleep(15)
    pool_task = asyncio.create_task(update_pool_metrics())
    try:
        yield
    finally:
        if scheduler_stop is not None:
            scheduler_stop.set()
        pool_task.cancel()
        try:
            await pool_task
        except asyncio.CancelledError:
            pass
        shutdown_telemetry()


app = FastAPI(title="Studentkare Care API", version=APP_VERSION, lifespan=lifespan)


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


# Responses that are the same for every caller and may be cached by the route's
# own Cache-Control. Everything else is no-store. /api/config/public carries no
# per-user data (services/integrations.py), and the app reads it at boot.
CACHEABLE_PATHS = frozenset({"/api/config/public"})


@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.url.path not in CACHEABLE_PATHS or "Cache-Control" not in response.headers:
        response.headers["Cache-Control"] = "no-store"
    return response


# CORS is registered LAST so it is the OUTERMOST middleware (Starlette wraps in
# reverse order of registration). That way the 429 from GlobalRateLimitMiddleware
# and the 413 from BodyLimitMiddleware still carry Access-Control-Allow-Origin
# for allowed origins, so the browser lets the app read them instead of
# reporting an opaque network error. It also means a CORS preflight (OPTIONS
# with Origin + Access-Control-Request-Method) is answered here and never
# reaches, or spends budget in, the rate limiter. The allow-list is unchanged:
# a disallowed origin still gets no Access-Control-Allow-Origin header.
app.add_middleware(CORSMiddleware,
    allow_origins=[value.strip() for value in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173").split(',')],
    allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
)


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
        # "not_connected": OpenWA is configured but its WhatsApp session can't deliver (ops must re-link it).
        "otpChannels": available_channels(db), "whatsapp": whatsapp_status(db)["state"],
        "payments": False, "insurer": False,
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
app.include_router(wellness_router)
app.include_router(member_profile_router)
app.include_router(preventive_router)
app.include_router(integrations_router)
app.include_router(billing_router)
app.include_router(campus_departure_router)
app.include_router(emergency_router)
app.include_router(care_directory_router)
app.include_router(erasure_router)
app.include_router(student_requests_router)
app.include_router(clinical_router)
app.include_router(medicine_master_router)
app.include_router(lab_booking_router)
app.include_router(rx_uploads_router)
app.include_router(lab_results_router)
app.include_router(alerts_router)
app.include_router(rewards_router)
app.include_router(settings_router)
app.include_router(team_accounts_router)
app.include_router(student_passcode_router)
app.include_router(account_password_router)
app.include_router(account_contacts_router)
app.include_router(signup_contacts_router)
app.include_router(student_invites_router)
app.include_router(apilayer_router, dependencies=[Depends(require_super_admin)])
