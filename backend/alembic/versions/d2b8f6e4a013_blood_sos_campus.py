"""Record the campus a blood SOS went to (audit H1).

``care_blood_sos_requests.campus``: a blood SOS now goes only to donors on the
requester's verified campus (a super admin may name one, or none for every
campus), and the per-campus rate limit counts recent requests by this column.
Existing rows keep "" (sent before campus scoping existed). Clinical plane, as
the table already is (core/rule_l.py).

Revision ID: d2b8f6e4a013
Revises: c1a7e5d3f902
Create Date: 2026-10-22
"""
import sqlalchemy as sa

from alembic import op

revision = "d2b8f6e4a013"
down_revision = "c1a7e5d3f902"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("care_blood_sos_requests")}
    if "campus" not in columns:
        op.add_column("care_blood_sos_requests",
                      sa.Column("campus", sa.String(160), nullable=False, server_default=""))
        op.create_index("ix_care_blood_sos_requests_campus", "care_blood_sos_requests", ["campus"])


def downgrade() -> None:
    op.drop_index("ix_care_blood_sos_requests_campus", table_name="care_blood_sos_requests")
    op.drop_column("care_blood_sos_requests", "campus")
