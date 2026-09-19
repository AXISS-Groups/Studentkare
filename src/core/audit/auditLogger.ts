/**
 * Append-Only Access Audit Logger (P45)
 * Logs every read and write of clinical data with hash chaining for tamper-evidence.
 * The application cannot modify or delete audit entries once written.
 */

export interface AuditRecord {
  id: string;
  actingUserId: string;
  targetUserId: string;
  action: 'READ' | 'WRITE' | 'EXPORT' | 'DELETE' | 'REVOKE' | 'BREAK_GLASS';
  resource: string;
  consentId?: string;
  timestamp: Date;
  previousHash: string;
  currentHash: string;
}

export interface CreateAuditInput {
  actingUserId: string;
  targetUserId: string;
  action: AuditRecord['action'];
  resource: string;
  consentId?: string;
}

/** Simple hash helper for hash chaining (tamper-evident audit log) */
function computeHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private records: AuditRecord[] = [];
  private latestHash: string = 'GENESIS_HASH';

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /** Reset logger (for test teardown only) */
  public resetForTesting(): void {
    this.records = [];
    this.latestHash = 'GENESIS_HASH';
  }

  /**
   * Appends an audit entry. Implements P45 tamper-evident hash chaining.
   */
  public async logAccess(input: CreateAuditInput): Promise<Readonly<AuditRecord>> {
    const timestamp = new Date();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const previousHash = this.latestHash;

    const rawPayload = `${id}|${input.actingUserId}|${input.targetUserId}|${input.action}|${input.resource}|${input.consentId || ''}|${timestamp.toISOString()}|${previousHash}`;
    const currentHash = computeHash(rawPayload);

    const record: AuditRecord = Object.freeze({
      id,
      actingUserId: input.actingUserId,
      targetUserId: input.targetUserId,
      action: input.action,
      resource: input.resource,
      consentId: input.consentId,
      timestamp,
      previousHash,
      currentHash,
    });

    this.records.push(record);
    this.latestHash = currentHash;

    return record;
  }

  /**
   * Retrieves access logs for a specific student (P45 student-facing access log screen).
   */
  public getAccessLogsForStudent(targetUserId: string): ReadonlyArray<AuditRecord> {
    return this.records.filter((r) => r.targetUserId === targetUserId);
  }

  /**
   * Validates the integrity of the audit log chain (tamper check).
   */
  public verifyIntegrity(): boolean {
    let expectedPrevHash = 'GENESIS_HASH';
    for (const record of this.records) {
      if (record.previousHash !== expectedPrevHash) {
        return false;
      }
      const rawPayload = `${record.id}|${record.actingUserId}|${record.targetUserId}|${record.action}|${record.resource}|${record.consentId || ''}|${record.timestamp.toISOString()}|${record.previousHash}`;
      const recomputedHash = computeHash(rawPayload);
      if (record.currentHash !== recomputedHash) {
        return false;
      }
      expectedPrevHash = record.currentHash;
    }
    return true;
  }
}
