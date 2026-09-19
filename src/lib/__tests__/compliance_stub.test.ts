/**
 * Studentkare — Compliance Stub Assertion Test (Gate 0)
 * Asserts that compliance stubs return UNKNOWN and no static true boolean assertions exist in compliance views.
 */

import { describe, it, expect } from 'vitest';
import { evaluateComplianceAssertion } from '../complianceStub';

describe('Gate 0 Compliance Stub Test Suite', () => {
  it('evaluateComplianceAssertion must return status: "UNKNOWN" and verified: null', () => {
    const assertion = evaluateComplianceAssertion('Rule-K1', 'Database Plane Isolation');
    expect(assertion.status).toBe('UNKNOWN');
    expect(assertion.verified).toBeNull();
    expect(assertion.evidenceId).toBeNull();
    expect(assertion.notes).toContain('Pending M35 Incident Audit Ledger');
  });

  it('compliance stubs must never return hardcoded verified: true', () => {
    const assertion = evaluateComplianceAssertion('Rule-K4', 'Hash-Chained Audit Ledger');
    expect(assertion.verified).not.toBe(true);
  });
});
