import { describe, it, expect } from 'vitest';
import { TelemetryVitalsPayload } from '../../types';

function validateTelemetryVitalsContract(payload: any): { isValid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'Payload must be an object' };
  }

  if (payload.sensorAccuracyIndex === undefined) {
    return { isValid: false, error: 'Missing required field: sensorAccuracyIndex' };
  }

  if (payload.sensorAccuracyIndex === null) {
    return { isValid: false, error: 'Null value not allowed for sensorAccuracyIndex' };
  }

  if (typeof payload.sensorAccuracyIndex !== 'number' || isNaN(payload.sensorAccuracyIndex)) {
    return { isValid: false, error: 'sensorAccuracyIndex must be a number' };
  }

  if (payload.sensorAccuracyIndex < 0.0 || payload.sensorAccuracyIndex > 1.0) {
    return { isValid: false, error: 'sensorAccuracyIndex out of range [0.0, 1.0]' };
  }

  return { isValid: true };
}

describe('Telemetry Vitals sensorAccuracyIndex Contract Test Suite', () => {
  const baseValidPayload: TelemetryVitalsPayload = {
    deviceId: 'BLE-SMART-PULSE-001',
    heartRateBpm: 72,
    spO2Percent: 98,
    respirationRateRpm: 16,
    systolicBp: 120,
    diastolicBp: 80,
    temperatureF: 98.6,
    sensorAccuracyIndex: 0.95,
  };

  it('accepts valid payload with sensorAccuracyIndex in range (0.95)', () => {
    const res = validateTelemetryVitalsContract(baseValidPayload);
    expect(res.isValid).toBe(true);
  });

  it('accepts lower boundary sensorAccuracyIndex (0.0)', () => {
    const res = validateTelemetryVitalsContract({ ...baseValidPayload, sensorAccuracyIndex: 0.0 });
    expect(res.isValid).toBe(true);
  });

  it('accepts upper boundary sensorAccuracyIndex (1.0)', () => {
    const res = validateTelemetryVitalsContract({ ...baseValidPayload, sensorAccuracyIndex: 1.0 });
    expect(res.isValid).toBe(true);
  });

  it('rejects out-of-bounds lower sensorAccuracyIndex (-0.01)', () => {
    const res = validateTelemetryVitalsContract({ ...baseValidPayload, sensorAccuracyIndex: -0.01 });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('out of range');
  });

  it('rejects out-of-bounds upper sensorAccuracyIndex (1.01)', () => {
    const res = validateTelemetryVitalsContract({ ...baseValidPayload, sensorAccuracyIndex: 1.01 });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('out of range');
  });

  it('rejects missing sensorAccuracyIndex field', () => {
    const payload: any = { ...baseValidPayload };
    delete payload.sensorAccuracyIndex;
    const res = validateTelemetryVitalsContract(payload);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Missing required field');
  });

  it('rejects null sensorAccuracyIndex value', () => {
    const res = validateTelemetryVitalsContract({ ...baseValidPayload, sensorAccuracyIndex: null });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Null value not allowed');
  });

  it('rejects incorrect type for sensorAccuracyIndex', () => {
    const res = validateTelemetryVitalsContract({ ...baseValidPayload, sensorAccuracyIndex: 'invalid_string' });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('must be a number');
  });
});
