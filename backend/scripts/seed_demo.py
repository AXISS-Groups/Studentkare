"""Seed explicitly-marked demo accounts and catalog. Local development only."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.db_sql import SessionLocal, create_all_tables


def main():
    if os.getenv("APP_ENV", "development") == "production":
        raise SystemExit("Demo seeding is refused in production. No changes were made.")
    from services.demo_seed import DEMO_ADMIN, DEMO_STUDENT, DEMO_VENDOR, seed_demo_data
    create_all_tables()
    with SessionLocal() as db:
        created = seed_demo_data(db)
    print(f"Demo accounts: {created['accounts']} created (student/admin/vendor already present are kept).")
    print(f"Demo catalog: {created['catalog']} sample entries created.")
    print(f"Landing content: {created['content']} sections, {created['articles']} articles created.")
    print("Sign in with any of these contact addresses (EMAIL channel):")
    print(f"  student:     {DEMO_STUDENT}")
    print(f"  super-admin: {DEMO_ADMIN}")
    print(f"  vendor:      {DEMO_VENDOR}")
    print("Verification codes are delivered by the configured provider, or printed to")
    print("the server log when DEV_OTP_CONSOLE=true (local development only).")


if __name__ == "__main__":
    main()
