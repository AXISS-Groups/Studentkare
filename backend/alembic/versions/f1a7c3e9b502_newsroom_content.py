"""Newsroom content module: categories, series, precision-gated auto posts, share counts.

* ``care_posts``: ``category_id``, ``series_id``, ``episode``; ``precision`` (percent, -1 when
  not scored), ``precision_report`` (per sentence) and ``hold_reason`` for auto drafts held
  for the super admin. Every existing row: no category, no series, not scored, not held.
* ``care_autopilot_items``: ``category_id`` (the aggregator's classification), ``series_id``
  (a series slot) and ``precision``.
* ``care_post_categories``, ``care_post_series``, ``care_post_stats``: platform plane. The
  default categories and the two built-in series are added by the app at start
  (services/newsroom_content.ensure_defaults), not here, so they live in one place.

Grants are re-applied (P23) so neither group role gets anything it should not.

Revision ID: f1a7c3e9b502
Revises: c4f8a2d6e913
Create Date: 2026-10-23
"""
import sqlalchemy as sa

from alembic import op

revision = "f1a7c3e9b502"
down_revision = "c4f8a2d6e913"
branch_labels = None
depends_on = None

POSTS = "care_posts"
ITEMS = "care_autopilot_items"
CATEGORIES = "care_post_categories"
SERIES = "care_post_series"
STATS = "care_post_stats"

POST_COLUMNS = (
    ("category_id", lambda: sa.Column("category_id", sa.String(40), nullable=False, server_default="")),
    ("series_id", lambda: sa.Column("series_id", sa.String(), nullable=False, server_default="")),
    ("episode", lambda: sa.Column("episode", sa.Integer(), nullable=False, server_default="0")),
    ("precision", lambda: sa.Column("precision", sa.Integer(), nullable=False, server_default="-1")),
    ("precision_report", lambda: sa.Column("precision_report", sa.JSON(), nullable=False, server_default=sa.text("'{}'"))),
    ("hold_reason", lambda: sa.Column("hold_reason", sa.String(20), nullable=False, server_default="")),
)
ITEM_COLUMNS = (
    ("category_id", lambda: sa.Column("category_id", sa.String(40), nullable=False, server_default="")),
    ("series_id", lambda: sa.Column("series_id", sa.String(), nullable=False, server_default="")),
    ("precision", lambda: sa.Column("precision", sa.Integer(), nullable=False, server_default="-1")),
)
POST_INDEXES = ("category_id", "series_id")


def _add_columns(bind, table: str, columns) -> None:
    present = {c["name"] for c in sa.inspect(bind).get_columns(table)}
    with op.batch_alter_table(table) as batch:
        for name, column in columns:
            if name not in present:
                batch.add_column(column())


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if POSTS in tables:
        _add_columns(bind, POSTS, POST_COLUMNS)
        indexes = {i["name"] for i in sa.inspect(bind).get_indexes(POSTS)}
        for name in POST_INDEXES:
            if f"ix_care_posts_{name}" not in indexes:
                op.create_index(f"ix_care_posts_{name}", POSTS, [name])
    if ITEMS in tables:
        _add_columns(bind, ITEMS, ITEM_COLUMNS)
        if "ix_care_autopilot_items_series_id" not in {i["name"] for i in sa.inspect(bind).get_indexes(ITEMS)}:
            op.create_index("ix_care_autopilot_items_series_id", ITEMS, ["series_id"])
    if CATEGORIES not in tables:
        op.create_table(
            "care_post_categories",
            sa.Column("id", sa.String(40), primary_key=True),
            sa.Column("name", sa.String(60), nullable=False),
            sa.Column("hue", sa.String(12), nullable=False, server_default="indigo"),
            sa.Column("icon", sa.String(40), nullable=False, server_default="file-text"),
            sa.Column("clinical", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("crisis_lines", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("hashtags", sa.JSON(), nullable=False),
            sa.Column("keywords", sa.JSON(), nullable=False),
            sa.Column("topics", sa.JSON(), nullable=False),
            sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("sort", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("updated_by", sa.String(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_post_categories_archived", CATEGORIES, ["archived"])
    if SERIES not in tables:
        op.create_table(
            "care_post_series",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("slug", sa.String(80), nullable=False),
            sa.Column("name", sa.String(80), nullable=False),
            sa.Column("summary", sa.String(300), nullable=False, server_default=""),
            sa.Column("category_id", sa.String(40), nullable=False, server_default=""),
            sa.Column("template", sa.String(20), nullable=False, server_default="SERIES_EPISODE"),
            sa.Column("hue", sa.String(12), nullable=False, server_default="teal"),
            sa.Column("autopilot_key", sa.String(20), nullable=False, server_default=""),
            sa.Column("episode_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("library", sa.JSON(), nullable=False),
            sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("sample", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("updated_by", sa.String(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_post_series_slug", SERIES, ["slug"], unique=True)
        op.create_index("ix_care_post_series_autopilot_key", SERIES, ["autopilot_key"])
    if STATS not in tables:
        op.create_table(
            "care_post_stats",
            sa.Column("post_id", sa.String(), primary_key=True),
            sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("shares", sa.JSON(), nullable=False),
        )

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    for table in (STATS, SERIES, CATEGORIES):
        if table in tables:
            op.drop_table(table)
    for table, columns in ((ITEMS, ITEM_COLUMNS), (POSTS, POST_COLUMNS)):
        if table not in tables:
            continue
        indexes = {i["name"] for i in sa.inspect(bind).get_indexes(table)}
        for name in ("category_id", "series_id"):
            index = f"ix_{table}_{name}"
            if index in indexes:
                op.drop_index(index, table_name=table)
        present = {c["name"] for c in sa.inspect(bind).get_columns(table)}
        with op.batch_alter_table(table) as batch:
            for name, _ in reversed(columns):
                if name in present:
                    batch.drop_column(name)
