"""Loopback-only E2E fixture server. Never imported by the application."""
import json
import os
import sys
import time
from pathlib import Path

if os.environ.get("WORKFLOW_E2E") != "1" or not os.environ.get("WORKFLOW_TEST_DATABASE"):
    raise SystemExit("This fixture server requires an explicitly configured isolated test database.")

os.environ["DATABASE_URL"] = f"sqlite:///{os.environ['WORKFLOW_TEST_DATABASE']}"
os.environ["ALLOWED_ORIGINS"] = "http://127.0.0.1:3001"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn
from app import main
from services import workflow_auth
from services.db_sql import SessionLocal, create_all_tables
from core.workflow_models import Account, CatalogEntry


def test_delivery(identifier, code, channel):
    # Transport test data over the child process pipe, never an HTTP bypass route.
    print("TEST_OTP " + json.dumps({"identifier": identifier, "code": code}), flush=True)
    return True


workflow_auth.deliver_code = test_delivery
workflow_auth.available_channels = lambda: ["EMAIL"]
main.available_channels = lambda: ["EMAIL"]
create_all_tables()
with SessionLocal() as db:
    for identifier, role, name in [
        ("admin@example.test", "SUPER_ADMIN", "Test Administrator"),
        ("vendor@example.test", "VENDOR", "Test Device Provider"),
        ("doctor@example.test", "NMC_DOCTOR", "Test Clinician"),
    ]:
        db.add(Account(id=role.lower(), identifier=identifier, channel="EMAIL", full_name=name, role=role, active=True, profile={}, created_at=time.time()))
    db.add(CatalogEntry(id="test-thermometer", provider_id="vendor", kind="product", name="Campus digital thermometer", brand="Fixture provider", category="devices", description="A catalog entry used only by the isolated browser test.", pack="1 device", price_paise=25000, stock=5, active=True, requires_prescription=False, preparation="Follow the supplied device manual."))
    db.commit()

uvicorn.run(main.app, host="127.0.0.1", port=8011, log_level="warning")
