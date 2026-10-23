"""Content autopilot: auto posts from official feeds and the weekly blog plan.

* ``care_posts.origin`` (MANUAL | AUTO), ``source_name``, ``source_url``,
  ``source_published_at``: an auto news post names the outside item it
  summarises, and the page shows "Source:" with its link. Every existing row is
  MANUAL with no source.
* ``care_autopilot_items``: each feed item or blog slot the autopilot saw, once
  (unique ``dedupe_key``), with what it did and why. Platform plane.
* ``care_autopilot_sources``: per-feed fetch health. Platform plane.

Grants are re-applied (P23) so neither group role gets anything it should not.

Revision ID: e7c3a9f1b204
Revises: e5c1a9d3f7b2
Create Date: 2026-10-23
"""
import sqlalchemy as sa

from alembic import op

revision = "e7c3a9f1b204"
down_revision = "e5c1a9d3f7b2"
branch_labels = None
depends_on = None

POSTS = "care_posts"
ITEMS = "care_autopilot_items"
SOURCES = "care_autopilot_sources"
POST_COLUMNS = ("origin", "source_name", "source_url", "source_published_at")


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if POSTS in tables:
        columns = {c["name"] for c in sa.inspect(bind).get_columns(POSTS)}
        with op.batch_alter_table(POSTS) as batch:
            if "origin" not in columns:
                batch.add_column(sa.Column("origin", sa.String(8), nullable=False, server_default="MANUAL"))
            if "source_name" not in columns:
                batch.add_column(sa.Column("source_name", sa.String(120), nullable=False, server_default=""))
            if "source_url" not in columns:
                batch.add_column(sa.Column("source_url", sa.String(1000), nullable=False, server_default=""))
            if "source_published_at" not in columns:
                batch.add_column(sa.Column("source_published_at", sa.Float(), nullable=False, server_default="0"))
        indexes = {i["name"] for i in sa.inspect(bind).get_indexes(POSTS)}
        if "ix_care_posts_origin" not in indexes:
            op.create_index("ix_care_posts_origin", POSTS, ["origin"])
    if ITEMS not in tables:
        op.create_table(
            "care_autopilot_items",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("lane", sa.String(8), nullable=False),
            sa.Column("dedupe_key", sa.String(64), nullable=False),
            sa.Column("source_id", sa.String(40), nullable=False, server_default=""),
            sa.Column("source_url", sa.String(1000), nullable=False, server_default=""),
            sa.Column("title", sa.String(300), nullable=False, server_default=""),
            sa.Column("excerpt", sa.String(2000), nullable=False, server_default=""),
            sa.Column("published_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("relevance", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("state", sa.String(8), nullable=False, server_default="SEEN"),
            sa.Column("reason", sa.String(200), nullable=False, server_default=""),
            sa.Column("topic", sa.String(60), nullable=False, server_default=""),
            sa.Column("slot_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("post_id", sa.String(), nullable=False, server_default=""),
            sa.Column("generator", sa.String(40), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
            sa.CheckConstraint("lane IN ('NEWS', 'BLOG')", name="ck_care_autopilot_items_lane"),
            sa.CheckConstraint("state IN ('SEEN', 'SKIPPED', 'POSTED', 'HELD', 'FAILED')",
                               name="ck_care_autopilot_items_state"),
        )
        op.create_index("ix_care_autopilot_items_dedupe_key", ITEMS, ["dedupe_key"], unique=True)
        for name in ("lane", "source_id", "state", "post_id", "created_at"):
            op.create_index(f"ix_care_autopilot_items_{name}", ITEMS, [name])
    if SOURCES not in tables:
        op.create_table(
            "care_autopilot_sources",
            sa.Column("source_id", sa.String(40), primary_key=True),
            sa.Column("last_fetch_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("last_ok_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("last_error", sa.String(200), nullable=False, server_default=""),
            sa.Column("last_items", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("failures", sa.Integer(), nullable=False, server_default="0"),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if SOURCES in tables:
        op.drop_table(SOURCES)
    if ITEMS in tables:
        for name in ("lane", "source_id", "state", "post_id", "created_at", "dedupe_key"):
            op.drop_index(f"ix_care_autopilot_items_{name}", table_name=ITEMS)
        op.drop_table(ITEMS)
    if POSTS in tables:
        indexes = {i["name"] for i in sa.inspect(bind).get_indexes(POSTS)}
        if "ix_care_posts_origin" in indexes:
            op.drop_index("ix_care_posts_origin", table_name=POSTS)
        columns = {c["name"] for c in sa.inspect(bind).get_columns(POSTS)}
        with op.batch_alter_table(POSTS) as batch:
            for name in reversed(POST_COLUMNS):
                if name in columns:
                    batch.drop_column(name)
