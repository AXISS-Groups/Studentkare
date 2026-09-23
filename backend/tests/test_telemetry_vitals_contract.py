"""API Contract Unit Tests for POST /api/v1/telemetry/vitals.
Validates sensorAccuracyIndex field contract rules:
- Valid: 0.0 <= sensorAccuracyIndex <= 1.0
- Boundary: 0.0 (lower), 1.0 (upper)
- Invalid out-of-range: -0.01, 1.01
- Missing, Null, and Incorrect Type handling
"""
import pytest
from test_workflow_api import harness, register


def valid_vitals_payload(**kwargs):
    payload = {
        "deviceId": "BLE-SMART-PULSE-001",
        "heartRateBpm": 72.0,
        "spO2Percent": 98.0,
        "respirationRateRpm": 16.0,
        "systolicBp": 120.0,
        "diastolicBp": 80.0,
        "temperatureF": 98.6,
        "sensorAccuracyIndex": 0.95,
        "notes": "Normal baseline capture",
    }
    payload.update(kwargs)
    return payload


def test_telemetry_vitals_valid_payload(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload(sensorAccuracyIndex=0.95)
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["sensorAccuracyIndex"] == 0.95
    assert data["vitals"]["sensorAccuracyIndex"] == 0.95


def test_telemetry_vitals_lower_boundary(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload(sensorAccuracyIndex=0.0)
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["sensorAccuracyIndex"] == 0.0


def test_telemetry_vitals_upper_boundary(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload(sensorAccuracyIndex=1.0)
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["sensorAccuracyIndex"] == 1.0


def test_telemetry_vitals_out_of_range_lower_rejected(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload(sensorAccuracyIndex=-0.01)
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 422


def test_telemetry_vitals_out_of_range_upper_rejected(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload(sensorAccuracyIndex=1.01)
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 422


def test_telemetry_vitals_missing_field_rejected(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload()
    del payload["sensorAccuracyIndex"]
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 422


def test_telemetry_vitals_null_value_rejected(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload(sensorAccuracyIndex=None)
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 422


def test_telemetry_vitals_incorrect_type_rejected(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    payload = valid_vitals_payload(sensorAccuracyIndex="invalid_string_value")
    response = client.post("/api/v1/telemetry/vitals", json=payload, headers=headers)
    assert response.status_code == 422
