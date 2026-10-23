"""Move catalogue product photos out of the clinical care_documents table.

Catalogue images were stored as rows in care_documents (title "Catalog Image -
…", category OTHER, owned by the uploading admin). That table is the clinical
record, so the image endpoints could not run as sk_commerce and marketplace
pictures sat beside lab reports. This creates the commerce-plane table
care_catalog_images, copies every catalogue image into it under the same id (so
care_catalog.image_id keeps pointing at it), and removes the copied rows from
care_documents.

Safe and idempotent:
- only documents that look like catalogue uploads (title prefix + OTHER) and
  that a catalogue row points at are copied — a clinical document is never
  pulled into the commerce plane, whatever image_id says;
- the copy skips ids already present, so a re-run copies nothing twice;
- a source document is deleted only once its copy exists and nothing else
  (record shares, intake, report reviews) references it;
- a catalogue row whose image_id points at anything else is cleared, so the
  public image endpoint can never serve a clinical document.

Revision ID: c2f8a1d6e4b7
Revises: f1a7c3e9b2d4
Create Date: 2026-10-17
"""
import sqlalchemy as sa

from alembic import op

revision = "c2f8a1d6e4b7"
down_revision = "f1a7c3e9b2d4"
branch_labels = None
depends_on = None

def upgrade() -> None:
    bind = op.get_bind()
    if "care_catalog_images" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "care_catalog_images",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("item_id", sa.String(), sa.ForeignKey("care_catalog.id"), nullable=False),
            sa.Column("filename", sa.String(200), nullable=False),
            sa.Column("mime_type", sa.String(100), nullable=False),
            sa.Column("content", sa.LargeBinary(), nullable=False),
            sa.Column("uploaded_by", sa.String(), nullable=False),
            sa.Column("created_at", sa.Float(), nullable=False),
        )
        op.create_index("ix_care_catalog_images_item_id", "care_catalog_images", ["item_id"])

    op.execute("""
        INSERT INTO care_catalog_images (id, item_id, filename, mime_type, content, uploaded_by, created_at)
        SELECT d.id, MIN(c.id), SUBSTR(d.filename, 1, 200), d.mime_type, d.content, d.account_id, d.created_at
        FROM care_catalog c JOIN care_documents d ON d.id = c.image_id
        WHERE d.title LIKE 'Catalog Image - %' AND d.category = 'OTHER'
          AND NOT EXISTS (SELECT 1 FROM care_catalog_images i WHERE i.id = d.id)
        GROUP BY d.id, d.filename, d.mime_type, d.content, d.account_id, d.created_at
    """)
    op.execute("""
        UPDATE care_catalog SET image_id = NULL, image_mime = NULL
        WHERE image_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM care_catalog_images i WHERE i.id = care_catalog.image_id)
    """)
    op.execute("""
        DELETE FROM care_documents
        WHERE id IN (SELECT i.id FROM care_catalog_images i)
          AND title LIKE 'Catalog Image - %' AND category = 'OTHER'
          AND NOT EXISTS (SELECT 1 FROM care_record_shares s WHERE s.document_id = care_documents.id)
          AND NOT EXISTS (SELECT 1 FROM care_document_intake n WHERE n.document_id = care_documents.id)
          AND NOT EXISTS (SELECT 1 FROM care_preventive_report_reviews r WHERE r.document_id = care_documents.id)
    """)

    from core.rule_l import apply_grants

    apply_grants(bind)   # P23: the new table ships with its grants


def downgrade() -> None:
    """Put the photos back in care_documents (as they were) and drop the table."""
    op.execute("""
        INSERT INTO care_documents (id, account_id, title, category, filename, mime_type, content, created_at)
        SELECT i.id, i.uploaded_by, SUBSTR('Catalog Image - ' || c.name, 1, 116), 'OTHER',
               i.filename, i.mime_type, i.content, i.created_at
        FROM care_catalog_images i JOIN care_catalog c ON c.id = i.item_id
        WHERE NOT EXISTS (SELECT 1 FROM care_documents d WHERE d.id = i.id)
          AND EXISTS (SELECT 1 FROM care_accounts a WHERE a.id = i.uploaded_by)
    """)
    op.execute("""
        UPDATE care_catalog SET image_id = NULL, image_mime = NULL
        WHERE image_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM care_documents d WHERE d.id = care_catalog.image_id)
    """)
    op.drop_index("ix_care_catalog_images_item_id", table_name="care_catalog_images")
    op.drop_table("care_catalog_images")
