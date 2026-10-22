"""Which account an email or WhatsApp number belongs to, and whether it is verified.

Plan tier1-auth-password-2026-10-22 (section A), approved by the founder
2026-10-22. An account has at most one email and one WhatsApp number
(``care_account_contacts``). A contact is *verified* once a one-time code sent
to it has been entered. The rules every sign-in path follows:

* **A sign-in code goes only to a verified contact.** ``account_for_sign_in``
  answers None for a contact that isn't verified, so a mistyped number or one an
  admin typed for someone can never receive a code that opens the account.
* **A value belongs to one account**, verified or not. ``contact_in_use`` is
  what sign-up and "add a contact" check, so nobody can create a second account
  on someone's address.
* **The account's own sign-in ID** (``care_accounts.identifier``) counts as a
  verified contact when it has no contact row of its kind. That covers accounts
  made by a path that doesn't write a row (demo seed, older admin tools); the
  migration copied in every account that existed.

Only the platform plane reads this (core/rule_l.py). No function here logs a value.
"""
from __future__ import annotations

import time
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M

CONTACT_KINDS = ("EMAIL", "WHATSAPP")


def contacts_of(db: DBSession, account_id: str) -> list[M.AccountContact]:
    return list(db.scalars(select(M.AccountContact).where(M.AccountContact.account_id == account_id)
                           .order_by(M.AccountContact.kind)).all())


def contact_of_kind(db: DBSession, account_id: str, kind: str) -> M.AccountContact | None:
    return db.scalar(select(M.AccountContact).where(M.AccountContact.account_id == account_id,
                                                    M.AccountContact.kind == kind))


def _primary_counts(db: DBSession, account: M.Account) -> bool:
    """The sign-in ID stands in as verified only when no row of its kind exists."""
    return account.channel in CONTACT_KINDS and contact_of_kind(db, account.id, account.channel) is None


def account_for_sign_in(db: DBSession, value: str, kind: str) -> M.Account | None:
    """The active account whose *verified* contact this is, or None. Fails closed."""
    row = db.scalar(select(M.AccountContact).where(M.AccountContact.value == value, M.AccountContact.kind == kind))
    if row is not None:
        if not row.verified_at:
            return None
        account = db.get(M.Account, row.account_id)
        return account if account is not None and account.active is True else None
    account = db.scalar(select(M.Account).where(M.Account.identifier == value, M.Account.channel == kind,
                                                M.Account.active.is_(True)))
    return account if account is not None and _primary_counts(db, account) else None


def account_holding(db: DBSession, value: str) -> M.Account | None:
    """Any account with this value as a contact or its sign-in ID, verified or not, active or not."""
    row = db.scalar(select(M.AccountContact).where(M.AccountContact.value == value))
    if row is not None:
        return db.get(M.Account, row.account_id)
    return db.scalar(select(M.Account).where(M.Account.identifier == value))


def contact_in_use(db: DBSession, value: str, except_account_id: str = "") -> bool:
    holder = account_holding(db, value)
    return holder is not None and holder.id != except_account_id


def save_contact(db: DBSession, account_id: str, kind: str, value: str, *, verified: bool) -> M.AccountContact:
    """Sets the account's contact of this kind (one per kind), replacing an earlier value. Doesn't commit."""
    now = time.time()
    row = contact_of_kind(db, account_id, kind)
    if row is None:
        row = M.AccountContact(id=uuid.uuid4().hex, account_id=account_id, kind=kind, value=value,
                               verified_at=now if verified else 0.0, created_at=now)
        db.add(row)
    else:
        row.value, row.verified_at = value, (now if verified else 0.0)
    db.flush()
    return row


def verified_contact(db: DBSession, account: M.Account, kind: str) -> str:
    """The account's verified value of this kind, or ""."""
    row = contact_of_kind(db, account.id, kind)
    if row is not None:
        return row.value if row.verified_at else ""
    return account.identifier if account.channel == kind else ""
