"""Audit L8: with COMPANY_ADDRESS / SUPPORT_PHONE unset, no invented address or phone is shown."""
import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def test_unset_company_details_are_empty():
    # A fresh interpreter, so the module-level defaults are read with the env unset.
    env = {k: v for k, v in os.environ.items() if k not in ("COMPANY_ADDRESS", "SUPPORT_PHONE")}
    out = subprocess.run(
        [sys.executable, "-c", "import json; from services.integration_config import public_config;"
                               "print(json.dumps(public_config()['platform']))"],
        cwd=BACKEND, env=env, capture_output=True, text=True, check=True).stdout
    platform = json.loads(out.strip().splitlines()[-1])
    assert platform["companyAddress"] == "" and platform["supportPhone"] == ""
    assert "Plot 42" not in out and "80080 00000" not in out
