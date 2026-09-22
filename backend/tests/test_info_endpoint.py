import os
import pytest
from fastapi.testclient import TestClient
import importlib
import backend.app.main

def get_client(env_overrides=None, env_to_unset=None):
    """Create a TestClient with the given environment overrides.
    env_overrides: dict of environment variables to set
    env_to_unset: list of environment variables to unset (after setting overrides)
    Returns a tuple (client, old_env) where old_env is a copy of the environment before changes.
    """
    # Backup the current environment
    old_env = dict(os.environ)
    # Apply overrides
    if env_overrides:
        for k, v in env_overrides.items():
            os.environ[k] = v
    # Unset the specified variables
    if env_to_unset:
        for k in env_to_unset:
            if k in os.environ:
                del os.environ[k]
    # Reload the module to pick up the new environment
    importlib.reload(backend.app.main)
    from backend.app.main import app
    client = TestClient(app)
    return client, old_env

def test_info_endpoint_returns_expected_fields():
    """Happy-path: all env vars provided."""
    client, old_env = get_client(
        env_overrides={
            "APP_VERSION": "1.2.3-test",
            "APP_ENV": "testing",
            "GIT_COMMIT": "abcdef1234567890",
        },
        env_to_unset=[]  # we are setting all three, so none to unset
    )
    try:
        response = client.get("/api/info")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Studentkare Care API"
        assert data["version"] == "1.2.3-test"
        assert data["environment"] == "testing"
        assert data["commit"] == "abcdef1234567890"
    finally:
        # Restore environment
        for k in list(os.environ.keys()):
            if k not in old_env:
                del os.environ[k]
        for k, v in old_env.items():
            os.environ[k] = v
        # Reload module to restore original state
        importlib.reload(backend.app.main)

def test_info_endpoint_missing_env_defaults():
    """When env vars are missing, the defaults from main.py should be used."""
    client, old_env = get_client(
        env_overrides={},  # do not set any overrides
        env_to_unset=["APP_VERSION", "APP_ENV", "GIT_COMMIT"]  # unset the three we care about
    )
    try:
        response = client.get("/api/info")
        assert response.status_code == 200
        data = response.json()
        # defaults defined in main.py: APP_VERSION = os.getenv("APP_VERSION", "dev")
        assert data["version"] == "dev"
        assert data["environment"] == "development"
        assert data["commit"] == "unknown"
    finally:
        # Restore environment
        for k in list(os.environ.keys()):
            if k not in old_env:
                del os.environ[k]
        for k, v in old_env.items():
            os.environ[k] = v
        # Reload module to restore original state
        importlib.reload(backend.app.main)

def test_info_endpoint_partial_env():
    """Test when some env vars are set and some are missing."""
    client, old_env = get_client(
        env_overrides={
            "APP_VERSION": "partial-version",
            # APP_ENV is not set
            "GIT_COMMIT": "partial-commit",
        },
        env_to_unset=["APP_ENV"]  # unset APP_ENV to ensure it's missing
    )
    try:
        response = client.get("/api/info")
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "partial-version"
        assert data["environment"] == "development"  # default
        assert data["commit"] == "partial-commit"
    finally:
        # Restore environment
        for k in list(os.environ.keys()):
            if k not in old_env:
                del os.environ[k]
        for k, v in old_env.items():
            os.environ[k] = v
        importlib.reload(backend.app.main)
