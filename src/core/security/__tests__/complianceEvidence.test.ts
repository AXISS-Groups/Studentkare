import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceEvidenceMatrix } from '../complianceEvidenceMatrix';

describe('P78 — Compliance Mapping & Evidence Matrix', () => {
  let matrix: ComplianceEvidenceMatrix;

  beforeEach(() => {
    matrix = ComplianceEvidenceMatrix.getInstance();
    matrix.resetForTesting();
  });

  it('contains verified evidence controls across DPDP 2023, ABDM, ISO 27001, and SOC 2', () => {
    const dpdpControl = matrix.getControl('DPDP-01');
    expect(dpdpControl).toBeDefined();
    expect(dpdpControl?.framework).toBe('DPDP_ACT_2023');
    expect(dpdpControl?.artefactPath).toContain('auditLogger.test.ts');
    expect(dpdpControl?.owner).toBeDefined();

    const soc2Control = matrix.getControl('SOC2-CC6');
    expect(soc2Control).toBeDefined();
    expect(soc2Control?.artefactPath).toContain('detectionEngine.test.ts');
  });

  it('rejects registering a control missing an evidence artefact path or owner (P0 #6 Guardrail)', () => {
    expect(() => {
      matrix.registerControl({
        controlId: 'INVALID-01',
        name: 'Unsubstantiated Claim Control',
        framework: 'DPDP_ACT_2023',
        promptId: 'P99',
        implementingModule: 'src/fakeModule.ts',
        artefactPath: '', // MISSING ARTEFACT PATH!
        verificationStatus: 'VERIFIED_AUTOMATED',
        owner: 'security@studentkare.co',
        lastVerifiedDate: new Date(),
      });
    }).toThrow(/\[P0 #6 \/ P78 Defect\]/);
  });

  it('throws an error if an unsubstantiated compliance claim is asserted without evidence (P0 #6)', () => {
    expect(() => {
      matrix.verifyNoUnsubstantiatedClaims([
        { claimText: 'ABDM Certified Platform', controlId: 'NON_EXISTENT_CONTROL' },
      ]);
    }).toThrow(/\[P0 #6 \/ P78 Violation\]/);

    expect(
      matrix.verifyNoUnsubstantiatedClaims([
        { claimText: 'DPDP Act 2023 Aligned Consent Architecture', controlId: 'DPDP-01' },
      ])
    ).toBe(true);
  });

  it('generates institutional procurement security pack with Indian data residency details', () => {
    const pack = matrix.generateProcurementPack();

    expect(pack.platformName).toContain('Studentkare');
    expect(pack.dataResidency).toContain('Indian cloud regions (ap-south-1)');
    expect(pack.verifiedControlsCount).toBeGreaterThanOrEqual(5);
    expect(pack.subprocessors).toContain('AWS India (MeitY Empaneled Cloud)');
    expect(pack.certificationStatus.DPDP_ACT_2023).toBe('ALIGNED_EVIDENCE_HELD');
  });
});
