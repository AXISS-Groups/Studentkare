"""Model-built test schemas preserve the migration's pending-embedding state."""
import pytest
from sqlalchemy import create_engine, select

from core import workflow_models as M


@pytest.mark.parametrize("model, owner", [
    (M.KnowledgeChunk, {"source_id": "source"}),
    (M.PersonalDocumentChunk, {"document_id": "document", "account_id": "owner"}),
])
def test_a_chunk_can_wait_for_reindexing_without_a_vector(model, owner):
    engine = create_engine("sqlite://")
    table = model.__table__
    try:
        with engine.begin() as connection:
            table.create(connection)
            connection.execute(table.insert().values(
                id="chunk", **owner, content="Pending embedding fixture", vector=[0.0] * M.VECTOR_DIMENSIONS,
            ))
            # A migrated knowledge chunk has a NULL vector until explicit reindexing.
            # Use UPDATE so the insert's existing Python default does not mask NULL.
            connection.execute(table.update().where(table.c.id == "chunk").values(vector=None))
            assert connection.scalar(select(table.c.vector)) is None
    finally:
        engine.dispose()
