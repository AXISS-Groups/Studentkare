#!/usr/bin/env python3
"""Prometheus rules and Alertmanager config are valid, and Helm wires them up.

1. promtool check rules on deploy/alerts.yml and deploy/slo-alerts.yml, and
   promtool check config on deploy/prometheus.yml (compose).
2. amtool check-config on deploy/alertmanager.yml and deploy/alertmanager-prod.yml.
3. With helm: render the chart and check that
   - the prometheus-rules ConfigMap holds every rule file (non-empty, promtool-valid),
   - prometheus.yml's rule_files glob points at the directory the rules are mounted on,
   - the rendered alertmanager.yml is amtool-valid and its slack_api_url_file sits
     in the directory the Slack webhook Secret is mounted on.

Usage: python3 scripts/ops/check-monitoring.py
Needs promtool and amtool on PATH (CI downloads them from the GitHub releases),
helm for step 3, and PyYAML.
"""
from __future__ import annotations

import fnmatch
import posixpath
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "deploy"
CHART = DEPLOY / "helm" / "studentkare"
RULE_FILES = ["alerts.yml", "slo-alerts.yml"]

failures: list[str] = []


def run(*argv: str) -> subprocess.CompletedProcess:
    return subprocess.run(list(argv), capture_output=True, text=True, check=False)  # noqa: S603 — fixed tools


def check(label: str, *argv: str) -> None:
    out = run(*argv)
    status = "ok" if out.returncode == 0 else "FAILED"
    print(f"[{status}] {label}")
    if out.returncode != 0:
        failures.append(f"{label}:\n{out.stdout}{out.stderr}")


def tool(name: str) -> str:
    path = shutil.which(name)
    if not path:
        sys.exit(f"{name} not on PATH")
    return path


def mount_path(pod_spec: dict, volume_name: str) -> str | None:
    for container in pod_spec["containers"]:
        for mount in container.get("volumeMounts") or []:
            if mount["name"] == volume_name:
                return mount["mountPath"]
    return None


def main() -> int:
    promtool, amtool = tool("promtool"), tool("amtool")
    check("promtool check rules (deploy/)", promtool, "check", "rules", *[str(DEPLOY / f) for f in RULE_FILES])
    check("promtool check config deploy/prometheus.yml", promtool, "check", "config", str(DEPLOY / "prometheus.yml"))
    for name in ("alertmanager.yml", "alertmanager-prod.yml"):
        check(f"amtool check-config deploy/{name}", amtool, "check-config", str(DEPLOY / name))

    helm = shutil.which("helm")
    if not helm:
        print("note: helm not on PATH; skipped the rendered-chart checks")
    else:
        out = run(helm, "template", "monitoring-check", str(CHART), "-f", str(CHART / "values" / "production.yaml"),
                  "--set", "backend.image.tag=sha-check,frontend.image.tag=sha-check",
                  "--set", "backend.secrets.ALERTMANAGER_WEBHOOK_SECRET=check",
                  "--set", "alertmanager.config.global.slack_api_url=https://hooks.slack.test/check")
        if out.returncode != 0:
            failures.append(f"helm template:\n{out.stderr}")
        else:
            docs = [d for d in yaml.safe_load_all(out.stdout) if d]
            by = {(d["kind"], d["metadata"]["name"]): d for d in docs}
            with tempfile.TemporaryDirectory() as tmp:
                rules = by[("ConfigMap", "prometheus-rules")]["data"]
                for name in RULE_FILES:
                    body = (rules.get(name) or "").strip()
                    if not body:
                        failures.append(f"Helm prometheus-rules ConfigMap: {name} is empty (chart cannot read it)")
                        continue
                    (Path(tmp) / name).write_text(body + "\n", encoding="utf-8")
                    check(f"promtool check rules (Helm {name})", promtool, "check", "rules", str(Path(tmp) / name))

                prom_cfg = yaml.safe_load(by[("ConfigMap", "prometheus-config")]["data"]["prometheus.yml"])
                pod = by[("StatefulSet", "prometheus")]["spec"]["template"]["spec"]
                rules_dir = mount_path(pod, "rules")
                globs = prom_cfg.get("rule_files") or []
                matched = [g for g in globs if rules_dir and posixpath.dirname(g) == rules_dir
                           and all(fnmatch.fnmatch(f, posixpath.basename(g)) for f in RULE_FILES)]
                print(f"[{'ok' if matched else 'FAILED'}] Helm rule_files {globs} cover the rules mounted at {rules_dir}")
                if not matched:
                    failures.append(f"Helm: rule_files {globs} do not load the rules mounted at {rules_dir}")
                prom_path = Path(tmp) / "prometheus.yml"
                prom_path.write_text(yaml.safe_dump(prom_cfg), encoding="utf-8")
                check("promtool check config (Helm prometheus.yml)", promtool, "check", "config", "--syntax-only", str(prom_path))

                am_text = by[("ConfigMap", "alertmanager-config")]["data"]["alertmanager.yml"]
                am_path = Path(tmp) / "alertmanager.yml"
                am_path.write_text(am_text, encoding="utf-8")
                check("amtool check-config (Helm alertmanager.yml)", amtool, "check-config", str(am_path))
                url_file = (yaml.safe_load(am_text).get("global") or {}).get("slack_api_url_file", "")
                am_pod = by[("StatefulSet", "alertmanager")]["spec"]["template"]["spec"]
                secret_dir = mount_path(am_pod, "slack-webhook")
                items = next((v["secret"].get("items") or [] for v in am_pod["volumes"] if v["name"] == "slack-webhook"), [])
                wired = bool(secret_dir) and any(posixpath.join(secret_dir, i["path"]) == url_file for i in items)
                print(f"[{'ok' if wired else 'FAILED'}] Helm Slack webhook secret mounted at {url_file or '(no slack_api_url_file)'}")
                if not wired:
                    failures.append(f"Helm: slack_api_url_file {url_file!r} is not the mounted secret ({secret_dir}, {items})")

    if failures:
        print("\n".join(["", "monitoring config: FAILED", *failures]))
        return 1
    print("monitoring config: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
