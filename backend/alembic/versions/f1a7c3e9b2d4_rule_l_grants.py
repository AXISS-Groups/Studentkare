"""Rule L commerce firewall: NOLOGIN group roles and the grant matrix.

Creates ``sk_commerce`` (commerce tables only, nothing clinical) and
``sk_clinical`` (clinical tables, nothing commercial), and grants the app's own
login membership of ``sk_commerce`` so the commerce code paths can
``SET LOCAL ROLE sk_commerce``. The table classification and the matrix live in
core/rule_l.py; this migration writes them.

Idempotent and non-fatal: on SQLite it does nothing; where the migrating user
lacks CREATEROLE (or does not own the tables) it logs a warning, the schema
upgrade still succeeds, and ``rule_l_status`` / GET /api/ops/rule-l report that
the grants are NOT in force. Nothing here records a compliance claim.

Later migrations that add a table must classify it in core/rule_l.py and call
``apply_grants(op.get_bind())`` again (P23: grants ship in the migration).

Revision ID: f1a7c3e9b2d4
Revises: b6965aa39f06
Create Date: 2026-10-17
"""
from alembic import op

revision = "f1a7c3e9b2d4"
down_revision = "b6965aa39f06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from core.rule_l import apply_grants

    apply_grants(op.get_bind())


def downgrade() -> None:
    """Strip the matrix. The roles are left in place: they are cluster-wide,
    may be shared by other databases, and DROP ROLE needs CREATEROLE."""
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    from core.rule_l import GROUP_ROLES, TABLE_PLANES, _q, _role_exists, _try

    present = [r for r in GROUP_ROLES if _role_exists(bind, r)]
    if not present:
        return
    existing = {row[0] for row in bind.exec_driver_sql("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")}
    roles = ", ".join(_q(r) for r in present)
    _try(bind, [f"REVOKE ALL ON TABLE public.{_q(t)} FROM {roles}" for t in sorted(existing & set(TABLE_PLANES))]
         + [f"REVOKE USAGE ON SCHEMA public FROM {roles}"])
