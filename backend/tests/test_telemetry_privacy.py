"""Synthetic raw spans through the actual SDK/exporter and a loopback gRPC sink."""
from concurrent.futures import ThreadPoolExecutor

import grpc
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceResponse
from opentelemetry.proto.collector.trace.v1.trace_service_pb2_grpc import (
    TraceServiceServicer,
    add_TraceServiceServicer_to_server,
)
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import Event, ReadableSpan
from opentelemetry.sdk.trace.export import SpanExportResult
from opentelemetry.sdk.util.instrumentation import InstrumentationScope
from opentelemetry.trace import Link, SpanContext, SpanKind, Status, StatusCode, TraceState

from core.telemetry_privacy import PrivacySpanExporter, scrub_spans


def unsafe_span(context=None, parent=None):
    context = context or SpanContext(0x1234567890ABCDEF1234567890ABCDEF, 0x1234567890ABCDEF, False,
                                     trace_state=TraceState([("opaque", "opaque-token")]))
    return ReadableSpan(
        name="Asha O+ 72", context=context, parent=parent,
        resource=Resource({"service.name": "opaque-token", "host.name": "Asha"}),
        instrumentation_scope=InstrumentationScope("opaque-token", version="Asha", attributes={"reading": 72}),
        attributes={"http.url": "https://asha:opaque-token@example.test/asha", "db.statement": "SELECT 'O+'", "reading": 72},
        events=[Event("opaque-token", attributes={"exception.message": "Asha", "reading": 72})],
        links=[Link(context, attributes={"value": "O+"})],
        kind=SpanKind.CLIENT, status=Status(StatusCode.ERROR, "opaque-token"),
        start_time=1000000000, end_time=2000000000,
    )


def test_operational_timing_and_intra_batch_parents_survive(monkeypatch):
    monkeypatch.setenv("APP_ENV", "testing")
    root = unsafe_span()
    child_context = SpanContext(root.context.trace_id, 0x234567890ABCDEF1, False)
    child = unsafe_span(child_context, root.context)
    result = scrub_spans([root, child])
    assert result is not None and len(result) == 2
    safe_root, safe_child = result
    assert safe_root.name == "client"
    assert safe_root.start_time == root.start_time and safe_root.end_time == root.end_time
    assert safe_root.status.status_code == StatusCode.ERROR and safe_root.status.description is None
    assert dict(safe_root.attributes) == {} and not safe_root.events and not safe_root.links
    assert safe_root.context.trace_id != root.context.trace_id
    assert safe_root.context.span_id != root.context.span_id
    assert not safe_root.context.trace_state
    assert safe_child.parent == safe_root.context
    assert safe_child.context.trace_id == safe_root.context.trace_id
    assert dict(safe_root.resource.attributes) == {
        "service.name": "studentkare-api", "deployment.environment": "testing",
    }
    assert root.name == "Asha O+ 72"


def test_unknown_context_fails_closed_without_export_or_logging(caplog):
    from unittest.mock import Mock

    delegate = Mock()
    exporter = PrivacySpanExporter(delegate)
    assert exporter.export([ReadableSpan("opaque-token")]) == SpanExportResult.FAILURE
    delegate.export.assert_not_called()
    assert exporter.export([]) == SpanExportResult.SUCCESS
    delegate.export.assert_not_called()
    assert "opaque-token" not in caplog.text
    exporter.force_flush(123)
    delegate.force_flush.assert_called_once_with(123)
    exporter.shutdown()
    delegate.shutdown.assert_called_once()


def test_actual_otlp_grpc_wire_payload():
    requests = []

    class Sink(TraceServiceServicer):
        def Export(self, request, context):  # noqa: N802
            requests.append(request)
            return ExportTraceServiceResponse()

    server = grpc.server(ThreadPoolExecutor(max_workers=2))
    add_TraceServiceServicer_to_server(Sink(), server)
    port = server.add_insecure_port("127.0.0.1:0")
    server.start()
    delegate = OTLPSpanExporter(endpoint=f"127.0.0.1:{port}", insecure=True, timeout=5)
    exporter = PrivacySpanExporter(delegate)
    try:
        assert exporter.export([unsafe_span()]) == SpanExportResult.SUCCESS
        assert len(requests) == 1
        encoded = requests[0].SerializeToString()
        for value in (b"opaque-token", b"Asha", b"O+", b"reading", b"http.url", b"db.statement", b"exception.message"):
            assert value not in encoded
        span = requests[0].resource_spans[0].scope_spans[0].spans[0]
        assert span.name == "client" and span.start_time_unix_nano == 1000000000
        assert span.end_time_unix_nano == 2000000000
        assert not span.attributes and not span.events and not span.links and not span.trace_state
        assert span.trace_id != bytes.fromhex("1234567890abcdef1234567890abcdef")
    finally:
        exporter.shutdown()
        server.stop(grace=0).wait(timeout=5)
