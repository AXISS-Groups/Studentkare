"""Every backend module runs, or is listed here with the reason it does not (audit TD-08).

At the first audit 58 modules — career/hackathon "agents", a Mongo client, a
consent engine, an audit chain — sat in the tree with tests of their own while
nothing in the running app imported them, so they read as shipped safety controls
(AGENTS.md guardrail 3: a file nothing imports is a bug to report). This walks the
static import graph from the real entry points and fails on anything unreachable
that is not allowed below with a reason.

It also fails when a router is defined under services/ but never mounted, the bug
behind the old DPDP router that only a test ever mounted.
"""
import ast
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"tests", "alembic", "__pycache__", ".venv", "venv"}

# Processes started directly (Dockerfile CMD, compose/Helm `command`, operators).
# scripts.export_public_settings runs from `npm run settings:build|check` (CI step 1.6).
# scripts.team_accounts is run on the server after a deploy (docs/guides/team-accounts.md).
# scripts.seed_scenarios is run on a staging server only (docs/guides/staging-seed.md).
ENTRY_POINTS = ("app.main", "scripts.workflow_worker", "scripts.provision_account",
                "scripts.seed_catalog", "scripts.seed_demo", "scripts.export_public_settings",
                "scripts.team_accounts", "scripts.seed_scenarios")

# Unreachable on purpose. Each entry needs a reason; remove it when the reason goes.
ALLOWED_UNREACHABLE = {
    "services.abdm_gateway": "Kept for planned ABDM work (backend/ARCHITECTURE.md).",
}


def _modules() -> dict[str, Path]:
    out = {}
    for path in BACKEND.rglob("*.py"):
        rel = path.relative_to(BACKEND)
        if SKIP_DIRS & set(rel.parts):
            continue
        name = ".".join(rel.with_suffix("").parts)
        out[name.removesuffix(".__init__")] = path
    return out


def _imports(path: Path, module: str, known: dict[str, Path]) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    names: set[str] = set()
    package = module.split(".")[:-1] if path.name != "__init__.py" else module.split(".")
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            base = node.module or ""
            if node.level:
                parts = package[: len(package) - (node.level - 1)]
                base = ".".join(parts + ([base] if base else []))
            names.add(base)
            names.update(f"{base}.{alias.name}" for alias in node.names)
    found = set()
    for name in names:
        for candidate in (name, f"app.{name}"):
            while candidate:
                if candidate in known:
                    found.add(candidate)
                    break
                candidate = candidate.rpartition(".")[0]
    return found


def _reachable(known: dict[str, Path]) -> set[str]:
    seen: set[str] = set()
    stack = [m for m in ENTRY_POINTS if m in known]
    while stack:
        module = stack.pop()
        if module in seen:
            continue
        seen.add(module)
        parts = module.split(".")
        stack.extend(".".join(parts[:i]) for i in range(1, len(parts)) if ".".join(parts[:i]) in known)
        stack.extend(_imports(known[module], module, known) - seen)
    return seen


def test_every_backend_module_is_reachable_or_allowed():
    known = _modules()
    unreachable = set(known) - _reachable(known)
    unexplained = sorted(unreachable - set(ALLOWED_UNREACHABLE))
    assert not unexplained, (
        "Modules nothing in the running backend imports. Wire them into a live path "
        f"or delete them (and their tests): {unexplained}")


def test_allow_list_has_no_stale_entries():
    known = _modules()
    reachable = _reachable(known)
    stale = sorted(m for m in ALLOWED_UNREACHABLE if m not in known or m in reachable)
    assert not stale, f"Remove these from ALLOWED_UNREACHABLE: {stale}"


def test_every_services_router_is_mounted():
    main = (BACKEND / "app" / "main.py").read_text(encoding="utf-8")
    tree = ast.parse(main)
    imported_routers = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("services."):
            for alias in node.names:
                if alias.name == "router":
                    imported_routers[alias.asname or alias.name] = node.module
    mounted = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "attr", "") == "include_router" and node.args:
            arg = node.args[0]
            if isinstance(arg, ast.Name) and arg.id in imported_routers:
                mounted.add(imported_routers[arg.id])
    defined = set()
    for path in (BACKEND / "services").glob("*.py"):
        if any(isinstance(n, ast.Assign) and any(getattr(t, "id", "") == "router" for t in n.targets)
               and isinstance(n.value, ast.Call) and getattr(n.value.func, "id", "") == "APIRouter"
               for n in ast.parse(path.read_text(encoding="utf-8")).body):
            defined.add(f"services.{path.stem}")
    assert defined <= mounted, f"Routers defined but not mounted in app/main.py: {sorted(defined - mounted)}"
