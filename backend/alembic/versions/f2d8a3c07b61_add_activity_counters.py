"""Add aggregated request telemetry.

Counters, not a row per request: one row per (hour, route, method, role, status
class). No account ids, path parameters, query values or payloads are stored.
"""
import sqlalchemy as sa

from alembic import op

revision = "f2d8a3c07b61"
down_revision = "e7c1b4d92a35"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_activity_counters",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("bucket", sa.Integer(), nullable=False),
        sa.Column("route", sa.String(200), nullable=False),
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("actor_role", sa.String(24), nullable=False, server_default="ANONYMOUS"),
        sa.Column("status_class", sa.String(3), nullable=False, server_default="2xx"),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_latency_ms", sa.Float(), nullable=False, server_default="0"),
        sa.Column("max_latency_ms", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_at", sa.Float(), nullable=False, server_default="0"),
        sa.UniqueConstraint("bucket", "route", "method", "actor_role", "status_class",
                            name="uq_care_activity_counters_bucket"),
    )
    for column in ("bucket", "route", "actor_role", "status_class"):
        op.create_index(f"ix_care_activity_counters_{column}", "care_activity_counters", [column])


def downgrade() -> None:
    op.drop_table("care_activity_counters")
