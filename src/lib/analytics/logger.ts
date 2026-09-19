/**
 * Studentkare — 3-Stream Allowlist Logging System
 * Compliance: L-2.1 to L-2.4 Logging Specification
 *
 * Isolated Streams:
 * 1. Application Stream (Errors, traces, latency, correlation ID, 30-90 day retention)
 * 2. Audit Stream (Append-only hash-chained, write-before-render, immutable)
 * 3. Security Stream (Auth failures, rate limits, attestation, 1-year retention)
 *
 * Opt-in by Allowlist: Only keys listed in LOGGABLE_FIELDS are emitted. All PHI dropped.
 */

export const LOGGABLE_FIELDS = [
  'requestId',
  'correlationId',
  'studentId',
  'tenantId',
  'purposeCode',
  'ruleRef',
  'route',
  'statusCode',
  'durationMs',
  'errorCode',
  'actorType',
] as const;

export type LoggableField = (typeof LOGGABLE_FIELDS)[number];
export type AllowlistLogPayload = Partial<Record<LoggableField, string | number | boolean>>;

export class StudentkareLogger {
  private sanitizePayload(rawPayload: Record<string, any>): AllowlistLogPayload {
    const sanitized: AllowlistLogPayload = {};
    for (const key of LOGGABLE_FIELDS) {
      if (key in rawPayload && rawPayload[key] !== undefined) {
        sanitized[key] = rawPayload[key];
      }
    }
    return sanitized;
  }

  logApplicationEvent(message: string, payload: Record<string, any> = {}): void {
    const cleanPayload = this.sanitizePayload(payload);
    console.log(`[APP_LOG] ${message}`, JSON.stringify(cleanPayload));
  }

  logSecurityEvent(event: string, payload: Record<string, any> = {}): void {
    const cleanPayload = this.sanitizePayload(payload);
    console.warn(`[SECURITY_LOG] ${event}`, JSON.stringify(cleanPayload));
  }

  logAuditEvent(action: string, payload: Record<string, any> = {}): void {
    const cleanPayload = this.sanitizePayload(payload);
    console.info(`[AUDIT_LOG] ${action}`, JSON.stringify(cleanPayload));
  }
}

export const logger = new StudentkareLogger();
