"""The public plans page promises that a plan never changes the care (WebPlans, Tier 1).

"Crisis support, records, export and critical-result handling are the same on
every plan" is a claim the product must honour, so it is tested here, not left
to the page copy: the care paths never read billing state, and an account that
has never paid can still export everything it stored.
"""
import ast
from pathlib import Path

from test_workflow_api import harness, register  # noqa: F401  (pytest fixture)

BACKEND = Path(__file__).resolve().parents[1]

# The paths behind the page's "same on every plan" rows: crisis support, SOS and
# the emergency card, clinical results and their alerts.
CARE_MODULES = (
    "services/crisis_gate.py",
    "services/emergency_api.py",
    "services/clinical_api.py",
    "services/clinical_fulfilment.py",
    "services/alerts.py",
)
# The records export lives in the larger workflow router (which also hosts order
# payments), so only its handler is held to the rule.
EXPORT_MODULE, EXPORT_HANDLER = "services/workflow_api.py", "export_records"
BILLING_MARKERS = ("care_billing_", "effectivePlanId", "BillingSubscription", "billing.", "subscription")

BILLING_NAMES = ("billing", "billing_models", "payment_gateway", "razorpay_client")


def _imported_names(source: str) -> set[str]:
    names: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            names.update(alias.name.rsplit(".", 1)[-1] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                names.add(node.module.rsplit(".", 1)[-1])
            names.update(alias.name for alias in node.names)
    return names


def test_care_paths_never_import_billing():
    for rel in CARE_MODULES:
        source = (BACKEND / rel).read_text(encoding="utf-8")
        found = _imported_names(source) & set(BILLING_NAMES)
        assert not found, f"{rel} imports {sorted(found)}: a plan must never gate care"


def test_care_paths_never_read_subscription_state():
    for rel in CARE_MODULES:
        source = (BACKEND / rel).read_text(encoding="utf-8")
        found = [m for m in BILLING_MARKERS if m in source]
        assert not found, f"{rel} reads billing state {found}: a plan must never gate care"


def test_records_export_handler_never_reads_billing():
    source = (BACKEND / EXPORT_MODULE).read_text(encoding="utf-8")
    handler = next(n for n in ast.walk(ast.parse(source)) if isinstance(n, ast.FunctionDef) and n.name == EXPORT_HANDLER)
    body = ast.get_source_segment(source, handler) or ""
    assert "/records/export" in source and body
    found = [m for m in BILLING_MARKERS + ("payment", "plan") if m in body]
    assert not found, f"export_records reads {found}: exporting must never depend on a plan"


def test_an_account_that_never_paid_exports_everything(harness):  # noqa: F811
    client, _, codes = harness
    _, headers = register(client, codes, "neverpaid@example.test")
    assert client.get("/api/billing/me").json()["effectivePlanId"] == "FREE"
    exported = client.get("/api/records/export", headers=headers)
    assert exported.status_code == 200
    assert "documents" in exported.json()
