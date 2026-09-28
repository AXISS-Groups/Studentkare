"""The migration chain, checked without a Postgres to run it against.

These exist because the test suite builds its schema with
`Base.metadata.create_all()` and never applies a migration, so the models and
the migrations could drift arbitrarily far apart while every other test passed.
Production is the opposite: app/main.py calls run_migrations() when
APP_ENV == "production" and never calls create_all. So the only place the
migrations are exercised is the one place a failure is expensive.

Two real defects were found this way, both pre-existing:

  * run_migrations() looked for backend/alembic.ini. db854c0 moved that file
    under config/ and did not update this module, so the call raised
    FileNotFoundError — in the production startup path, meaning the app failed
    to boot rather than merely skipping migrations.
  * care_blood_donors and care_blood_sos_requests were declared by models and
    written to by POST /blood/donors, and no migration created them.
"""
import glob
import re
from collections import Counter
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
VERSIONS = sorted(glob.glob(str(BACKEND / "alembic" / "versions" / "*.py")))


def revisions() -> dict[str, tuple[str | None, str]]:
    found: dict[str, tuple[str | None, str]] = {}
    for path in VERSIONS:
        text = Path(path).read_text()
        rev = re.search(r'^revision\s*=\s*["\']([^"\']+)', text, re.M)
        down = re.search(r'^down_revision\s*=\s*(?:["\']([^"\']+)["\']|None)', text, re.M)
        if rev:
            found[rev.group(1)] = (down.group(1) if down and down.group(1) else None,
                                   Path(path).name)
    return found


class TestTheChain:
    def test_there_are_migrations(self):
        assert len(revisions()) >= 10

    def test_exactly_one_head(self):
        # Two heads make `alembic upgrade head` fail outright, and the failure
        # only appears wherever migrations actually run — production.
        revs = revisions()
        parents = Counter(down for down, _ in revs.values())
        heads = [r for r in revs if r not in parents]
        assert len(heads) == 1, f"expected one head, found {heads}"

    def test_exactly_one_root(self):
        roots = [r for r, (down, _) in revisions().items() if down is None]
        assert len(roots) == 1, f"expected one root, found {roots}"

    def test_no_dangling_parent(self):
        revs = revisions()
        dangling = [(r, down) for r, (down, _) in revs.items() if down and down not in revs]
        assert dangling == [], f"down_revision points at a missing revision: {dangling}"

    def test_no_duplicate_revision_ids(self):
        ids = []
        for path in VERSIONS:
            match = re.search(r'^revision\s*=\s*["\']([^"\']+)', Path(path).read_text(), re.M)
            if match:
                ids.append(match.group(1))
        assert len(ids) == len(set(ids))


class TestTheRunnerCanFindItsConfig:
    def test_alembic_ini_is_locatable(self):
        from services.migrations import _alembic_ini
        assert _alembic_ini().is_file()

    def test_it_reads_the_config_that_exists_on_disk(self):
        # The regression: the runner hardcoded a path that a config refactor had
        # moved, and nothing noticed because nothing runs migrations in tests.
        from services.migrations import _alembic_ini
        assert "script_location" in _alembic_ini().read_text()

    def test_production_startup_would_reach_the_database(self, monkeypatch):
        """Gets past config loading and fails on the connection, not the file.

        A FileNotFoundError here means production cannot boot.
        """
        from services.migrations import run_migrations
        monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@127.0.0.1:59999/none")
        with pytest.raises(Exception) as excinfo:
            run_migrations()
        assert not isinstance(excinfo.value, FileNotFoundError), excinfo.value

    def test_it_refuses_a_non_postgres_url(self, monkeypatch):
        from services.migrations import run_migrations
        monkeypatch.setenv("DATABASE_URL", "sqlite:///tmp.db")
        with pytest.raises(RuntimeError, match="Postgres-only"):
            run_migrations()


class TestModelsAndMigrationsAgree:
    def created_tables(self) -> set[str]:
        text = "\n".join(Path(p).read_text() for p in VERSIONS)
        made = set(re.findall(r"op\.create_table\(\s*[\"']([^\"']+)", text))
        made |= set(re.findall(r"CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z_]+)", text, re.I))
        return made

    def test_every_model_table_has_a_migration(self):
        """Production applies migrations only, so a table no migration makes
        does not exist there — however happily create_all conjures it in dev."""
        import core.billing_models  # noqa: F401
        import core.workflow_models  # noqa: F401
        from services.db_sql import Base

        missing = sorted(set(Base.metadata.tables) - self.created_tables())
        assert missing == [], f"declared by a model, created by no migration: {missing}"

    def test_the_blood_sos_tables_are_covered(self):
        # Named explicitly: POST /blood/donors writes to the first of these, and
        # neither existed in production.
        made = self.created_tables()
        assert "care_blood_donors" in made
        assert "care_blood_sos_requests" in made
