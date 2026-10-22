"""Backfill the campus verification request sign-up always promised (live-run audit #4).

Sign-up told every student "your account starts with campus verification
pending" and stored their university and roll number on the profile, but it
never opened the request the campus queue reads (care_campus_verifications),
so their status was NOT_SUBMITTED and no campus ever saw them. Sign-up now
opens it (services/workflow_auth.signup). This opens it, PENDING, for active
student accounts that gave a university and roll number, are not verified and
have no request yet. A team test campus is never asked (core/team_scope.py).

Data only: no schema change. Identity plane (core/rule_l.py). Downgrade leaves
the rows: a campus may already have acted on them.

Revision ID: a4e8c2d6f013
Revises: e3c9a7f5b124
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "a4e8c2d6f013"
down_revision = "e3c9a7f5b124"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from core.team_scope import is_reserved_campus

    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if not {"care_accounts", "care_campus_verifications"} <= tables:
        return
    accounts = sa.table("care_accounts", sa.column("id", sa.String), sa.column("role", sa.String),
                        sa.column("active", sa.Boolean), sa.column("profile", sa.JSON))
    verifications = sa.table("care_campus_verifications", sa.column("account_id", sa.String),
                             sa.column("university", sa.String), sa.column("roll_number", sa.String),
                             sa.column("status", sa.String), sa.column("verified_by", sa.String),
                             sa.column("verified_at", sa.Float))
    asked = set(bind.execute(sa.select(verifications.c.account_id)).scalars())
    rows = []
    for account_id, profile in bind.execute(sa.select(accounts.c.id, accounts.c.profile).where(
            accounts.c.role == "STUDENT", accounts.c.active.is_(True))):
        profile = profile or {}
        university = " ".join(str(profile.get("university", "")).split())[:160]
        roll = str(profile.get("rollNumber", "")).strip()[:80]
        if account_id in asked or not university or not roll or profile.get("isVerifiedStudent") is True:
            continue
        if is_reserved_campus(university):
            continue
        rows.append({"account_id": account_id, "university": university, "roll_number": roll,
                     "status": "PENDING", "verified_by": "", "verified_at": 0.0})
    if rows:
        op.bulk_insert(verifications, rows)


def downgrade() -> None:
    pass
