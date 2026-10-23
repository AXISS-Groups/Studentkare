"""
OpenTelemetry initialization and Prometheus metrics exposition for Studentkare.
Fail-closed: no metrics if initialization fails, never breaks the application.
"""

import logging
import os
from typing import Optional

from core.app_env import app_env

try:
    from opentelemetry import metrics, trace
    from opentelemetry.exporter.prometheus import PrometheusMetricReader
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.resources import (
        DEPLOYMENT_ENVIRONMENT,
        SERVICE_NAME,
        SERVICE_VERSION,
        Resource,
    )
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    HAS_OTEL = True
except ImportError:
    metrics = None
    trace = None
    PrometheusMetricReader = None
    MeterProvider = None
    TracerProvider = None
    BatchSpanProcessor = None
    Resource = None
    DEPLOYMENT_ENVIRONMENT = SERVICE_NAME = SERVICE_VERSION = ""
    HAS_OTEL = False

try:
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
except (ImportError, TypeError, Exception):
    OTLPSpanExporter = None

try:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
except ImportError:
    FastAPIInstrumentor = None
try:
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
except ImportError:
    HTTPXClientInstrumentor = None
try:
    from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
except ImportError:
    PsycopgInstrumentor = None
try:
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
except ImportError:
    SQLAlchemyInstrumentor = None

try:
    from prometheus_client import Counter, Gauge, Histogram, make_asgi_app
    HAS_PROMETHEUS = True
except ImportError:
    HAS_PROMETHEUS = False

    class _DummyMetric:
        def labels(self, *args, **kwargs):
            return self

        def inc(self, *args, **kwargs):
            pass

        def set(self, *args, **kwargs):
            pass

        def observe(self, *args, **kwargs):
            pass

    def Counter(*args, **kwargs):  # noqa: N802
        return _DummyMetric()

    def Gauge(*args, **kwargs):  # noqa: N802
        return _DummyMetric()

    def Histogram(*args, **kwargs):  # noqa: N802
        return _DummyMetric()

    def make_asgi_app():
        from starlette.responses import PlainTextResponse

        async def dummy_app(scope, receive, send):
            response = PlainTextResponse("# metrics unavailable\n")
            await response(scope, receive, send)

        return dummy_app

from services.db_sql import engine

logger = logging.getLogger("core.telemetry")

APP_VERSION = os.getenv("APP_VERSION", "dev")
APP_ENV = app_env()
OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")

_tracer_provider: Optional[TracerProvider] = None
_meter_provider: Optional[MeterProvider] = None
_prometheus_app = None


# Custom application metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "route", "status_class"]
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "route"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

http_requests_in_flight = Gauge(
    "http_requests_in_flight",
    "Currently active HTTP requests"
)

db_pool_checked_out = Gauge(
    "db_pool_checked_out",
    "Database connections currently checked out"
)

db_pool_overflow = Gauge(
    "db_pool_overflow",
    "Database pool overflow connections"
)

db_pool_idle = Gauge(
    "db_pool_idle",
    "Database pool idle connections"
)

db_query_duration_seconds = Histogram(
    "db_query_duration_seconds",
    "Database query latency in seconds",
    ["operation"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

slack_alerts_total = Counter(
    "slack_alerts_total",
    "Total Slack alerts sent",
    ["kind", "result"]
)

activity_telemetry_errors_total = Counter(
    "activity_telemetry_errors_total",
    "Activity telemetry write failures"
)

# Scheduled jobs, read from care_scheduled_jobs so the backend can export them
# for the worker, which has no HTTP endpoint (audit TD-49).
scheduled_job_overdue_seconds = Gauge(
    "scheduled_job_overdue_seconds",
    "Seconds an enabled job is past its next_run_at (about 0 while a worker keeps up)",
    ["job"]
)

guardrail_violations_total = Counter(
    "guardrail_violations_total",
    "Guardrail violations detected (should always be 0)"
)


def _create_resource():
    if not HAS_OTEL or Resource is None:
        return None
    return Resource.create({
        SERVICE_NAME: "studentkare-api",
        SERVICE_VERSION: APP_VERSION,
        DEPLOYMENT_ENVIRONMENT: APP_ENV,
    })


def init_telemetry() -> bool:
    """Initialize OpenTelemetry SDK. Returns True on success, False on failure (fail-closed)."""
    global _tracer_provider, _meter_provider, _prometheus_app

    if not HAS_OTEL:
        logger.info("OpenTelemetry SDK not installed (fail-closed, continuing without telemetry)")
        return False

    try:
        # Tracer provider with OTLP exporter (for traces to Tempo/Jaeger if deployed)
        _tracer_provider = TracerProvider(resource=_create_resource())
        trace.set_tracer_provider(_tracer_provider)

        if OTLPSpanExporter is not None:
            try:
                otlp_exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
                _tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
                logger.info("OTLP trace exporter configured for %s", OTEL_ENDPOINT)
            except Exception as e:
                logger.warning("OTLP trace exporter unavailable (traces will not be exported): %s", e)

        # Meter provider with Prometheus exporter
        prometheus_reader = PrometheusMetricReader()
        _meter_provider = MeterProvider(resource=_create_resource(), metric_readers=[prometheus_reader])
        metrics.set_meter_provider(_meter_provider)
        logger.info("Prometheus metrics reader configured")

        # Auto-instrument libraries
        if FastAPIInstrumentor is not None:
            FastAPIInstrumentor().instrument()
        if SQLAlchemyInstrumentor is not None:
            SQLAlchemyInstrumentor().instrument(engine=engine)
        if HTTPXClientInstrumentor is not None:
            HTTPXClientInstrumentor().instrument()
        if PsycopgInstrumentor is not None:
            PsycopgInstrumentor().instrument()

        logger.info("OpenTelemetry auto-instrumentation initialized")
        return True

    except Exception as e:
        logger.error("Failed to initialize OpenTelemetry (fail-closed, continuing without): %s", e)
        return False


def get_prometheus_app():
    """Return the Prometheus metrics ASGI app for mounting at /metrics."""
    global _prometheus_app
    if _prometheus_app is None:
        _prometheus_app = make_asgi_app()
    return _prometheus_app


# Who may scrape /metrics (audit L2): the internal network only. The metrics name
# routes, job states and pool sizes, which is reconnaissance for anyone outside.
# METRICS_ALLOWED_NETWORKS (comma-separated CIDRs) replaces the default private
# ranges for one deployment. The peer address is the one uvicorn resolved with
# --proxy-headers / FORWARDED_ALLOW_IPS (core/rate_limiter.py), never a header.
DEFAULT_METRICS_NETWORKS = "127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7"


def metrics_networks() -> list:
    import ipaddress
    raw = os.getenv("METRICS_ALLOWED_NETWORKS", DEFAULT_METRICS_NETWORKS)
    networks = []
    for entry in raw.split(","):
        try:
            networks.append(ipaddress.ip_network(entry.strip(), strict=False))
        except ValueError:
            logger.warning("[metrics] ignoring invalid network in METRICS_ALLOWED_NETWORKS")
    return networks


def metrics_client_allowed(host: str | None) -> bool:
    """True only for a peer address inside an allowed network. Unknown or unparsable is refused."""
    import ipaddress
    try:
        address = ipaddress.ip_address(host or "")
    except ValueError:
        return False
    return any(address in network for network in metrics_networks())


def internal_only(app):
    """Wrap an ASGI app so only the internal network reaches it; everyone else gets a plain 404."""
    async def guarded(scope, receive, send):
        if scope.get("type") == "http" and not metrics_client_allowed((scope.get("client") or (None,))[0]):
            await send({"type": "http.response.start", "status": 404,
                        "headers": [(b"content-type", b"text/plain; charset=utf-8")]})
            await send({"type": "http.response.body", "body": b"Not Found"})
            return
        await app(scope, receive, send)
    return guarded


def shutdown_telemetry() -> None:
    """Gracefully shut down telemetry providers."""
    global _tracer_provider, _meter_provider
    try:
        if _tracer_provider:
            _tracer_provider.shutdown()
        if _meter_provider:
            _meter_provider.shutdown()
        logger.info("Telemetry providers shut down")
    except Exception as e:
        logger.warning("Error during telemetry shutdown: %s", e)


def update_db_pool_metrics() -> None:
    """Update database pool metrics from SQLAlchemy engine pool."""
    try:
        pool = engine.pool
        db_pool_checked_out.set(pool.checkedout())
        db_pool_overflow.set(pool.overflow())
        db_pool_idle.set(pool.checkedin())
    except Exception:
        pass


def update_job_metrics() -> None:
    """Export how far each enabled job is past due. Never raises."""
    import time

    from sqlalchemy import select

    from core import workflow_models as M
    from services.db_sql import SessionLocal
    try:
        with SessionLocal() as db:
            jobs = db.execute(select(M.ScheduledJob.key, M.ScheduledJob.next_run_at)
                              .where(M.ScheduledJob.enabled.is_(True))).all()
        at = time.time()
        for key, next_run_at in jobs:
            scheduled_job_overdue_seconds.labels(job=key).set(max(at - (next_run_at or at), 0.0))
    except Exception as exc:  # noqa: BLE001 — metrics never break the app; the gauge goes stale
        logger.warning("Job metrics update failed: %s", type(exc).__name__)


def record_slack_alert(kind: str, success: bool) -> None:
    slack_alerts_total.labels(kind=kind, result="success" if success else "failure").inc()


def record_guardrail_violation() -> None:
    guardrail_violations_total.inc()
