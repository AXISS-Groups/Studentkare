"""Merge the four branches that each started from the settings registry.

#145 (appearance), #146 (wellness logs), #147 (setup answers) and #148
(points and referrals) were each written on top of a7d3e9c1f5b2 and merged
separately, which left four heads and made `alembic upgrade head` fail.
This revision joins them; it changes no schema.

Revision ID: f1a9c3e5b7d2
Revises: a7d3e1c9b5f2, c3e252d528c4, d7a4c2e9f1b3, e4b8a1c6d293
Create Date: 2026-10-20
"""

revision = "f1a9c3e5b7d2"
down_revision = ("a7d3e1c9b5f2", "c3e252d528c4", "d7a4c2e9f1b3", "e4b8a1c6d293")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
