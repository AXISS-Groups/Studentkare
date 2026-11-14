"""SOS request receipts and one open alert per account.

Existing duplicate open alerts require operator review. Never close or delete
an emergency automatically to make the migration pass.
"""
import sqlalchemy as sa

from alembic import op

revision = "a8c4f2e6d190"
down_revision = "e7a3c1d9b250"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    duplicate = bind.execute(sa.text(
        "SELECT 1 FROM care_sos_alerts WHERE status IN ('ACTIVE', 'ACKNOWLEDGED') "
        "GROUP BY account_id HAVING COUNT(*) > 1 LIMIT 1"
    )).first()
    if duplicate:
        raise RuntimeError("Duplicate open SOS alerts require operator review before migration.")
    op.create_index("uq_care_sos_alerts_open_account", "care_sos_alerts", ["account_id"], unique=True,
                    postgresql_where=sa.text("status IN ('ACTIVE', 'ACKNOWLEDGED')"),
                    sqlite_where=sa.text("status IN ('ACTIVE', 'ACKNOWLEDGED')"))
    op.create_table(
        "care_sos_requests",
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
        sa.Column("request_id", sa.String(120), primary_key=True),
        sa.Column("alert_id", sa.String(), sa.ForeignKey("care_sos_alerts.id"), nullable=False),
    )
    op.create_index("ix_care_sos_requests_alert_id", "care_sos_requests", ["alert_id"])
    if bind.dialect.name == "postgresql":
        from core.rule_l import apply_grants

        apply_grants(bind)


def downgrade() -> None:
    op.drop_table("care_sos_requests")
    op.drop_index("uq_care_sos_alerts_open_account", table_name="care_sos_alerts")
