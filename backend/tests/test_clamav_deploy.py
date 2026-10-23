"""Production runs a virus scanner, and the upload scanner client is wired to it.

Prescription uploads never skip the scan (services/rx_uploads.py), so without a
reachable clamd every prescription upload fails closed. The scanner's default
host is a Dokploy service name that exists in neither the compose file nor the
Helm chart; production must point CLAMAV_HOST at the clamav service it deploys.
"""
import importlib
import shutil
import socket
import struct
import subprocess
import threading
from pathlib import Path

import pytest
import yaml

from services import security_scanner

REPO = Path(__file__).resolve().parents[2]
COMPOSE_PROD = REPO / "docker-compose.prod.yml"
CHART = REPO / "deploy" / "helm" / "studentkare"


class _ComposeLoader(yaml.SafeLoader):
    """Accepts Compose's !reset / !override tags."""


_ComposeLoader.add_multi_constructor(
    "!", lambda loader, _tag, node: (
        loader.construct_mapping(node, deep=True) if isinstance(node, yaml.MappingNode)
        else loader.construct_sequence(node, deep=True) if isinstance(node, yaml.SequenceNode)
        else loader.construct_scalar(node)))


def _default(value: str) -> str:
    """'${CLAMAV_HOST:-clamav}' -> 'clamav'; a literal stays as it is."""
    value = str(value)
    if value.startswith("${") and ":-" in value:
        return value.split(":-", 1)[1].rstrip("}")
    return value


@pytest.fixture(scope="module")
def compose():
    return yaml.load(COMPOSE_PROD.read_text(encoding="utf-8"), Loader=_ComposeLoader)  # noqa: S506 — SafeLoader subclass


def test_prod_compose_runs_clamd_with_updates_health_and_limits(compose):
    clamav = compose["services"]["clamav"]
    assert clamav["image"].startswith("clamav/clamav:")
    assert not clamav["image"].endswith(":latest")
    assert clamav["environment"]["CLAMAV_NO_FRESHCLAMD"] == "false"  # freshclam keeps signatures current
    assert clamav["environment"]["CLAMAV_NO_CLAMD"] == "false"
    assert clamav["healthcheck"]["test"] == ["CMD", "clamdcheck.sh"]
    assert clamav["deploy"]["resources"]["limits"]["memory"]
    assert "studentkare" in clamav["networks"]


@pytest.mark.parametrize("service", ["backend", "worker"])
def test_prod_compose_points_the_scanner_at_the_clamav_service(compose, service):
    env = compose["services"][service]["environment"]
    assert _default(env["CLAMAV_HOST"]) == "clamav"
    assert _default(env["CLAMAV_PORT"]) == "3310"


@pytest.mark.skipif(shutil.which("helm") is None, reason="helm not installed (CI's ops-config job runs it)")
def test_helm_points_the_scanner_at_the_clamav_service():
    out = subprocess.run(  # noqa: S603 — fixed argv, repo-local chart
        [shutil.which("helm"), "template", "t", str(CHART), "-f", str(CHART / "values" / "production.yaml"),
         "--set", "backend.image.tag=sha-test,frontend.image.tag=sha-test",
         "--set", "backend.secrets.ALERTMANAGER_WEBHOOK_SECRET=test",
         "--set", "alertmanager.config.global.slack_api_url=https://hooks.slack.test/t"],
        capture_output=True, text=True, check=True,
    ).stdout
    docs = [d for d in yaml.safe_load_all(out) if d]
    config = next(d for d in docs if d["kind"] == "ConfigMap" and d["metadata"]["name"] == "studentkare-backend-config")
    service = next(d for d in docs if d["kind"] == "Service" and d["metadata"]["name"] == "clamav")
    assert config["data"]["CLAMAV_HOST"] == service["metadata"]["name"]
    assert config["data"]["CLAMAV_PORT"] == str(service["spec"]["ports"][0]["port"])
    deployment = next(d for d in docs if d["kind"] == "Deployment" and d["metadata"]["name"] == "clamav")
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    assert container["resources"]["limits"]["memory"]
    assert container["readinessProbe"]["exec"]["command"] == ["clamdcheck.sh"]


def _fake_clamd(reply: bytes):
    """A one-shot clamd on 127.0.0.1 that reads one INSTREAM and answers ``reply``."""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(("127.0.0.1", 0))
    server.listen(1)
    received = {}

    def serve():
        conn, _ = server.accept()
        with conn:
            data = b""
            while not data.endswith(struct.pack("!I", 0)):
                chunk = conn.recv(65536)
                if not chunk:
                    break
                data += chunk
            received["data"] = data
            conn.sendall(reply)
        server.close()

    thread = threading.Thread(target=serve, daemon=True)
    thread.start()
    return server.getsockname()[1], thread, received


def test_the_scanner_client_reads_its_address_from_the_environment(monkeypatch):
    port, thread, received = _fake_clamd(b"stream: OK\0")
    monkeypatch.setenv("CLAMAV_HOST", "127.0.0.1")
    monkeypatch.setenv("CLAMAV_PORT", str(port))
    monkeypatch.setenv("APP_ENV", "production")
    try:
        scanner = importlib.reload(security_scanner)
        assert (scanner.CLAMAV_HOST, scanner.CLAMAV_PORT) == ("127.0.0.1", port)
        # Prescriptions call it with no offline bypass; a reachable scanner lets them through.
        assert scanner.scan_file_for_viruses(b"%PDF-1.4 test", allow_offline_bypass=False) is True
        thread.join(timeout=5)
        assert received["data"].startswith(b"zINSTREAM\0")
    finally:
        monkeypatch.undo()
        importlib.reload(security_scanner)
