"""Preventive care contracts through real HTTP/session auth and isolated SQL storage."""
import time

import pytest
from sqlalchemy import select

from core import workflow_models as M
from test_workflow_api import harness, login, register


ROOT = "/api/preventive"


def staff(factory, account_id="admin", role="SUPER_ADMIN"):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                         full_name=f"Test {role}", role=role, active=True, profile={}, created_at=time.time()))
        db.commit()


def listing(client, headers):
    provider = client.post(f"{ROOT}/ops/providers", headers=headers, json={
        "name": "Fixture provider", "sourceUrl": "https://example.test/provider",
        "bookingUrl": "https://example.test/book", "lastVerifiedAt": time.time() - 10,
    })
    assert provider.status_code == 201, provider.text
    data = {"providerId": provider.json()["id"], "vaccineName": "Fixture vaccine",
            "pincode": "500001", "region": "Telangana", "sourceUrl": "https://example.test/vaccine"}
    response = client.post(f"{ROOT}/ops/vaccines", headers=headers, json=data)
    assert response.status_code == 201, response.text
    return provider.json(), response.json(), data


def report(client, headers):
    response = client.post("/api/health/documents", headers=headers,
                           data={"title": "Synthetic lab report", "category": "LAB"},
                           files={"file": ("report.pdf", b"%PDF-1.4\nSynthetic lab report", "application/pdf")})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def requested_review(client, headers):
    document_id = report(client, headers)
    response = client.post(f"{ROOT}/report-reviews", headers=headers, json={"documentId": document_id})
    assert response.status_code == 201, response.text
    return document_id, response.json()


def assigned_review(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    staff(factory)
    staff(factory, "doctor", "NMC_DOCTOR")
    document_id, review = requested_review(client, headers)
    share = client.post("/api/records/shares", headers=headers, json={
        "documentId": document_id, "clinicianEmail": "doctor@example.test", "expiresInDays": 7,
    }).json()
    admin_headers = login(client, codes, "admin@example.test")
    assigned = client.post(f"{ROOT}/ops/report-reviews/{review['id']}/assign", headers=admin_headers,
                           json={"clinicianId": "doctor", "expectedVersion": review["version"]})
    assert assigned.status_code == 200, assigned.text
    return user, document_id, assigned.json(), share


def guidance(version):
    return {"expectedVersion": version, "decision": "APPROVED",
            "summary": "Discuss these recorded findings with your clinician.",
            "questions": ["Does this result need repeating?"],
            "nextSteps": ["Arrange a follow-up consultation."],
            "sourceRefs": [{"title": "Reviewed reference", "url": "https://example.test/reference"}]}


def test_directory_empty_public_and_mutations_protected(harness):
    client, factory, codes = harness
    assert client.get(f"{ROOT}/vaccines").json() == {"items": [], "total": 0, "offset": 0, "limit": 20}
    assert client.get(f"{ROOT}/providers").json()["items"] == []
    assert client.post(f"{ROOT}/ops/providers", json={"name": "Fixture", "sourceUrl": "https://example.test"}).status_code == 401
    _, headers = register(client, codes)
    assert client.post(f"{ROOT}/ops/providers", headers=headers, json={"name": "Fixture", "sourceUrl": "https://example.test"}).status_code == 403
    staff(factory)
    login(client, codes, "admin@example.test")
    assert client.post(f"{ROOT}/ops/providers", json={"name": "Fixture", "sourceUrl": "https://example.test"}).status_code == 403


def test_directory_filters_pagination_provenance_and_expiry(harness):
    client, factory, codes = harness
    staff(factory)
    headers = login(client, codes, "admin@example.test")
    provider, vaccine, _ = listing(client, headers)
    assert vaccine["pricePaise"] is None
    assert vaccine["availability"] == "UNKNOWN"
    assert vaccine["lastVerifiedAt"] is None
    assert client.get(f"{ROOT}/vaccines", params={"query": "fixture", "provider": provider["id"], "pincode": "500001", "limit": 1}).json()["total"] == 1
    assert client.get(f"{ROOT}/vaccines", params={"pincode": "500002"}).json()["total"] == 0
    assert client.get(f"{ROOT}/vaccines", params={"offset": 1}).json()["items"] == []
    updated = client.patch(f"{ROOT}/ops/vaccines/{vaccine['id']}", headers=headers, json={
        "availability": "CONFIRMED", "pricePaise": 150000,
        "lastVerifiedAt": time.time() - 5, "expiresAt": time.time() + 86400,
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()["availability"] == "CONFIRMED"
    assert updated.json()["sourceUrl"] == "https://example.test/vaccine"
    from core.preventive_models import VaccineOffering
    with factory() as db:
        db.get(VaccineOffering, vaccine["id"]).expires_at = time.time() - 1
        db.commit()
    stale = client.get(f"{ROOT}/vaccines").json()["items"][0]
    assert stale["availability"] == "UNKNOWN" and stale["pricePaise"] is None
    assert stale["verificationStatus"] == "EXPIRED"
    assert client.patch(f"{ROOT}/ops/vaccines/{vaccine['id']}", headers=headers, json={"active": False}).status_code == 200
    assert client.patch(f"{ROOT}/ops/providers/{provider['id']}", headers=headers, json={"active": False}).status_code == 200
    assert client.get(f"{ROOT}/vaccines").json()["total"] == 0


@pytest.mark.parametrize("changes", [
    {"sourceUrl": "http://example.test"}, {"sourceUrl": "javascript:alert(1)"},
    {"sourceUrl": "https://user:password@example.test"}, {"pricePaise": -1},
    {"availability": "CONFIRMED"}, {"pincode": "bad"}, {"vaccineName": "   "},
    {"lastVerifiedAt": 99999999999}, {"providerId": "missing"},
])
def test_listing_validation(harness, changes):
    client, factory, codes = harness
    staff(factory)
    headers = login(client, codes, "admin@example.test")
    _, _, body = listing(client, headers)
    assert client.post(f"{ROOT}/ops/vaccines", headers=headers, json={**body, **changes}).status_code == 422


def test_preventive_preferences_explicit_consent_and_withdrawal(harness):
    client, factory, codes = harness
    assert client.get(f"{ROOT}/preferences").status_code == 401
    user, headers = register(client, codes)
    defaults = client.get(f"{ROOT}/preferences").json()
    assert defaults["seasonalEducationEnabled"] is False and defaults["promotionsEnabled"] is False
    assert client.put(f"{ROOT}/preferences", headers=headers, json={"region": "Telangana"}).status_code == 422
    body = {"seasonalEducationEnabled": True, "promotionsEnabled": False, "region": "Telangana", "topics": ["vaccines", "seasonal-health"]}
    saved = client.put(f"{ROOT}/preferences", headers=headers, json=body)
    assert saved.status_code == 200, saved.text
    assert client.get(f"{ROOT}/preferences").json()["topics"] == body["topics"]
    assert client.put(f"{ROOT}/preferences", headers=headers, json={**body, "seasonalEducationEnabled": False, "topics": []}).json()["seasonalEducationEnabled"] is False
    from core.preventive_models import PreventivePreference
    with factory() as db:
        assert db.get(PreventivePreference, user["id"]).seasonal_education_enabled is False
        assert db.scalars(select(M.OutboxEvent)).all() == []
    client.post("/api/auth/logout", headers=headers)
    register(client, codes, "other@example.test")
    assert client.get(f"{ROOT}/preferences").json()["region"] == ""


def test_report_requests_idempotent_private_and_owner_cannot_review(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    doc, review = requested_review(client, headers)
    repeated = client.post(f"{ROOT}/report-reviews", headers=headers, json={"documentId": doc})
    assert repeated.status_code == 200 and repeated.json()["id"] == review["id"]
    assert review["status"] == "REQUESTED" and review["guidance"] is None
    assert client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=headers, json=guidance(1)).status_code == 403
    client.post("/api/auth/logout", headers=headers)
    _, other_headers = register(client, codes, "other@example.test")
    assert client.get(f"{ROOT}/report-reviews").json()["items"] == []
    assert client.post(f"{ROOT}/report-reviews", headers=other_headers, json={"documentId": doc}).status_code == 404


def test_clinician_review_approved_content_and_stale_version(harness):
    client, factory, codes = harness
    user, doc, review, share = assigned_review(harness)
    doctor_headers = login(client, codes, "doctor@example.test")
    queue = client.get(f"{ROOT}/work/report-reviews").json()["items"]
    assert len(queue) == 1 and queue[0]["shareId"] == share["id"]
    assert client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=doctor_headers, json=guidance(1)).status_code == 409
    approved = client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=doctor_headers, json=guidance(review["version"]))
    assert approved.status_code == 200, approved.text
    assert approved.json()["reviewedBy"] == "doctor"
    assert approved.json()["guidance"]["summary"] == guidance(1)["summary"]
    assert client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=doctor_headers, json=guidance(approved.json()["version"])).status_code == 409
    login(client, codes, "member@example.test")
    owner_result = client.get(f"{ROOT}/report-reviews").json()["items"][0]
    assert owner_result["status"] == "APPROVED" and owner_result["guidance"]["sourceRefs"]


@pytest.mark.parametrize("access", ["revoked", "expired", "wrong_doctor", "vendor", "admin", "withdrawn", "changed_document"])
def test_review_access_rechecked_at_execution(harness, access):
    client, factory, codes = harness
    user, doc, review, share = assigned_review(harness)
    if access in {"revoked", "expired", "changed_document"}:
        with factory() as db:
            if access == "revoked":
                db.get(M.RecordShare, share["id"]).revoked = True
            elif access == "expired":
                db.get(M.RecordShare, share["id"]).expires_at = time.time() - 1
            else:
                db.get(M.Document, doc).content = b"changed"
            db.commit()
    if access == "withdrawn":
        owner_headers = login(client, codes, "member@example.test")
        assert client.post(f"{ROOT}/report-reviews/{review['id']}/withdraw", headers=owner_headers).status_code == 200
    role = {"wrong_doctor": "NMC_DOCTOR", "vendor": "VENDOR"}.get(access)
    identity = "doctor"
    if role:
        staff(factory, "otherstaff", role)
        identity = "otherstaff"
    elif access == "admin":
        identity = "admin"
    headers = login(client, codes, f"{identity}@example.test")
    result = client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=headers, json=guidance(review["version"]))
    assert result.status_code in (403, 404, 409), result.text
    if access in {"revoked", "expired", "wrong_doctor", "withdrawn"}:
        assert client.get(f"{ROOT}/work/report-reviews").json()["items"] == []


def test_assignment_requires_current_share_and_actual_clinician(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    doc, review = requested_review(client, headers)
    staff(factory)
    staff(factory, "doctor", "NMC_DOCTOR")
    staff(factory, "vendor", "VENDOR")
    headers = login(client, codes, "admin@example.test")
    for clinician in ("doctor", "vendor", "missing"):
        result = client.post(f"{ROOT}/ops/report-reviews/{review['id']}/assign", headers=headers,
                             json={"clinicianId": clinician, "expectedVersion": 1})
        assert result.status_code == 422


def test_rejected_guidance_never_published_and_pagination_bounded(harness):
    client, factory, codes = harness
    _, _, review, _ = assigned_review(harness)
    headers = login(client, codes, "doctor@example.test")
    response = client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=headers,
                           json={"expectedVersion": review["version"], "decision": "REJECTED"})
    assert response.status_code == 200, response.text
    login(client, codes, "member@example.test")
    assert client.get(f"{ROOT}/report-reviews").json()["items"][0]["guidance"] is None
    for endpoint in ("vaccines", "providers", "report-reviews"):
        assert client.get(f"{ROOT}/{endpoint}?limit=101").status_code == 422
        assert client.get(f"{ROOT}/{endpoint}?offset=-1").status_code == 422


def test_patch_validation_and_missing_resources(harness):
    client, factory, codes = harness
    staff(factory)
    headers = login(client, codes, "admin@example.test")
    provider, vaccine, _ = listing(client, headers)
    for path in (f"ops/providers/{provider['id']}", f"ops/vaccines/{vaccine['id']}"):
        for body in ({}, {"active": None}, {"unexpected": "value"}, {"sourceUrl": None}):
            assert client.patch(f"{ROOT}/{path}", headers=headers, json=body).status_code == 422
    for path in ("ops/providers/missing", "ops/vaccines/missing"):
        assert client.patch(f"{ROOT}/{path}", headers=headers, json={"active": False}).status_code == 404
    assert client.get(f"{ROOT}/vaccines?pincode=123").status_code == 422
    assert client.get(f"{ROOT}/vaccines?query=%25").json()["items"] == []
    assert client.get(f"{ROOT}/providers?query=absent").json()["items"] == []
    assert client.patch(f"{ROOT}/ops/vaccines/{vaccine['id']}", headers=headers, json={"pricePaise": None}).status_code == 200


def test_guidance_validation_no_admin_bypass_or_synthetic_reports(harness):
    client, factory, codes = harness
    _, _, review, _ = assigned_review(harness)
    headers = login(client, codes, "doctor@example.test")
    for bad in ({"summary": "   "}, {"nextSteps": []}, {"sourceRefs": []},
                {"sourceRefs": [{"title": "Bad link", "url": "http://example.test"}]},
                {"questions": [" " ]}, {"decision": "REJECTED"}):
        result = client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=headers,
                             json={**guidance(review["version"]), **bad})
        assert result.status_code == 422, result.text
    assert client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", json=guidance(review["version"])).status_code == 403
    headers = login(client, codes, "member@example.test")
    with factory() as db:
        owner = db.scalar(select(M.Account).where(M.Account.identifier == "member@example.test"))
        db.add(M.Document(id="synthetic", account_id=owner.id, title="Synthetic output", category="Radiology & Imaging",
                          filename="ai.json", mime_type="application/json", content=b"not evidence", created_at=time.time()))
        db.commit()
    assert client.post(f"{ROOT}/report-reviews", headers=headers, json={"documentId": "synthetic"}).status_code == 422
    assert client.get(f"{ROOT}/ops/report-reviews").status_code == 403
    assert client.post(f"{ROOT}/report-reviews/missing/withdraw", headers=headers).status_code == 404


def test_preference_validation_and_withdrawal_isolated(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    doc, review = requested_review(client, headers)
    base = {"seasonalEducationEnabled": False, "promotionsEnabled": False}
    for bad in ({"topics": ["diagnosis"]}, {"topics": ["vaccines", "vaccines"]},
                {"promotionsEnabled": "true"}, {"accountId": "other"}, {"region": "x" * 101}):
        assert client.put(f"{ROOT}/preferences", headers=headers, json={**base, **bad}).status_code == 422
    assert client.put(f"{ROOT}/preferences", json=base).status_code == 403
    client.post("/api/auth/logout", headers=headers)
    _, other_headers = register(client, codes, "other@example.test")
    assert client.post(f"{ROOT}/report-reviews/{review['id']}/withdraw", headers=other_headers).status_code == 404
    headers = login(client, codes, "member@example.test")
    withdrawn = client.post(f"{ROOT}/report-reviews/{review['id']}/withdraw", headers=headers).json()
    assert withdrawn["status"] == "WITHDRAWN" and withdrawn["guidance"] is None
    repeated = client.post(f"{ROOT}/report-reviews/{review['id']}/withdraw", headers=headers).json()
    assert repeated["version"] == withdrawn["version"]
    assert client.post(f"{ROOT}/report-reviews", headers=headers, json={"documentId": doc}).json()["status"] == "WITHDRAWN"
