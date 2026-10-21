"""Blood group and allergies move to the clinical plane (care_clinical_profiles).

They were keys in ``care_accounts.profile`` (IDENTITY plane), so anything that
could read an account row could read them. This creates
``care_clinical_profiles`` (CLINICAL), copies every account's ``bloodGroup``
and ``allergies`` into it, and removes the two keys from the identity row.
``no_known_allergies`` is new and starts False for everyone: an empty stored
list never said "none", so it is not turned into one.

Downgrade writes the values back into ``care_accounts.profile`` and drops the
table. ``no_known_allergies`` has no identity-side equivalent and is lost on
downgrade (the list it implies is empty either way).

Grants are re-applied (P23) so sk_commerce has nothing on the new table.

Revision ID: a6c2e8d4f1b7
Revises: c3d7e2a9f4b1
Create Date: 2026-10-21
"""
import time

import sqlalchemy as sa

from alembic import op

revision = "a6c2e8d4f1b7"
down_revision = "c3d7e2a9f4b1"
branch_labels = None
depends_on = None

MOVED_KEYS = ("bloodGroup", "allergies")

accounts = sa.table("care_accounts", sa.column("id", sa.String()), sa.column("profile", sa.JSON()))
clinical = sa.table(
    "care_clinical_profiles",
    sa.column("account_id", sa.String()),
    sa.column("blood_group", sa.String()),
    sa.column("allergies", sa.JSON()),
    sa.column("no_known_allergies", sa.Boolean()),
    sa.column("updated_at", sa.Float()),
)


def _text_list(value) -> list[str]:
    """The stored allergies as a list of non-empty strings; anything else is not an answer."""
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def upgrade() -> None:
    op.create_table(
        "care_clinical_profiles",
        sa.Column("account_id", sa.String(), sa.ForeignKey("care_accounts.id"), primary_key=True),
        sa.Column("blood_group", sa.String(3), nullable=False, server_default=""),
        sa.Column("allergies", sa.JSON(), nullable=False),
        sa.Column("no_known_allergies", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
    )
    bind = op.get_bind()
    now = time.time()
    for account_id, profile in bind.execute(sa.select(accounts.c.id, accounts.c.profile)).all():
        if not isinstance(profile, dict) or not any(key in profile for key in MOVED_KEYS):
            continue
        blood_group = profile.get("bloodGroup")
        allergies = _text_list(profile.get("allergies"))
        if (isinstance(blood_group, str) and blood_group.strip()) or allergies:
            bind.execute(clinical.insert().values(
                account_id=account_id, blood_group=blood_group.strip() if isinstance(blood_group, str) else "",
                allergies=allergies, no_known_allergies=False, updated_at=now))
        rest = {key: value for key, value in profile.items() if key not in MOVED_KEYS}
        bind.execute(accounts.update().where(accounts.c.id == account_id).values(profile=rest))

    from core.rule_l import apply_grants

    apply_grants(bind)


def downgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.select(clinical.c.account_id, clinical.c.blood_group, clinical.c.allergies)).all()
    for account_id, blood_group, allergies in rows:
        profile = bind.execute(sa.select(accounts.c.profile).where(accounts.c.id == account_id)).scalar()
        restored = dict(profile) if isinstance(profile, dict) else {}
        restored.update(bloodGroup=blood_group or "", allergies=_text_list(allergies))
        bind.execute(accounts.update().where(accounts.c.id == account_id).values(profile=restored))
    op.drop_table("care_clinical_profiles")
