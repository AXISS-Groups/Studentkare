"""Stored lab values: a student's own results, typed and confirmed, over time.

Mobile 2.0 plan (docs/plans/tier1-mobile2-health-2026-10-21.md), Gap 1 /
D-M2-6, D-M2-10, D-M2-17. Approved by the founder on 2026-10-21.

  GET    /lab-tests/reference                         test names and body-system groups (no ranges)
  GET    /health/lab-results                          own visible values, grouped by report
  GET    /health/lab-results/tests                    one entry per test with stored values (Trends chips)
  GET    /health/lab-results/trends?test=<key>        one test over time, newest first, each row's own range
  GET    /health/lab-results/pinned                   the Trends bookmarks
  PUT    /health/lab-results/pinned                   replace the bookmarks
  GET    /health/documents/{id}/lab-results           one owned report's rows, drafts included (the Check step)
  POST   /health/documents/{id}/lab-results           add DRAFT rows the student typed from that report
  POST   /health/documents/{id}/lab-results/confirm   all or nothing: listed drafts CONFIRMED, the rest discarded
  PATCH  /health/lab-results/{id}                     correct a DRAFT row
  DELETE /health/lab-results/{id}                     remove a row the student entered

Rules this module keeps:

* Owner only, students only. Another account's report or value is a 404; a
  non-student role is a 403. No doctor, admin or partner reads these rows here
  (doctor access through record shares is not part of phase 1).
* A DRAFT is never listed, trended or counted. A row tied to a lab order is
  visible only while that order is REPORT_RELEASED for this student (the
  doctor's release gate); phase 1 creates no such rows.
* Whether a value is in range is computed on every read from the range the lab
  printed and the student typed with it (``rangeSource``). There is no clinical
  threshold anywhere in this file; a value with no printed range is NO_RANGE.
* Rule L: clinical plane, ``workflow_db`` only. Nothing here imports or is
  imported by commerce code. Audit rows carry ids only; nothing is notified.
"""
from __future__ import annotations

import re
import time
import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, StringConstraints, ValidationError, field_validator, model_validator
from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import student_time
from services.workflow_auth import StrictModel, authenticated_user, workflow_db

router = APIRouter(prefix="/api", tags=["Lab results"])

DRAFT = "DRAFT"
CONFIRMED = "CONFIRMED"
LAB_RELEASED = "LAB_RELEASED"
STUDENT_CONFIRMED = "STUDENT_CONFIRMED"
RELEASED_ORDER_STATUS = "REPORT_RELEASED"
REPORT_CATEGORY = "LAB"

IN_RANGE = "IN_RANGE"
ABOVE = "ABOVE"
BELOW = "BELOW"
NO_RANGE = "NO_RANGE"
RANGE_STATES = (IN_RANGE, ABOVE, BELOW, NO_RANGE)
# Where the range a value is compared with came from: printed by a StudentKare
# lab with the released report, or copied by the student from their report.
RANGE_SOURCE = {LAB_RELEASED: "LAB_REPORT", STUDENT_CONFIRMED: "TYPED_FROM_REPORT"}

NAME_KEY_PREFIX = "name:"
# Units as labs print them: letters (incl. µ), digits, %, /, ^, ., *, ×, ·,
# superscripts, brackets, hyphen and spaces. Anything else is a typing slip.
UNIT_PATTERN = re.compile(r"^[A-Za-z0-9µμ%/^.*×·²³⁹\-\[\]() ]*$")
MAX_IDS = 200

Code = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
TestName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
ValueText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)]
Unit = Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)]
RefText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)]
LabName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
Number = Annotated[float, Field(allow_inf_nan=False)]
Identifier = Annotated[str, StringConstraints(min_length=1, max_length=64)]
TestKey = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=len(NAME_KEY_PREFIX) + 120)]


def require_student(user=Depends(authenticated_user)):
    if user["role"] != "STUDENT":
        raise HTTPException(403, "Lab values are kept by the student they belong to.")
    return user


def _new_id() -> str:
    return uuid.uuid4().hex


def _audit(db: Session, user: dict, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_new_id(), actor_id=user["id"], action=action, resource_id=resource_id,
                           created_at=time.time()))


# --- validation ----------------------------------------------------------------------------------------


class ValueFields(StrictModel):
    """The parts of one value that come from one line of the report."""
    testCode: Code | None = None
    testName: TestName
    valueNumeric: Number | None = None
    valueText: ValueText = ""
    unit: Unit = ""
    refLow: Number | None = None
    refHigh: Number | None = None
    refText: RefText = ""

    @field_validator("unit")
    @classmethod
    def unit_as_printed(cls, value: str) -> str:
        if not UNIT_PATTERN.match(value):
            raise ValueError("Type the unit as it is printed, for example mg/dL, %, g/dL or ng/mL.")
        return value

    @model_validator(mode="after")
    def one_value_and_a_coherent_range(self):
        has_number = self.valueNumeric is not None
        if has_number == bool(self.valueText):
            raise ValueError("Give either a number or a printed result such as Negative, not both.")
        if not has_number and (self.refLow is not None or self.refHigh is not None):
            raise ValueError("A low or high limit needs a numeric value to compare with.")
        if self.refLow is not None and self.refHigh is not None and self.refLow > self.refHigh:
            raise ValueError("The low limit of the range is above the high limit.")
        return self


class ValueRow(ValueFields):
    collectedOn: date
    labName: LabName = ""


class DraftInput(StrictModel):
    collectedOn: date
    labName: LabName = ""
    rows: list[ValueFields] = Field(min_length=1, max_length=MAX_IDS)


class DraftPatch(StrictModel):
    testCode: Code | None = None
    testName: TestName | None = None
    valueNumeric: Number | None = None
    valueText: ValueText | None = None
    unit: Unit | None = None
    refLow: Number | None = None
    refHigh: Number | None = None
    refText: RefText | None = None
    collectedOn: date | None = None
    labName: LabName | None = None


class ConfirmInput(StrictModel):
    ids: list[Identifier] = Field(min_length=1, max_length=MAX_IDS)


class PinnedInput(StrictModel):
    codes: list[TestKey] = Field(max_length=MAX_IDS)


def _check_bounds(db: Session, row: ValueRow, today: date, where: str) -> None:
    """Bounds that come from the settings registry. Input limits, never clinical thresholds."""
    limit = setting("lab_results.value_abs_max", db)
    for number in (row.valueNumeric, row.refLow, row.refHigh):
        if number is not None and abs(number) > limit:
            raise HTTPException(422, f"{where}: that number is too large. Check it against the report.")
    if row.collectedOn > today:
        raise HTTPException(422, f"{where}: the report date is in the future.")
    years = setting("lab_results.collected_on_max_age_years", db)
    try:
        earliest = today.replace(year=today.year - years)
    except ValueError:   # 29 February
        earliest = today.replace(year=today.year - years, day=today.day - 1)
    if row.collectedOn < earliest:
        raise HTTPException(422, f"{where}: the report date is more than {years} years ago.")


def _active_codes(db: Session, codes: set[str]) -> set[str]:
    if not codes:
        return set()
    return set(db.scalars(select(M.LabTestReference.code).where(
        M.LabTestReference.code.in_(codes), M.LabTestReference.active.is_(True))).all())


def _check_codes(db: Session, rows: list[ValueRow]) -> None:
    wanted = {r.testCode for r in rows if r.testCode}
    unknown = wanted - _active_codes(db, wanted)
    if unknown:
        raise HTTPException(422, "Choose a test from the list, or type its name as printed without a code.")


# --- reading -------------------------------------------------------------------------------------------


def range_state(value: float | None, low: float | None, high: float | None) -> str:
    """Where a value sits against the range its own lab printed. Never a clinical threshold."""
    if value is None or (low is None and high is None):
        return NO_RANGE
    if low is not None and value < low:
        return BELOW
    if high is not None and value > high:
        return ABOVE
    return IN_RANGE


def test_key(row: M.LabResult) -> str:
    """Groups one test's values: its reference code, or its printed name when it has none."""
    if row.test_code:
        return row.test_code
    return NAME_KEY_PREFIX + " ".join(row.test_name_as_printed.split()).casefold()


def visible_statement(account_id: str):
    """CONFIRMED rows of this account that may be shown: released if from a lab order, owned report if any."""
    released = select(M.LabOrder.id).where(M.LabOrder.patient_id == account_id,
                                           M.LabOrder.status == RELEASED_ORDER_STATUS)
    owned_docs = select(M.Document.id).where(M.Document.account_id == account_id)
    return select(M.LabResult).where(
        M.LabResult.account_id == account_id,
        M.LabResult.status == CONFIRMED,
        or_(M.LabResult.lab_order_id.is_(None), M.LabResult.lab_order_id.in_(released)),
        or_(M.LabResult.document_id.is_(None), M.LabResult.document_id.in_(owned_docs)),
    )


def _references(db: Session, rows: list[M.LabResult]) -> dict[str, M.LabTestReference]:
    codes = {r.test_code for r in rows if r.test_code}
    if not codes:
        return {}
    return {ref.code: ref for ref in db.scalars(select(M.LabTestReference).where(M.LabTestReference.code.in_(codes)))}


def result_payload(row: M.LabResult, refs: dict[str, M.LabTestReference]) -> dict:
    ref = refs.get(row.test_code or "")
    state = range_state(row.value_numeric, row.ref_low, row.ref_high)
    return {
        "id": row.id,
        "testKey": test_key(row),
        "testCode": row.test_code,
        "testName": ref.display_name if ref else row.test_name_as_printed,
        "testNameAsPrinted": row.test_name_as_printed,
        "bodySystem": ref.body_system if ref else None,
        "valueNumeric": row.value_numeric,
        "valueText": row.value_text,
        "unit": row.unit,
        "refLow": row.ref_low,
        "refHigh": row.ref_high,
        "refText": row.ref_text,
        "rangeState": state,
        "rangeSource": None if state == NO_RANGE else RANGE_SOURCE[row.source],
        "collectedOn": row.collected_on.isoformat(),
        "labName": row.lab_name,
        "source": row.source,
        "documentId": row.document_id,
        "labOrderId": row.lab_order_id,
        "status": row.status,
        "createdAt": row.created_at,
        "confirmedAt": row.confirmed_at,
    }


def _newest_first(rows: list[M.LabResult]) -> list[M.LabResult]:
    return sorted(rows, key=lambda r: (r.collected_on, r.created_at, r.id), reverse=True)


def _visible(db: Session, account_id: str) -> list[M.LabResult]:
    stmt = visible_statement(account_id).order_by(M.LabResult.collected_on.desc(), M.LabResult.created_at.desc())
    return list(db.scalars(stmt.limit(setting("lab_results.list_cap", db))).all())


def _counts(items: list[dict]) -> dict[str, int]:
    counts = dict.fromkeys(RANGE_STATES, 0)
    for item in items:
        counts[item["rangeState"]] += 1
    return counts


def _pinned(db: Session, account_id: str) -> list[str]:
    prefs = db.get(M.Preference, account_id)
    return list(prefs.pinned_lab_tests or []) if prefs else []


@router.get("/lab-tests/reference")
def reference(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.LabTestReference).where(M.LabTestReference.active.is_(True))
                      .order_by(M.LabTestReference.display_name)).all()
    return {"items": [{"code": r.code, "displayName": r.display_name, "bodySystem": r.body_system,
                       "defaultUnit": r.default_unit} for r in rows]}


@router.get("/health/lab-results")
def list_results(user=Depends(require_student), db: Session = Depends(workflow_db)):
    rows = _visible(db, user["id"])
    refs = _references(db, rows)
    groups: dict[str, list[M.LabResult]] = {}
    for row in rows:
        key = row.document_id or row.lab_order_id or row.id
        groups.setdefault(key, []).append(row)
    reports = []
    for key, members in groups.items():
        items = [result_payload(r, refs) for r in members]
        newest = members[0]
        reports.append({
            "key": key, "documentId": newest.document_id, "labOrderId": newest.lab_order_id,
            "labName": newest.lab_name, "collectedOn": newest.collected_on.isoformat(), "source": newest.source,
            "rangeCounts": _counts(items), "items": items,
        })
    reports.sort(key=lambda g: (g["collectedOn"], max(i["createdAt"] for i in g["items"])), reverse=True)

    # By body system: each coded test's latest value, grouped by the reference table.
    latest: dict[str, M.LabResult] = {}
    for row in _newest_first(rows):
        if row.test_code and row.test_code in refs:
            latest.setdefault(row.test_code, row)
    systems: dict[str, dict] = {}
    for code, row in latest.items():
        system = refs[code].body_system
        entry = systems.setdefault(system, {"bodySystem": system, "tests": 0, "outsideRange": 0, "noRange": 0})
        state = range_state(row.value_numeric, row.ref_low, row.ref_high)
        entry["tests"] += 1
        entry["outsideRange"] += state in (ABOVE, BELOW)
        entry["noRange"] += state == NO_RANGE
    order = {name: i for i, name in enumerate(M.LAB_BODY_SYSTEMS)}
    return {"reports": reports, "bodySystems": sorted(systems.values(), key=lambda s: order[s["bodySystem"]]),
            "total": len(rows)}


@router.get("/health/lab-results/tests")
def tests_with_values(user=Depends(require_student), db: Session = Depends(workflow_db)):
    rows = _newest_first(_visible(db, user["id"]))
    refs = _references(db, rows)
    pinned = _pinned(db, user["id"])
    tests: dict[str, dict] = {}
    for row in rows:
        key = test_key(row)
        if key not in tests:
            payload = result_payload(row, refs)
            tests[key] = {"testKey": key, "testCode": row.test_code, "testName": payload["testName"],
                          "bodySystem": payload["bodySystem"], "count": 0,
                          "latestCollectedOn": payload["collectedOn"], "latestRangeState": payload["rangeState"],
                          "pinned": key in pinned}
        tests[key]["count"] += 1
    items = sorted(tests.values(), key=lambda t: (not t["pinned"], t["testName"].casefold()))
    return {"items": items, "pinned": pinned, "minPointsForLine": setting("trends.min_points_for_line", db)}


@router.get("/health/lab-results/trends")
def trend(test: TestKey = Query(...), user=Depends(require_student), db: Session = Depends(workflow_db)):
    rows = [r for r in _newest_first(_visible(db, user["id"])) if test_key(r) == test]
    refs = _references(db, rows)
    items = [result_payload(r, refs) for r in rows]
    name = items[0]["testName"] if items else None
    if name is None and not test.startswith(NAME_KEY_PREFIX):
        ref = db.get(M.LabTestReference, test)
        name = ref.display_name if ref else None
    return {"testKey": test, "testName": name, "items": items, "pinned": test in _pinned(db, user["id"]),
            "minPointsForLine": setting("trends.min_points_for_line", db)}


@router.get("/health/lab-results/pinned")
def pinned_tests(user=Depends(require_student), db: Session = Depends(workflow_db)):
    return {"codes": _pinned(db, user["id"]), "max": setting("lab_results.pinned_max", db)}


@router.put("/health/lab-results/pinned")
def set_pinned(body: PinnedInput, user=Depends(require_student), db: Session = Depends(workflow_db)):
    codes = list(dict.fromkeys(body.codes))
    if len(codes) > setting("lab_results.pinned_max", db):
        raise HTTPException(422, "You have bookmarked as many tests as you can. Remove one first.")
    known = {test_key(r) for r in _visible(db, user["id"])} | _active_codes(db, set(codes))
    if any(code not in known for code in codes):
        raise HTTPException(422, "Bookmark a test from your own results or from the test list.")
    prefs = db.get(M.Preference, user["id"])
    if prefs is None:
        prefs = M.Preference(account_id=user["id"], saved_exercises=[], completed_tasks=[], task_date="")
        db.add(prefs)
    prefs.pinned_lab_tests = codes
    _audit(db, user, "LAB_TESTS_PINNED", user["id"])
    db.commit()
    return {"codes": codes, "max": setting("lab_results.pinned_max", db)}


# --- the Check step: drafts from an owned report ---------------------------------------------------------


def _owned_report(db: Session, account_id: str, document_id: str) -> M.Document:
    doc = db.scalar(select(M.Document).where(M.Document.id == document_id, M.Document.account_id == account_id))
    if doc is None:
        raise HTTPException(404, "Report not found.")
    if doc.category != REPORT_CATEGORY:
        raise HTTPException(422, "Lab values can be added only to a lab report.")
    return doc


def _report_rows(db: Session, account_id: str, document_id: str) -> list[M.LabResult]:
    return list(db.scalars(select(M.LabResult).where(
        M.LabResult.account_id == account_id, M.LabResult.document_id == document_id)
        .order_by(M.LabResult.created_at, M.LabResult.id)).all())


def _today(db: Session, account_id: str) -> date:
    return student_time.local_today(student_time.student_zone(db, account_id))


@router.get("/health/documents/{document_id}/lab-results")
def report_results(document_id: str, user=Depends(require_student), db: Session = Depends(workflow_db)):
    _owned_report(db, user["id"], document_id)
    rows = _report_rows(db, user["id"], document_id)
    refs = _references(db, rows)
    return {"documentId": document_id, "items": [result_payload(r, refs) for r in rows],
            "maxRows": setting("lab_results.max_rows_per_report", db)}


@router.post("/health/documents/{document_id}/lab-results", status_code=201)
def add_drafts(document_id: str, body: DraftInput, user=Depends(require_student), db: Session = Depends(workflow_db)):
    _owned_report(db, user["id"], document_id)
    existing = len(_report_rows(db, user["id"], document_id))
    maximum = setting("lab_results.max_rows_per_report", db)
    if existing + len(body.rows) > maximum:
        raise HTTPException(422, f"A report can hold at most {maximum} values.")
    today = _today(db, user["id"])
    rows = [ValueRow(**fields.model_dump(), collectedOn=body.collectedOn, labName=body.labName) for fields in body.rows]
    for index, row in enumerate(rows, start=1):
        _check_bounds(db, row, today, f"Row {index}")
    _check_codes(db, rows)
    now = time.time()
    created = [M.LabResult(
        id=_new_id(), account_id=user["id"], test_code=row.testCode, test_name_as_printed=row.testName,
        value_numeric=row.valueNumeric, value_text=row.valueText, unit=row.unit, ref_low=row.refLow,
        ref_high=row.refHigh, ref_text=row.refText, collected_on=row.collectedOn, lab_name=row.labName,
        source=STUDENT_CONFIRMED, document_id=document_id, lab_order_id=None, status=DRAFT, created_at=now,
        confirmed_at=None) for row in rows]
    db.add_all(created)
    _audit(db, user, "LAB_RESULTS_DRAFTED", document_id)
    db.commit()
    refs = _references(db, created)
    return {"documentId": document_id, "items": [result_payload(r, refs) for r in created]}


def _own_row(db: Session, account_id: str, result_id: str) -> M.LabResult:
    row = db.scalar(select(M.LabResult).where(M.LabResult.id == result_id, M.LabResult.account_id == account_id))
    if row is None:
        raise HTTPException(404, "Value not found.")
    return row


@router.patch("/health/lab-results/{result_id}")
def correct_draft(result_id: str, body: DraftPatch, user=Depends(require_student), db: Session = Depends(workflow_db)):
    row = _own_row(db, user["id"], result_id)
    if row.status != DRAFT:
        raise HTTPException(409, "A saved value cannot be edited. Delete it and add it again.")
    current = {"testCode": row.test_code, "testName": row.test_name_as_printed, "valueNumeric": row.value_numeric,
               "valueText": row.value_text, "unit": row.unit, "refLow": row.ref_low, "refHigh": row.ref_high,
               "refText": row.ref_text, "collectedOn": row.collected_on, "labName": row.lab_name}
    try:
        merged = ValueRow(**{**current, **body.model_dump(exclude_unset=True)})
    except ValidationError as exc:
        raise HTTPException(422, exc.errors()[0]["msg"].removeprefix("Value error, ")) from None
    _check_bounds(db, merged, _today(db, user["id"]), "This value")
    _check_codes(db, [merged])
    row.test_code, row.test_name_as_printed = merged.testCode, merged.testName
    row.value_numeric, row.value_text, row.unit = merged.valueNumeric, merged.valueText, merged.unit
    row.ref_low, row.ref_high, row.ref_text = merged.refLow, merged.refHigh, merged.refText
    row.collected_on, row.lab_name = merged.collectedOn, merged.labName
    _audit(db, user, "LAB_RESULT_CORRECTED", row.id)
    db.commit()
    return result_payload(row, _references(db, [row]))


@router.delete("/health/lab-results/{result_id}")
def remove_result(result_id: str, user=Depends(require_student), db: Session = Depends(workflow_db)):
    row = _own_row(db, user["id"], result_id)
    if row.source == LAB_RELEASED:
        raise HTTPException(409, "Values released by a StudentKare lab stay with the report.")
    db.delete(row)
    _audit(db, user, "LAB_RESULT_DELETED", result_id)
    db.commit()
    return {"success": True}


@router.post("/health/documents/{document_id}/lab-results/confirm")
def confirm(document_id: str, body: ConfirmInput, user=Depends(require_student), db: Session = Depends(workflow_db)):
    """Save exactly the ticked values. All or nothing; drafts left unticked are discarded."""
    _owned_report(db, user["id"], document_id)
    ids = list(dict.fromkeys(body.ids))
    if len(ids) > setting("lab_results.max_rows_per_report", db):
        raise HTTPException(422, "Too many values for one report. Nothing was saved.")
    rows = list(db.scalars(select(M.LabResult).where(
        M.LabResult.id.in_(ids), M.LabResult.account_id == user["id"], M.LabResult.document_id == document_id)).all())
    if len(rows) != len(ids):
        raise HTTPException(422, "Some values are not part of this report. Nothing was saved.")
    drafts = [r.id for r in rows if r.status == DRAFT]
    now = time.time()
    if drafts:
        changed = db.execute(update(M.LabResult).where(
            M.LabResult.id.in_(drafts), M.LabResult.account_id == user["id"], M.LabResult.status == DRAFT,
        ).values(status=CONFIRMED, source=STUDENT_CONFIRMED, confirmed_at=now),
            execution_options={"synchronize_session": False}).rowcount
        if changed != len(drafts):
            db.rollback()
            raise HTTPException(409, "These values changed while you were saving. Nothing was saved; check them again.")
    discarded = db.execute(delete(M.LabResult).where(
        M.LabResult.account_id == user["id"], M.LabResult.document_id == document_id,
        M.LabResult.status == DRAFT, M.LabResult.id.not_in(ids),
    ), execution_options={"synchronize_session": False}).rowcount
    _audit(db, user, "LAB_RESULTS_CONFIRMED", document_id)
    db.commit()
    saved = _newest_first([r for r in _report_rows(db, user["id"], document_id) if r.id in set(ids)])
    refs = _references(db, saved)
    items = [result_payload(r, refs) for r in saved]
    counts = _counts(items)
    return {"documentId": document_id, "confirmed": len(items), "discarded": discarded, "rangeCounts": counts,
            "outsideRange": counts[ABOVE] + counts[BELOW], "items": items}


def export_rows(db: Session, account_id: str) -> dict:
    """Every lab value the account owns (drafts included, marked) and its bookmarks, for GET /records/export."""
    rows = list(db.scalars(select(M.LabResult).where(M.LabResult.account_id == account_id)
                           .order_by(M.LabResult.collected_on, M.LabResult.created_at)).all())
    refs = _references(db, rows)
    return {"labResults": [result_payload(r, refs) for r in rows], "pinnedLabTests": _pinned(db, account_id)}


def delete_for_document(db: Session, account_id: str, document_id: str) -> None:
    """A report's values leave with it (the FK cascades on Postgres; this also covers SQLite)."""
    db.execute(delete(M.LabResult).where(M.LabResult.account_id == account_id,
                                         M.LabResult.document_id == document_id))

