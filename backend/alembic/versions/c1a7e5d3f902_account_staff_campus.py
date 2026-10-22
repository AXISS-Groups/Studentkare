"""Server-assigned campus scope for campus administrators and counsellors (audit C1).

``care_accounts.staff_campus`` replaces ``profile.university`` as the source of a
staff member's campus scope. The profile is self-service (PATCH /api/profile), so
a scope read from it let a campus admin or counsellor point their account at any
college and read its crisis queue, SOS alerts and pending verifications.

Backfill: each existing CAMPUS_ADMIN / COUNSELLOR gets the campus currently in
their profile. Before deploying, a super admin should check those assignments
(GET /api/ops/accounts?role=CAMPUS_ADMIN|COUNSELLOR) because a profile could
have been edited before this fix; PATCH /api/ops/accounts/{id}/campus corrects one.

Revision ID: c1a7e5d3f902
Revises: b7d3e1f9a6c2
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "c1a7e5d3f902"
down_revision = "b7d3e1f9a6c2"
branch_labels = None
depends_on = None

CAMPUS_SCOPED_ROLES = ("CAMPUS_ADMIN", "COUNSELLOR")
MAX_CAMPUS_CHARS = 160


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("care_accounts")}
    if "staff_campus" not in columns:
        op.add_column("care_accounts",
                      sa.Column("staff_campus", sa.String(MAX_CAMPUS_CHARS), nullable=False, server_default=""))
    accounts = sa.table("care_accounts", sa.column("id", sa.String()), sa.column("role", sa.String()),
                        sa.column("profile", sa.JSON()), sa.column("staff_campus", sa.String()))
    rows = bind.execute(sa.select(accounts.c.id, accounts.c.profile)
                        .where(accounts.c.role.in_(CAMPUS_SCOPED_ROLES))).all()
    for account_id, profile in rows:
        campus = " ".join(str((profile or {}).get("university", "") or "").split())[:MAX_CAMPUS_CHARS]
        if campus:
            bind.execute(sa.update(accounts).where(accounts.c.id == account_id).values(staff_campus=campus))


def downgrade() -> None:
    op.drop_column("care_accounts", "staff_campus")
