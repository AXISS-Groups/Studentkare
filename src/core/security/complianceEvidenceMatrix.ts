/**
 * Studentkare — P78 Compliance Mapping & Evidence Matrix Engine
 * Maps security & privacy controls across DPDP Act 2023, ABDM HIU/HIP, ISO 27001 Annex A, and SOC 2.
 * Enforces P0 #6 Guardrail: Evidence, Never Assertion (No unbacked compliance claims).
 */

export type RegulatoryFramework = 'DPDP_ACT_2023' | 'ABDM_HIU_HIP' | 'ISO_27001' | 'SOC_2_TYPE_II';

export interface ComplianceControl {
  controlId: string;
  name: string;
  framework: RegulatoryFramework;
  promptId: string; // P0 - P80
  implementingModule: string;
  artefactPath: string; // Relative file path or test file proving control
  verificationStatus: 'VERIFIED_AUTOMATED' | 'VERIFIED_MANUAL' | 'GAP_REMEDIATION_PLANNED';
  owner: string;
  lastVerifiedDate: Date;
}

export type FrameworkEvidenceStatus = 'MAPPED_CONTROLS_EVIDENCED' | 'GAPS_OPEN' | 'NOT_ASSESSED' | 'NOT_APPLICABLE';

/** Frameworks with no integration behind them: there is no ABDM/ABHA integration (guardrail 6). */
const NOT_INTEGRATED: ReadonlySet<RegulatoryFramework> = new Set(['ABDM_HIU_HIP']);

export interface ProcurementResponsePack {
  platformName: string;
  architectureSummary: string;
  dataResidency: string;
  verifiedControlsCount: number;
  gapCount: number;
  subprocessors: string[];
  vdpUrl: string;
  /**
   * What the control inventory shows per framework — never a certification.
   * MAPPED_CONTROLS_EVIDENCED: every mapped control has a verified artefact.
   * GAPS_OPEN: at least one mapped control is a planned remediation.
   * NOT_ASSESSED: no control is mapped. NOT_APPLICABLE: no integration exists.
   */
  certificationStatus: Record<RegulatoryFramework, FrameworkEvidenceStatus>;
}

export class ComplianceEvidenceMatrix {
  private static instance: ComplianceEvidenceMatrix;
  private controls = new Map<string, ComplianceControl>();

  private constructor() {
    this.seedDefaultControlInventory();
  }

  public static getInstance(): ComplianceEvidenceMatrix {
    if (!ComplianceEvidenceMatrix.instance) {
      ComplianceEvidenceMatrix.instance = new ComplianceEvidenceMatrix();
    }
    return ComplianceEvidenceMatrix.instance;
  }

  public resetForTesting(): void {
    this.controls.clear();
    this.seedDefaultControlInventory();
  }

  private seedDefaultControlInventory(): void {
    // DPDP Act 2023 Controls
    this.registerControl({
      controlId: 'DPDP-01',
      name: 'Student Consent Architecture & Revocation',
      framework: 'DPDP_ACT_2023',
      promptId: 'P45',
      implementingModule: 'src/core/audit/auditLogger.ts',
      artefactPath: 'src/core/audit/__tests__/auditLogger.test.ts',
      verificationStatus: 'VERIFIED_AUTOMATED',
      owner: 'privacy-lead@studentkare.co',
      lastVerifiedDate: new Date('2026-09-20'),
    });

    this.registerControl({
      controlId: 'DPDP-02',
      name: 'Data Subject Erasure / Crypto-Shredding',
      framework: 'DPDP_ACT_2023',
      promptId: 'P44',
      implementingModule: 'src/core/security/secretManager.ts',
      artefactPath: 'src/core/security/__tests__/secretHygiene.test.ts',
      // Erasure now exists (backend/services/erasure.py, tests/test_erasure.py): deletion plus a
      // sealed, time-limited archive. That is not crypto-shredding, so this control stays a gap
      // until it is re-mapped and reviewed.
      verificationStatus: 'GAP_REMEDIATION_PLANNED',
      owner: 'data-eng-lead@studentkare.co',
      lastVerifiedDate: new Date('2026-09-20'),
    });

    // ABDM HIU/HIP Controls
    this.registerControl({
      controlId: 'ABDM-01',
      name: 'ABHA ID Encryption & Log Exclusion',
      framework: 'ABDM_HIU_HIP',
      promptId: 'P46',
      implementingModule: 'src/core/security/ciGuardrailLinter.ts',
      artefactPath: 'src/core/security/__tests__/ciGuardrails.test.ts',
      verificationStatus: 'VERIFIED_AUTOMATED',
      owner: 'abdm-integration-lead@studentkare.co',
      lastVerifiedDate: new Date('2026-09-20'),
    });

    // ISO 27001 Annex A / SOC 2 Controls
    this.registerControl({
      controlId: 'ISO-A8',
      name: 'BOLA / IDOR Object Level Access Control',
      framework: 'ISO_27001',
      promptId: 'P67',
      implementingModule: 'src/core/security/bolaGuard.ts',
      artefactPath: 'src/core/security/__tests__/apiSecurity.test.ts',
      verificationStatus: 'VERIFIED_AUTOMATED',
      owner: 'secops-lead@studentkare.co',
      lastVerifiedDate: new Date('2026-09-20'),
    });

    this.registerControl({
      controlId: 'SOC2-CC6',
      name: 'Bulk Access Anomaly Detection Engine',
      framework: 'SOC_2_TYPE_II',
      promptId: 'P75',
      implementingModule: 'src/core/security/securityDetectionEngine.ts',
      artefactPath: 'src/core/security/__tests__/detectionEngine.test.ts',
      verificationStatus: 'VERIFIED_AUTOMATED',
      owner: 'secops-lead@studentkare.co',
      lastVerifiedDate: new Date('2026-09-20'),
    });
  }

  public registerControl(control: ComplianceControl): void {
    // P0 #6 Guardrail: Every control MUST have an implementing module, artefact path, and named owner
    if (!control.artefactPath || !control.owner || !control.implementingModule) {
      throw new Error(
        `[P0 #6 / P78 Defect] Control ${control.controlId} missing required evidence artefact path or owner.`
      );
    }
    this.controls.set(control.controlId, control);
  }

  /**
   * Verifies that no compliance claims exist without valid verified evidence artefacts (P0 #6).
   */
  public verifyNoUnsubstantiatedClaims(claimedStatus: { claimText: string; controlId: string }[]): boolean {
    for (const claim of claimedStatus) {
      const control = this.controls.get(claim.controlId);
      if (!control || !control.artefactPath || control.verificationStatus === 'GAP_REMEDIATION_PLANNED') {
        throw new Error(
          `[P0 #6 / P78 Violation] Unsubstantiated compliance claim '${claim.claimText}' for control ${claim.controlId} without verified evidence artefact.`
        );
      }
    }
    return true;
  }

  /**
   * Generates institutional procurement security pack for university IT review.
   */
  /** Computed from the inventory, so a status can never say more than the evidence does. */
  private frameworkStatus(): Record<RegulatoryFramework, FrameworkEvidenceStatus> {
    const frameworks: RegulatoryFramework[] = ['DPDP_ACT_2023', 'ABDM_HIU_HIP', 'ISO_27001', 'SOC_2_TYPE_II'];
    const all = Array.from(this.controls.values());
    const status = {} as Record<RegulatoryFramework, FrameworkEvidenceStatus>;
    for (const framework of frameworks) {
      const mapped = all.filter((c) => c.framework === framework);
      status[framework] = NOT_INTEGRATED.has(framework)
        ? 'NOT_APPLICABLE'
        : mapped.length === 0
          ? 'NOT_ASSESSED'
          : mapped.some((c) => c.verificationStatus === 'GAP_REMEDIATION_PLANNED')
            ? 'GAPS_OPEN'
            : 'MAPPED_CONTROLS_EVIDENCED';
    }
    return status;
  }

  public generateProcurementPack(): ProcurementResponsePack {
    const verifiedList = Array.from(this.controls.values()).filter((c) => c.verificationStatus !== 'GAP_REMEDIATION_PLANNED');
    const gapList = Array.from(this.controls.values()).filter((c) => c.verificationStatus === 'GAP_REMEDIATION_PLANNED');

    return {
      platformName: 'Studentkare Campus Health Platform',
      architectureSummary: 'Student-owned health records platform built on MVVM architecture, fail-closed security gates, and Rule L clinical firewall.',
      dataResidency: 'Not asserted here: data residency depends on the deployment region, which this code cannot observe.',
      verifiedControlsCount: verifiedList.length,
      gapCount: gapList.length,
      subprocessors: ['AWS India (MeitY Empaneled Cloud)', 'Tata 1mg Diagnostic API', 'Twilio/Fast2SMS Gateway'],
      vdpUrl: 'https://studentkare.co/security.txt',
      certificationStatus: this.frameworkStatus(),
    };
  }

  public getControl(controlId: string): ComplianceControl | undefined {
    return this.controls.get(controlId);
  }
}
