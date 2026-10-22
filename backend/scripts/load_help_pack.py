"""Publish StudentKare's help pack for Agent Ayush and bring its index up to date.

The articles are ``backend/content/ayush_help/*.md`` (product help only, never
clinical advice). Idempotent: re-running publishes new or changed articles as the
next version and leaves everything else alone. Articles an admin edited or
unpublished in Super admin → Knowledge are skipped unless ``--force``.

Usage (on the server, with the app's environment):

    DATABASE_URL=postgresql://... backend/.venv/bin/python backend/scripts/load_help_pack.py --confirm
    ... --confirm --force      # also restore articles an admin edited or unpublished
    ... --check                # validate the articles only; writes nothing

The API also does this at startup unless AYUSH_HELP_PACK_AUTOLOAD=false.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _display_target(database_url: str) -> str:
    """Return the host/database portion without leaking credentials."""
    return database_url.split("@", 1)[-1] if "@" in database_url else database_url


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Publish the Ayush help pack into DATABASE_URL.")
    parser.add_argument("--confirm", action="store_true", help="Required to write to the configured database.")
    parser.add_argument("--force", action="store_true", help="Restore articles an admin edited or unpublished.")
    parser.add_argument("--check", action="store_true", help="Validate the articles and exit without writing.")
    args = parser.parse_args(argv)

    from services import help_pack
    if args.check:
        articles = help_pack.load_articles()
        for article in articles:
            help_pack.render(article)
        print(f"{len(articles)} help articles are valid.")
        return 0
    if not args.confirm:
        raise SystemExit("Refusing to write without --confirm. Re-run with --confirm to proceed.")

    from services.db_sql import DATABASE_URL, SessionLocal
    with SessionLocal() as db:
        result = help_pack.publish_help_pack(db, force=args.force)
    print(f"Target database: {_display_target(DATABASE_URL)}")
    print(f"Help articles: {result['articles']} in the pack · {result['created']} published · "
          f"{result['updated']} updated · {result['unchanged']} unchanged · {result['retired']} retired.")
    if result["skippedEdited"] or result["skippedWithdrawn"]:
        print(f"Left alone: {result['skippedEdited']} edited and {result['skippedWithdrawn']} unpublished by an admin "
              "(use --force to restore the pack's text).")
    print(f"Index: {result['indexed']} source(s) (re)indexed with {result['embedder']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
