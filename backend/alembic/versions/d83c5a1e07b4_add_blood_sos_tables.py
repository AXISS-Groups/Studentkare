"""Blood SOS tables, which the models declared but no migration created.

core/workflow_models.py has declared BloodDonor (care_blood_donors) and
BloodSOSRequest (care_blood_sos_requests) since 7556d60, and
POST /blood/donors writes to the first one. No migration ever created either.

That was survivable only because development boots with
`Base.metadata.create_all()`, which makes any missing table. Production does
not: app/main.py runs `alembic upgrade head` when APP_ENV == "production", so
these two tables were never created there and donor registration would fail
with "relation care_blood_donors does not exist".

Created conditionally. The raw dump at migrations/postgres_full_schema.sql
contains both, so a database bootstrapped from that file already has them and an
unconditional create_table would fail on it. Checking the inspector first makes
this safe on a database from either origin.
"""
import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision = "d83c5a1e07b4"
down_revision = "c71d94b2e5a8"
branch_labels = None
depends_on = None


def _has(table: str) -> bool:
    return table in set(inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if not _has("care_blood_donors"):
        op.create_table(
            "care_blood_donors",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("blood_group", sa.String(length=5), nullable=False),
            sa.Column("hostel_block", sa.String(length=160), nullable=False),
            sa.Column("phone", sa.String(length=20), nullable=False),
            sa.Column("last_donated", sa.String(length=40), nullable=False, server_default=""),
            sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.true()),
            # Defaults to hidden: a donor's blood group, hostel and phone are only
            # listed once they have chosen to be listed.
            sa.Column("visible", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_blood_donors_account_id", "care_blood_donors", ["account_id"])
        op.create_index("ix_care_blood_donors_blood_group", "care_blood_donors", ["blood_group"])

    if not _has("care_blood_sos_requests"):
        op.create_table(
            "care_blood_sos_requests",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
            sa.Column("patient_name", sa.String(length=120), nullable=False),
            sa.Column("required_group", sa.String(length=5), nullable=False),
            sa.Column("units_needed", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("hospital_location", sa.String(length=200), nullable=False),
            sa.Column("urgency", sa.String(length=20), nullable=False, server_default="CRITICAL"),
            sa.Column("matching_donors_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="QUEUED"),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index(
            "ix_care_blood_sos_requests_account_id", "care_blood_sos_requests", ["account_id"]
        )


def downgrade() -> None:
    # Only drop what this migration would have made; a database bootstrapped from
    # the raw dump owns these tables independently.
    for table in ("care_blood_sos_requests", "care_blood_donors"):
        if _has(table):
            op.drop_table(table)
