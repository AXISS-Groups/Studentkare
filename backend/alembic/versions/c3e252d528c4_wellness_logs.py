"""Wellness logs: a water goal and structured doses per day.

No new tables. Water, activity, heart rate, weight and height are rows in
care_readings (clinical plane), one metric each, so they inherit that table's
Rule L grants and its owner-only read/delete paths. Two columns are added:

- care_preferences.water_goal_ml (clinical plane, nullable): the daily water
  goal the owner set, 500-6000 ml. NULL means never set; the API uses its
  default and reports that it is the default.
- care_medication_plans.times_per_day (clinical plane, nullable, 1-6): how many
  doses a day the owner says the plan has. ``frequency`` stays free text and is
  never parsed; without this value the planned dose count is unknown.

Revision ID: c3e252d528c4
Revises: a7d3e9c1f5b2
Create Date: 2026-10-20
"""
import sqlalchemy as sa

from alembic import op

revision = "c3e252d528c4"
down_revision = "a7d3e9c1f5b2"
branch_labels = None
depends_on = None


def _columns(bind, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    if "water_goal_ml" not in _columns(bind, "care_preferences"):
        op.add_column("care_preferences", sa.Column("water_goal_ml", sa.Integer(), nullable=True))
    if "times_per_day" not in _columns(bind, "care_medication_plans"):
        op.add_column("care_medication_plans", sa.Column("times_per_day", sa.Integer(), nullable=True))
    if bind.dialect.name == "postgresql":
        # The API validates both; the database refuses anything that slips past it.
        op.create_check_constraint("ck_care_preferences_water_goal_ml", "care_preferences",
                                   "water_goal_ml IS NULL OR water_goal_ml BETWEEN 500 AND 6000")
        op.create_check_constraint("ck_care_medication_plans_times_per_day", "care_medication_plans",
                                   "times_per_day IS NULL OR times_per_day BETWEEN 1 AND 6")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_constraint("ck_care_medication_plans_times_per_day", "care_medication_plans", type_="check")
        op.drop_constraint("ck_care_preferences_water_goal_ml", "care_preferences", type_="check")
    op.drop_column("care_medication_plans", "times_per_day")
    op.drop_column("care_preferences", "water_goal_ml")
