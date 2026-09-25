"""Who can see an uncollected sample, and who cannot.

The overdue rules are covered as pure functions in test_awaiting_collection.py.
This covers the part that cannot be: the endpoint's role scoping, and that an
order only appears once it is genuinely overdue.
"""
import time

import pytest

from core import workflow_models as M
from services.clinical_fulfilment import COLLECTION_GRACE_HOURS
from test_clinical_fulfilment import make_provider, make_staff  # noqa: F401
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

HOUR = 3600.0
ENDPOINT = "/api/work/lab-orders/awaiting-collection"


def add_order(factory, order_id, *, lab_id, ordered_by, patient_id="patient-1",
              status="BOOKED", slot_offset_hours=-24.0, panel=("CBC",)):
    """A lab order whose slot sits `slot_offset_hours` from now."""
    slot = time.gmtime(time.time() + slot_offset_hours * HOUR)
    with factory() as db:
        db.add(M.LabOrder(
            id=order_id, prescription_id="", patient_id=patient_id, lab_id=lab_id,
            ordered_by=ordered_by, test_panel=list(panel), clinical_indication="Routine",
            collection_mode="WALK_IN", slot_start=time.strftime("%Y-%m-%dT%H:%M:%SZ", slot),
            fasting_required=False, collector_name="", sample_id="", status=status,
            report_document_id="", critical_flag=False, critical_note="",
            created_at=time.time() - 24 * HOUR, updated_at=time.time(),
        ))
        db.commit()


def ids(response):
    return sorted(item["id"] for item in response.json()["items"])


@pytest.fixture
def clinic(harness):
    """Two clinicians, two labs, and one overdue order belonging to each pairing."""
    client, factory, codes = harness
    make_staff(factory, "doc-a", "NMC_DOCTOR", "doc-a@example.test", name="Doctor A")
    make_staff(factory, "doc-b", "NMC_DOCTOR", "doc-b@example.test", name="Doctor B")
    make_staff(factory, "labco-a", "VENDOR", "labco-a@example.test")
    make_staff(factory, "labco-b", "VENDOR", "labco-b@example.test")
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    make_provider(factory, "lab-a", "labco-a", "LAB")
    make_provider(factory, "lab-b", "labco-b", "LAB")
    add_order(factory, "order-a", lab_id="lab-a", ordered_by="doc-a")
    add_order(factory, "order-b", lab_id="lab-b", ordered_by="doc-b")
    return client, factory, codes


class TestScoping:
    def test_a_clinician_sees_only_the_orders_they_placed(self, clinic):
        client, _factory, codes = clinic
        assert ids(client.get(ENDPOINT, headers=login(client, codes, "doc-a@example.test"))) == ["order-a"]
        assert ids(client.get(ENDPOINT, headers=login(client, codes, "doc-b@example.test"))) == ["order-b"]

    def test_a_lab_sees_only_the_collections_it_owed(self, clinic):
        client, _factory, codes = clinic
        assert ids(client.get(ENDPOINT, headers=login(client, codes, "labco-a@example.test"))) == ["order-a"]

    def test_the_super_admin_sees_every_one(self, clinic):
        client, _factory, codes = clinic
        assert ids(client.get(ENDPOINT, headers=login(client, codes, "root@example.test"))) == ["order-a", "order-b"]

    def test_a_student_cannot_read_the_queue_at_all(self, clinic):
        client, _factory, codes = clinic
        _patient, headers = register(client, codes, "student@example.test")
        assert client.get(ENDPOINT, headers=headers).status_code in (401, 403)

    def test_a_vendor_with_no_provider_gets_nothing_rather_than_everything(self, clinic):
        # Failing open here would hand one partner another partner's orders.
        client, factory, codes = clinic
        make_staff(factory, "labco-c", "VENDOR", "labco-c@example.test")
        response = client.get(ENDPOINT, headers=login(client, codes, "labco-c@example.test"))
        assert response.json() == {"items": [], "total": 0}


class TestWhatCounts:
    def test_an_order_inside_its_grace_period_does_not_appear(self, harness):
        client, factory, codes = harness
        make_staff(factory, "doc-a", "NMC_DOCTOR", "doc-a@example.test")
        make_staff(factory, "labco-a", "VENDOR", "labco-a@example.test")
        make_provider(factory, "lab-a", "labco-a", "LAB")
        add_order(factory, "fresh", lab_id="lab-a", ordered_by="doc-a",
                  slot_offset_hours=-(COLLECTION_GRACE_HOURS - 1))
        assert client.get(ENDPOINT, headers=login(client, codes, "doc-a@example.test")).json()["total"] == 0

    def test_a_collected_sample_leaves_the_queue(self, harness):
        client, factory, codes = harness
        make_staff(factory, "doc-a", "NMC_DOCTOR", "doc-a@example.test")
        make_staff(factory, "labco-a", "VENDOR", "labco-a@example.test")
        make_provider(factory, "lab-a", "labco-a", "LAB")
        add_order(factory, "done", lab_id="lab-a", ordered_by="doc-a", status="SAMPLE_COLLECTED")
        assert client.get(ENDPOINT, headers=login(client, codes, "doc-a@example.test")).json()["total"] == 0

    def test_the_longest_wait_is_listed_first(self, clinic):
        client, factory, codes = clinic
        add_order(factory, "ancient", lab_id="lab-a", ordered_by="doc-a", slot_offset_hours=-240)
        listed = client.get(ENDPOINT, headers=login(client, codes, "doc-a@example.test")).json()["items"]
        assert [item["id"] for item in listed] == ["ancient", "order-a"]
        assert listed[0]["waitingSeconds"] > listed[1]["waitingSeconds"]

    def test_each_row_says_why_it_is_overdue(self, clinic):
        client, _factory, codes = clinic
        item = client.get(ENDPOINT, headers=login(client, codes, "doc-a@example.test")).json()["items"][0]
        assert item["overdueReason"] == "slot_passed"
