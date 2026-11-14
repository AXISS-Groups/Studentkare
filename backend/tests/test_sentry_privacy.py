"""Synthetic payloads through the real optional SDK and loopback HTTP transport."""
import gzip
import json
import threading
from copy import deepcopy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import sentry_sdk
from sentry_sdk.envelope import Envelope, Item, PayloadRef

from core import sentry
from core.sentry_privacy import scrub_envelope, scrub_event

SYNTHETIC_EVENT = {
    "event_id": "0123456789abcdef0123456789abcdef",
    "level": "warning", "message": "Asha O+ 72", "release": "opaque-token",
    "exception": {"values": [{"type": "ValueError", "value": "opaque-token", "stacktrace": {
        "frames": [{"filename": "Asha.py", "vars": {"reading": 72}, "pre_context": ["O+"]}],
    }}]},
    "user": {"id": "Asha", "email": "asha@example.test"},
    "request": {"url": "https://asha:opaque-token@example.test/asha", "headers": {"Authorization": "Bearer opaque-token"}, "data": {"reading": 72}},
    "contexts": {"arbitrary": {"group": "O+", "reading": 72}},
    "tags": {"arbitrary": "opaque-token"}, "extra": {"password": "opaque-token"},
    "breadcrumbs": {"values": [{"message": "Asha", "data": {"reading": 72}}]},
    "fingerprint": ["opaque-token"], "unknown": {"reading": 72},
}


def test_closed_metadata_schema(monkeypatch):
    monkeypatch.setenv("APP_ENV", "testing")
    event = scrub_event(SYNTHETIC_EVENT)
    assert event is not None
    assert event.pop("event_id") != SYNTHETIC_EVENT["event_id"]
    assert event == {
        "platform": "python", "environment": "testing", "level": "warning",
        "exception": {"values": [{"type": "ValueError", "value": "Error details withheld"}]},
    }
    assert SYNTHETIC_EVENT["exception"]["values"][0]["value"] == "opaque-token"
    unknown = scrub_event({"exception": {"values": [{"type": "Asha"}]}, "level": "O+"})
    assert unknown is not None
    unknown.pop("event_id")
    assert unknown == {
        "platform": "python", "environment": "testing", "level": "error",
        "exception": {"values": [{"type": "Exception", "value": "Error details withheld"}]},
    }


@pytest.mark.parametrize("payload", [None, [], "opaque-token", {"type": "transaction"}, {"type": "feedback"}])
def test_malformed_or_non_error_events_deny(payload):
    assert scrub_event(payload) is None


def test_unreadable_payload_denies_without_logging(caplog):
    class BrokenEvent(dict):
        def get(self, key, default=None):
            raise ValueError("opaque-token")

    assert scrub_event(BrokenEvent()) is None
    assert "opaque-token" not in caplog.text


@pytest.mark.parametrize("kind", ["transaction", "attachment", "session", "sessions", "profile", "profile_chunk", "replay_event", "replay_recording", "feedback", "user_report", "statsd", "span", "check_in", "client_report", "log", "trace_metric"])
def test_side_envelopes_cannot_bypass_the_boundary(kind):
    assert scrub_envelope(Envelope(items=[Item(PayloadRef(json={"message": "opaque-token"}), type=kind)])) is None


def test_envelope_headers_ids_and_attachments_are_rebuilt():
    envelope = Envelope(
        headers={"event_id": SYNTHETIC_EVENT["event_id"], "trace": {"transaction": "opaque-token"}},
        items=[Item(PayloadRef(json=SYNTHETIC_EVENT), type="event"), Item(b"opaque-token", type="attachment", filename="Asha.txt")],
    )
    safe = scrub_envelope(envelope)
    assert safe is not None
    assert len(safe.items) == 1
    event = safe.items[0].get_event()
    assert event is not None
    assert safe.headers == {"event_id": event["event_id"]}
    assert event["event_id"] != SYNTHETIC_EVENT["event_id"]
    encoded = safe.serialize().decode()
    for value in ("opaque-token", "Asha", "reading", "O+", "trace", "filename"):
        assert value not in encoded


def test_actual_sdk_http_envelopes(monkeypatch):
    bodies = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):  # noqa: N802
            body = self.rfile.read(int(self.headers["Content-Length"]))
            if self.headers.get("Content-Encoding") == "gzip":
                body = gzip.decompress(body)
            bodies.append(body.decode())
            self.send_response(200)
            self.end_headers()

        def log_message(self, format, *args):
            return None

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    previous_client = sentry_sdk.get_client()
    try:
        monkeypatch.setattr(sentry, "SENTRY_DSN", f"http://public@127.0.0.1:{server.server_port}/1")
        assert sentry.init_sentry()
        client = sentry_sdk.get_client()
        assert client.options["traces_sample_rate"] == 0
        assert client.options["profiles_sample_rate"] == 0
        assert not client.options["auto_session_tracking"]
        assert client.options["before_send_transaction"]({"transaction": "opaque-token"}, {}) is None
        with sentry_sdk.isolation_scope() as scope:
            scope.set_user({"id": "Asha", "email": "asha@example.test"})
            scope.set_context("arbitrary", {"reading": 72})
            scope.add_attachment(bytes=b"opaque-token", filename="Asha.txt")
            sentry_sdk.capture_event(deepcopy(SYNTHETIC_EVENT))
            sentry_sdk.flush(timeout=5)
            assert len(bodies) == 1
            lines = bodies[0].splitlines()
            headers, item, event = (json.loads(line) for line in lines)
            assert item["type"] == "event"
            assert headers == {"event_id": event["event_id"]}
            assert event["exception"]["values"][0]["type"] == "ValueError"
            for value in ("opaque-token", "Asha", "asha", "reading", "O+", "request", "trace", "attachment"):
                assert value not in bodies[0]

            # Force a sampled transaction: the independent hook still denies it.
            client.options["traces_sample_rate"] = 1
            with sentry_sdk.start_transaction(name="opaque-token"):
                pass
            sentry_sdk.flush(timeout=5)
            assert len(bodies) == 1

            # Exercise the configured transport directly: no before_send call.
            client.transport.capture_envelope(Envelope(
                headers={"trace": {"transaction": "opaque-token"}},
                items=[Item(PayloadRef(json=SYNTHETIC_EVENT), type="event"), Item(b"opaque-token", type="attachment")],
            ))
            sentry_sdk.flush(timeout=5)
            assert len(bodies) == 2
            assert "opaque-token" not in bodies[1]
        client.close(timeout=5)
    finally:
        sentry_sdk.get_global_scope().set_client(previous_client)
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_disabled_reporting_and_initialization_failure(monkeypatch, caplog):
    monkeypatch.setattr(sentry, "SENTRY_DSN", None)
    assert not sentry.init_sentry()
    monkeypatch.setattr(sentry, "SENTRY_DSN", "http://public@example.test/1")

    def broken_init(**kwargs):
        raise RuntimeError("opaque-token")

    monkeypatch.setattr(sentry_sdk, "init", broken_init)
    assert not sentry.init_sentry()
    assert "opaque-token" not in caplog.text
