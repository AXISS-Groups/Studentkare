"""Publish the sample catalog and storefront content to the configured database.

Unlike ``scripts/seed_demo.py`` this is not restricted to development. It writes
only the provider vendor account, the catalog entries, and the landing-page
content — never the demo student or administrator accounts — so a deployed
environment can show a populated storefront. It is idempotent and refuses to run
without an explicit ``--confirm`` flag.

Usage:

    DATABASE_URL=postgresql://... backend/.venv/bin/python \
        backend/scripts/seed_catalog.py --confirm

Every catalog entry it creates is marked "Sample development entry". For real
inventory, create a VENDOR account and publish entries from the admin console
instead.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _display_target(database_url: str) -> str:
    """Return the host/database portion without leaking credentials."""
    return database_url.split("@", 1)[-1] if "@" in database_url else database_url


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed the sample catalog into DATABASE_URL.")
    parser.add_argument("--confirm", action="store_true",
                        help="Required acknowledgement that sample entries will be written to the configured database.")
    args = parser.parse_args(argv)
    if not args.confirm:
        raise SystemExit("Refusing to write without --confirm. Re-run with --confirm to proceed.")

    from services.db_sql import DATABASE_URL, SessionLocal, create_all_tables
    from services.demo_seed import DEMO_VENDOR, seed_catalog_data

    create_all_tables()
    with SessionLocal() as db:
        created = seed_catalog_data(db)

    print(f"Target database: {_display_target(DATABASE_URL)}")
    print(f"Provider accounts: {created['accounts']} created (vendor {DEMO_VENDOR}).")
    print(f"Catalog entries: {created['catalog']} created.")
    print(f"Landing content: {created['content']} sections, {created['articles']} articles created.")
    print("Existing rows are kept; re-running this command changes nothing.")
    print("For real inventory, create a VENDOR account and publish entries in the admin console.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
