"""Seed explicitly-marked demo accounts and catalog. Local development only."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.db_sql import SessionLocal, create_all_tables


def main():
    if os.getenv("APP_ENV", "development") == "production":
        raise SystemExit("Demo seeding is refused in production. No changes were made.")
    from services.demo_seed import (
        DEMO_ADMIN,
        DEMO_ADMIN_PHONE,
        DEMO_STUDENT,
        DEMO_STUDENT_PHONE,
        DEMO_VENDOR,
        DEMO_VENDOR_PHONE,
        seed_demo_data,
    )
    create_all_tables()
    with SessionLocal() as db:
        created = seed_demo_data(db)
    print(f"Demo accounts: {created['accounts']} created (student/admin/vendor already present are kept).")
    print(f"Demo catalog: {created['catalog']} sample entries created.")
    print(f"Landing content: {created['content']} sections, {created['articles']} articles created.")
    print("\n--- EMAIL CHANNEL DEMO ACCOUNTS ---")
    print(f"  Student:     {DEMO_STUDENT}")
    print(f"  Super-admin: {DEMO_ADMIN}")
    print(f"  Vendor:      {DEMO_VENDOR}")
    print("\n--- WHATSAPP / MOBILE CHANNEL DEMO ACCOUNTS ---")
    print(f"  Student:     {DEMO_STUDENT_PHONE}")
    print(f"  Super-admin: {DEMO_ADMIN_PHONE}")
    print(f"  Vendor:      {DEMO_VENDOR_PHONE}")
    print("\nVerification codes are printed to the server log when DEV_OTP_CONSOLE=true.")


if __name__ == "__main__":
    main()
