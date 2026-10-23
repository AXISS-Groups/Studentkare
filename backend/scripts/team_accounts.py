"""Team accounts on the server: create, rotate, unlock, disable, list.

Run from the backend directory after a deploy (docs/guides/team-accounts.md):

    python -m scripts.team_accounts create          # creates any missing account, prints each new ID + PIN once
    python -m scripts.team_accounts rotate campus   # a new PIN for one account (id, sign-in ID or short name)
    python -m scripts.team_accounts unlock campus
    python -m scripts.team_accounts disable campus
    python -m scripts.team_accounts set-password superadmin   # asks for it twice; never shown or logged
    python -m scripts.team_accounts list

A PIN is printed only when it is made (create for a new account, or rotate) and
is never stored or logged anywhere but as a hash. These are shared accounts, to
be replaced by individual logins.
"""
from __future__ import annotations

import argparse
import getpass
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from core import workflow_models as M  # noqa: E402
from core.settings_registry import setting  # noqa: E402
from services.account_password import PasswordRefused, refusal, set_password  # noqa: E402
from services.db_sql import SessionLocal, create_all_tables  # noqa: E402
from services.team_accounts import (  # noqa: E402
    CLI_ACTOR,
    RetiredAccount,
    account_row,
    create_missing,
    disable,
    rotate,
    team_account,
    unlock,
)


def _when(value: float | None) -> str:
    return datetime.fromtimestamp(value, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if value else "never"


def _kind(role: str, partner_kind: str) -> str:
    return f"{role}/{partner_kind}" if partner_kind else role


def cmd_create(db) -> int:
    results = create_missing(db)
    shown = False
    for result in results:
        label = _kind(result.role, result.partner_kind)
        if result.pin:
            shown = True
            print(f"{result.identifier:<32} {label:<20} PIN {result.pin}   ({result.note})")
        else:
            print(f"{result.identifier:<32} {label:<20} {result.note}")
    if shown:
        print("\nThese PINs are shown once and are not stored. Hand each to the team now.")
    else:
        print("\nNo new PINs. Existing PINs are never shown again; use 'rotate <id>' for a new one.")
    return 0


def _resolve(db, key: str) -> M.Account | None:
    account = team_account(db, key)
    if account is None:
        print(f"No team account matches {key!r}. Run 'list' to see them.", file=sys.stderr)
    return account


def cmd_rotate(db, key: str) -> int:
    account = _resolve(db, key)
    if account is None:
        return 1
    try:
        pin = rotate(db, account, CLI_ACTOR)
    except RetiredAccount:
        print(f"{account.identifier} was retired for named super admins and stays off.", file=sys.stderr)
        return 1
    print(f"{account.identifier:<32} {_kind(account.role, account.partner_kind):<20} new PIN {pin}")
    print("\nShown once and not stored. Its other sessions were signed out.")
    return 0


def cmd_unlock(db, key: str) -> int:
    account = _resolve(db, key)
    if account is None:
        return 1
    unlock(db, account, CLI_ACTOR)
    print(f"{account.identifier} unlocked.")
    return 0


def cmd_disable(db, key: str) -> int:
    account = _resolve(db, key)
    if account is None:
        return 1
    ended = disable(db, account, CLI_ACTOR)
    print(f"{account.identifier} disabled; {ended} session(s) ended. 'rotate' turns it back on with a new PIN.")
    return 0


def cmd_set_password(db, key: str) -> int:
    account = _resolve(db, key)
    if account is None:
        return 1
    ask = getpass.getpass   # never echoed
    password = ask(f"New password for {account.identifier}: ")
    if ask("Type it again: ") != password:
        print("The two don't match. Nothing was changed.", file=sys.stderr)
        return 1
    try:
        set_password(db, account, password, CLI_ACTOR)
    except PasswordRefused as error:
        print(refusal(error, setting("auth.password_min_length", db)).detail["message"], file=sys.stderr)
        return 1
    print(f"{account.identifier} password set. Its sessions were signed out.")
    return 0


def cmd_list(db) -> int:
    now = time.time()
    rows = db.scalars(select(M.Account).where(M.Account.is_team_account.is_(True)).order_by(M.Account.identifier)).all()
    if not rows:
        print("No team accounts yet. Run 'create'.")
        return 0
    for account in rows:
        row = account_row(db, account, now)
        state = "disabled" if not row["active"] else "locked" if row["locked"] else "active"
        password = "password" if row["hasPassword"] else "no password"
        print(f"{row['identifier']:<32} {_kind(row['role'], row['partnerKind']):<20} {state:<9} {password:<12} "
              f"last sign-in {_when(row['lastSignInAt'])}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m scripts.team_accounts",
                                     description="Shared team accounts (one per role) signed in with a PIN.")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("create", help="Create any missing team account and print its new PIN once.")
    sub.add_parser("list", help="List the team accounts, their state and last sign-in.")
    for name, text in (("rotate", "Give one account a new PIN (printed once) and sign out its sessions."),
                       ("unlock", "Clear a lockout after too many wrong PINs."),
                       ("disable", "Turn one account off and end its sessions."),
                       ("set-password", "Set or replace one account's password (typed in, never shown).")):
        command = sub.add_parser(name, help=text)
        command.add_argument("id", help="Account id, sign-in ID (campus@…) or short name (campus).")
    args = parser.parse_args(argv)
    create_all_tables()
    with SessionLocal() as db:
        if args.command == "create":
            return cmd_create(db)
        if args.command == "list":
            return cmd_list(db)
        handler = {"rotate": cmd_rotate, "unlock": cmd_unlock, "disable": cmd_disable,
                   "set-password": cmd_set_password}[args.command]
        return handler(db, args.id)


if __name__ == "__main__":
    raise SystemExit(main())
