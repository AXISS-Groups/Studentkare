"""Uploaded paper prescriptions: stored in the student's vault, sent to one pharmacy,
viewed by that pharmacy only through a short-lived audited link, and verified by a
named pharmacist who has opened it.

Fail-closed cases first-class: wrong role, someone else's document, a pharmacy that
does not own the dispense, an expired or forged link, an oversized / wrong-type /
infected file, and a virus scanner that cannot be reached.
"""
import time

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from test_clinical_fulfilment import (
    ALL_CHECKS,
    issue_and_send,
    make_document,
    make_provider,
    make_staff,
)
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import clinical_api, security_scanner

PNG = b"\x89PNG\r\n\x1a\n" + b"paper prescription pixels"
PDF = b"%PDF-1.4 scanned prescription"


@pytest.fixture
def scanned(monkeypatch):
    """A scanner that answers clean, recording how it was asked."""
    calls = []

    def fake(content, *, allow_offline_bypass=True):
        calls.append(allow_offline_bypass)
        return True

    monkeypatch.setattr(security_scanner, "scan_file_for_viruses", fake)
    return calls


def upload(client, headers, content=PNG, mime="image/png", name="Dr Rao - Asha Kumar.png"):
    return client.post("/api/prescriptions/uploads", files={"file": (name, content, mime)}, headers=headers)


def setup_pharmacy(factory, account="pharm", provider="ph-1"):
    make_staff(factory, account, "VENDOR", f"{account}@example.test")
    make_provider(factory, provider, account, "PHARMACY", pincode="500001")


def uploaded_and_sent(client, factory, codes, identifier="rxup@example.test"):
    student, headers = register(client, codes, identifier)
    setup_pharmacy(factory)
    document = upload(client, headers).json()
    headers = login(client, codes, identifier)
    sent = client.post("/api/dispenses", json={"uploadedPrescriptionId": document["id"], "pharmacyId": "ph-1"},
                       headers=headers)
    assert sent.status_code == 201, sent.text
    return student, headers, document, sent.json()


def view_path(client, pharm_headers):
    [review] = client.get("/api/v1/pharmacy/rx-reviews/uploads", headers=pharm_headers).json()["reviews"]
    return review["document"]["viewPath"]


# ══════════════════════════════════════════════════════════════════════════════
# Upload
# ══════════════════════════════════════════════════════════════════════════════

def test_a_student_uploads_a_photo_into_their_own_vault_with_nothing_extracted(harness, scanned):
    client, factory, codes = harness
    student, headers = register(client, codes, "rxup@example.test")

    res = upload(client, headers)

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["category"] == "OUTSIDE_PRESCRIPTION"
    assert body["mimeType"] == "image/png"
    assert body["itemsExtracted"] is False and body["dispense"] is None
    assert scanned == [False], "the upload path must never allow the offline-scanner bypass"
    with factory() as db:
        document = db.get(M.Document, body["id"])
        assert document.account_id == student["id"] and document.content == PNG
        assert db.query(M.WorkflowAudit).filter_by(action="RX_UPLOADED", resource_id=body["id"]).count() == 1
        assert db.query(M.DocumentIntake).count() == 0, "no extraction is queued or implied"
    listed = client.get("/api/prescriptions/uploads", headers=headers).json()
    assert listed["total"] == 1 and listed["items"][0]["id"] == body["id"]
    vault = client.get("/api/health/documents", headers=headers).json()["items"]
    assert [d["category"] for d in vault] == ["OUTSIDE_PRESCRIPTION"]


def test_a_pdf_is_accepted(harness, scanned):
    client, _factory, codes = harness
    _student, headers = register(client, codes, "rxup@example.test")
    assert upload(client, headers, PDF, "application/pdf", "rx.pdf").status_code == 201


@pytest.mark.parametrize("content,mime,status", [
    (b"\x89PNG\r\n\x1a\n" + b"0" * (10 * 1024 * 1024), "image/png", 413),
    (b"just some text", "text/plain", 422),
    (PDF, "image/png", 422),            # declared type does not match the bytes
    (b"", "image/jpeg", 422),
    (b"GIF89a....", "image/gif", 422),
])
def test_oversized_or_wrong_type_files_are_refused_and_nothing_is_stored(harness, scanned, content, mime, status):
    client, factory, codes = harness
    _student, headers = register(client, codes, "rxup@example.test")

    assert upload(client, headers, content, mime).status_code == status
    with factory() as db:
        assert db.query(M.Document).count() == 0


def test_an_infected_file_is_refused(harness, monkeypatch):
    client, factory, codes = harness
    _student, headers = register(client, codes, "rxup@example.test")

    def infected(content, *, allow_offline_bypass=True):
        raise HTTPException(400, "Security Error: Malicious file detected (Eicar-Test-Signature). Upload blocked.")

    monkeypatch.setattr(security_scanner, "scan_file_for_viruses", infected)
    assert upload(client, headers).status_code == 400
    with factory() as db:
        assert db.query(M.Document).count() == 0


def test_an_unreachable_scanner_refuses_the_upload_even_in_test(harness, monkeypatch):
    """The lab-report and vault uploads let dev/test through without ClamAV; this path does not."""
    client, factory, codes = harness
    _student, headers = register(client, codes, "rxup@example.test")
    monkeypatch.delenv("CLAMAV_STRICT", raising=False)
    monkeypatch.setattr(security_scanner, "CLAMAV_HOST", "127.0.0.1")
    monkeypatch.setattr(security_scanner, "CLAMAV_PORT", 9)  # nothing listens

    res = upload(client, headers)

    assert res.status_code == 500
    assert "offline" in res.json()["detail"].lower()
    with factory() as db:
        assert db.query(M.Document).count() == 0


@pytest.mark.parametrize("reply,status", [
    (b"stream: OK\0", None),
    (b"stream: Doc.Dropper.OKAY-1 FOUND\0", 400),   # a signature name containing "OK" is still a detection
    (b"stream: Eicar-Test-Signature FOUND\0", 400),
    (b"INSTREAM size limit exceeded. ERROR\0", 500),
])
def test_the_scanner_reads_clamav_replies_strictly(monkeypatch, reply, status):
    class FakeSocket:
        def __init__(self, *args):
            pass

        def settimeout(self, _):
            pass

        def connect(self, _):
            pass

        def sendall(self, _):
            pass

        def recv(self, _):
            return reply

        def close(self):
            pass

    monkeypatch.setattr(security_scanner.socket, "socket", FakeSocket)
    if status is None:
        assert security_scanner.scan_file_for_viruses(PNG, allow_offline_bypass=False) is True
        return
    with pytest.raises(HTTPException) as refused:
        security_scanner.scan_file_for_viruses(PNG, allow_offline_bypass=False)
    assert refused.value.status_code == status


@pytest.mark.parametrize("role", ["VENDOR", "NMC_DOCTOR", "SUPER_ADMIN", "CAMPUS_ADMIN"])
def test_only_a_student_may_upload_or_list(harness, scanned, role):
    client, factory, codes = harness
    make_staff(factory, "other", role, "other@example.test")
    headers = login(client, codes, "other@example.test")

    assert upload(client, headers).status_code == 403
    assert client.get("/api/prescriptions/uploads", headers=headers).status_code == 403
    with factory() as db:
        assert db.query(M.Document).count() == 0


def test_upload_needs_a_session(harness, scanned):
    client, _factory, _codes = harness
    assert upload(client, {}).status_code in (401, 403)


# ══════════════════════════════════════════════════════════════════════════════
# Sending to a pharmacy
# ══════════════════════════════════════════════════════════════════════════════

def test_a_student_sends_their_upload_to_a_pharmacy(harness, scanned):
    client, factory, codes = harness
    student, headers, document, dispense = uploaded_and_sent(client, factory, codes)

    assert dispense["source"] == "UPLOAD"
    assert dispense["uploadedPrescriptionId"] == document["id"]
    assert dispense["prescriptionId"] is None and dispense["status"] == "RX_ISSUED"
    with factory() as db:
        assert db.query(M.DispenseItem).count() == 0, "nothing was transcribed, so there are no items"
    listed = client.get("/api/prescriptions/uploads", headers=headers).json()["items"][0]
    assert listed["dispense"]["id"] == dispense["id"]

    again = client.post("/api/dispenses", json={"uploadedPrescriptionId": document["id"], "pharmacyId": "ph-1"},
                        headers=headers)
    assert again.status_code == 409


def test_a_student_cannot_send_someone_elses_upload_or_another_vault_document(harness, scanned):
    client, factory, codes = harness
    _owner, _headers, document, _dispense = uploaded_and_sent(client, factory, codes)
    client.cookies.clear()
    intruder, intruder_headers = register(client, codes, "intruder@example.test")
    make_document(factory, "lab-doc", intruder["id"])  # the intruder's own lab report

    for target in (document["id"], "lab-doc", "missing"):
        res = client.post("/api/dispenses", json={"uploadedPrescriptionId": target, "pharmacyId": "ph-1"},
                          headers=intruder_headers)
        assert res.status_code == 404, target
    with factory() as db:
        assert db.query(M.Dispense).count() == 1


def test_a_dispense_names_exactly_one_source(harness, scanned):
    client, factory, codes = harness
    _student, headers, document, _dispense = uploaded_and_sent(client, factory, codes)

    both = client.post("/api/dispenses", json={"uploadedPrescriptionId": document["id"], "prescriptionId": "rx",
                                               "pharmacyId": "ph-1"}, headers=headers)
    neither = client.post("/api/dispenses", json={"pharmacyId": "ph-1"}, headers=headers)
    assert both.status_code == 422 and neither.status_code == 422


def test_the_database_refuses_a_dispense_with_both_or_neither_source(harness, scanned):
    client, factory, codes = harness
    student, _headers, document, _dispense = uploaded_and_sent(client, factory, codes)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    with factory() as db:
        db.add(M.Prescription(id="rx-1", encounter_id="", prescriber_id="doc", prescriber_reg_no="", patient_id=student["id"],
                              issued_at=time.time(), valid_until=0, status="ISSUED", advice="", allergy_check={}))
        db.commit()
    for prescription_id, document_id in (("rx-1", document["id"]), (None, None)):
        with factory() as db:
            db.add(M.Dispense(id=f"bad-{prescription_id}", prescription_id=prescription_id,
                              uploaded_document_id=document_id, pharmacy_id="ph-1", patient_id=student["id"],
                              status="RX_ISSUED", delivery={}, created_at=time.time(), updated_at=time.time()))
            with pytest.raises(IntegrityError):
                db.commit()


def test_a_pharmacy_cannot_send_an_upload(harness, scanned):
    client, factory, codes = harness
    _student, _headers, document, _dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")
    res = client.post("/api/dispenses", json={"uploadedPrescriptionId": document["id"], "pharmacyId": "ph-1"},
                      headers=pharm)
    assert res.status_code == 403


def test_a_sent_upload_cannot_be_deleted_from_the_vault_but_an_unsent_one_can(harness, scanned):
    client, factory, codes = harness
    _student, headers, document, _dispense = uploaded_and_sent(client, factory, codes)
    unsent = upload(client, headers).json()

    assert client.delete(f"/api/health/documents/{document['id']}", headers=headers).status_code == 409
    assert client.delete(f"/api/health/documents/{unsent['id']}", headers=headers).status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# Pharmacy review and the view link
# ══════════════════════════════════════════════════════════════════════════════

def test_the_upload_review_carries_the_dispense_and_a_link_only(harness, scanned):
    client, factory, codes = harness
    student, _headers, document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")

    queue = client.get("/api/v1/pharmacy/rx-reviews/uploads", headers=pharm).json()

    assert queue["total"] == 1
    review = queue["reviews"][0]
    assert set(review) == {"dispenseId", "receivedAt", "source", "document"}
    assert set(review["document"]) == {"mimeType", "viewPath", "expiresAt"}
    assert review["dispenseId"] == dispense["id"] and review["document"]["mimeType"] == "image/png"
    assert review["document"]["expiresAt"] <= time.time() + clinical_api.UPLOAD_VIEW_SECONDS + 1
    flat = str(review)
    assert student["id"] not in flat and document["id"] not in flat
    # The in-app review queue (and its screen) never sees an upload.
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=pharm).json() == {"reviews": [], "total": 0}


def test_the_owning_pharmacy_views_the_file_no_store_and_audited(harness, scanned):
    client, factory, codes = harness
    _student, _headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")

    res = client.get(f"/api{view_path(client, pharm)}", headers=pharm)

    assert res.status_code == 200, res.text
    assert res.content == PNG
    assert res.headers["content-type"] == "image/png"
    assert res.headers["cache-control"] == "no-store"
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["content-disposition"] == 'inline; filename="prescription.png"', "never the student's filename"
    with factory() as db:
        views = db.query(M.WorkflowAudit).filter_by(action="RX_UPLOAD_VIEWED", resource_id=dispense["id"]).all()
        assert [v.actor_id for v in views] == ["pharm"]


def test_another_pharmacy_cannot_view_list_or_review_it(harness, scanned):
    client, factory, codes = harness
    _student, _headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")
    path = view_path(client, pharm)
    setup_pharmacy(factory, "rival", "ph-2")
    rival = login(client, codes, "rival@example.test")

    assert client.get("/api/v1/pharmacy/rx-reviews/uploads", headers=rival).json() == {"reviews": [], "total": 0}
    assert client.get(f"/api{path}", headers=rival).status_code == 404
    assert client.post(f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/approve",
                       json={"pharmacistName": "Rival", "checks": ALL_CHECKS}, headers=rival).status_code == 404
    with factory() as db:
        assert db.query(M.WorkflowAudit).filter_by(action="RX_UPLOAD_VIEWED").count() == 0


def test_the_link_is_closed_to_students_doctors_and_admins(harness, scanned):
    client, factory, codes = harness
    _student, student_headers, _document, _dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")
    path = view_path(client, pharm)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    for headers in (login(client, codes, "rxup@example.test"), login(client, codes, "doc@example.test"),
                    login(client, codes, "root@example.test")):
        assert client.get(f"/api{path}", headers=headers).status_code == 403
        assert client.get("/api/v1/pharmacy/rx-reviews/uploads", headers=headers).status_code == 403


def test_a_forged_missing_or_expired_link_is_refused(harness, scanned):
    client, factory, codes = harness
    _student, _headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")
    base = f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/document"
    good = view_path(client, pharm).split("token=")[1]
    expires, signature = good.split(".")
    with factory() as db:
        row = db.get(M.Dispense, dispense["id"])
        past = int(time.time()) - 1
        expired = f"{past}.{clinical_api._view_signature(row, 'pharm', past)}"
        someone_elses = f"{expires}.{clinical_api._view_signature(row, 'rival', int(expires))}"

    assert client.get(base, headers=pharm).status_code == 422
    assert client.get(f"{base}?token={int(expires) + 999}.{signature}", headers=pharm).status_code == 403
    assert client.get(f"{base}?token=garbage", headers=pharm).status_code == 403
    assert client.get(f"{base}?token={someone_elses}", headers=pharm).status_code == 403
    assert client.get(f"{base}?token={expired}", headers=pharm).status_code == 410
    with factory() as db:
        assert db.query(M.WorkflowAudit).filter_by(action="RX_UPLOAD_VIEWED").count() == 0


def test_a_closed_dispense_no_longer_opens_the_file(harness, scanned):
    client, factory, codes = harness
    _student, headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")
    path = view_path(client, pharm)
    student = login(client, codes, "rxup@example.test")
    assert client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "CANCELLED"},
                        headers=student).status_code == 200
    pharm = login(client, codes, "pharm@example.test")
    assert client.get(f"/api{path}", headers=pharm).status_code == 404


def test_the_link_never_reaches_another_vault_document(harness, scanned):
    """The file endpoint is keyed by the dispense; the student's other records are unreachable."""
    client, factory, codes = harness
    student, _headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    make_document(factory, "private-lab", student["id"])
    pharm = login(client, codes, "pharm@example.test")
    token = view_path(client, pharm).split("token=")[1]

    assert client.get(f"/api/v1/pharmacy/rx-reviews/private-lab/document?token={token}", headers=pharm).status_code == 404
    with factory() as db:
        # Even if the dispense row were repointed, the category check refuses a non-upload document.
        db.get(M.Dispense, dispense["id"]).uploaded_document_id = "private-lab"
        db.commit()
        row = db.get(M.Dispense, dispense["id"])
        expires = int(time.time()) + 60
        forged_for_lab = f"{expires}.{clinical_api._view_signature(row, 'pharm', expires)}"
    res = client.get(f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/document?token={forged_for_lab}", headers=pharm)
    assert res.status_code == 404


def test_the_pharmacy_queue_shows_the_upload_link_and_no_prescription(harness, scanned):
    client, factory, codes = harness
    _student, _headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")

    [item] = client.get("/api/work/dispenses", headers=pharm).json()["items"]

    assert item["id"] == dispense["id"] and item["source"] == "UPLOAD"
    assert item["prescription"] is None
    assert item["uploadedPrescription"]["viewPath"].startswith(f"/v1/pharmacy/rx-reviews/{dispense['id']}/document?token=")


def test_verifying_an_upload_needs_the_pharmacist_to_have_opened_it(harness, scanned):
    client, factory, codes = harness
    _student, _headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")
    approve = f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/approve"

    unopened = client.post(approve, json={"pharmacistName": "R. Iyer", "checks": ALL_CHECKS}, headers=pharm)
    bypass = client.patch(f"/api/dispenses/{dispense['id']}",
                          json={"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"}, headers=pharm)
    assert unopened.status_code == 409 and bypass.status_code == 409
    unchecked = client.post(approve, json={"pharmacistName": "R. Iyer", "checks": {**ALL_CHECKS, "prescriptionDate": False}},
                            headers=pharm)
    assert unchecked.status_code == 422

    assert client.get(f"/api{view_path(client, pharm)}", headers=pharm).status_code == 200
    res = client.post(approve, json={"pharmacistName": "R. Iyer", "checks": ALL_CHECKS}, headers=pharm)

    assert res.status_code == 200, res.text
    assert res.json()["status"] == "RX_VERIFIED" and res.json()["verifiedBy"] == "R. Iyer"
    assert client.get("/api/v1/pharmacy/rx-reviews/uploads", headers=pharm).json()["total"] == 0


def test_an_upload_can_be_rejected_with_a_reason(harness, scanned):
    client, factory, codes = harness
    student, _headers, _document, dispense = uploaded_and_sent(client, factory, codes)
    pharm = login(client, codes, "pharm@example.test")

    res = client.post(f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/reject",
                      json={"reason": "The registration number is not visible."}, headers=pharm)

    assert res.status_code == 200 and res.json()["status"] == "REJECTED"
    with factory() as db:
        assert db.query(M.OpsEvent).filter_by(kind="DISPENSE_REJECTED", subject_id=student["id"]).count() == 1


def test_in_app_dispenses_are_unchanged(harness, scanned):
    client, factory, codes = harness
    _patient, rx, dispense, _headers = issue_and_send(client, factory, codes)
    assert dispense["source"] == "IN_APP" and dispense["prescriptionId"] == rx["id"]
    assert dispense["uploadedPrescriptionId"] is None
    pharm = login(client, codes, "pharm@example.test")
    assert client.get("/api/v1/pharmacy/rx-reviews/uploads", headers=pharm).json()["total"] == 0
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=pharm).json()["total"] == 1
