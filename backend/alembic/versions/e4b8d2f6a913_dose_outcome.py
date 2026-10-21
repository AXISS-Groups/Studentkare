"""A logged dose can be a dose the student skipped.

Adds ``care_medication_doses.outcome`` (clinical plane, same table, same
grants): ``TAKEN`` for every existing row and by default, ``SKIPPED`` when the
student says they skipped a dose (POST /meds/skip-dose). A skipped dose fills a
slot of the day, so the screen stops asking about it, but it is never counted
as taken: adherence coverage and "doses taken" read TAKEN rows only.

Nobody is told about a skip and nothing is scored (WP-07 Medications).

Revision ID: e4b8d2f6a913
Revises: a6c2e8d4f1b7
Create Date: 2026-10-21
"""
import sqlalchemy as sa

from alembic import op

revision = "e4b8d2f6a913"
down_revision = "a6c2e8d4f1b7"
branch_labels = None
depends_on = None


def _columns(bind, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    if "outcome" not in _columns(bind, "care_medication_doses"):
        op.add_column("care_medication_doses",
                      sa.Column("outcome", sa.String(8), nullable=False, server_default="TAKEN"))
    if bind.dialect.name == "postgresql":
        op.create_check_constraint("ck_care_medication_doses_outcome", "care_medication_doses",
                                   "outcome IN ('TAKEN', 'SKIPPED')")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_constraint("ck_care_medication_doses_outcome", "care_medication_doses", type_="check")
    # A skipped dose has no meaning without the column: drop those rows rather than turn them into doses taken.
    op.execute(sa.text("DELETE FROM care_medication_doses WHERE outcome = 'SKIPPED'"))
    op.drop_column("care_medication_doses", "outcome")
