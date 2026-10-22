"""Audit L5: a return photo is virus scanned before it is stored."""
from fastapi import HTTPException
from test_student_requests import partner, student_with_line
from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import workflow_models as M
from services import student_requests

PNG = b"\x89PNG\r\n\x1a\nrest"


def test_an_infected_photo_is_refused_and_not_stored(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    pharm = partner(client, codes, factory)
    _user, headers = student_with_line(client, codes, factory, pharm["id"])
    rid = client.post("/api/returns", headers=headers,
                      json={"orderLineId": "l1", "reason": "DAMAGED", "note": "Seal broken"}).json()["return"]["id"]
    scanned = []

    def infected(content, **_kw):
        scanned.append(content)
        raise HTTPException(422, "The file failed the virus scan.")

    monkeypatch.setattr(student_requests, "scan_file_for_viruses", infected)
    refused = client.post(f"/api/returns/{rid}/photo", headers=headers, files={"file": ("x.png", PNG, "image/png")})
    assert refused.status_code == 422 and scanned == [PNG]
    with factory() as db:
        assert not db.get(M.ReturnRequest, rid).photo

    monkeypatch.setattr(student_requests, "scan_file_for_viruses", lambda content, **_kw: scanned.append(content) or True)
    ok = client.post(f"/api/returns/{rid}/photo", headers=headers, files={"file": ("x.png", PNG, "image/png")})
    assert ok.status_code == 200 and ok.json()["return"]["hasPhoto"] is True and len(scanned) == 2
