"""Add health camp booking slots and preparation details."""

import sqlalchemy as sa

from alembic import op

revision = "7c5d1e2a4b90"
down_revision = "d83c5a1e07b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "care_health_camps",
        sa.Column(
            "what_to_bring",
            sa.String(1000),
            nullable=False,
            server_default="",
        ),
    )

    op.create_table(
        "care_health_camp_slots",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "camp_id",
            sa.String(),
            sa.ForeignKey("care_health_camps.id"),
            nullable=False,
        ),
        sa.Column("slot_start", sa.String(40), nullable=False),
        sa.Column("slot_end", sa.String(40), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("booked", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_index(
        "ix_care_health_camp_slots_camp_id",
        "care_health_camp_slots",
        ["camp_id"],
    )

    op.add_column(
        "care_camp_attendances",
        sa.Column(
            "slot_id",
            sa.String(),
            sa.ForeignKey("care_health_camp_slots.id"),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_care_camp_attendances_slot_id",
        "care_camp_attendances",
        ["slot_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_care_camp_attendances_slot_id",
        table_name="care_camp_attendances",
    )
    op.drop_column("care_camp_attendances", "slot_id")

    op.drop_index(
        "ix_care_health_camp_slots_camp_id",
        table_name="care_health_camp_slots",
    )
    op.drop_table("care_health_camp_slots")

    op.drop_column("care_health_camps", "what_to_bring")
