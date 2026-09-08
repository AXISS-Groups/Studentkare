"""Deterministic unit tests for the ECHO payment / OTP / ticket logic.

These tests run fully in-process with a mocked motor-like DB — they do NOT hit
the live backend or MongoDB, so they are stable on any machine.

Run: cd backend && venv/bin/python -m pytest tests/test_echo_payments_otp_unit.py -v
"""
from __future__ import annotations

import asyncio
import hmac
import hashlib
from datetime import datetime, timezone, timedelta

import pytest

import echo_showcase as es
import server as srv


# ── In-memory fake collection (subset of motor's async surface) ──────────────
class FakeCursor:
    def __init__(self, docs, limit=0):
        self.docs = docs
        self._limit = limit

    async def to_list(self, n):
        return self.docs[: n or self._limit or len(self.docs)]

    def sort(self, key, direction):
        return self

    def limit(self, n):
        self._limit = n
        return self


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs if docs is not None else []
        self._indexes = []

    async def find_one(self, query):
        for d in self.docs:
            if self._match(d, query):
                return dict(d)
        return None

    def find(self, query):
        return FakeCursor([d for d in self.docs if self._match(d, query)])

    async def insert_one(self, doc):
        self.docs.append(doc)
        return type("R", (), {"inserted_id": doc.get("_id", "fakeid")})()

    async def insert_many(self, docs):
        self.docs.extend(docs)
        return type("R", (), {"inserted_ids": [d.get("_id", "fakeid") for d in docs]})()

    async def update_one(self, query, update, **kw):
        for d in self.docs:
            if self._match(d, query):
                self._apply(d, update)
                return type("R", (), {"matched_count": 1})()
        return type("R", (), {"matched_count": 0})()

    async def count_documents(self, query):
        return sum(1 for d in self.docs if self._match(d, query))

    async def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if self._match(d, query):
                del self.docs[i]
                return type("R", (), {"deleted_count": 1})()
        return type("R", (), {"deleted_count": 0})()

    async def create_index(self, *a, **k):
        self._indexes.append((a, k))

    @staticmethod
    def _match(doc, query):
        for k, v in (query or {}).items():
            if k == "$or":
                if not any(FakeCollection._match(doc, sub) for sub in v):
                    return False
                continue
            if k.startswith("$"):
                continue
            cur = doc
            parts = k.split(".")
            for p in parts[:-1]:
                cur = (cur or {}).get(p)
                if not isinstance(cur, dict):
                    return False
            if cur.get(parts[-1]) != v:
                return False
        return True

    @staticmethod
    def _apply(doc, update):
        for op, fields in (update or {}).items():
            if op == "$set":
                for k, v in fields.items():
                    _deep_set(doc, k, v)
            elif op == "$inc":
                for k, v in fields.items():
                    cur = _deep_get(doc, k)
                    _deep_set(doc, k, (cur or 0) + v)


def _deep_set(doc, dotted, val):
    parts = dotted.split(".")
    node = doc
    for p in parts[:-1]:
        node = node.setdefault(p, {})
    node[parts[-1]] = val


def _deep_get(doc, dotted):
    node = doc
    for p in dotted.split("."):
        if not isinstance(node, dict) or p not in node:
            return None
        node = node[p]
    return node


class FakeDB:
    def __init__(self, **colls):
        self._colls = colls

    def __getattr__(self, name):
        if name not in self._colls:
            self._colls[name] = FakeCollection()
        return self._colls[name]


class FakeRequest:
    def __init__(self, headers=None):
        self.headers = headers or {}
        self._body = b"{}"

    async def body(self):
        return self._body


# ── Helpers used by the routes (mocked so no network) ───────────────────────
@pytest.fixture
def patch_deps(monkeypatch):
    monkeypatch.setattr(es, "_razorpay_config", es._razorpay_config)  # keep real
    monkeypatch.setattr(es, "send_email", lambda *a, **k: asyncio.sleep(0) or True)
    monkeypatch.setattr(es, "_mirror_to_event_registration", lambda *a, **k: asyncio.sleep(0))
    monkeypatch.setattr(es, "_store_invoice_and_email", lambda *a, **k: asyncio.sleep(0) or {"invoice_no": "INV-TEST"})
    monkeypatch.setattr(srv, "send_email", lambda *a, **k: asyncio.sleep(0) or True)
    yield


@pytest.fixture
def fake_db(monkeypatch):
    """Swap the shared core.db database singleton with an in-memory fake so the
    echo routes (which call _get_db -> db.db) operate deterministically."""
    import core.db as core_db
    import db as db_mod

    fdb = FakeDB()
    monkeypatch.setattr(core_db, "db", fdb)
    monkeypatch.setattr(db_mod, "db", fdb)
    return fdb


def _showcase(slug="echo-tech-2026", fee=0.0, max_seats=0, enabled=True, badge="Upcoming", deadline=None):
    return {
        "_id": "sh1",
        "slug": slug,
        "title": "ECHO Tech Summit",
        "status": "published",
        "event_status_badge": badge,
        "college": "VNR VJIET",
        "registration": {
            "enabled": enabled,
            "fee": fee,
            "currency": "INR",
            "max_seats": max_seats,
            "deadline": deadline,
        },
    }


# ── 1. OTP token carries type=access + exp (main auth dep accepts it) ───────
def test_otp_token_has_access_type_and_expiry():
    from core.deps import get_current_user
    from fastapi import HTTPException

    user_id = "507f1f77bcf86cd799439011"
    token = srv.create_access_token(user_id, "a@b.co", "student")

    import jwt as pyjwt
    payload = pyjwt.decode(token, srv.JWT_SECRET, algorithms=[srv.JWT_ALGORITHM])
    assert payload.get("type") == "access"
    assert "exp" in payload

    # get_current_user rejects tokens lacking type=access
    bad = srv.jwt.encode({"sub": user_id, "email": "a@b.co"}, srv.JWT_SECRET, algorithm="HS256")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(get_current_user(FakeRequest({"Authorization": f"Bearer {bad}"})))
    assert exc.value.status_code == 401


# ── 2. Registration gates: disabled / completed / deadline / capacity ───────
@pytest.mark.asyncio
async def test_assert_registration_open_gates(patch_deps, fake_db):
    from fastapi import HTTPException

    db = fake_db

    # disabled
    with pytest.raises(HTTPException) as e:
        await es._assert_registration_open(db, _showcase(enabled=False))
    assert e.value.status_code == 400

    # completed badge
    with pytest.raises(HTTPException) as e:
        await es._assert_registration_open(db, _showcase(badge="Completed"))
    assert "ended" in e.value.detail

    # past deadline
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    with pytest.raises(HTTPException) as e:
        await es._assert_registration_open(db, _showcase(deadline=past))
    assert e.value.status_code == 400

    # capacity: 2 of 2 seats taken -> closed
    db.echo_registrations.docs = [
        {"slug": "echo-tech-2026", "payment": {"status": "paid"}},
        {"slug": "echo-tech-2026", "payment": {"status": "paid"}},
    ]
    with pytest.raises(HTTPException) as e:
        await es._assert_registration_open(db, _showcase(max_seats=2))
    assert "capacity" in e.value.detail

    # capacity NOT reached (1 of 2) -> open
    db.echo_registrations.docs = [
        {"slug": "echo-tech-2026", "payment": {"status": "paid"}},
    ]
    await es._assert_registration_open(db, _showcase(max_seats=2))  # no raise


# ── 3. Paid event without gateway -> 503 (fail-closed) ──────────────────────
@pytest.mark.asyncio
async def test_register_paid_no_gateway_503(patch_deps, fake_db, monkeypatch):
    from fastapi import HTTPException

    async def no_cfg(db):
        return None
    monkeypatch.setattr(es, "_razorpay_config", no_cfg)

    db = fake_db
    db.echo_showcases.docs = [_showcase(fee=500)]
    req = FakeRequest()

    with pytest.raises(HTTPException) as e:
        await es.register_for_showcase(
            "echo-tech-2026",
            es.RegisterSchema(full_name="T", email="t@x.co", phone="+919876543210", terms_accepted=True),
            req,
        )
    assert e.value.status_code == 503
    assert db.echo_registrations.docs == []  # nothing written


# ── 4. Free event -> confirmed immediately, QR generated, no gateway needed ─
@pytest.mark.asyncio
async def test_register_free_confirmed(patch_deps, fake_db):
    db = fake_db
    db.echo_showcases.docs = [_showcase(fee=0)]
    req = FakeRequest()

    out = await es.register_for_showcase(
        "echo-tech-2026",
        es.RegisterSchema(full_name="Free Guy", email="F@x.Co", phone="+919876543210", terms_accepted=True),
        req,
    )
    assert out["payment"]["status"] == "paid"
    assert out["payment"]["gateway"] == "free"
    assert out["status"] == "registered"
    assert out["qr_code_base64"]  # QR present
    assert out["email"] == "f@x.co"  # lowercased
    assert out["confirmation_email_sent"] is True


# ── 5. Case-insensitive dedup ───────────────────────────────────────────────
@pytest.mark.asyncio
async def test_register_dedup_lowercase(patch_deps, fake_db):
    db = fake_db
    db.echo_showcases.docs = [_showcase(fee=0)]
    req = FakeRequest()

    await es.register_for_showcase("echo-tech-2026", es.RegisterSchema(full_name="A", email="a@b.co", terms_accepted=True), req)
    again = await es.register_for_showcase("echo-tech-2026", es.RegisterSchema(full_name="A", email="A@B.CO", terms_accepted=True), req)

    assert len(db.echo_registrations.docs) == 1
    assert again.get("id") == db.echo_registrations.docs[0]["id"]


# ── 6. Ticket parsing + verify + check-in ───────────────────────────────────
def test_parse_ticket_variants():
    assert es._parse_ticket("ECHO:echo-tech-2026|user@x.co|abc123") == {
        "slug": "echo-tech-2026", "user_key": "user@x.co", "reg_id": "abc123",
    }
    assert es._parse_ticket("abc123") == {"reg_id": "abc123"}
    assert es._parse_ticket("  ") == {}
    assert es._parse_ticket("ECHO:only-two|parts") == {}


@pytest.mark.asyncio
async def test_verify_and_checkin(patch_deps, fake_db):
    db = fake_db
    db.echo_registrations.docs = [{
        "_id": "r1", "id": "reg1", "slug": "echo-tech-2026", "user_key": "u@x.co",
        "full_name": "N", "email": "u@x.co", "showcase_title": "ECHO Tech Summit",
        "payment": {"status": "paid", "payment_id": "pay1"},
        "status": "registered",
    }]

    # verify (read-only)
    v = await es.verify_ticket(es.TicketVerifySchema(ticket="ECHO:echo-tech-2026|u@x.co|reg1"), FakeRequest())
    assert v["valid"] is True
    assert v["checked_in"] is False

    # check-in
    c = await es.check_in_attendee(es.TicketVerifySchema(ticket="ECHO:echo-tech-2026|u@x.co|reg1"), FakeRequest())
    assert c["ok"] is True and c["first_checkin"] is True

    # idempotent — second check-in is not "first"
    c2 = await es.check_in_attendee(es.TicketVerifySchema(ticket="ECHO:echo-tech-2026|u@x.co|reg1"), FakeRequest())
    assert c2["first_checkin"] is False
    assert db.echo_registrations.docs[0]["checked_in_count"] == 1

    # unpaid cannot check in
    db.echo_registrations.docs = [{
        "_id": "r2", "id": "reg2", "slug": "echo-tech-2026", "payment": {"status": "pending"}, "status": "pending",
    }]
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        await es.check_in_attendee(es.TicketVerifySchema(ticket="reg2"), FakeRequest())


# ── 7. Signature verification (HMAC) ────────────────────────────────────────
def test_razorpay_signature_helpers(monkeypatch):
    db = FakeDB()
    db.installed_tools.docs = [{
        "tool_id": "razorpay", "status": "connected",
        "credentials": {
            "key_id": "k1", "key_secret": "sekret", "webhook_secret": "whsec",
        },
    }]

    async def run():
        # verify payment signature (order|payment HMAC-SHA256 with key_secret)
        ok = await es._razorpay_verify_signature(db, "order_1", "pay_1", "")
        assert ok is False
        sig = hmac.new(b"sekret", b"order_1|pay_1", hashlib.sha256).hexdigest()
        ok = await es._razorpay_verify_signature(db, "order_1", "pay_1", sig)
        assert ok is True

        # verify webhook signature (raw-body HMAC with webhook_secret)
        body = b'{"event":"payment.captured"}'
        ok = await es._razorpay_verify_webhook_signature(db, body, "")
        assert ok is False
        sig2 = hmac.new(b"whsec", body, hashlib.sha256).hexdigest()
        ok = await es._razorpay_verify_webhook_signature(db, body, sig2)
        assert ok is True
        # falls back to key_secret when webhook_secret absent
        db2 = FakeDB()
        db2.installed_tools.docs = [{
            "tool_id": "razorpay", "status": "connected",
            "credentials": {"key_id": "k1", "key_secret": "sekret"},
        }]
        sig3 = hmac.new(b"sekret", body, hashlib.sha256).hexdigest()
        ok = await es._razorpay_verify_webhook_signature(db2, body, sig3)
        assert ok is True

    asyncio.run(run())


# ── 8. Razorpay webhook finalizes a pending registration ────────────────────
@pytest.mark.asyncio
async def test_webhook_finalizes_pending(patch_deps, fake_db, monkeypatch):
    import json as _json

    db = fake_db
    db.echo_showcases.docs = [_showcase(fee=500)]
    db.echo_registrations.docs = [{
        "_id": "rX", "id": "regX", "slug": "echo-tech-2026", "user_key": "u@x.co",
        "fee": 500, "currency": "INR", "showcase_title": "ECHO Tech Summit",
        "payment": {"status": "pending", "method": "upi"},
        "status": "pending",
        "payment_order": {"order_id": "order_abc"},
    }]
    db.installed_tools.docs = [{
        "tool_id": "razorpay", "status": "connected",
        "credentials": {"key_id": "k1", "key_secret": "sekret", "webhook_secret": "whsec"},
    }]

    body = _json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {
            "order_id": "order_abc",
            "id": "pay_xyz",
            "amount": 50000,
        }}},
    }).encode()

    req = FakeRequest({"x-razorpay-signature": ""})
    req._body = body

    # wrong signature -> processed False
    out = await es.razorpay_webhook(req)
    assert out["processed"] is False

    # correct signature -> finalize
    sig = hmac.new(b"whsec", body, hashlib.sha256).hexdigest()
    req.headers["x-razorpay-signature"] = sig
    out = await es.razorpay_webhook(req)
    assert out["processed"] is True
    assert out["registration_id"] == "regX"
    assert db.echo_registrations.docs[0]["payment"]["status"] == "paid"
    assert db.echo_registrations.docs[0]["payment"]["payment_id"] == "pay_xyz"
    assert db.echo_registrations.docs[0]["qr_code_base64"]  # QR generated


# ── 9. Amount-mismatch webhook is rejected ──────────────────────────────────
@pytest.mark.asyncio
async def test_webhook_amount_mismatch(patch_deps, fake_db, monkeypatch):
    import json as _json

    db = fake_db
    db.echo_showcases.docs = [_showcase(fee=500)]
    db.echo_registrations.docs = [{
        "_id": "rX2", "id": "regX", "slug": "echo-tech-2026", "fee": 500, "currency": "INR",
        "payment": {"status": "pending"}, "status": "pending",
        "payment_order": {"order_id": "order_abc"},
    }]
    db.installed_tools.docs = [{
        "tool_id": "razorpay", "status": "connected",
        "credentials": {"key_id": "k1", "key_secret": "sekret", "webhook_secret": "whsec"},
    }]

    body = _json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"order_id": "order_abc", "id": "pay_xyz", "amount": 1}}},
    }).encode()
    sig = hmac.new(b"whsec", body, hashlib.sha256).hexdigest()
    req = FakeRequest({"x-razorpay-signature": sig})
    req._body = body

    out = await es.razorpay_webhook(req)
    assert out["processed"] is False
    assert out["reason"] == "amount_mismatch"
    assert db.echo_registrations.docs[0]["payment"]["status"] == "pending"


# ── 10. verify_payment fallback resolves by order id ────────────────────────
@pytest.mark.asyncio
async def test_verify_payment_fallback_by_order_id(patch_deps, fake_db, monkeypatch):
    db = fake_db
    db.echo_showcases.docs = [_showcase(fee=500)]
    # reg keyed by order id (no matching user_key when anonymous phone-only)
    db.echo_registrations.docs = [{
        "_id": "rY", "id": "regY", "slug": "echo-tech-2026", "user_key": "9990001111", "fee": 500,
        "currency": "INR", "showcase_title": "ECHO Tech Summit",
        "payment": {"status": "pending", "method": "upi"}, "status": "pending",
        "payment_order": {"order_id": "order_zzz"},
    }]
    db.installed_tools.docs = [{
        "tool_id": "razorpay", "status": "connected",
        "credentials": {"key_id": "k1", "key_secret": "sekret"},
    }]

    sig = hmac.new(b"sekret", b"order_zzz|pay_1", hashlib.sha256).hexdigest()
    out = await es.verify_payment("echo-tech-2026", es.VerifyPaymentSchema(
        email="anon@x.co",
        razorpay_order_id="order_zzz",
        razorpay_payment_id="pay_1",
        razorpay_signature=sig,
    ), FakeRequest())
    assert out["registration"]["payment"]["status"] == "paid"
    assert out["registration"]["payment"]["payment_id"] == "pay_1"


# ── 11. Free registration provisions a StudentAlumni account ────────────────
@pytest.mark.asyncio
async def test_free_registration_provisions_sa_account(patch_deps, fake_db, monkeypatch):
    sent = []
    monkeypatch.setattr(
        es, "send_email",
        lambda to, subj, body, *a, **k: sent.append((to, subj)) or asyncio.sleep(0) or True,
    )

    db = fake_db
    db.echo_showcases.docs = [_showcase(fee=0)]

    out = await es.register_for_showcase(
        "echo-tech-2026",
        es.RegisterSchema(full_name="Provision Me", email="provision@x.co", phone="+919876543210", dob="2002-01-15", terms_accepted=True),
        FakeRequest(),
    )
    assert out["payment"]["status"] == "paid"
    assert out.get("qr_code_base64") is not None

    # A brand-new SA student account was created
    users = db.users.docs
    assert len(users) == 1
    u = users[0]
    assert u["email"] == "provision@x.co"
    assert u["role"] == "student"
    assert u["onboarding_completed"] is False
    assert u["email_verified"] is False
    assert u["account_source"] == "echo"
    assert u["password_hash"]            # auto-generated password hashed
    assert u["dob"]                      # DOB captured & encrypted
    assert u["unique_id"].startswith("SA-")

    # Echo registration is linked to the new account
    assert db.echo_registrations.docs[0]["user_id"]

    # Welcome email (account created) + confirmation/ticket email both sent
    subjects = [s for _, s in sent]
    assert any("Welcome to StudentAlumni" in s for s in subjects)
    assert any("Entry Pass" in s for s in subjects)


@pytest.mark.asyncio
async def test_provision_sa_account_idempotent_and_existing(patch_deps, fake_db, monkeypatch):
    sent = []
    monkeypatch.setattr(
        es, "send_email",
        lambda to, subj, body: sent.append((to, subj)) or asyncio.sleep(0) or True,
    )
    db = fake_db

    # Existing SA user must not be duplicated, and no welcome email is sent.
    db.users.docs = [{
        "_id": "existing-user",
        "email": "already@x.co",
        "full_name": "Already Here",
        "role": "student",
    }]
    reg = {
        "id": "r1", "slug": "echo-tech-2026", "showcase_title": "ECHO Tech Summit",
        "full_name": "Already Here", "email": "already@x.co", "phone": "",
        "dob": "2000-05-05",
    }
    user, created, password = await es._provision_sa_account(db, reg, {})
    assert created is False
    assert password is None
    assert user["_id"] == "existing-user"
    assert reg["user_id"] == "existing-user"
    assert len(db.users.docs) == 1  # no duplicate

    # A second call for the same new email is idempotent (no duplicate account)
    fresh = {"id": "r2", "email": "new@x.co", "full_name": "New User", "phone": "", "dob": ""}
    u1, c1, p1 = await es._provision_sa_account(db, dict(fresh), {})
    assert c1 is True and p1 and u1["email"] == "new@x.co"
    u2, c2, p2 = await es._provision_sa_account(db, dict(fresh), {})
    assert c2 is False and p2 is None
    assert u2["_id"] == u1["_id"]
    assert len(db.users.docs) == 2


# ── 12. Ticket / pass templates ──────────────────────────────────────────────
def test_ticket_templates_render_all_variants():
    reg = {
        "id": "REG123", "slug": "echo-tech-2026", "showcase_title": "ECHO Tech Summit",
        "full_name": "Aarav Sharma", "email": "a@x.co", "phone": "9999999999",
        "branch": "CSE", "year": "3rd Year", "college": "VNR VJIET",
        "qr_code_base64": "iVBORw0KGgo=",
    }
    show = {
        "title": "ECHO Tech Summit", "date": "August 15, 2026", "time": "10:00 AM – 4:30 PM",
        "venue": "Main Auditorium", "organizer_name": "Student Alumni Cell",
        "registration": {"ticket_template": "aurora"},
    }
    for template in ("aurora", "classic", "minimal"):
        html = es._build_ticket_html(reg, show, template)
        assert "<html" in html and "REG123" in html and "ECHO Tech Summit" in html
        assert "data:image/png;base64," in html  # QR embedded

    # Unknown template id gracefully falls back to the default
    assert es._build_ticket_html(reg, show, "bogus") == es._build_ticket_html(reg, show, "aurora")

    # Default resolution from the showcase registration config
    show2 = {"title": "T", "registration": {"ticket_template": "classic"}}
    assert "classic" in es._build_ticket_html(reg, show2) or "CONFIRMED" in es._build_ticket_html(reg, show2)
    assert es._build_ticket_html(reg, {"title": "T"}) == es._build_ticket_html(reg, {"title": "T"}, "aurora")


def test_ticket_email_block_contains_pass_and_download_link():
    reg = {
        "id": "REG456", "full_name": "Bhavna Rao", "email": "b@x.co",
        "qr_code_base64": "iVBORw0KGgo=",
    }
    show = {"title": "Hack Night", "date": "Sept 1, 2026", "venue": "Block C"}
    block = es._ticket_email_block(reg, show, "https://studentalumni.ai/api/echo/tickets/REG456")
    assert "ENTRY PASS" in block.upper() or "ENTRY PASS" in block
    assert "Download Pass" in block
    assert "REG456" in block
    assert "qr.png" in block or "data:image/png;base64," in block


@pytest.mark.asyncio
async def test_get_ticket_endpoint(patch_deps, fake_db):
    from fastapi import HTTPException

    db = fake_db
    db.echo_registrations.docs = [{
        "_id": "rT", "id": "tkt1", "slug": "echo-tech-2026",
        "user_key": "owner@x.co", "email": "owner@x.co", "full_name": "Owner",
        "showcase_title": "ECHO Tech Summit", "qr_code_base64": "iVBORw0KGgo=",
        "status": "registered",
    }]
    db.echo_showcases.docs = [{"slug": "echo-tech-2026", "title": "ECHO Tech Summit", "registration": {}}]

    # Unauthenticated owner-by-email resolves via a seeded user lookup is not
    # wired in the fake, so an anonymous call must 403 (no token / no user).
    req = FakeRequest()
    try:
        await es.get_ticket("tkt1", req)
        raised = False
    except HTTPException as e:
        raised = True
        assert e.status_code in (401, 403)
    assert raised is True


@pytest.mark.asyncio
async def test_fulfill_team_members_creates_accounts_tickets_and_coupons(patch_deps, fake_db, monkeypatch):
    """Verify that _fulfill_team_members creates child registrations, provisions SA accounts, and issues tickets for members 2..5."""
    emails_sent = []
    async def fake_send_email(to, subject, body, **kw):
        emails_sent.append({"to": to, "subject": subject, "body": body, "attachments": kw.get("attachments", [])})
    monkeypatch.setattr(es, "send_email", fake_send_email)

    db = fake_db
    showcase = {
        "slug": "hackwave-3",
        "title": "SNIST HackWave 3.0",
        "college": "Sreenidhi Institute of Science and Technology",
        "sessions": [
            {"key": "lunch_day1", "name": "Day 1 Lunch Pass", "day": 1},
            {"key": "snacks_day1", "name": "Day 1 Evening Snacks", "day": 1},
        ],
    }

    parent_reg = {
        "_id": "p1",
        "id": "HW3-TEAM-101",
        "slug": "hackwave-3",
        "full_name": "Tejas Leader",
        "email": "lead@snist.edu",
        "phone": "+919876543210",
        "registration_type": "team",
        "team_name": "Neural Pioneers",
        "team_size": 4,
        "team_members": [
            {"name": "Ananya Sharma", "email": "ananya@snist.edu", "phone": "+919876543211"},
            {"name": "Rahul Verma", "email": "rahul@snist.edu", "phone": "+919876543212"},
            {"name": "Karthik Reddy", "email": "karthik@snist.edu", "phone": "+919876543213"},
        ],
        "payment": {"status": "paid", "amount": 2495, "currency": "INR"},
        "status": "registered",
    }

    fulfilled = await es._fulfill_team_members(db, parent_reg, showcase)
    assert len(fulfilled) == 3

    # Check child registrations in echo_registrations
    m1 = await db.echo_registrations.find_one({"id": "HW3-TEAM-101_M1"})
    assert m1 is not None
    assert m1["email"] == "ananya@snist.edu"
    assert m1["full_name"] == "Ananya Sharma"
    assert m1["parent_reg_id"] == "HW3-TEAM-101"
    assert m1["is_team_member"] is True
    assert m1["team_name"] == "Neural Pioneers"
    assert m1["status"] == "registered"
    assert m1["payment"]["status"] == "paid"
    assert m1.get("qr_code_base64") is not None

    m2 = await db.echo_registrations.find_one({"id": "HW3-TEAM-101_M2"})
    assert m2 is not None
    assert m2["email"] == "rahul@snist.edu"

    m3 = await db.echo_registrations.find_one({"id": "HW3-TEAM-101_M3"})
    assert m3 is not None
    assert m3["email"] == "karthik@snist.edu"

    # Check that SA user accounts were provisioned in db.users
    user_ananya = await db.users.find_one({"email": "ananya@snist.edu"})
    assert user_ananya is not None
    assert user_ananya["role"] == "student"
    assert user_ananya.get("unique_id") is not None

    # Check session coupons generated for teammate
    coupons = await db.echo_coupons.find({"reg_id": "HW3-TEAM-101_M1"}).to_list(10)
    assert len(coupons) == 2

    # Check emails sent (both Welcome email with credentials and Ticket pass confirmation)
    ananya_emails = [e for e in emails_sent if e["to"] == "ananya@snist.edu"]
    assert len(ananya_emails) >= 2  # 1 Welcome email with password + 1 Entry Pass email
    pass_email = next(e for e in ananya_emails if "Entry Pass" in e["subject"])
    assert "Neural Pioneers" in pass_email["subject"]
    assert "HW3-TEAM-101_M1" in pass_email["body"]


@pytest.mark.asyncio
async def test_finalize_paid_registration_triggers_team_fulfillment(patch_deps, fake_db, monkeypatch):
    """Verify that finalizing a paid team registration automatically provisions accounts & passes for all team members."""
    emails_sent = []
    async def fake_send_email(to, subject, body, **kw):
        emails_sent.append({"to": to, "subject": subject, "body": body})
    monkeypatch.setattr(es, "send_email", fake_send_email)

    db = fake_db
    showcase = {
        "slug": "snist-hackwave",
        "title": "SNIST HackWave 3.0",
        "college": "SNIST",
        "fee": 2495,
    }
    db.echo_showcases.docs = [showcase]

    team_reg = {
        "_id": "paid_t1",
        "id": "HW3-TEAM-555",
        "slug": "snist-hackwave",
        "full_name": "Captain Marvel",
        "email": "captain@snist.edu",
        "registration_type": "team",
        "team_name": "Code Avengers",
        "team_size": 3,
        "team_members": [
            {"name": "Iron Man", "email": "tony@snist.edu"},
            {"name": "Thor", "email": "thor@snist.edu"},
        ],
        "fee": 2495,
        "status": "pending",
        "payment": {"status": "pending"},
    }
    db.echo_registrations.docs = [team_reg]

    res = await es._finalize_paid_registration(db, team_reg, showcase, payment_id="pay_999")
    assert res["status"] == "registered"

    # Team members must be created
    tony = await db.echo_registrations.find_one({"id": "HW3-TEAM-555_M1"})
    assert tony is not None
    assert tony["email"] == "tony@snist.edu"
    assert tony["status"] == "registered"

    thor = await db.echo_registrations.find_one({"id": "HW3-TEAM-555_M2"})
    assert thor is not None
    assert thor["email"] == "thor@snist.edu"

    # User accounts created
    assert await db.users.find_one({"email": "tony@snist.edu"}) is not None
    assert await db.users.find_one({"email": "thor@snist.edu"}) is not None
