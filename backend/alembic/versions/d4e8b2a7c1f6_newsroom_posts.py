"""The newsroom: News and Blog posts in the SK templates (care_posts, care_post_events, care_post_images).

Platform plane: editorial text the team writes, never about a student. A post
has a template (health tip, campus news, product update, press release, story),
a status (draft, scheduled, published, unpublished), a unique slug and, for a
health tip, the clinician approval that must still match its content before it
is public. Images placed in a post are stored here after a virus scan. The
event table is append-only (ids and content hashes, no text).

Grants are re-applied (P23) so neither group role gets anything it should not.

Revision ID: d4e8b2a7c1f6
Revises: c5f9d3e7a024
Create Date: 2026-10-23
"""
import sqlalchemy as sa

from alembic import op

revision = "d4e8b2a7c1f6"
down_revision = "c5f9d3e7a024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())
    if "care_posts" not in existing:
        op.create_table(
            "care_posts",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("slug", sa.String(80), nullable=False),
            sa.Column("template", sa.String(20), nullable=False),
            sa.Column("section", sa.String(8), nullable=False),
            sa.Column("title", sa.String(160), nullable=False),
            sa.Column("summary", sa.String(300), nullable=False, server_default=""),
            sa.Column("body", sa.JSON(), nullable=False),
            sa.Column("tags", sa.JSON(), nullable=False),
            sa.Column("cover_alt", sa.String(200), nullable=False, server_default=""),
            sa.Column("cover_art", sa.String(40), nullable=False, server_default=""),
            sa.Column("seo_title", sa.String(70), nullable=False, server_default=""),
            sa.Column("seo_description", sa.String(160), nullable=False, server_default=""),
            sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("author_id", sa.String(), nullable=False, server_default=""),
            sa.Column("status", sa.String(12), nullable=False, server_default="DRAFT"),
            sa.Column("publish_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("first_published_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("reviewed_by", sa.String(), nullable=True),
            sa.Column("reviewed_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("reviewed_hash", sa.String(64), nullable=False, server_default=""),
            sa.Column("sample", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_by", sa.String(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
            sa.Column("updated_by", sa.String(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Float(), nullable=False, server_default="0"),
            sa.CheckConstraint("status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED')", name="ck_care_posts_status"),
            sa.CheckConstraint("section IN ('BLOG', 'NEWS')", name="ck_care_posts_section"),
        )
        op.create_index("ix_care_posts_slug", "care_posts", ["slug"], unique=True)
        op.create_index("ix_care_posts_template", "care_posts", ["template"])
        op.create_index("ix_care_posts_section", "care_posts", ["section"])
        op.create_index("ix_care_posts_status", "care_posts", ["status"])
        op.create_index("ix_care_posts_publish_at", "care_posts", ["publish_at"])
    if "care_post_events" not in existing:
        op.create_table(
            "care_post_events",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("post_id", sa.String(), nullable=False),
            sa.Column("action", sa.String(24), nullable=False),
            sa.Column("actor_id", sa.String(), nullable=False, server_default=""),
            sa.Column("actor_role", sa.String(20), nullable=False, server_default=""),
            sa.Column("content_hash", sa.String(64), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_post_events_post_id", "care_post_events", ["post_id"])
        op.create_index("ix_care_post_events_created_at", "care_post_events", ["created_at"])
    if "care_post_images" not in existing:
        op.create_table(
            "care_post_images",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("post_id", sa.String(), nullable=False),
            sa.Column("filename", sa.String(200), nullable=False, server_default=""),
            sa.Column("mime_type", sa.String(40), nullable=False),
            sa.Column("content", sa.LargeBinary(), nullable=False),
            sa.Column("uploaded_by", sa.String(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Float(), nullable=False, server_default="0"),
        )
        op.create_index("ix_care_post_images_post_id", "care_post_images", ["post_id"])

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: new tables ship with their grants


def downgrade() -> None:
    op.drop_index("ix_care_post_images_post_id", table_name="care_post_images")
    op.drop_table("care_post_images")
    op.drop_index("ix_care_post_events_created_at", table_name="care_post_events")
    op.drop_index("ix_care_post_events_post_id", table_name="care_post_events")
    op.drop_table("care_post_events")
    for name in ("publish_at", "status", "section", "template"):
        op.drop_index(f"ix_care_posts_{name}", table_name="care_posts")
    op.drop_index("ix_care_posts_slug", table_name="care_posts")
    op.drop_table("care_posts")
