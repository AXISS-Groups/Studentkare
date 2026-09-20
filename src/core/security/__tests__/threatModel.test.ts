import { describe, it, expect, beforeEach } from 'vitest';
import { ThreatModelValidator } from '../threatModelValidator';

describe('ThreatModelValidator (P65 — Threat Model)', () => {
  let validator: ThreatModelValidator;

  beforeEach(() => {
    validator = ThreatModelValidator.getInstance();
  });

  it('verifies all 5 core trust boundaries are fail-closed and auth-enforced', () => {
    expect(validator.verifyModelIntegrity()).toBe(true);

    const tb1 = validator.getBoundary('TB1');
    expect(tb1).toBeDefined();
    expect(tb1?.failClosed).toBe(true);
    expect(tb1?.authEnforced).toBe(true);
  });

  it('rejects registering any trust boundary that does not fail closed (P65 Guardrail)', () => {
    expect(() => {
      validator.registerBoundary({
        boundaryId: 'TB_INVALID',
        name: 'Insecure Permissive Boundary',
        sourceZone: 'CLIENT',
        targetZone: 'APPLICATION',
        authEnforced: false,
        failClosed: false,
      });
    }).toThrow(/\[P65 Security Defect\]/);
  });

  it('detects and blocks bulk exfiltration attempt exceeding threshold (>100 records in 5 min)', () => {
    const normalReq = validator.validateBulkRetrievalRequest(25, 5);
    expect(normalReq.allowed).toBe(true);
    expect(normalReq.alertTriggered).toBe(false);

    const bulkExfiltration = validator.validateBulkRetrievalRequest(150, 2);
    expect(bulkExfiltration.allowed).toBe(false);
    expect(bulkExfiltration.alertTriggered).toBe(true);
  });

  it('requires an accepted risk owner if a threat control is not test-verified (P65 Governance Rule)', () => {
    expect(() => {
      validator.registerControlMapping({
        threatId: 'T-UNTESTED',
        category: 'STRIDE',
        targetModule: 'M99',
        mitigationControl: 'Manual inspection rule',
        testVerified: false,
      });
    }).toThrow(/\[P65 Governance Defect\]/);

    expect(() => {
      validator.registerControlMapping({
        threatId: 'T-ACCEPTED',
        category: 'STRIDE',
        targetModule: 'M99',
        mitigationControl: 'Manual inspection rule',
        testVerified: false,
        acceptedRiskOwner: 'lead_security_architect@studentkare.in',
      });
    }).not.toThrow();
  });
});
