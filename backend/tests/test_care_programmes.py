"""Chronic care programmes, and the promises the design makes about leaving.

The design states them plainly: "A student who leaves a programme disappears
from your follow-up list but keeps everything recorded. Nobody is chased after
they opt out, and leaving is never flagged to their campus." Those are three
testable guarantees, and they are the reason a student will use this at all.

The tracker also identifies students as "B-214 · KC" — room and initials, never
a name. A clinician needs to recognise who they are chasing; a chronic tracker
does not need a roster of names.
"""
import time

import pytest

from core import workflow_models as M
from services.workflow_api import student_label
from test_clinical_fulfilment import make_staff  # noqa: F401  (shared account helper)
from test_workflow_api import harness, login, register  # noqa: F401  (isolated database)

TRACKER = "/api/work/chronic"
DAY = 86400


def enrol(factory, programme_id, account_id="stu", clinician_id="doc", programme="Asthma",
          target="action plan in place", interval=90, last_review_days_ago=None, state="ACTIVE"):
    with factory() as db:
        db.add(M.CareProgramme(
            id=programme_id, account_id=account_id, clinician_id=clinician_id,
            programme=programme, target=target, review_interval_days=interval,
            last_review_at=0.0 if last_review_days_ago is None else time.time() - last_review_days_ago * DAY,
            state=state, ended_at=0.0, created_at=time.time(),
        ))
        db.commit()


def with_profile(factory, account_id, **profile):
    with factory() as db:
        account = db.get(M.Account, account_id)
        account.profile = {**(account.profile or {}), **profile}
        db.commit()


@pytest.fixture
def clinic(harness):
    """One clinician, one other clinician, and two students."""
    client, factory, codes = harness
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", name="Doctor One")
    make_staff(factory, "doc2", "NMC_DOCTOR", "doc2@example.test", name="Doctor Two")
    make_staff(factory, "stu", "STUDENT", "stu@example.test", name="Kavya Chandra")
    make_staff(factory, "stu2", "STUDENT", "stu2@example.test", name="Ishaan Sood")
    with_profile(factory, "stu", room="B-214", hostelBlock="Block B")
    return client, factory, codes


def tracker(client, codes, identifier="doc@example.test"):
    response = client.get(TRACKER, headers=login(client, codes, identifier))
    assert response.status_code == 200, response.text
    return response.json()


class TestWhoMayLook:
    def test_a_student_may_not_open_the_tracker(self, clinic):
        client, _, codes = clinic
        assert client.get(TRACKER, headers=login(client, codes, "stu@example.test")).status_code == 403

    def test_an_anonymous_caller_may_not(self, clinic):
        client, _, _ = clinic
        assert client.get(TRACKER).status_code in (401, 403)

    def test_a_clinician_sees_only_their_own_enrolments(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "mine", clinician_id="doc")
        enrol(factory, "theirs", clinician_id="doc2")
        assert [item["id"] for item in tracker(client, codes)["items"]] == ["mine"]
        assert [item["id"] for item in tracker(client, codes, "doc2@example.test")["items"]] == ["theirs"]


class TestWhatIsExposed:
    def test_a_student_is_room_and_initials(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1")
        assert tracker(client, codes)["items"][0]["label"] == "B-214 · KC"

    def test_no_name_reaches_the_tracker(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1")
        body = tracker(client, codes)
        assert "Kavya" not in repr(body) and "Chandra" not in repr(body)

    def test_no_condition_list_reaches_the_tracker(self, clinic):
        # Chronic conditions live on the student's profile and stay there. The
        # programme's own name is what the clinician agreed to follow.
        client, factory, codes = clinic
        with_profile(factory, "stu", chronicConditions=["Epilepsy"], allergies=["Penicillin"])
        enrol(factory, "p1")
        body = repr(tracker(client, codes))
        assert "Epilepsy" not in body and "Penicillin" not in body

    def test_initials_alone_when_no_room_is_recorded(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1", account_id="stu2")
        assert tracker(client, codes)["items"][0]["label"] == "IS"

    def test_never_a_blank_label(self, clinic):
        # A row a clinician cannot identify is a row they cannot act on.
        client, factory, codes = clinic
        with factory() as db:
            db.get(M.Account, "stu2").full_name = ""
            db.commit()
        enrol(factory, "p1", account_id="stu2")
        assert tracker(client, codes)["items"][0]["label"] == "stu2"


class TestReviewTiming:
    def test_an_overdue_review_is_counted_and_dated(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1", interval=90, last_review_days_ago=102)
        body = tracker(client, codes)
        assert body["overdue"] == 1
        assert body["items"][0]["overdueByDays"] == 12

    def test_a_review_due_inside_a_week_is_counted(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1", interval=90, last_review_days_ago=85)
        body = tracker(client, codes)
        assert body["dueThisWeek"] == 1 and body["overdue"] == 0

    def test_a_review_due_later_is_only_on_the_programme(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1", interval=90, last_review_days_ago=10)
        body = tracker(client, codes)
        assert body["onProgramme"] == 1 and body["dueThisWeek"] == 0 and body["overdue"] == 0

    def test_a_programme_never_reviewed_claims_no_due_date(self, clinic):
        # Inventing one from the enrolment date would put a date on the screen
        # that no review actually sets.
        client, factory, codes = clinic
        enrol(factory, "p1", last_review_days_ago=None)
        item = tracker(client, codes)["items"][0]
        assert item["lastReviewAt"] is None and item["nextDueAt"] is None
        assert item["overdueByDays"] is None


class TestLeaving:
    def test_a_student_may_leave_their_own_programme(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1", last_review_days_ago=10)
        headers = login(client, codes, "stu@example.test")
        response = client.post("/api/care/programmes/p1/leave", headers=headers)
        assert response.status_code == 200
        assert response.json()["state"] == "ENDED_BY_STUDENT"

    def test_leaving_is_idempotent(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1")
        headers = login(client, codes, "stu@example.test")
        first = client.post("/api/care/programmes/p1/leave", headers=headers).json()
        second = client.post("/api/care/programmes/p1/leave", headers=headers).json()
        assert first == second

    def test_nobody_else_may_end_a_student_s_programme(self, clinic):
        # Not the other student, and not the clinician either: this is the
        # student's decision, and a clinician ending it would be a different act
        # wearing the same name.
        client, factory, codes = clinic
        enrol(factory, "p1")
        for identifier in ("stu2@example.test", "doc@example.test"):
            response = client.post("/api/care/programmes/p1/leave",
                                   headers=login(client, codes, identifier))
            assert response.status_code == 404, identifier

    def test_leaving_stops_the_chasing(self, clinic):
        # "Nobody is chased after they opt out." An overdue programme must stop
        # being overdue the moment the student leaves.
        client, factory, codes = clinic
        enrol(factory, "p1", interval=90, last_review_days_ago=200)
        assert tracker(client, codes)["overdue"] == 1

        client.post("/api/care/programmes/p1/leave", headers=login(client, codes, "stu@example.test"))
        body = tracker(client, codes)
        assert body["overdue"] == 0 and body["dueThisWeek"] == 0
        assert body["items"][0]["nextDueAt"] is None
        assert body["items"][0]["overdueByDays"] is None

    def test_leaving_keeps_the_record(self, clinic):
        # "...but keeps everything recorded." The row stays and stays visible as
        # ended, so the history is whole.
        client, factory, codes = clinic
        enrol(factory, "p1", programme="Diabetes")
        client.post("/api/care/programmes/p1/leave", headers=login(client, codes, "stu@example.test"))
        body = tracker(client, codes)
        assert body["endedByStudent"] == 1
        assert body["items"][0]["programme"] == "Diabetes"

    def test_leaving_drops_out_of_the_active_count(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1")
        enrol(factory, "p2", account_id="stu2")
        client.post("/api/care/programmes/p1/leave", headers=login(client, codes, "stu@example.test"))
        assert tracker(client, codes)["onProgramme"] == 1

    def test_leaving_is_never_flagged_to_the_campus(self, clinic):
        # "...and leaving is never flagged to their campus." A student who fears
        # their university will be told will not opt out of a programme they
        # need to leave. Nothing may reach the ops feed campus admins read.
        client, factory, codes = clinic
        enrol(factory, "p1")
        with factory() as db:
            before = db.query(M.OpsEvent).count()
        client.post("/api/care/programmes/p1/leave", headers=login(client, codes, "stu@example.test"))
        with factory() as db:
            assert db.query(M.OpsEvent).count() == before

    def test_leaving_does_not_notify_the_clinician(self, clinic):
        client, factory, codes = clinic
        enrol(factory, "p1")
        with factory() as db:
            before = db.query(M.OutboxEvent).count()
        client.post("/api/care/programmes/p1/leave", headers=login(client, codes, "stu@example.test"))
        with factory() as db:
            assert db.query(M.OutboxEvent).count() == before

    def test_leaving_is_still_audited(self, clinic):
        # Accountable without being reported: /ops/audit is super-admin only.
        client, factory, codes = clinic
        enrol(factory, "p1")
        client.post("/api/care/programmes/p1/leave", headers=login(client, codes, "stu@example.test"))
        with factory() as db:
            actions = [row.action for row in db.query(M.WorkflowAudit).all()]
        assert "PROGRAMME_LEFT" in actions

    def test_a_programme_that_does_not_exist_is_404(self, clinic):
        client, _, codes = clinic
        headers = login(client, codes, "stu@example.test")
        assert client.post("/api/care/programmes/nope/leave", headers=headers).status_code == 404


class TestEmpty:
    def test_a_clinician_with_no_programmes_gets_zeroes(self, clinic):
        client, _, codes = clinic
        assert tracker(client, codes) == {
            "items": [], "onProgramme": 0, "overdue": 0, "dueThisWeek": 0, "endedByStudent": 0,
        }


class TestStudentLabel:
    def test_it_takes_at_most_three_initials(self):
        account = M.Account(id="a", full_name="A B C D E", profile={"room": "X-1"})
        assert student_label(account) == "X-1 · ABC"

    def test_it_survives_a_missing_profile(self):
        account = M.Account(id="a", full_name="Kavya Chandra", profile=None)
        assert student_label(account) == "KC"

    def test_it_survives_a_missing_account(self):
        assert student_label(None) == "Unknown student"
