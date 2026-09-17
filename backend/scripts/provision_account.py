"""Provision an explicitly named staff account; no default credentials or role guessing."""
import argparse
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from core.workflow_models import Account
from services.db_sql import SessionLocal, create_all_tables
from services.workflow_auth import normalize_identifier


def main():
    parser = argparse.ArgumentParser(description="Create a staff account in the configured Studentkare database.")
    parser.add_argument("--identifier", required=True, help="Contact address the account holder controls")
    parser.add_argument("--channel", choices=["EMAIL", "WHATSAPP"], default="EMAIL")
    parser.add_argument("--name", required=True)
    parser.add_argument("--role", choices=["SUPER_ADMIN", "VENDOR", "NMC_DOCTOR", "CAMPUS_ADMIN"], default="SUPER_ADMIN")
    args = parser.parse_args()
    if not 2 <= len(args.name.strip()) <= 120:
        parser.error("Name must be between 2 and 120 characters.")
    identifier = normalize_identifier(args.identifier, args.channel)
    create_all_tables()
    with SessionLocal() as db:
        if db.scalar(select(Account).where(Account.identifier == identifier)):
            parser.exit(1, "An account already exists for this contact. No changes were made.\n")
        db.add(Account(id=str(uuid.uuid4()), identifier=identifier, channel=args.channel, full_name=args.name.strip(),
                       role=args.role, active=True, profile={}, created_at=time.time()))
        db.commit()
    print("Staff account created. Sign in by verifying the configured contact address.")


if __name__ == "__main__":
    main()
