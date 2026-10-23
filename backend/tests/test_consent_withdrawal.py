"""Seeing and withdrawing consents, and legal documents published without a deploy (audit H2).

* Every consent is listed: the sign-up ones (purpose, wording version, time, which
  notice/terms versions were shown) and each optional one.
* An optional consent is withdrawn as easily as it was given, stamps
  ``withdrawn_at``, is audited, and turns off the flag its processing reads.
* A required one can't be withdrawn alone: the answer says it means deleting the account.
* The switches on other screens write the same ledger.
* Legal documents: a super admin drafts and publishes; the public page and the sign-up
  record follow; with nothing published sign-up still works and records "unpublished".
"""
import time

import pytest
from sqlalchemy import select
from test_clinical_fulfilment import make_staff
from test_workflow_api import (  # noqa: F401 — pytest fixture
    SIGNUP_CONSENT,
    harness,
    login,
    register,
)

from core import preventive_models as P
from core import workflow_models as M
from services import consent_ledger
from services.agent_ayush import history_kept

OPTIONAL = {"AYUSH_HISTORY", "BLOOD_DONOR_CONTACT", "PICKUP_LOCATION", "PREVENTIVE_OFFERS", "SEASONAL_EDUCATION"}


def change(client, headers, purpose, granted):
    return client.post(f"/api/privacy/consents/{purpose}", json={"granted": granted}, headers=headers)


def optional(view, purpose):
    return next(item for item in view["optional"] if item["purpose"] == purpose)


def audits(factory, prefix):
    with factory() as db:
        return [row for row in db.scalars(select(M.WorkflowAudit)).all() if row.action.startswith(prefix)]


def test_lists_signup_consent_and_every_optional_purpose(harness):
    client, _factory, codes = harness
    register(client, codes)
    view = client.get("/api/privacy/consents").json()
    assert view["required"]["purposes"] == ["RECORDS_STORAGE", "CAMPUS_ENROLMENT", "ADULT_18_PLUS"]
    assert view["required"]["version"] == SIGNUP_CONSENT["version"]
    assert view["required"]["givenAt"] > 0
    assert {item["purpose"] for item in view["optional"]} == OPTIONAL
    # Nothing optional is on until the student turns it on.
    assert all(item["on"] is False for item in view["optional"])


def test_withdrawing_ayush_history_stops_keeping_words_and_is_audited(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    given = change(client, headers, "AYUSH_HISTORY", True)
    assert given.status_code == 200, given.text
    item = optional(given.json(), "AYUSH_HISTORY")
    assert item["on"] is True and item["givenAt"] and item["version"] == consent_ledger.OPTIONAL_CONSENT_VERSION
    with factory() as db:
        assert history_kept(db, user["id"]) is True
        db.add(M.AgentTurn(id="turn-1", account_id=user["id"], conversation_id="c", question="my words", answer="reply",
                           outcome="ANSWERED", created_at=time.time()))
        db.commit()

    withdrawn = change(client, headers, "AYUSH_HISTORY", False)
    assert withdrawn.status_code == 200
    item = optional(withdrawn.json(), "AYUSH_HISTORY")
    assert item["on"] is False and item["withdrawnAt"]
    with factory() as db:
        # The gate the agent reads is closed, and the words already kept are gone.
        assert history_kept(db, user["id"]) is False
        turn = db.get(M.AgentTurn, "turn-1")
        assert (turn.question, turn.answer) == ("", "")
        record = db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.purposes == ["AYUSH_HISTORY"])).one()
        assert record.withdrawn_at > 0
    assert [a.action for a in audits(factory, "CONSENT_")] == ["CONSENT_GIVEN_AYUSH_HISTORY", "CONSENT_WITHDRAWN_AYUSH_HISTORY"]

    # Given again: a new record, the withdrawn one is kept (append-only).
    change(client, headers, "AYUSH_HISTORY", True)
    with factory() as db:
        rows = db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.purposes == ["AYUSH_HISTORY"])).all()
        assert sorted(bool(r.withdrawn_at) for r in rows) == [False, True]


@pytest.mark.parametrize("purpose", ["RECORDS_STORAGE", "CAMPUS_ENROLMENT", "ADULT_18_PLUS"])
def test_a_required_consent_cannot_be_withdrawn_alone(harness, purpose):
    client, factory, codes = harness
    _user, headers = register(client, codes)
    refused = change(client, headers, purpose, False)
    assert refused.status_code == 409
    assert refused.json()["detail"]["code"] == consent_ledger.REQUIRED_FOR_SERVICE
    assert "delete your account" in refused.json()["detail"]["message"]
    with factory() as db:
        assert all(not r.withdrawn_at for r in db.scalars(select(M.ConsentRecord)).all())


def test_unknown_purpose_and_signed_out_are_refused(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    assert change(client, headers, "PARTNER_OFFERS", True).status_code == 404
    client.post("/api/auth/logout", headers=headers)
    assert client.get("/api/privacy/consents").status_code == 401
    assert change(client, headers, "AYUSH_HISTORY", True).status_code == 401


def test_preventive_switches_stop_and_write_the_ledger(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    body = {"seasonalEducationEnabled": True, "promotionsEnabled": True, "region": "", "topics": []}
    assert client.put("/api/preventive/preferences", json=body, headers=headers).status_code == 200
    view = client.get("/api/privacy/consents").json()
    assert optional(view, "SEASONAL_EDUCATION")["on"] and optional(view, "PREVENTIVE_OFFERS")["on"]
    assert optional(view, "SEASONAL_EDUCATION")["givenAt"]

    assert change(client, headers, "PREVENTIVE_OFFERS", False).status_code == 200
    with factory() as db:
        row = db.get(P.PreventivePreference, user["id"])
        assert row.promotions_enabled is False and row.seasonal_education_enabled is True
    assert client.get("/api/preventive/preferences").json()["promotionsEnabled"] is False


def test_notification_settings_write_the_ledger(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes)
    prefs = client.get("/api/notifications/preferences").json()
    assert client.put("/api/notifications/preferences", json={**prefs, "pickupLocationEnabled": True}, headers=headers).status_code == 200
    assert optional(client.get("/api/privacy/consents").json(), "PICKUP_LOCATION")["givenAt"]
    assert change(client, headers, "PICKUP_LOCATION", False).status_code == 200
    assert client.get("/api/notifications/preferences").json()["pickupLocationEnabled"] is False
    assert [a.action for a in audits(factory, "CONSENT_")] == ["CONSENT_GIVEN_PICKUP_LOCATION", "CONSENT_WITHDRAWN_PICKUP_LOCATION"]


def test_withdrawing_donor_contact_takes_the_donor_out_of_every_match(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    # Not registered: it can't be given from the privacy page.
    assert optional(client.get("/api/privacy/consents").json(), "BLOOD_DONOR_CONTACT")["canGiveHere"] is False
    assert change(client, headers, "BLOOD_DONOR_CONTACT", True).status_code == 409
    with factory() as db:
        db.add(M.BloodDonor(id="donor-1", account_id=user["id"], blood_group="O+", hostel_block="A", phone="",
                            is_available=True, visible=True, created_at=time.time()))
        db.commit()
    assert change(client, headers, "BLOOD_DONOR_CONTACT", False).status_code == 200
    with factory() as db:
        assert db.get(M.BloodDonor, "donor-1").visible is False
        from services.agents.blood_emergency_agent import blood_emergency_agent
        assert all(d.id != "donor-1" for d in blood_emergency_agent.campus_donors(db, None, ["O+"]))


# --- legal documents ----------------------------------------------------------------


def _super_admin(client, factory, codes):
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    return login(client, codes, "root@example.test")


def test_nothing_published_signup_still_works_and_records_unpublished(harness):
    client, factory, codes = harness
    assert client.get("/api/legal/PRIVACY_NOTICE").json() == {
        "kind": "PRIVACY_NOTICE", "published": False, "version": None, "title": None, "body": None, "publishedAt": None}
    terms = client.get("/api/auth/consent").json()
    assert terms["noticeVersion"] == "unpublished" and terms["termsVersion"] == "unpublished"
    _register_with(client, codes, "unpublished", "unpublished")
    with factory() as db:
        record = db.scalars(select(M.ConsentRecord)).one()
        assert (record.notice_version, record.terms_version) == ("unpublished", "unpublished")


def _register_with(client, codes, notice, terms, identifier="member@example.test"):
    import test_workflow_api as W
    original = dict(W.SIGNUP_CONSENT)
    W.SIGNUP_CONSENT.update({"noticeVersion": notice, "termsVersion": terms})
    try:
        return register(client, codes, identifier)
    finally:
        W.SIGNUP_CONSENT.clear()
        W.SIGNUP_CONSENT.update(original)


def test_super_admin_publishes_versions_and_signup_records_them(harness):
    client, factory, codes = harness
    headers = _super_admin(client, factory, codes)
    draft = client.post("/api/ops/legal-documents", headers=headers,
                        json={"kind": "PRIVACY_NOTICE", "version": "2026-11-01", "title": "Privacy notice", "body": "Text from legal."})
    assert draft.status_code == 201, draft.text
    doc = draft.json()
    assert doc["status"] == "DRAFT"
    # A draft isn't public.
    assert client.get("/api/legal/PRIVACY_NOTICE").json()["published"] is False
    assert client.patch(f"/api/ops/legal-documents/{doc['id']}", headers=headers,
                        json={"title": "Privacy notice", "body": "Corrected text from legal."}).status_code == 200
    assert client.post(f"/api/ops/legal-documents/{doc['id']}/publish", headers=headers).status_code == 200
    public = client.get("/api/legal/PRIVACY_NOTICE").json()
    assert public["published"] and public["version"] == "2026-11-01" and public["body"] == "Corrected text from legal."
    # Published is frozen; the same version can't be made twice.
    assert client.patch(f"/api/ops/legal-documents/{doc['id']}", headers=headers,
                        json={"title": "x" * 3, "body": "changed"}).status_code == 409
    assert client.post("/api/ops/legal-documents", headers=headers,
                       json={"kind": "PRIVACY_NOTICE", "version": "2026-11-01", "title": "Again", "body": "b"}).status_code == 409
    assert client.post("/api/ops/legal-documents", headers=headers,
                       json={"kind": "TERMS", "version": "unpublished", "title": "Terms", "body": "b"}).status_code == 422
    assert {a.action for a in audits(factory, "LEGAL_")} == {
        "LEGAL_DRAFT_CREATED_PRIVACY_NOTICE", "LEGAL_DRAFT_EDITED_PRIVACY_NOTICE", "LEGAL_PUBLISHED_PRIVACY_NOTICE"}
    client.post("/api/auth/logout", headers=headers)

    # A student who saw an older version is told to reload; the current one is recorded.
    assert client.get("/api/auth/consent").json()["noticeVersion"] == "2026-11-01"
    with pytest.raises(AssertionError):
        _register_with(client, codes, "unpublished", "unpublished")
    _register_with(client, codes, "2026-11-01", "unpublished", "second@example.test")
    with factory() as db:
        record = db.scalars(select(M.ConsentRecord)).one()
        assert (record.notice_version, record.terms_version) == ("2026-11-01", "unpublished")
    assert client.get("/api/privacy/consents").json()["required"]["noticeVersion"] == "2026-11-01"


def test_publishing_a_new_version_retires_the_old_one(harness):
    client, factory, codes = harness
    headers = _super_admin(client, factory, codes)
    ids = []
    for version in ("v1", "v2"):
        made = client.post("/api/ops/legal-documents", headers=headers,
                           json={"kind": "GRIEVANCE_OFFICER", "version": version, "title": "Grievance officer", "body": version})
        ids.append(made.json()["id"])
        client.post(f"/api/ops/legal-documents/{ids[-1]}/publish", headers=headers)
    items = {i["id"]: i["status"] for i in client.get("/api/ops/legal-documents").json()["items"]}
    assert items == {ids[0]: "RETIRED", ids[1]: "PUBLISHED"}
    assert client.get("/api/legal/GRIEVANCE_OFFICER").json()["body"] == "v2"


def test_only_a_super_admin_writes_legal_documents(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    assert client.get("/api/ops/legal-documents").status_code == 403
    assert client.post("/api/ops/legal-documents", headers=headers,
                       json={"kind": "TERMS", "version": "v1", "title": "Terms", "body": "b"}).status_code == 403
