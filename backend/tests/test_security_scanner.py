"""ClamAV reply parsing is exact, and prescriptions fail closed when the scanner is down."""
import pytest
from fastapi import HTTPException
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from services import security_scanner

PDF = b"%PDF-1.4\n" + b"0" * 32


class FakeClamd:
    reply = b"stream: OK\0"

    def __init__(self, *_args):
        pass

    def settimeout(self, _t):
        pass

    def connect(self, _addr):
        pass

    def sendall(self, _data):
        pass

    def recv(self, _n):
        return type(self).reply

    def close(self):
        pass


def scan_with_reply(monkeypatch, reply: bytes):
    FakeClamd.reply = reply
    monkeypatch.setattr(security_scanner.socket, "socket", FakeClamd)
    return security_scanner.scan_file_for_viruses(PDF)


def test_a_clean_reply_ending_in_ok_passes(monkeypatch):
    assert scan_with_reply(monkeypatch, b"stream: OK\0") is True


def test_a_signature_containing_ok_is_still_a_virus(monkeypatch):
    with pytest.raises(HTTPException) as exc:
        scan_with_reply(monkeypatch, b"stream: Win.Test.OKAY-1 FOUND\0")
    assert exc.value.status_code == 400


@pytest.mark.parametrize("reply", [b"stream: OK-ish ERROR\0", b"", b"INSTREAM size limit exceeded. ERROR\0"])
def test_any_other_reply_is_refused(monkeypatch, reply):
    with pytest.raises(HTTPException) as exc:
        scan_with_reply(monkeypatch, reply)
    assert exc.value.status_code == 500


def offline(monkeypatch):
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.delenv("CLAMAV_STRICT", raising=False)
    monkeypatch.setattr(security_scanner, "CLAMAV_HOST", "127.0.0.1")
    monkeypatch.setattr(security_scanner, "CLAMAV_PORT", 9)  # nothing listens


def test_strict_mode_refuses_when_offline_even_in_test(monkeypatch):
    offline(monkeypatch)
    assert security_scanner.scan_file_for_viruses(PDF) is True  # the dev/test bypass, unchanged
    with pytest.raises(HTTPException):
        security_scanner.scan_file_for_viruses(PDF, allow_offline_bypass=False)


def test_a_prescription_record_is_refused_when_the_scanner_is_offline(harness, monkeypatch):
    client, _factory, codes = harness
    _student, headers = register(client, codes, "scan@example.test")
    offline(monkeypatch)

    def post(category):
        return client.post("/api/health/documents", headers=headers, data={"title": "Record", "category": category},
                           files={"file": ("r.pdf", PDF, "application/pdf")})

    assert post("PRESCRIPTION").status_code == 500
    assert post("LAB").status_code == 201
    listed = client.get("/api/health/documents", headers=headers).json()
    assert [d["category"] for d in listed["items"]] == ["LAB"]
