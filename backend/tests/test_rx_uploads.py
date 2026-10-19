"""A student uploads a prescription in any common format and sends it to a pharmacist.

These pin the rules rather than the happy path alone: the type is read from the
bytes, the file stays the student's, only the chosen pharmacy's pharmacist can
open it (not another pharmacy, a laboratory, a doctor or a platform admin), the
link to it is short-lived and bound to that pharmacist, and approving records an
outcome without ordering anything.
"""
import logging
import time

import pytest
from fastapi import HTTPException
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import rx_uploads

JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PDF = b"%PDF-1.7\n" + b"0" * 64
HEIC = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 64
HEIF = b"\x00\x00\x00\x18ftypmif1\x00\x00\x00\x00mif1heic" + b"\x00" * 64
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 64
TIFF = b"II*\x00\x08\x00\x00\x00" + b"\x00" * 64

ALL_CHECKS = {"prescriberRegistration": True, "prescriptionDate": True, "patientMatches": True,
              "allergyChecked": True, "scheduleLogged": True}


@pytest.fixture(autouse=True)
def _no_clamav(monkeypatch):
    monkeypatch.setattr(rx_uploads, "scan_file_for_viruses", lambda content, **_: True)


def make_account(factory, account_id, role, partner_kind=""):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                         full_name=account_id, role=role, active=True, profile={}, created_at=time.time(),
                         partner_kind=partner_kind))
        db.commit()


def make_provider(factory, provider_id, account_id, kind, name=None, active=True, licence_expiry=0.0):
    with factory() as db:
        db.add(M.ServiceProvider(
            id=provider_id, account_id=account_id, kind=kind, legal_name=name or f"{kind} {provider_id}",
            licence_no="LIC", licence_expiry=licence_expiry, accreditation="", address="12 Main Road, Flat 4",
            pincode="500001", latitude=0.0, longitude=0.0, serviceable_pincodes=[], open_hours="",
            home_collection=False, source_url="", verified_at=0.0, active=active, updated_at=time.time(),
        ))
        db.commit()


def upload(client, headers, content=JPEG, name="rx.jpg", declared="image/jpeg", title="Dr Rao, fever"):
    return client.post("/api/health/prescription-uploads", files={"file": (name, content, declared)},
                       data={"title": title}, headers=headers)


@pytest.fixture
def world(harness):
    """A student, their pharmacy, a rival pharmacy, a lab, a doctor and a platform admin."""
    client, factory, codes = harness
    student, student_headers = register(client, codes, "student@example.test")
    make_account(factory, "pharm", "VENDOR", "PHARMACY")
    make_provider(factory, "ph-1", "pharm", "PHARMACY", name="Campus Pharmacy")
    make_account(factory, "rival", "VENDOR", "PHARMACY")
    make_provider(factory, "ph-2", "rival", "PHARMACY", name="Rival Pharmacy")
    make_account(factory, "lab", "VENDOR", "LAB")
    make_provider(factory, "lab-1", "lab", "LAB", name="City Lab")
    make_account(factory, "doc", "NMC_DOCTOR")
    make_account(factory, "root", "SUPER_ADMIN")
    return client, factory, codes, student, student_headers


def other_student(client, codes):
    client.cookies.clear()
    return register(client, codes, "other@example.test")


def as_(client, codes, account_id):
    return login(client, codes, f"{account_id}@example.test")


def uploaded_and_sent(world):
    client, factory, codes, student, headers = world
    doc = upload(client, headers).json()
    sent = client.post(f"/api/health/prescription-uploads/{doc['id']}/reviews", json={"pharmacyId": "ph-1"},
                       headers=headers)
    assert sent.status_code == 201, sent.text
    return doc, sent.json()


# ══════════════════════════════════════════════════════════════════════════════
# Type sniffing, size and scanning
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("content,declared,expected", [
    (JPEG, "image/jpeg", "image/jpeg"),
    (PNG, "image/png", "image/png"),
    (PDF, "application/pdf", "application/pdf"),
    (HEIC, "image/heic", "image/heic"),
    (HEIF, "image/heif", "image/heif"),
    (WEBP, "image/webp", "image/webp"),
    (TIFF, "image/tiff", "image/tiff"),
    # Phones often declare HEIC as a generic stream; the bytes decide.
    (HEIC, "application/octet-stream", "image/heic"),
])
def test_accepted_formats_are_read_from_the_bytes(world, content, declared, expected):
    client, factory, _codes, student, headers = world
    res = upload(client, headers, content=content, declared=declared)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["mimeType"] == expected
    with factory() as db:
        doc = db.get(M.Document, body["id"])
        assert doc.account_id == student["id"]
        assert doc.category == "PRESCRIPTION"
        assert doc.mime_type == expected
        assert doc.content == content


def test_a_pdf_named_jpg_is_stored_as_the_pdf_it_is(world):
    client, _factory, _codes, _student, headers = world
    res = upload(client, headers, content=PDF, name="photo.jpg", declared="image/jpeg")
    assert res.status_code == 201
    assert res.json()["mimeType"] == "application/pdf"
    assert res.json()["filename"] == "photo.pdf"


@pytest.mark.parametrize("content,name,declared", [
    (b"MZ\x90\x00" + b"\x00" * 64, "rx.jpg", "image/jpeg"),                         # a Windows executable
    (b"PK\x03\x04" + b"\x00" * 64, "rx.docx", "application/vnd.openxmlformats"),   # Office / zip
    (b"<html><script>alert(1)</script></html>", "rx.pdf", "application/pdf"),     # markup claiming PDF
    (b"GIF89a" + b"\x00" * 64, "rx.gif", "image/gif"),
    (b"\x00\x00\x00\x18ftypisom" + b"\x00" * 64, "rx.heic", "image/heic"),       # an MP4, not an image
    (b"just some text", "rx.txt", "text/plain"),
])
def test_unsupported_or_disguised_files_are_refused(world, content, name, declared):
    client, factory, _codes, _student, headers = world
    res = upload(client, headers, content=content, name=name, declared=declared)
    assert res.status_code == 415
    with factory() as db:
        assert db.query(M.Document).count() == 0


def test_empty_file_is_refused(world):
    client, _factory, _codes, _student, headers = world
    assert upload(client, headers, content=b"").status_code == 422


def test_size_limit(world, monkeypatch):
    client, factory, _codes, _student, headers = world
    monkeypatch.setattr(rx_uploads, "MAX_BYTES", len(JPEG))
    assert upload(client, headers, content=JPEG).status_code == 201
    too_big = upload(client, headers, content=JPEG + b"\x00")
    assert too_big.status_code == 413
    with factory() as db:
        assert db.query(M.Document).count() == 1


def test_an_infected_file_is_refused_and_not_stored(world, monkeypatch):
    client, factory, _codes, _student, headers = world

    def infected(content, **_):
        raise HTTPException(400, "Security Error: Malicious file detected (Eicar). Upload blocked.")

    monkeypatch.setattr(rx_uploads, "scan_file_for_viruses", infected)
    assert upload(client, headers).status_code == 400
    with factory() as db:
        assert db.query(M.Document).count() == 0


def test_file_content_and_name_never_reach_the_logs(world, caplog, capsys):
    client, _factory, _codes, _student, headers = world
    marker = b"PATIENT-SECRET-AMOXICILLIN"
    caplog.set_level(logging.DEBUG)
    doc = upload(client, headers, content=PDF + marker, name="Ravi_Kumar_rx.pdf").json()
    client.post(f"/api/health/prescription-uploads/{doc['id']}/reviews", json={"pharmacyId": "ph-1"}, headers=headers)
    logged = caplog.text + capsys.readouterr().out
    assert "PATIENT-SECRET" not in logged
    assert "Ravi_Kumar" not in logged


def test_upload_is_not_queued_for_text_extraction(world):
    """Extracted fields go to a platform-admin queue; a prescription file must not."""
    client, factory, _codes, _student, headers = world
    upload(client, headers)
    with factory() as db:
        assert db.query(M.DocumentIntake).count() == 0


# ══════════════════════════════════════════════════════════════════════════════
# The student's own uploads
# ══════════════════════════════════════════════════════════════════════════════

def test_student_lists_only_their_own_prescriptions(world):
    client, _factory, codes, _student, headers = world
    mine = upload(client, headers).json()
    _other, other_headers = other_student(client, codes)
    theirs = upload(client, other_headers).json()

    listed = client.get("/api/health/prescription-uploads", headers=other_headers).json()
    assert [i["id"] for i in listed["items"]] == [theirs["id"]]
    assert mine["id"] not in str(listed)


def test_only_students_use_the_upload_routes(world):
    client, _factory, codes, _student, _headers = world
    for account in ("pharm", "doc", "root"):
        headers = as_(client, codes, account)
        assert upload(client, headers).status_code == 403
        assert client.get("/api/health/prescription-uploads", headers=headers).status_code == 403
        assert client.get("/api/pharmacies", headers=headers).status_code == 403


def test_another_student_cannot_delete_or_send_my_prescription(world):
    client, factory, codes, _student, headers = world
    doc = upload(client, headers).json()
    _other, other_headers = other_student(client, codes)
    assert client.delete(f"/api/health/prescription-uploads/{doc['id']}", headers=other_headers).status_code == 404
    assert client.post(f"/api/health/prescription-uploads/{doc['id']}/reviews", json={"pharmacyId": "ph-1"},
                       headers=other_headers).status_code == 404
    with factory() as db:
        assert db.get(M.Document, doc["id"]) is not None
        assert db.query(M.RxUploadReview).count() == 0


def test_delete_removes_the_file_and_withdraws_a_pending_review(world):
    client, factory, codes, _student, headers = world
    doc, review = uploaded_and_sent(world)
    pharm = as_(client, codes, "pharm")
    link = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/file-link", headers=pharm).json()

    student = login(client, codes, "student@example.test")
    res = client.delete(f"/api/health/prescription-uploads/{doc['id']}", headers=student)
    assert res.status_code == 200
    assert res.json()["withdrawnReviews"] == 1
    with factory() as db:
        assert db.get(M.Document, doc["id"]) is None
        assert db.get(M.RxUploadReview, review["id"]).status == "WITHDRAWN"
        assert db.query(M.WorkflowAudit).filter_by(action="RX_UPLOAD_DELETED", resource_id=doc["id"]).count() == 1

    pharm = as_(client, codes, "pharm")
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=pharm).json()["uploads"] == []
    assert client.get(link["url"], headers=pharm).status_code == 409
    student = login(client, codes, "student@example.test")
    assert client.delete(f"/api/health/prescription-uploads/{doc['id']}", headers=student).status_code == 404


def test_deleting_through_the_vault_also_withdraws_the_review(world):
    client, factory, _codes, _student, headers = world
    doc, review = uploaded_and_sent(world)
    assert client.delete(f"/api/health/documents/{doc['id']}", headers=headers).status_code == 200
    with factory() as db:
        assert db.get(M.RxUploadReview, review["id"]).status == "WITHDRAWN"


def test_the_upload_is_a_vault_document_the_student_can_download(world):
    client, _factory, _codes, _student, headers = world
    doc = upload(client, headers, content=PNG, declared="image/png").json()
    vault = client.get("/api/health/documents", headers=headers).json()["items"]
    assert [d["category"] for d in vault if d["id"] == doc["id"]] == ["PRESCRIPTION"]
    assert client.get(f"/api/health/documents/{doc['id']}/file", headers=headers).content == PNG


# ══════════════════════════════════════════════════════════════════════════════
# Choosing a pharmacy and sending
# ══════════════════════════════════════════════════════════════════════════════

def test_pharmacy_list_is_active_pharmacies_by_name_and_area_only(world):
    client, factory, _codes, _student, headers = world
    make_account(factory, "closed", "VENDOR", "PHARMACY")
    make_provider(factory, "ph-closed", "closed", "PHARMACY", name="Closed Pharmacy", active=False)
    make_account(factory, "lapsed", "VENDOR", "PHARMACY")
    make_provider(factory, "ph-lapsed", "lapsed", "PHARMACY", name="Lapsed Pharmacy", licence_expiry=time.time() - 60)

    listed = client.get("/api/pharmacies", headers=headers).json()
    assert [p["name"] for p in listed["items"]] == ["Campus Pharmacy", "Rival Pharmacy"]
    assert all(set(p) == {"id", "name", "area"} for p in listed["items"])
    assert "Main Road" not in str(listed)


@pytest.mark.parametrize("pharmacy_id", ["lab-1", "ph-missing", "ph-closed", "ph-lapsed"])
def test_send_only_to_a_real_active_pharmacy(world, pharmacy_id):
    client, factory, _codes, _student, headers = world
    make_account(factory, "closed", "VENDOR", "PHARMACY")
    make_provider(factory, "ph-closed", "closed", "PHARMACY", active=False)
    make_account(factory, "lapsed", "VENDOR", "PHARMACY")
    make_provider(factory, "ph-lapsed", "lapsed", "PHARMACY", licence_expiry=time.time() - 60)
    doc = upload(client, headers).json()
    res = client.post(f"/api/health/prescription-uploads/{doc['id']}/reviews", json={"pharmacyId": pharmacy_id},
                      headers=headers)
    assert res.status_code == 422
    with factory() as db:
        assert db.query(M.RxUploadReview).count() == 0


def test_one_pending_review_per_file(world):
    client, _factory, _codes, _student, headers = world
    doc, _review = uploaded_and_sent(world)
    again = client.post(f"/api/health/prescription-uploads/{doc['id']}/reviews", json={"pharmacyId": "ph-2"},
                        headers=headers)
    assert again.status_code == 409


def test_sending_lands_in_the_pharmacys_queue_without_student_details(world):
    client, factory, codes, student, _headers = world
    doc, review = uploaded_and_sent(world)
    queue = client.get("/api/v1/pharmacy/rx-reviews", headers=as_(client, codes, "pharm")).json()
    assert queue["uploadsTotal"] == 1
    item = queue["uploads"][0]
    assert set(item) == {"reviewId", "receivedAt", "mimeType", "source"}
    assert item["reviewId"] == review["id"] and item["source"] == "UPLOAD"
    flat = str(queue)
    assert student["id"] not in flat and doc["id"] not in flat and "Dr Rao" not in flat
    with factory() as db:
        assert db.query(M.OpsEvent).filter_by(kind="RX_UPLOAD_SENT", provider_id="ph-1").count() == 1


# ══════════════════════════════════════════════════════════════════════════════
# Who can open the file
# ══════════════════════════════════════════════════════════════════════════════

def test_the_pharmacist_opens_the_file_through_a_short_lived_link(world):
    client, factory, codes, _student, _headers = world
    _doc, review = uploaded_and_sent(world)
    pharm = as_(client, codes, "pharm")

    link = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/file-link", headers=pharm)
    assert link.status_code == 200, link.text
    body = link.json()
    assert 0 < body["expiresAt"] - time.time() <= rx_uploads.LINK_TTL_SECONDS
    opened = client.get(body["url"], headers=pharm)
    assert opened.status_code == 200
    assert opened.content == JPEG
    assert opened.headers["content-type"] == "image/jpeg"
    assert opened.headers["cache-control"] == "no-store"
    assert "rx.jpg" not in opened.headers["content-disposition"]
    with factory() as db:
        assert db.query(M.WorkflowAudit).filter_by(action="RX_UPLOAD_LINK_ISSUED", actor_id="pharm").count() == 1
        assert db.query(M.WorkflowAudit).filter_by(action="RX_UPLOAD_VIEWED", actor_id="pharm",
                                                   resource_id=review["id"]).count() == 1
        stored = db.get(M.RxUploadReview, review["id"])
        assert stored.last_viewed_at > 0
        token = body["url"].split("token=")[1]
        assert token not in stored.link_token_hash  # only a hash is kept


def test_an_expired_link_is_refused(world):
    client, factory, codes, _student, _headers = world
    _doc, review = uploaded_and_sent(world)
    pharm = as_(client, codes, "pharm")
    url = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/file-link", headers=pharm).json()["url"]
    with factory() as db:
        db.get(M.RxUploadReview, review["id"]).link_expires_at = time.time() - 1
        db.commit()
    assert client.get(url, headers=pharm).status_code == 403


def test_a_tampered_or_old_token_is_refused(world):
    client, _factory, codes, _student, _headers = world
    _doc, review = uploaded_and_sent(world)
    pharm = as_(client, codes, "pharm")
    first = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/file-link", headers=pharm).json()["url"]
    second = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/file-link", headers=pharm).json()["url"]
    assert client.get(first, headers=pharm).status_code == 403          # replaced by the newer link
    assert client.get(second + "x", headers=pharm).status_code == 403
    assert client.get(second, headers=pharm).status_code == 200


def test_the_link_is_useless_without_the_pharmacists_session(world):
    client, _factory, codes, _student, _headers = world
    _doc, review = uploaded_and_sent(world)
    url = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/file-link",
                      headers=as_(client, codes, "pharm")).json()["url"]
    client.cookies.clear()
    assert client.get(url).status_code == 401
    assert client.get(url, headers=as_(client, codes, "rival")).status_code == 404
    assert client.get(url, headers=as_(client, codes, "root")).status_code == 403


def test_another_pharmacy_cannot_see_open_or_review_it(world):
    client, factory, codes, _student, _headers = world
    _doc, review = uploaded_and_sent(world)
    rival = as_(client, codes, "rival")
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=rival).json()["uploads"] == []
    base = f"/api/v1/pharmacy/rx-uploads/{review['id']}"
    assert client.post(f"{base}/file-link", headers=rival).status_code == 404
    assert client.post(f"{base}/approve", json={"pharmacistName": "X", "checks": ALL_CHECKS},
                       headers=rival).status_code == 404
    assert client.post(f"{base}/reject", json={"reason": "Not ours"}, headers=rival).status_code == 404
    with factory() as db:
        assert db.get(M.RxUploadReview, review["id"]).status == "PENDING"


def test_a_laboratory_cannot_open_it_even_if_it_owns_the_pharmacy_listing(world):
    """partner_kind decides: a LAB-typed partner is not a pharmacist."""
    client, factory, codes, student, headers = world
    make_provider(factory, "ph-lab-owned", "lab", "PHARMACY", name="Lab-owned Pharmacy")
    doc = upload(client, headers).json()
    review = client.post(f"/api/health/prescription-uploads/{doc['id']}/reviews",
                         json={"pharmacyId": "ph-lab-owned"}, headers=headers).json()
    lab = as_(client, codes, "lab")
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=lab).json()["uploads"] == []
    base = f"/api/v1/pharmacy/rx-uploads/{review['id']}"
    assert client.post(f"{base}/file-link", headers=lab).status_code == 404
    assert client.post(f"{base}/approve", json={"pharmacistName": "X", "checks": ALL_CHECKS},
                       headers=lab).status_code == 404


@pytest.mark.parametrize("account", ["root", "doc"])
def test_platform_admin_and_doctors_have_no_access(world, account):
    client, factory, codes, _student, _headers = world
    doc, review = uploaded_and_sent(world)
    headers = as_(client, codes, account)
    base = f"/api/v1/pharmacy/rx-uploads/{review['id']}"
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=headers).status_code == 403
    assert client.post(f"{base}/file-link", headers=headers).status_code == 403
    assert client.get(f"{base}/file?token={'a' * 43}", headers=headers).status_code == 403
    assert client.post(f"{base}/approve", json={"pharmacistName": "X", "checks": ALL_CHECKS},
                       headers=headers).status_code == 403
    # Nor through the vault: a document is its owner's alone.
    assert client.get(f"/api/health/documents/{doc['id']}/file", headers=headers).status_code == 404
    if account == "root":
        assert client.get("/api/ops/intake/review", headers=headers).json()["items"] == []


def test_the_student_cannot_review_their_own_upload(world):
    client, _factory, _codes, _student, headers = world
    _doc, review = uploaded_and_sent(world)
    base = f"/api/v1/pharmacy/rx-uploads/{review['id']}"
    assert client.post(f"{base}/file-link", headers=headers).status_code == 403
    assert client.post(f"{base}/approve", json={"pharmacistName": "Me", "checks": ALL_CHECKS},
                       headers=headers).status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# Approve and reject: the same five checks, the outcome only
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("payload", [
    {"pharmacistName": "R. Iyer", "checks": {**ALL_CHECKS, "allergyChecked": False}},
    {"pharmacistName": "R. Iyer", "checks": {}},
    {"pharmacistName": "   ", "checks": ALL_CHECKS},
    {"checks": ALL_CHECKS},
])
def test_approve_needs_every_check_and_a_name(world, payload):
    client, factory, codes, _student, _headers = world
    _doc, review = uploaded_and_sent(world)
    res = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/approve", json=payload,
                      headers=as_(client, codes, "pharm"))
    assert res.status_code == 422
    with factory() as db:
        assert db.get(M.RxUploadReview, review["id"]).status == "PENDING"


def test_approve_records_the_outcome_and_orders_nothing(world):
    client, factory, codes, student, _headers = world
    _doc, review = uploaded_and_sent(world)
    pharm = as_(client, codes, "pharm")
    url = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/file-link", headers=pharm).json()["url"]

    res = client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/approve",
                      json={"pharmacistName": "R. Iyer", "checks": ALL_CHECKS}, headers=pharm)

    assert res.status_code == 200, res.text
    assert res.json()["status"] == "RX_VERIFIED" and res.json()["verifiedBy"] == "R. Iyer"
    with factory() as db:
        stored = db.get(M.RxUploadReview, review["id"])
        assert stored.checks == ALL_CHECKS and stored.reviewer_account_id == "pharm"
        assert stored.link_token_hash == ""
        assert db.query(M.Dispense).count() == 0
        assert db.query(M.Order).count() == 0
        assert db.query(M.WorkflowAudit).filter_by(action="RX_UPLOAD_RX_VERIFIED").count() == 1
    assert client.get(url, headers=pharm).status_code == 409   # the link closes with the review
    assert client.post(f"/api/v1/pharmacy/rx-uploads/{review['id']}/approve",
                       json={"pharmacistName": "R. Iyer", "checks": ALL_CHECKS}, headers=pharm).status_code == 409

    student_headers = login(client, codes, "student@example.test")
    listed = client.get("/api/health/prescription-uploads", headers=student_headers).json()["items"][0]
    assert listed["reviews"][0]["status"] == "RX_VERIFIED"
    assert listed["reviews"][0]["pharmacyName"] == "Campus Pharmacy"


def test_reject_needs_a_reason_and_tells_the_student_without_the_reason_in_the_notice(world):
    client, factory, codes, student, _headers = world
    doc, review = uploaded_and_sent(world)
    pharm = as_(client, codes, "pharm")
    url = f"/api/v1/pharmacy/rx-uploads/{review['id']}/reject"
    assert client.post(url, json={"reason": "  "}, headers=pharm).status_code == 422
    assert client.post(url, json={"reason": "x" * 301}, headers=pharm).status_code == 422

    res = client.post(url, json={"reason": "Dose of amoxicillin is illegible."}, headers=pharm)
    assert res.status_code == 200
    assert res.json()["status"] == "REJECTED"
    with factory() as db:
        notices = db.query(M.OpsEvent).filter_by(kind="RX_UPLOAD_REJECTED").all()
        assert notices and all("amoxicillin" not in (n.summary or "") for n in notices)

    # The student can now try another pharmacy.
    student_headers = login(client, codes, "student@example.test")
    listed = client.get("/api/health/prescription-uploads", headers=student_headers).json()["items"][0]
    assert listed["reviews"][0]["rejectionReason"] == "Dose of amoxicillin is illegible."
    again = client.post(f"/api/health/prescription-uploads/{doc['id']}/reviews", json={"pharmacyId": "ph-2"},
                        headers=student_headers)
    assert again.status_code == 201


def test_an_unreachable_scanner_refuses_the_prescription_even_in_test(world, monkeypatch):
    """Strict mode: no offline bypass for prescriptions, whatever APP_ENV says."""
    from services import security_scanner
    client, factory, _codes, _student, headers = world
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.delenv("CLAMAV_STRICT", raising=False)
    monkeypatch.setattr(security_scanner, "CLAMAV_HOST", "127.0.0.1")
    monkeypatch.setattr(security_scanner, "CLAMAV_PORT", 9)  # nothing listens: scanner offline
    monkeypatch.setattr(rx_uploads, "scan_file_for_viruses", security_scanner.scan_file_for_viruses)
    assert upload(client, headers).status_code == 500
    with factory() as db:
        assert db.query(M.Document).count() == 0
