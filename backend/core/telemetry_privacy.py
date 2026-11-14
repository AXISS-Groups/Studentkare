"""Allowlisted operational spans; raw instrumentation data never reaches OTLP."""
from __future__ import annotations

from collections.abc import Sequence

from opentelemetry.sdk.resources import DEPLOYMENT_ENVIRONMENT, SERVICE_NAME, Resource
from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult
from opentelemetry.sdk.trace.id_generator import RandomIdGenerator
from opentelemetry.sdk.util.instrumentation import InstrumentationScope
from opentelemetry.trace import SpanContext, SpanKind, Status, StatusCode, TraceFlags

from core.app_env import app_env

TELEMETRY_SERVICE_NAME = "studentkare-api"
FLUSH_TIMEOUT_MILLIS = 30000  # SpanExporter protocol default.
SPAN_NAMES = {
    SpanKind.INTERNAL: "internal", SpanKind.SERVER: "server", SpanKind.CLIENT: "client",
    SpanKind.PRODUCER: "producer", SpanKind.CONSUMER: "consumer",
}


def scrub_spans(spans: Sequence[ReadableSpan]) -> tuple[ReadableSpan, ...] | None:
    """Keep kind, status and measured timing; rebuild IDs and intra-batch parents."""
    try:
        ids = RandomIdGenerator()
        trace_ids: dict[int, int] = {}
        contexts: dict[tuple[int, int], SpanContext] = {}
        for span in spans:
            if span.context is None or span.kind not in SPAN_NAMES:
                return None
            old = span.context
            if old.trace_id not in trace_ids:
                trace_ids[old.trace_id] = ids.generate_trace_id()
            key = (old.trace_id, old.span_id)
            if key not in contexts:
                contexts[key] = SpanContext(
                    trace_id=trace_ids[old.trace_id], span_id=ids.generate_span_id(),
                    is_remote=False, trace_flags=TraceFlags(TraceFlags.SAMPLED),
                )
        resource = Resource({SERVICE_NAME: TELEMETRY_SERVICE_NAME, DEPLOYMENT_ENVIRONMENT: app_env()})
        scope = InstrumentationScope("studentkare.telemetry")
        result = []
        for span in spans:
            old = span.context
            if old is None:
                return None
            parent = contexts.get((span.parent.trace_id, span.parent.span_id)) if span.parent else None
            code = span.status.status_code
            if code not in (StatusCode.UNSET, StatusCode.OK, StatusCode.ERROR):
                return None
            result.append(ReadableSpan(
                name=SPAN_NAMES[span.kind], context=contexts[(old.trace_id, old.span_id)],
                parent=parent, resource=resource, instrumentation_scope=scope,
                kind=span.kind, status=Status(code),
                start_time=span.start_time, end_time=span.end_time,
                attributes={}, events=(), links=(),
            ))
        return tuple(result)
    except Exception:
        return None


class PrivacySpanExporter(SpanExporter):
    def __init__(self, delegate: SpanExporter) -> None:
        self.delegate = delegate

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        safe = scrub_spans(spans)
        if safe is None:
            return SpanExportResult.FAILURE
        return self.delegate.export(safe) if safe else SpanExportResult.SUCCESS

    def shutdown(self) -> None:
        self.delegate.shutdown()

    def force_flush(self, timeout_millis: int = FLUSH_TIMEOUT_MILLIS) -> bool:
        return self.delegate.force_flush(timeout_millis)
