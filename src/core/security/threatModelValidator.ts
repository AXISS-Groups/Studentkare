/**
 * Studentkare — P65 Threat Model & Risk Architecture Validator
 * Enforces per-module trust boundaries, threat-to-control mapping, and fail-closed security rules.
 */

export interface ThreatBoundary {
  boundaryId: string;
  name: string;
  sourceZone: 'CLIENT' | 'GATEWAY' | 'APPLICATION' | 'PARTNER';
  targetZone: 'GATEWAY' | 'APPLICATION' | 'DATABASE' | 'M18_SERVICE' | 'PARTNER';
  authEnforced: boolean;
  failClosed: boolean;
}

export interface SecurityControlMapping {
  threatId: string;
  category: 'STRIDE' | 'ABUSE_CASE' | 'BULK_EXFILTRATION' | 'PROMPT_INJECTION' | 'BOLA';
  targetModule: string;
  mitigationControl: string;
  testVerified: boolean;
  acceptedRiskOwner?: string;
}

export class ThreatModelValidator {
  private static instance: ThreatModelValidator;

  private boundaries: Map<string, ThreatBoundary> = new Map();
  private controlMappings: Map<string, SecurityControlMapping> = new Map();

  private constructor() {
    this.seedDefaultModel();
  }

  public static getInstance(): ThreatModelValidator {
    if (!ThreatModelValidator.instance) {
      ThreatModelValidator.instance = new ThreatModelValidator();
    }
    return ThreatModelValidator.instance;
  }

  private seedDefaultModel(): void {
    // Trust Boundaries (TB1 - TB5)
    this.registerBoundary({
      boundaryId: 'TB1',
      name: 'Client-to-Gateway',
      sourceZone: 'CLIENT',
      targetZone: 'GATEWAY',
      authEnforced: true,
      failClosed: true,
    });

    this.registerBoundary({
      boundaryId: 'TB2',
      name: 'Gateway-to-FastAPI',
      sourceZone: 'GATEWAY',
      targetZone: 'APPLICATION',
      authEnforced: true,
      failClosed: true,
    });

    this.registerBoundary({
      boundaryId: 'TB3',
      name: 'Application-to-Postgres',
      sourceZone: 'APPLICATION',
      targetZone: 'DATABASE',
      authEnforced: true,
      failClosed: true,
    });

    this.registerBoundary({
      boundaryId: 'TB4',
      name: 'Application-to-M18-Service',
      sourceZone: 'APPLICATION',
      targetZone: 'M18_SERVICE',
      authEnforced: true,
      failClosed: true,
    });

    this.registerBoundary({
      boundaryId: 'TB5',
      name: 'Application-to-Partner-API',
      sourceZone: 'APPLICATION',
      targetZone: 'PARTNER',
      authEnforced: true,
      failClosed: true,
    });

    // Seed Core Threat Mappings (P65 Scenario Mappings)
    this.registerControlMapping({
      threatId: 'T-01',
      category: 'STRIDE',
      targetModule: 'M01',
      mitigationControl: 'OTP rate limiting & lockout mechanism',
      testVerified: true,
    });

    this.registerControlMapping({
      threatId: 'T-02',
      category: 'ABUSE_CASE',
      targetModule: 'M01',
      mitigationControl: 'Offline fail-closed read-only fallback',
      testVerified: true,
    });

    this.registerControlMapping({
      threatId: 'T-03',
      category: 'BOLA',
      targetModule: 'M02',
      mitigationControl: 'Object-level ownership verification & RLS',
      testVerified: true,
    });

    this.registerControlMapping({
      threatId: 'T-08',
      category: 'BULK_EXFILTRATION',
      targetModule: 'M00_CORE',
      mitigationControl: 'Bulk retrieval threshold detection (>100 records/5min)',
      testVerified: true,
    });

    this.registerControlMapping({
      threatId: 'T-07',
      category: 'PROMPT_INJECTION',
      targetModule: 'M26_AI',
      mitigationControl: 'Executable AI Constitution Output Verification',
      testVerified: true,
    });
  }

  public registerBoundary(boundary: ThreatBoundary): void {
    if (!boundary.failClosed) {
      throw new Error(`[P65 Security Defect] Trust boundary ${boundary.boundaryId} must be fail-closed.`);
    }
    this.boundaries.set(boundary.boundaryId, boundary);
  }

  public registerControlMapping(mapping: SecurityControlMapping): void {
    if (!mapping.testVerified && !mapping.acceptedRiskOwner) {
      throw new Error(
        `[P65 Governance Defect] Threat ${mapping.threatId} must either be test-verified or have an assigned acceptedRiskOwner.`
      );
    }
    this.controlMappings.set(mapping.threatId, mapping);
  }

  public validateBulkRetrievalRequest(requestCount: number, timeWindowMinutes: number): { allowed: boolean; alertTriggered: boolean } {
    const isExceeded = requestCount > 100 && timeWindowMinutes <= 5;
    if (isExceeded) {
      return { allowed: false, alertTriggered: true };
    }
    return { allowed: true, alertTriggered: false };
  }

  public getBoundary(boundaryId: string): ThreatBoundary | undefined {
    return this.boundaries.get(boundaryId);
  }

  public getControlMapping(threatId: string): SecurityControlMapping | undefined {
    return this.controlMappings.get(threatId);
  }

  public verifyModelIntegrity(): boolean {
    if (this.boundaries.size < 5) return false;
    for (const boundary of this.boundaries.values()) {
      if (!boundary.failClosed || !boundary.authEnforced) {
        return false;
      }
    }
    return true;
  }
}
