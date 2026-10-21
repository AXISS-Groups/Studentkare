"""India's Health Facility Registry (ABDM HFR): the care directory's connector stub.

The care directory lists only places someone has checked (services/care_directory.py).
HFR could one day suggest facilities for an admin to check, but no live lookup is
built: the registry's search contract and credentials flow have not been verified
against the real service from this codebase (AGENTS.md: never invent an API).

So this module only reports, honestly, one of two states:

* ``NOT_CONFIGURED`` — credentials are not set in Super admin → Integrations
  (``abdm_hfr``: enabled, registry_url, client_id, client_secret);
* ``NOT_BUILT`` — credentials are set, but the live search is not built yet.

It never returns a facility, never pretends to have reached HFR, and never adds
anything to the directory by itself.
"""
from __future__ import annotations

from services.integration_config import INTEGRATIONS_DB

PROVIDER = "abdm_hfr"
REQUIRED_FIELDS = ("registry_url", "client_id", "client_secret")

NOT_CONFIGURED = "NOT_CONFIGURED"
NOT_BUILT = "NOT_BUILT"


class RegistryUnavailable(Exception):
    """HFR cannot answer: not configured, or the live search is not built."""

    def __init__(self, state: str, message: str):
        super().__init__(message)
        self.state = state
        self.message = message


def missing_fields() -> list[str]:
    cfg = INTEGRATIONS_DB.get(PROVIDER, {})
    return [name for name in REQUIRED_FIELDS if not str(cfg.get(name) or "").strip()]


def configured() -> bool:
    cfg = INTEGRATIONS_DB.get(PROVIDER, {})
    return bool(cfg.get("enabled")) and not missing_fields()


def status() -> dict:
    """What the directory and the admin screens may say about HFR. No secret, ever."""
    if not configured():
        return {"provider": PROVIDER, "configured": False, "state": NOT_CONFIGURED,
                "message": "The Health Facility Registry is not configured. Set it up in Super admin → Integrations."}
    return {"provider": PROVIDER, "configured": True, "state": NOT_BUILT,
            "message": "Health Facility Registry credentials are set, but live facility search is not built yet. "
                       "Nothing is imported from it."}


def search_facilities(query: str, pincode: str = "") -> list[dict]:
    """Always raises: there is no live search to run. Callers report the state as given."""
    current = status()
    raise RegistryUnavailable(current["state"], current["message"])
