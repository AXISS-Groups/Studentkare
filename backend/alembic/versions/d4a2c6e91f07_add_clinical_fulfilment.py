"""Add crisis follow-up, service providers, prescriptions, dispensing and lab orders.

No seeded rows: pharmacies and laboratories are onboarded with their own licence
evidence, never shipped as sample data.
"""
import sqlalchemy as sa

from alembic import op

revision = "d4a2c6e91f07"
down_revision = "c3b7f1a9d8e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_crisis_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("language", sa.String(10), nullable=False, server_default=""),
        sa.Column("surface", sa.String(40), nullable=False, server_default=""),
        sa.Column("detected_by", sa.String(10), nullable=False, server_default="SERVER"),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("acknowledged_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("acknowledged_by", sa.String(), nullable=False, server_default=""),
        sa.Column("outcome", sa.String(24), nullable=False, server_default="PENDING"),
        sa.Column("outcome_note", sa.String(500), nullable=False, server_default=""),
    )
    op.create_index("ix_care_crisis_events_account_id", "care_crisis_events", ["account_id"])
    op.create_index("ix_care_crisis_events_kind", "care_crisis_events", ["kind"])
    op.create_index("ix_care_crisis_events_created_at", "care_crisis_events", ["created_at"])

    op.create_table(
        "care_service_providers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("kind", sa.String(12), nullable=False),
        sa.Column("legal_name", sa.String(160), nullable=False),
        sa.Column("licence_no", sa.String(80), nullable=False, server_default=""),
        sa.Column("licence_expiry", sa.Float(), nullable=False, server_default="0"),
        sa.Column("accreditation", sa.String(80), nullable=False, server_default=""),
        sa.Column("address", sa.String(400), nullable=False, server_default=""),
        sa.Column("pincode", sa.String(6), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False, server_default="0"),
        sa.Column("longitude", sa.Float(), nullable=False, server_default="0"),
        sa.Column("serviceable_pincodes", sa.JSON(), nullable=False),
        sa.Column("open_hours", sa.String(200), nullable=False, server_default=""),
        sa.Column("home_collection", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("source_url", sa.String(2000), nullable=False, server_default=""),
        sa.Column("verified_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_care_service_providers_account_id", "care_service_providers", ["account_id"])
    op.create_index("ix_care_service_providers_kind", "care_service_providers", ["kind"])
    op.create_index("ix_care_service_providers_pincode", "care_service_providers", ["pincode"])
    op.create_index("ix_care_service_providers_legal_name", "care_service_providers", ["legal_name"])

    op.create_table(
        "care_prescriptions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("encounter_id", sa.String(), nullable=False, server_default=""),
        sa.Column("prescriber_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("prescriber_reg_no", sa.String(60), nullable=False, server_default=""),
        sa.Column("patient_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("issued_at", sa.Float(), nullable=False),
        sa.Column("valid_until", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(24), nullable=False, server_default="ISSUED"),
        sa.Column("advice", sa.String(1000), nullable=False, server_default=""),
        sa.Column("allergy_check", sa.JSON(), nullable=False),
    )
    op.create_index("ix_care_prescriptions_patient_id", "care_prescriptions", ["patient_id"])
    op.create_index("ix_care_prescriptions_prescriber_id", "care_prescriptions", ["prescriber_id"])
    op.create_index("ix_care_prescriptions_encounter_id", "care_prescriptions", ["encounter_id"])
    op.create_index("ix_care_prescriptions_issued_at", "care_prescriptions", ["issued_at"])
    op.create_index("ix_care_prescriptions_status", "care_prescriptions", ["status"])

    op.create_table(
        "care_prescription_items",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("prescription_id", sa.String(), sa.ForeignKey("care_prescriptions.id"), nullable=False),
        sa.Column("generic_name", sa.String(160), nullable=False),
        sa.Column("brand_name", sa.String(160), nullable=False, server_default=""),
        sa.Column("strength", sa.String(60), nullable=False, server_default=""),
        sa.Column("form", sa.String(40), nullable=False, server_default=""),
        sa.Column("dose", sa.String(60), nullable=False, server_default=""),
        sa.Column("frequency", sa.String(60), nullable=False, server_default=""),
        sa.Column("duration_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("substitution_allowed", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("schedule_class", sa.String(4), nullable=False, server_default="OTC"),
    )
    op.create_index("ix_care_prescription_items_prescription_id", "care_prescription_items", ["prescription_id"])

    op.create_table(
        "care_dispenses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("prescription_id", sa.String(), sa.ForeignKey("care_prescriptions.id"), nullable=False),
        sa.Column("pharmacy_id", sa.String(), sa.ForeignKey("care_service_providers.id"), nullable=False),
        sa.Column("patient_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="RX_ISSUED"),
        sa.Column("verified_by", sa.String(), nullable=False, server_default=""),
        sa.Column("verified_at", sa.Float(), nullable=False, server_default="0"),
        sa.Column("substitution_note", sa.String(500), nullable=False, server_default=""),
        sa.Column("rejection_reason", sa.String(300), nullable=False, server_default=""),
        sa.Column("delivery", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_care_dispenses_prescription_id", "care_dispenses", ["prescription_id"])
    op.create_index("ix_care_dispenses_pharmacy_id", "care_dispenses", ["pharmacy_id"])
    op.create_index("ix_care_dispenses_patient_id", "care_dispenses", ["patient_id"])
    op.create_index("ix_care_dispenses_status", "care_dispenses", ["status"])
    op.create_index("ix_care_dispenses_created_at", "care_dispenses", ["created_at"])

    op.create_table(
        "care_lab_orders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("prescription_id", sa.String(), nullable=False, server_default=""),
        sa.Column("patient_id", sa.String(), sa.ForeignKey("care_accounts.id"), nullable=False),
        sa.Column("lab_id", sa.String(), sa.ForeignKey("care_service_providers.id"), nullable=False),
        sa.Column("ordered_by", sa.String(), nullable=False, server_default=""),
        sa.Column("test_panel", sa.JSON(), nullable=False),
        sa.Column("clinical_indication", sa.String(500), nullable=False, server_default=""),
        sa.Column("collection_mode", sa.String(12), nullable=False, server_default="WALK_IN"),
        sa.Column("slot_start", sa.String(40), nullable=False, server_default=""),
        sa.Column("fasting_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("collector_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("sample_id", sa.String(40), nullable=False, server_default=""),
        sa.Column("status", sa.String(24), nullable=False, server_default="BOOKED"),
        sa.Column("report_document_id", sa.String(), nullable=False, server_default=""),
        sa.Column("critical_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("critical_note", sa.String(500), nullable=False, server_default=""),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_care_lab_orders_patient_id", "care_lab_orders", ["patient_id"])
    op.create_index("ix_care_lab_orders_lab_id", "care_lab_orders", ["lab_id"])
    op.create_index("ix_care_lab_orders_prescription_id", "care_lab_orders", ["prescription_id"])
    op.create_index("ix_care_lab_orders_ordered_by", "care_lab_orders", ["ordered_by"])
    op.create_index("ix_care_lab_orders_sample_id", "care_lab_orders", ["sample_id"])
    op.create_index("ix_care_lab_orders_status", "care_lab_orders", ["status"])
    op.create_index("ix_care_lab_orders_critical_flag", "care_lab_orders", ["critical_flag"])
    op.create_index("ix_care_lab_orders_created_at", "care_lab_orders", ["created_at"])


def downgrade() -> None:
    op.drop_table("care_lab_orders")
    op.drop_table("care_dispenses")
    op.drop_table("care_prescription_items")
    op.drop_table("care_prescriptions")
    op.drop_table("care_service_providers")
    op.drop_table("care_crisis_events")
