"""Where team accounts live, and the rule that keeps them away from real students.

Team accounts (services/team_accounts.py, founder decision 2026-10-22) are one
shared account per role on the live site. They are scoped to a test campus and
a test partner organisation that no real student can belong to:

* the campus admin and counsellor act for ``TEAM_CAMPUS``, and no student may
  give that campus at sign-up, in a profile edit or in a campus verification
  (``is_reserved_campus``), so the campus-scoped screens find nobody real;
* the partners belong to ``TEAM_PARTNER_ORG`` and own nothing, and the open
  work queues every partner of a kind can see are closed to them
  (``team_sandboxed``);
* the doctor sees only what is assigned to it, and nobody can share a record
  with it or assign it a real student's report.

The super admin team account is a real super admin: platform-wide by nature.
No module here imports anything, so every layer can use it.
"""
from __future__ import annotations

TEAM_CAMPUS = "StudentKare Team Campus"
TEAM_PARTNER_ORG = "StudentKare Team Partners"


def _key(value: str) -> str:
    return " ".join((value or "").split()).casefold()


def is_reserved_campus(name: str | None) -> bool:
    """True for the team test campus, however it is spaced or capitalised."""
    return bool(name) and _key(name or "") == _key(TEAM_CAMPUS)


RESERVED_CAMPUS_MESSAGE = "That campus name is reserved. Enter your own college or university."


def team_sandboxed(user: dict) -> bool:
    """A team account that must not see real students: every team account but the super admin."""
    return user.get("isTeamAccount") is True and user.get("role") != "SUPER_ADMIN"
