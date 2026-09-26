"""
OpenTelemetry initialization and Prometheus metrics exposition for Studentkare.
Fail-closed: no metrics if initialization fails, never breaks the application.
"""

import os
import logging
from typing import Optional

from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
from prometheus_client import make_asgi_app, Counter, Histogram, Gauge

from services.db_sql import engine

logger = logging.getLogger("core.telemetry")

APP_VERSION = os.getenv("APP_VERSION", "dev")
APP_ENV = os.getenv("APP_ENV", "development")
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

guardrail_violations_total = Counter(
    "guardrail_violations_total",
    "Guardrail violations detected (should always be 0)"
)


def _create_resource() -> Resource:
    return Resource.create({
        SERVICE_NAME: "studentkare-api",
        SERVICE_VERSION: APP_VERSION,
        DEPLOYMENT_ENVIRONMENT: APP_ENV,
    })


def init_telemetry() -> bool:
    """Initialize OpenTelemetry SDK. Returns True on success, False on failure (fail-closed)."""
    global _tracer_provider, _meter_provider, _prometheus_app

    try:
        # Tracer provider with OTLP exporter (for traces to Tempo/Jaeger if deployed)
        _tracer_provider = TracerProvider(resource=_create_resource())
        trace.set_tracer_provider(_tracer_provider)

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
        FastAPIInstrumentor().instrument()
        SQLAlchemyInstrumentor().instrument(engine=engine)
        HTTPXClientInstrumentor().instrument()
        PsycopgInstrumentor().instrument()

        logger.info("OpenTelemetry auto-instrumentation enabled (FastAPI, SQLAlchemy, HTTPX, psycopg)")
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


def record_slack_alert(kind: str, success: bool) -> None:
    slack_alerts_total.labels(kind=kind, result="success" if success else "failure").inc()


def record_guardrail_violation() -> None:
    guardrail_violations_total.inc()