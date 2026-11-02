"""Stored lab values (Mobile 2.0 plan, Gap 1): typed, checked, confirmed, then listed and trended.

These pin the rules, not only the happy path: a draft is invisible until the
student ticks it, confirm is all or nothing, another account's report or value
is a 404 and another role a 403, range state comes only from the range printed
with the value (never a threshold of ours), rows from an unreleased lab order
never show, and the commerce role has no way to the table (Rule L).
"""
import time
from datetime import date, timedelta

import pytest
from clock import platform_today
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import workflow_models as M
from services import lab_results

TODAY = platform_today()


def staff(factory, account_id, role):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                         full_name=account_id, role=role, active=True, profile={}, created_at=time.time()))
        db.commit()


def reference(factory, code="4548-4", name="HbA1c", system="BLOOD_SUGAR", active=True):
    with factory() as db:
        db.add(M.LabTestReference(code=code, display_name=name, body_system=system, default_unit="%",
                                  active=active, reviewed_by="fixture", reviewed_at=time.time()))
        db.commit()


def report(client, headers, category="LAB"):
    response = client.post("/api/health/documents", headers=headers,
                           data={"title": "Synthetic lab report", "category": category},
                           files={"file": ("report.pdf", b"%PDF-1.4\nSynthetic lab report", "application/pdf")})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def row(name="HbA1c", value=6.1, unit="%", low=4.0, high=5.6, **extra):
    body = {"testName": name, "valueNumeric": value, "unit": unit, "refLow": low, "refHigh": high,
            "refText": f"{low} - {high}" if low is not None else ""}
    body.update(extra)
    return body


def draft(client, headers, document_id, rows, collected=None, lab="City Lab"):
    return client.post(f"/api/health/documents/{document_id}/lab-results", headers=headers, json={
        "collectedOn": (collected or TODAY).isoformat(), "labName": lab, "rows": rows})


def confirm(client, headers, document_id, ids):
    return client.post(f"/api/health/documents/{document_id}/lab-results/confirm", headers=headers, json={"ids": ids})


@pytest.fixture
def student(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "student@example.test")
    return client, factory, codes, user, headers


def test_typed_values_stay_drafts_until_confirmed(student):
    client, factory, codes, user, headers = student
    reference(factory)
    doc = report(client, headers)
    made = draft(client, headers, doc, [row(testCode="4548-4"), row("HDL", 52, "mg/dL", 40, None),
                                        row("Urine sugar", None, "", None, None, valueText="Negative")])
    assert made.status_code == 201, made.text
    items = made.json()["items"]
    assert [i["status"] for i in items] == ["DRAFT"] * 3
    # Nothing is listed, trended or offered as a chip while it is a draft.
    assert client.get("/api/health/lab-results", headers=headers).json()["total"] == 0
    assert client.get("/api/health/lab-results/tests", headers=headers).json()["items"] == []
    assert client.get("/api/health/lab-results/trends", params={"test": "4548-4"}, headers=headers).json()["items"] == []
    # The Check step can read its own drafts back.
    check = client.get(f"/api/health/documents/{doc}/lab-results", headers=headers).json()
    assert len(check["items"]) == 3 and check["maxRows"] >= 3

    saved = confirm(client, headers, doc, [items[0]["id"], items[1]["id"]])
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["confirmed"] == 2 and body["discarded"] == 1   # the unticked row is not saved
    assert body["rangeCounts"] == {"IN_RANGE": 1, "ABOVE": 1, "BELOW": 0, "NO_RANGE": 0}
    assert body["outsideRange"] == 1
    assert {i["source"] for i in body["items"]} == {"STUDENT_CONFIRMED"}
    assert {i["rangeSource"] for i in body["items"]} == {"TYPED_FROM_REPORT"}

    listed = client.get("/api/health/lab-results", headers=headers).json()
    assert listed["total"] == 2
    [group] = listed["reports"]
    assert group["documentId"] == doc and group["labName"] == "City Lab"
    hba1c = next(i for i in group["items"] if i["testCode"] == "4548-4")
    assert hba1c["rangeState"] == "ABOVE" and hba1c["bodySystem"] == "BLOOD_SUGAR" and hba1c["testName"] == "HbA1c"
    assert listed["bodySystems"] == [{"bodySystem": "BLOOD_SUGAR", "tests": 1, "outsideRange": 1, "noRange": 0}]
    with factory() as db:
        assert db.scalar(select(M.LabResult).where(M.LabResult.test_name_as_printed == "Urine sugar")) is None


def test_confirm_is_idempotent_and_all_or_nothing(student):
    client, factory, codes, user, headers = student
    doc, other_doc = report(client, headers), report(client, headers)
    ids = [i["id"] for i in draft(client, headers, doc, [row(), row("HDL", 52, "mg/dL", 40, 60)]).json()["items"]]
    foreign = draft(client, headers, other_doc, [row("TSH", 2.0, "mIU/L", 0.4, 4.0)]).json()["items"][0]["id"]

    # An id from another report: refused, and nothing at all was saved.
    refused = confirm(client, headers, doc, [ids[0], foreign])
    assert refused.status_code == 422
    assert "Nothing was saved" in refused.json()["detail"]
    with factory() as db:
        assert {r.status for r in db.scalars(select(M.LabResult)).all()} == {"DRAFT"}
    assert confirm(client, headers, doc, ["missing-id"]).status_code == 422
    assert confirm(client, headers, doc, []).status_code == 422

    first = confirm(client, headers, doc, ids).json()
    again = confirm(client, headers, doc, ids)
    assert again.status_code == 200
    assert again.json()["confirmed"] == first["confirmed"] == 2 and again.json()["discarded"] == 0
    # The other report's draft was not touched by this report's confirm.
    with factory() as db:
        assert db.get(M.LabResult, foreign).status == "DRAFT"


def test_another_account_cannot_see_or_touch_values(student):
    client, factory, codes, user, headers = student
    doc = report(client, headers)
    ids = [i["id"] for i in draft(client, headers, doc, [row()]).json()["items"]]
    client.cookies.clear()
    _, other = register(client, codes, "other@example.test")
    assert draft(client, other, doc, [row()]).status_code == 404
    assert client.get(f"/api/health/documents/{doc}/lab-results", headers=other).status_code == 404
    assert confirm(client, other, doc, ids).status_code == 404
    assert client.patch(f"/api/health/lab-results/{ids[0]}", headers=other, json={"valueNumeric": 1}).status_code == 404
    assert client.delete(f"/api/health/lab-results/{ids[0]}", headers=other).status_code == 404
    # Their own lists stay empty even after the owner confirms.
    client.cookies.clear()
    owner = login(client, codes, "student@example.test")
    assert confirm(client, owner, doc, ids).status_code == 200
    client.cookies.clear()
    other = login(client, codes, "other@example.test")
    assert client.get("/api/health/lab-results", headers=other).json()["total"] == 0
    assert client.get("/api/health/lab-results/trends", params={"test": "name:hba1c"}, headers=other).json()["items"] == []


@pytest.mark.parametrize("role", ["NMC_DOCTOR", "SUPER_ADMIN", "VENDOR", "CAMPUS_ADMIN"])
def test_other_roles_are_refused(student, role):
    client, factory, codes, user, headers = student
    doc = report(client, headers)
    staff(factory, "someone", role)
    client.cookies.clear()
    theirs = login(client, codes, "someone@example.test")
    for method, path, body in (
        ("GET", "/api/health/lab-results", None),
        ("GET", "/api/health/lab-results/tests", None),
        ("GET", "/api/health/lab-results/trends?test=name:hba1c", None),
        ("GET", "/api/health/lab-results/pinned", None),
        ("PUT", "/api/health/lab-results/pinned", {"codes": []}),
        ("GET", f"/api/health/documents/{doc}/lab-results", None),
        ("POST", f"/api/health/documents/{doc}/lab-results",
         {"collectedOn": TODAY.isoformat(), "rows": [row()]}),
        ("POST", f"/api/health/documents/{doc}/lab-results/confirm", {"ids": ["x"]}),
    ):
        response = client.request(method, path, headers=theirs, json=body)
        assert response.status_code == 403, (method, path, response.text)


def test_signed_out_is_refused(harness):
    client, *_ = harness
    assert client.get("/api/health/lab-results").status_code == 401
    assert client.get("/api/lab-tests/reference").status_code == 401


def test_only_lab_reports_take_values(student):
    client, factory, codes, user, headers = student
    doc = report(client, headers, category="VACCINE")
    assert draft(client, headers, doc, [row()]).status_code == 422


@pytest.mark.parametrize("bad", [
    {"valueNumeric": None},                                   # no value at all
    {"valueText": "Negative"},                                # both a number and text
    {"valueNumeric": "six"},                                  # not a number
    {"valueNumeric": "NaN"},                                  # not finite
    {"unit": "mg/dL; DROP"},                                  # not a unit as printed
    {"unit": "x" * 41},
    {"refLow": 9.0, "refHigh": 1.0},                          # inverted range
    {"valueNumeric": None, "valueText": "Trace"},             # text value with a numeric range
    {"testName": ""},
    {"testName": "x" * 121},
    {"testCode": "NOT-A-CODE"},                               # unknown reference code
    {"valueNumeric": 1e12},                                   # past the settings bound
    {"refHigh": 1e12},
    {"extra": "field"},
])
def test_value_validation(student, bad):
    client, factory, codes, user, headers = student
    reference(factory)
    doc = report(client, headers)
    assert draft(client, headers, doc, [row(**bad)]).status_code == 422
    with factory() as db:
        assert db.scalars(select(M.LabResult)).all() == []


@pytest.mark.parametrize("collected", [TODAY + timedelta(days=2), date(1900, 1, 1)])
def test_report_date_validation(student, collected):
    client, factory, codes, user, headers = student
    doc = report(client, headers)
    assert draft(client, headers, doc, [row()], collected=collected).status_code == 422
    bad_date = client.post(f"/api/health/documents/{doc}/lab-results", headers=headers,
                           json={"collectedOn": "20-06-2026", "rows": [row()]})
    assert bad_date.status_code == 422


def test_row_cap_per_report(student, monkeypatch):
    client, factory, codes, user, headers = student
    real = lab_results.setting
    monkeypatch.setattr(lab_results, "setting",
                        lambda key, db=None: 2 if key == "lab_results.max_rows_per_report" else real(key, db))
    doc = report(client, headers)
    assert draft(client, headers, doc, [row(), row("HDL", 50, "mg/dL", 40, 60)]).status_code == 201
    assert draft(client, headers, doc, [row("TSH", 2, "mIU/L", 0.4, 4)]).status_code == 422


def test_correct_a_draft_but_never_a_saved_value(student):
    client, factory, codes, user, headers = student
    doc = report(client, headers)
    item = draft(client, headers, doc, [row()]).json()["items"][0]
    fixed = client.patch(f"/api/health/lab-results/{item['id']}", headers=headers, json={"valueNumeric": 5.2})
    assert fixed.status_code == 200 and fixed.json()["rangeState"] == "IN_RANGE"
    to_text = client.patch(f"/api/health/lab-results/{item['id']}", headers=headers,
                           json={"valueNumeric": None, "refLow": None, "refHigh": None, "valueText": "Trace"})
    assert to_text.status_code == 200 and to_text.json()["rangeState"] == "NO_RANGE"
    assert client.patch(f"/api/health/lab-results/{item['id']}", headers=headers,
                        json={"valueNumeric": 3.0}).status_code == 422   # both a number and text
    confirm(client, headers, doc, [item["id"]])
    assert client.patch(f"/api/health/lab-results/{item['id']}", headers=headers,
                        json={"valueText": "Nil"}).status_code == 409
    assert client.delete(f"/api/health/lab-results/{item['id']}", headers=headers).status_code == 200
    assert client.get("/api/health/lab-results", headers=headers).json()["total"] == 0


@pytest.mark.parametrize(("value", "low", "high", "state"), [
    (5.0, 4.0, 5.6, "IN_RANGE"), (4.0, 4.0, 5.6, "IN_RANGE"), (5.6, 4.0, 5.6, "IN_RANGE"),
    (6.1, 4.0, 5.6, "ABOVE"), (3.9, 4.0, 5.6, "BELOW"),
    (35.0, 40.0, None, "BELOW"), (45.0, 40.0, None, "IN_RANGE"),      # printed as "> 40"
    (250.0, None, 200.0, "ABOVE"), (150.0, None, 200.0, "IN_RANGE"),  # printed as "< 200"
    (5.0, None, None, "NO_RANGE"), (None, 4.0, 5.6, "NO_RANGE"),
])
def test_range_state_uses_only_the_printed_range(value, low, high, state):
    assert lab_results.range_state(value, low, high) == state


def test_trend_keeps_each_rows_own_range_newest_first(student):
    client, factory, codes, user, headers = student
    reference(factory)
    old, new = report(client, headers), report(client, headers)
    a = draft(client, headers, old, [row(testCode="4548-4", value=5.9, low=4.0, high=6.0)],
              collected=TODAY - timedelta(days=400), lab="Lab A").json()["items"]
    b = draft(client, headers, new, [row(testCode="4548-4", value=5.9, low=4.0, high=5.6)],
              collected=TODAY - timedelta(days=10), lab="Lab B").json()["items"]
    confirm(client, headers, old, [a[0]["id"]])
    confirm(client, headers, new, [b[0]["id"]])
    trend = client.get("/api/health/lab-results/trends", params={"test": "4548-4"}, headers=headers).json()
    assert [i["labName"] for i in trend["items"]] == ["Lab B", "Lab A"]
    # Same value, two labs, two ranges: each judged by its own lab's range.
    assert [i["rangeState"] for i in trend["items"]] == ["ABOVE", "IN_RANGE"]
    assert trend["testName"] == "HbA1c" and trend["minPointsForLine"] >= 2
    tests = client.get("/api/health/lab-results/tests", headers=headers).json()["items"]
    assert tests == [{"testKey": "4548-4", "testCode": "4548-4", "testName": "HbA1c", "bodySystem": "BLOOD_SUGAR",
                      "count": 2, "latestCollectedOn": (TODAY - timedelta(days=10)).isoformat(),
                      "latestRangeState": "ABOVE", "pinned": False}]


def test_uncoded_tests_trend_by_printed_name(student):
    client, factory, codes, user, headers = student
    doc = report(client, headers)
    ids = [i["id"] for i in draft(client, headers, doc, [row("Vitamin  D", 18, "ng/mL", 30, 100)]).json()["items"]]
    confirm(client, headers, doc, ids)
    [chip] = client.get("/api/health/lab-results/tests", headers=headers).json()["items"]
    assert chip["testKey"] == "name:vitamin d" and chip["bodySystem"] is None
    trend = client.get("/api/health/lab-results/trends", params={"test": chip["testKey"]}, headers=headers).json()
    assert len(trend["items"]) == 1 and trend["items"][0]["rangeState"] == "BELOW"


def test_unreleased_lab_order_rows_never_show(student):
    client, factory, codes, user, headers = student
    staff(factory, "labacct", "VENDOR")
    with factory() as db:
        db.add(M.ServiceProvider(
            id="lab-1", account_id="labacct", kind="LAB", legal_name="City Lab", licence_no="L", licence_expiry=0.0,
            accreditation="", address="1 Road", pincode="500001", latitude=0.0, longitude=0.0,
            serviceable_pincodes=[], open_hours="", home_collection=False, source_url="", verified_at=0.0,
            active=True, updated_at=time.time()))
        db.add(M.LabOrder(id="ord-1", patient_id=user["id"], lab_id="lab-1", test_panel=["HbA1c"],
                          status="REPORT_READY", created_at=time.time()))
        db.add(M.LabResult(id="lr-1", account_id=user["id"], test_name_as_printed="HbA1c", value_numeric=6.1,
                           unit="%", ref_low=4.0, ref_high=5.6, collected_on=TODAY, lab_name="City Lab",
                           source="LAB_RELEASED", lab_order_id="ord-1", status="CONFIRMED", created_at=time.time()))
        db.commit()
    assert client.get("/api/health/lab-results", headers=headers).json()["total"] == 0
    assert client.get("/api/health/lab-results/trends", params={"test": "name:hba1c"},
                      headers=headers).json()["items"] == []
    with factory() as db:
        db.get(M.LabOrder, "ord-1").status = "REPORT_RELEASED"
        db.commit()
    listed = client.get("/api/health/lab-results", headers=headers).json()
    assert listed["total"] == 1 and listed["reports"][0]["items"][0]["rangeSource"] == "LAB_REPORT"
    # A lab-released value is not the student's to delete.
    assert client.delete("/api/health/lab-results/lr-1", headers=headers).status_code == 409


def test_bookmarks_are_server_side_and_bounded(student, monkeypatch):
    client, factory, codes, user, headers = student
    reference(factory)
    reference(factory, code="2085-9", name="HDL", system="HEART_BLOOD")
    reference(factory, code="OLD-1", name="Retired", active=False)
    assert client.get("/api/health/lab-results/pinned", headers=headers).json()["codes"] == []
    saved = client.put("/api/health/lab-results/pinned", headers=headers, json={"codes": ["4548-4", "4548-4", "2085-9"]})
    assert saved.status_code == 200 and saved.json()["codes"] == ["4548-4", "2085-9"]
    with factory() as db:
        assert db.get(M.Preference, user["id"]).pinned_lab_tests == ["4548-4", "2085-9"]
    assert client.put("/api/health/lab-results/pinned", headers=headers, json={"codes": ["OLD-1"]}).status_code == 422
    assert client.put("/api/health/lab-results/pinned", headers=headers,
                      json={"codes": ["name:not mine"]}).status_code == 422
    real = lab_results.setting
    monkeypatch.setattr(lab_results, "setting", lambda key, db=None: 1 if key == "lab_results.pinned_max" else real(key, db))
    assert client.put("/api/health/lab-results/pinned", headers=headers,
                      json={"codes": ["4548-4", "2085-9"]}).status_code == 422
    assert client.put("/api/health/lab-results/pinned", headers=headers, json={"codes": []}).json()["codes"] == []


def test_reference_list_shows_active_tests_without_ranges(student):
    client, factory, codes, user, headers = student
    reference(factory)
    reference(factory, code="OLD-1", name="Retired", active=False)
    items = client.get("/api/lab-tests/reference", headers=headers).json()["items"]
    assert items == [{"code": "4548-4", "displayName": "HbA1c", "bodySystem": "BLOOD_SUGAR", "defaultUnit": "%"}]


def test_values_leave_with_their_report_and_are_exported(student):
    client, factory, codes, user, headers = student
    doc = report(client, headers)
    ids = [i["id"] for i in draft(client, headers, doc, [row()]).json()["items"]]
    confirm(client, headers, doc, ids)
    exported = client.get("/api/records/export", headers=headers).json()
    assert [r["id"] for r in exported["labResults"]] == ids and exported["pinnedLabTests"] == []
    assert client.delete(f"/api/health/documents/{doc}", headers=headers).status_code == 200
    with factory() as db:
        assert db.scalars(select(M.LabResult)).all() == []


def test_audit_and_ops_carry_no_value_or_test_name(student):
    client, factory, codes, user, headers = student
    doc = report(client, headers)
    ids = [i["id"] for i in draft(client, headers, doc, [row("Haemoglobin", 11.2, "g/dL", 12.0, 15.0)]).json()["items"]]
    confirm(client, headers, doc, ids)
    with factory() as db:
        audit = " ".join(f"{a.action} {a.resource_id}" for a in db.scalars(select(M.WorkflowAudit)).all())
        events = " ".join(f"{e.summary}" for e in db.scalars(select(M.OpsEvent)).all())
        outbox = " ".join(str(e.payload) for e in db.scalars(select(M.OutboxEvent)).all())
    for text in (audit, events, outbox):
        assert "Haemoglobin" not in text and "11.2" not in text


def test_rule_l_lab_results_are_clinical_and_unreachable_from_commerce():
    assert rule_l.TABLE_PLANES["care_lab_results"] == rule_l.CLINICAL
    assert rule_l.TABLE_PLANES["care_lab_test_reference"] == rule_l.PLATFORM
    assert "care_lab_results" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]
    assert "care_lab_test_reference" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]
    sql = rule_l.grant_statements({"care_lab_results"})
    assert 'REVOKE ALL ON TABLE public."care_lab_results" FROM PUBLIC' in sql
    assert not any("care_lab_results" in s and "sk_commerce" in s and s.startswith("GRANT") for s in sql)


def test_no_lab_results_route_uses_the_commerce_session():
    from app.main import app
    from services.commerce_session import commerce_db

    def deps(dependant):
        for dep in dependant.dependencies:
            yield dep.call
            yield from deps(dep)

    routes = list(lab_results.router.routes)
    included = [getattr(r, "original_router", r) for r in app.router.routes]
    assert lab_results.router in included   # the router is part of the app
    assert len(routes) >= 11
    assert all(commerce_db not in set(deps(r.dependant)) for r in routes)


def test_commerce_code_never_imports_lab_results():
    import pathlib

    from services import commerce_session  # noqa: F401 — the module commerce paths run through
    backend = pathlib.Path(lab_results.__file__).resolve().parent.parent
    commerce_modules = [p for p in (backend / "services").glob("*.py")
                        if "commerce_db" in p.read_text() and p.name not in {"commerce_session.py", "workflow_api.py"}]
    for path in commerce_modules:
        text = path.read_text()
        assert "lab_results" not in text and "LabResult" not in text, path.name
