"""Settings registry overrides (AGENTS.md rule 11, core/settings_registry.py).

- care_setting_overrides (platform plane): a super admin's value for one
  declared setting. No row means the declared default is in force.
- care_setting_override_history (platform plane): append-only record of every
  change, with who, when and the reason. On Postgres a trigger refuses UPDATE
  and DELETE on it, so the history cannot be rewritten even outside the ORM.

Neither table holds anything about a person, so neither role in the Rule L
matrix gets a grant (platform tables are owner-only by default).

Revision ID: a7d3e9c1f5b2
Revises: c5f2a9d4e7b1
Create Date: 2026-10-20
"""
import sqlalchemy as sa

from alembic import op

revision = "a7d3e9c1f5b2"
down_revision = "c5f2a9d4e7b1"
branch_labels = None
depends_on = None

_TRIGGER_FN = "care_setting_override_history_append_only"
_TRIGGER = "care_setting_override_history_no_rewrite"


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "care_setting_overrides" not in existing:
        op.create_table(
            "care_setting_overrides",
            sa.Column("key", sa.String(80), primary_key=True),
            sa.Column("value", sa.JSON(), nullable=False),
            sa.Column("updated_by", sa.String(64), nullable=False),
            sa.Column("updated_at", sa.Float(), nullable=False),
        )

    if "care_setting_override_history" not in existing:
        op.create_table(
            "care_setting_override_history",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("key", sa.String(80), nullable=False),
            sa.Column("old_value", sa.JSON(), nullable=True),
            sa.Column("new_value", sa.JSON(), nullable=True),
            sa.Column("reason", sa.String(500), nullable=False),
            sa.Column("changed_by", sa.String(64), nullable=False),
            sa.Column("changed_at", sa.Float(), nullable=False),
        )
        for column in ("key", "changed_by", "changed_at"):
            op.create_index(f"ix_care_setting_override_history_{column}", "care_setting_override_history", [column])

    if bind.dialect.name == "postgresql":
        op.execute(f"""
            CREATE OR REPLACE FUNCTION {_TRIGGER_FN}() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'care_setting_override_history is append-only';
            END;
            $$ LANGUAGE plpgsql
        """)
        op.execute(f"DROP TRIGGER IF EXISTS {_TRIGGER} ON care_setting_override_history")
        op.execute(f"""
            CREATE TRIGGER {_TRIGGER}
            BEFORE UPDATE OR DELETE ON care_setting_override_history
            FOR EACH ROW EXECUTE FUNCTION {_TRIGGER_FN}()
        """)

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(f"DROP TRIGGER IF EXISTS {_TRIGGER} ON care_setting_override_history")
        op.execute(f"DROP FUNCTION IF EXISTS {_TRIGGER_FN}()")
    op.drop_table("care_setting_override_history")
    op.drop_table("care_setting_overrides")
