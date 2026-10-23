"""Health camp booking: campus scope, services, eligibility, price, host, waitlist.

* ``care_health_camps`` gains the campus it is for ("" = every campus, the camps
  made before this), the services it offers, who may book, its price in paise
  (0 = free), its status (a partner's camp waits for the campus to approve it),
  who created it and when. Platform plane, unchanged.
* ``care_camp_attendances`` gains a status (REGISTERED for the rows that never
  chose a slot, BOOKED, WAITLISTED, CANCELLED), the booking reference the student
  is shown, and when it last changed. Clinical plane, unchanged.

No new table, so no new grants (core/rule_l.py).

Revision ID: e7c3a9d5b241
Revises: d8b2f4a6c135
Create Date: 2026-10-23
"""
import sqlalchemy as sa

from alembic import op

revision = "e7c3a9d5b241"
down_revision = "d8b2f4a6c135"
branch_labels = None
depends_on = None

CAMPS = "care_health_camps"
ATTENDANCES = "care_camp_attendances"


def upgrade() -> None:
    op.add_column(CAMPS, sa.Column("campus", sa.String(160), nullable=False, server_default=""))
    op.add_column(CAMPS, sa.Column("services", sa.JSON(), nullable=True))
    op.add_column(CAMPS, sa.Column("eligibility", sa.String(24), nullable=False, server_default="CAMPUS_VERIFIED"))
    op.add_column(CAMPS, sa.Column("price_paise", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(CAMPS, sa.Column("status", sa.String(20), nullable=False, server_default="PUBLISHED"))
    op.add_column(CAMPS, sa.Column("host_account_id", sa.String(), nullable=False, server_default=""))
    op.add_column(CAMPS, sa.Column("host_kind", sa.String(12), nullable=False, server_default=""))
    op.add_column(CAMPS, sa.Column("created_at", sa.Float(), nullable=False, server_default="0"))
    op.add_column(CAMPS, sa.Column("cancel_reason", sa.String(300), nullable=False, server_default=""))
    op.create_index("ix_care_health_camps_campus", CAMPS, ["campus"])
    op.create_index("ix_care_health_camps_status", CAMPS, ["status"])
    # Camps made before this were open to every student; keep them that way.
    op.execute(sa.text("UPDATE care_health_camps SET eligibility = 'OPEN' WHERE campus = ''"))
    # An inactive camp was hidden; say so in its status.
    op.execute(sa.text("UPDATE care_health_camps SET status = 'CANCELLED' WHERE active = false"))

    op.add_column(ATTENDANCES, sa.Column("status", sa.String(16), nullable=False, server_default="BOOKED"))
    op.add_column(ATTENDANCES, sa.Column("booking_code", sa.String(16), nullable=False, server_default=""))
    op.add_column(ATTENDANCES, sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"))
    op.create_index("ix_care_camp_attendances_status", ATTENDANCES, ["status"])
    # A registration that never chose a slot is not a booking.
    op.execute(sa.text("UPDATE care_camp_attendances SET status = 'REGISTERED' WHERE slot_id IS NULL"))


def downgrade() -> None:
    op.drop_index("ix_care_camp_attendances_status", table_name=ATTENDANCES)
    for column in ("updated_at", "booking_code", "status"):
        op.drop_column(ATTENDANCES, column)
    op.drop_index("ix_care_health_camps_status", table_name=CAMPS)
    op.drop_index("ix_care_health_camps_campus", table_name=CAMPS)
    for column in ("cancel_reason", "created_at", "host_kind", "host_account_id", "status", "price_paise",
                   "eligibility", "services", "campus"):
        op.drop_column(CAMPS, column)
