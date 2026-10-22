#!/usr/bin/env python3
"""Every environment variable the app reads must reach production.

Finds the variables the backend reads (os.getenv / os.environ, and any helper
function that passes its own argument to them, e.g. ``_bounded_int("DB_POOL_SIZE", ...)``)
and the VITE_* variables the web build reads, then checks that each one is
declared in BOTH production deploy paths:

  backend  docker-compose.prod.yml   services.backend.environment and services.worker.environment
           Helm chart                the rendered backend and worker Deployments (env + envFrom
                                     ConfigMap), rendered with every backend.env/backend.secrets
                                     value filled in; without `helm` on PATH, the values keys
  web      deploy/Dockerfile ARG, release.yml build-args, docker-compose.prod.yml frontend build args

Variables that must not or need not be set in production are listed, with a
reason, in scripts/ops/env-passthrough.json. A retired variable listed there
fails the check if any production config still sets it.

Usage: python3 scripts/ops/check-env-passthrough.py [--list]
Exit 0 when nothing is missing, 1 otherwise. Needs PyYAML.
"""
from __future__ import annotations

import ast
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
CHART = ROOT / "deploy" / "helm" / "studentkare"
CHART_VALUES = CHART / "values" / "production.yaml"
COMPOSE_PROD = ROOT / "docker-compose.prod.yml"
FRONTEND_DOCKERFILE = ROOT / "deploy" / "Dockerfile"
RELEASE_WORKFLOW = ROOT / ".github" / "workflows" / "release.yml"
CONFIG = Path(__file__).with_name("env-passthrough.json")

BACKEND_SKIP_DIRS = {"tests", "__pycache__", "node_modules"}
ENV_NAME = re.compile(r"^[A-Z][A-Z0-9_]*$")


# --- backend --------------------------------------------------------------

def _is_env_read(call: ast.Call) -> bool:
    """os.getenv(x) / os.environ.get(x) / environ.get(x) / getenv(x)."""
    f = call.func
    if isinstance(f, ast.Attribute) and f.attr == "getenv":
        return True
    if isinstance(f, ast.Name) and f.id == "getenv":
        return True
    if isinstance(f, ast.Attribute) and f.attr == "get":
        v = f.value
        return (isinstance(v, ast.Attribute) and v.attr == "environ") or (isinstance(v, ast.Name) and v.id == "environ")
    return False


def _is_environ_subscript(node: ast.Subscript) -> bool:
    v = node.value
    return (isinstance(v, ast.Attribute) and v.attr == "environ") or (isinstance(v, ast.Name) and v.id == "environ")


def _env_key_node(node: ast.AST) -> ast.AST | None:
    if isinstance(node, ast.Call) and _is_env_read(node) and node.args:
        return node.args[0]
    if isinstance(node, ast.Subscript) and _is_environ_subscript(node):
        return node.slice
    return None


def _literal(node: ast.AST | None) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str) and ENV_NAME.match(node.value):
        return node.value
    return None


def _python_files():
    for path in sorted(BACKEND.rglob("*.py")):
        if BACKEND_SKIP_DIRS.intersection(path.relative_to(BACKEND).parts):
            continue
        yield path


def backend_env_reads(dynamic_allowed: set[str]) -> tuple[dict[str, list[str]], list[str]]:
    """{VAR: [file:line, ...]} and a list of unresolved dynamic reads."""
    trees = {p: ast.parse(p.read_text(encoding="utf-8"), filename=str(p)) for p in _python_files()}

    # Pass 1: helpers that hand one of their own parameters to an env read.
    helpers: dict[str, int] = {}
    helper_sites: set[tuple[Path, int]] = set()
    for path, tree in trees.items():
        for fn in ast.walk(tree):
            if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            params = [a.arg for a in fn.args.posonlyargs + fn.args.args]
            for node in ast.walk(fn):
                key = _env_key_node(node)
                if isinstance(key, ast.Name) and key.id in params:
                    helpers[fn.name] = params.index(key.id)
                    helper_sites.add((path, node.lineno))

    found: dict[str, list[str]] = {}
    dynamic: list[str] = []
    for path, tree in trees.items():
        rel = path.relative_to(BACKEND).as_posix()
        # Module constants such as URL_ENV = "LIVEKIT_URL", then os.getenv(URL_ENV).
        constants = {
            t.id: node.value.value
            for node in tree.body if isinstance(node, ast.Assign) and _literal(node.value)
            for t in node.targets if isinstance(t, ast.Name)
        }
        enclosing: dict[int, str] = {}
        for fn in ast.walk(tree):
            if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for node in ast.walk(fn):
                    if hasattr(node, "lineno"):
                        enclosing.setdefault(node.lineno, fn.name)
        for node in ast.walk(tree):
            key = _env_key_node(node)
            if key is not None:
                name = _literal(key) or (constants.get(key.id) if isinstance(key, ast.Name) else None)
                if name:
                    found.setdefault(name, []).append(f"{rel}:{node.lineno}")
                elif (path, node.lineno) not in helper_sites:
                    where = f"{rel}:{enclosing.get(node.lineno, '<module>')}"
                    if where not in dynamic_allowed:
                        dynamic.append(f"{rel}:{node.lineno} ({where})")
                continue
            if isinstance(node, ast.Call):
                fname = node.func.id if isinstance(node.func, ast.Name) else (
                    node.func.attr if isinstance(node.func, ast.Attribute) else None)
                if fname in helpers and len(node.args) > helpers[fname]:
                    name = _literal(node.args[helpers[fname]])
                    if name:
                        found.setdefault(name, []).append(f"{rel}:{node.lineno}")
    return found, dynamic


# --- web build ------------------------------------------------------------

VITE_READ = re.compile(r"(?:import\.meta\.env\.|read\(\s*['\"])(VITE_[A-Z0-9_]+)")


def frontend_env_reads() -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for path in sorted((ROOT / "src").rglob("*")):
        if path.suffix not in {".ts", ".tsx"} or "__tests__" in path.parts or ".test." in path.name:
            continue
        if path.name.endswith(".d.ts"):
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for name in VITE_READ.findall(line):
                found.setdefault(name, []).append(f"{path.relative_to(ROOT).as_posix()}:{lineno}")
    return found


# --- native app (Expo / EAS) ----------------------------------------------

NATIVE_READ = re.compile(r"(?:process\.env\.|optionalEnv\(\s*['\"])([A-Z][A-Z0-9_]*[A-Z0-9])\b")


def native_env_reads() -> dict[str, list[str]]:
    """process.env.X in src/ (Metro inlines EXPO_PUBLIC_*) and app.config.ts's optionalEnv("X").
    These are set on the EAS build, not on the servers, so each must be classed in
    env-passthrough.json under nativeBuildTime (or dev/test only)."""
    found: dict[str, list[str]] = {}
    paths = [ROOT / "app.config.ts", *sorted((ROOT / "src").rglob("*"))]
    for path in paths:
        if not path.is_file() or path.suffix not in {".ts", ".tsx"} or "__tests__" in path.parts or ".test." in path.name:
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for name in NATIVE_READ.findall(line):
                found.setdefault(name, []).append(f"{path.relative_to(ROOT).as_posix()}:{lineno}")
    return found


# --- production configs ---------------------------------------------------

class _ComposeLoader(yaml.SafeLoader):
    """SafeLoader that accepts Compose's !reset / !override merge tags."""


def _compose_tag(loader: yaml.SafeLoader, _suffix: str, node: yaml.Node):
    if isinstance(node, yaml.MappingNode):
        return loader.construct_mapping(node, deep=True)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node, deep=True)
    return loader.construct_scalar(node)


_ComposeLoader.add_multi_constructor("!", _compose_tag)


def compose_prod() -> dict:
    return yaml.load(COMPOSE_PROD.read_text(encoding="utf-8"), Loader=_ComposeLoader)  # noqa: S506 — SafeLoader subclass


def compose_env(compose: dict, service: str) -> set[str]:
    env = (compose.get("services", {}).get(service) or {}).get("environment") or {}
    if isinstance(env, list):
        return {item.split("=", 1)[0] for item in env}
    return set(env)


def helm_values() -> dict:
    return yaml.safe_load(CHART_VALUES.read_text(encoding="utf-8"))


def helm_env_rendered(values: dict) -> dict[str, set[str]] | None:
    """Env names each app Deployment gets, from `helm template`. None without helm."""
    helm = shutil.which("helm")
    if not helm:
        return None
    backend = values.get("backend", {})
    fill = {
        "backend": {
            "image": {"tag": "sha-envcheck"},
            "env": dict.fromkeys(backend.get("env") or {}, "env-check"),
            "secrets": dict.fromkeys(backend.get("secrets") or {}, "env-check"),
        },
        "frontend": {"image": {"tag": "sha-envcheck"}},
        "alertmanager": {"config": {"global": {"slack_api_url": "https://hooks.slack.test/envcheck"}}},
    }
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False) as fh:
        yaml.safe_dump(fill, fh)
        fill_path = fh.name
    out = subprocess.run(  # noqa: S603 — fixed argv, repo-local chart
        [helm, "template", "envcheck", str(CHART), "-f", str(CHART_VALUES), "-f", fill_path],
        capture_output=True, text=True, check=False,
    )
    Path(fill_path).unlink(missing_ok=True)
    if out.returncode != 0:
        sys.exit(f"helm template failed:\n{out.stderr}")
    docs = [d for d in yaml.safe_load_all(out.stdout) if d]
    configmaps = {d["metadata"]["name"]: set((d.get("data") or {})) for d in docs if d.get("kind") == "ConfigMap"}
    result: dict[str, set[str]] = {}
    for d in docs:
        if d.get("kind") != "Deployment" or d["metadata"]["name"] not in {"studentkare-backend", "studentkare-worker"}:
            continue
        container = d["spec"]["template"]["spec"]["containers"][0]
        names = {e["name"] for e in container.get("env") or []}
        for src in container.get("envFrom") or []:
            ref = src.get("configMapRef") or {}
            names |= configmaps.get(ref.get("name"), set())
        result[d["metadata"]["name"]] = names
    return result


def helm_env_static(values: dict) -> set[str]:
    backend = values.get("backend", {})
    names = set(backend.get("env") or {}) | set(backend.get("secrets") or {})
    for tpl in (CHART / "templates").glob("*.yaml"):
        names |= set(re.findall(r"-\s*name:\s*([A-Z][A-Z0-9_]+)\s*$", tpl.read_text(encoding="utf-8"), re.M))
        names |= set(re.findall(r"^  ([A-Z][A-Z0-9_]+):", tpl.read_text(encoding="utf-8"), re.M))  # ConfigMap data
    return names


# --- main -----------------------------------------------------------------

def main() -> int:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    backend_exempt = set(cfg.get("backendExempt", {}))
    frontend_exempt = set(cfg.get("frontendExempt", {}))
    retired = cfg.get("retired", {})
    problems: list[str] = []

    backend_reads, dynamic = backend_env_reads(set(cfg.get("backendDynamicReads", {})))
    for d in dynamic:
        problems.append(f"backend reads an env var by a computed name at {d}; read it by a literal "
                        "name or explain it under backendDynamicReads in env-passthrough.json")
    web_reads = frontend_env_reads()
    native_reads = native_env_reads()
    native_classed = set(cfg.get("nativeBuildTime", {}))
    for name in sorted(native_reads):
        if name not in native_classed:
            problems.append(f"{name} (read at {native_reads[name][0]}) is read by the native app/app.config.ts but not "
                            "classed under nativeBuildTime in env-passthrough.json (say where EAS sets it)")

    if "--list" in sys.argv:
        for name in sorted(backend_reads):
            print(f"backend {name:40} {'exempt' if name in backend_exempt else ''}")
        for name in sorted(web_reads):
            print(f"web     {name:40} {'exempt' if name in frontend_exempt else ''}")
        for name in sorted(native_reads):
            print(f"native  {name:40} {'EAS build' if name in native_classed else ''}")

    compose = compose_prod()
    values = helm_values()
    rendered = helm_env_rendered(values)
    if rendered is None:
        print("note: helm not on PATH; checking Helm values keys instead of the rendered chart")
        static = helm_env_static(values)
        rendered = {"studentkare-backend": static, "studentkare-worker": static}
    for deployment in ("studentkare-backend", "studentkare-worker"):
        if deployment not in rendered:
            problems.append(f"Helm: Deployment {deployment} not rendered")

    for name in sorted(backend_reads):
        if name in backend_exempt:
            continue
        where = backend_reads[name][0]
        for service in ("backend", "worker"):
            if name not in compose_env(compose, service):
                problems.append(f"{name} (read at {where}) missing from docker-compose.prod.yml services.{service}.environment")
        for deployment, names in rendered.items():
            if name not in names:
                problems.append(f"{name} (read at {where}) missing from Helm Deployment {deployment} "
                                "(add it to backend.env or backend.secrets in values/production.yaml)")

    dockerfile = FRONTEND_DOCKERFILE.read_text(encoding="utf-8")
    release = RELEASE_WORKFLOW.read_text(encoding="utf-8")
    frontend_build = (compose.get("services", {}).get("frontend") or {}).get("build") or {}
    compose_args = frontend_build.get("args") or {}
    compose_args = {a.split("=", 1)[0] for a in compose_args} if isinstance(compose_args, list) else set(compose_args)
    for name in sorted(web_reads):
        if name in frontend_exempt:
            continue
        where = web_reads[name][0]
        if not re.search(rf"^ARG {name}\b", dockerfile, re.M):
            problems.append(f"{name} (read at {where}) has no ARG in deploy/Dockerfile")
        if not re.search(rf"^\s*{name}=", release, re.M):
            problems.append(f"{name} (read at {where}) not passed in release.yml build-args")
        if name not in compose_args:
            problems.append(f"{name} (read at {where}) not passed in docker-compose.prod.yml frontend build args")

    prod_texts = {
        "docker-compose.prod.yml": COMPOSE_PROD.read_text(encoding="utf-8"),
        "deploy/helm/studentkare/values/production.yaml": CHART_VALUES.read_text(encoding="utf-8"),
        ".env.prod.example": (ROOT / ".env.prod.example").read_text(encoding="utf-8"),
    }
    prod_texts.update({tpl.relative_to(ROOT).as_posix(): tpl.read_text(encoding="utf-8")
                       for tpl in (CHART / "templates").glob("*")})
    for name, why in retired.items():
        for label, text in prod_texts.items():
            if re.search(rf"\b{name}\b", text):
                problems.append(f"{name} is retired ({why}) but {label} still sets it")

    if problems:
        print(f"env passthrough: {len(problems)} problem(s)")
        for p in problems:
            print(f"  - {p}")
        return 1
    print(f"env passthrough: OK ({len(backend_reads)} backend, {len(web_reads)} web and "
          f"{len(native_reads)} native/EAS build-time variables; "
          f"{len(backend_exempt)} + {len(frontend_exempt)} exempt with reasons)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
