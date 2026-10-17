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

  it('generates a procurement pack whose statuses are computed from evidence', () => {
    const pack = matrix.generateProcurementPack();

    expect(pack.platformName).toContain('Studentkare');
    expect(pack.dataResidency).toMatch(/Not asserted/);
    // DPDP-02 (erasure) moved to a gap: the erasure router is not mounted.
    expect(pack.verifiedControlsCount).toBeGreaterThanOrEqual(4);
    expect(pack.gapCount).toBeGreaterThanOrEqual(1);
    expect(pack.subprocessors).toContain('AWS India (MeitY Empaneled Cloud)');
    // Computed from the inventory: erasure is an open gap, ABDM has no integration.
    expect(pack.certificationStatus.DPDP_ACT_2023).toBe('GAPS_OPEN');
    expect(pack.certificationStatus.ABDM_HIU_HIP).toBe('NOT_APPLICABLE');
    expect(pack.certificationStatus.SOC_2_TYPE_II).toBe('MAPPED_CONTROLS_EVIDENCED');
  });
});
