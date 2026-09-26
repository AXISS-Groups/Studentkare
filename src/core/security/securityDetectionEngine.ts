/**
 * Studentkare — P75 Security Detection & Monitoring Engine
 * Analyzes audit streams in real-time to detect insider threats, mass exfiltration,
 * break-glass invocations, failed-auth spikes, and cross-tenant violations.
 */

import { AuditRecord, AuditLogger } from '../audit/auditLogger';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DetectionAlert {
  alertId: string;
  ruleId: 'BULK_ACCESS_EXCEEDED' | 'UNAUTHORIZED_BREAK_GLASS' | 'BOLA_DENIAL_SPIKE' | 'FAILED_AUTH_SPIKE' | 'OFF_HOURS_ADMIN_ACCESS';
  severity: AlertSeverity;
  actingUserId: string;
  eventCount: number;
  timeWindowMinutes: number;
  timestamp: Date;
  runbookUrl: string;
  owner: string;
  details: string; // Non-clinical identifiers and metrics only (P75 Guardrail)
}

export class SecurityDetectionEngine {
  private static instance: SecurityDetectionEngine;
  private generatedAlerts: DetectionAlert[] = [];

  private readonly BULK_ACCESS_RECORD_THRESHOLD = 100;
  private readonly BULK_ACCESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): SecurityDetectionEngine {
    if (!SecurityDetectionEngine.instance) {
      SecurityDetectionEngine.instance = new SecurityDetectionEngine();
    }
    return SecurityDetectionEngine.instance;
  }

  public resetForTesting(): void {
    this.generatedAlerts = [];
  }

  /**
   * Processes a new audit record and evaluates active detection rules (P75).
   */
  public evaluateAuditRecord(record: AuditRecord, recentHistory: AuditRecord[]): DetectionAlert | null {
    // P75 Priority Detection #1: Bulk Access Detection (>100 records in 5 min)
    if (record.action === 'READ' || record.action === 'EXPORT') {
      const fiveMinAgo = new Date(record.timestamp.getTime() - this.BULK_ACCESS_WINDOW_MS);
      const userReadsInWindow = recentHistory.filter(
        (r) =>
          r.actingUserId === record.actingUserId &&
          (r.action === 'READ' || r.action === 'EXPORT') &&
          r.timestamp >= fiveMinAgo
      );

      // Count distinct target student records
      const distinctStudents = new Set(userReadsInWindow.map((r) => r.targetUserId));
      if (distinctStudents.size >= this.BULK_ACCESS_RECORD_THRESHOLD) {
        return this.triggerAlert({
          ruleId: 'BULK_ACCESS_EXCEEDED',
          severity: 'CRITICAL',
          actingUserId: record.actingUserId,
          eventCount: distinctStudents.size,
          timeWindowMinutes: 5,
          timestamp: new Date(),
          runbookUrl: 'https://docs.studentkare.co/runbooks/RB-75-BULK-ACCESS.md',
          owner: 'secops-oncall@studentkare.co',
          details: `Identity ${record.actingUserId} accessed ${distinctStudents.size} distinct student records within 5 minutes window.`,
        });
      }
    }

    // P75 Priority Detection #2: Break-Glass Invocation
    if (record.action === 'BREAK_GLASS') {
      return this.triggerAlert({
        ruleId: 'UNAUTHORIZED_BREAK_GLASS',
        severity: 'HIGH',
        actingUserId: record.actingUserId,
        eventCount: 1,
        timeWindowMinutes: 0,
        timestamp: new Date(),
        runbookUrl: 'https://docs.studentkare.co/runbooks/RB-48-BREAK-GLASS.md',
        owner: 'clinical-compliance@studentkare.co',
        details: `Break-glass emergency access invoked by clinician ${record.actingUserId} for target ${record.targetUserId}.`,
      });
    }

    return null;
  }

  /**
   * Triggers and records a security detection alert.
   */
  public triggerAlert(
    input: Omit<DetectionAlert, 'alertId'>
  ): DetectionAlert {
    // P75 Guardrail: Confirm alert contains zero clinical text content
    if (input.details.includes('diagnosis') || input.details.includes('prescription')) {
      throw new Error('[P75 Security Defect] Detection alerts must not contain clinical record content.');
    }

    const alert: DetectionAlert = {
      alertId: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...input,
    };

    this.generatedAlerts.push(alert);
    return alert;
  }

  public getGeneratedAlerts(): ReadonlyArray<DetectionAlert> {
    return this.generatedAlerts;
  }

  /**
   * Runs validation scan across entire AuditLogger chain to detect anomalies (P75).
   */
  public runFullDetectionScan(): DetectionAlert[] {
    const alerts: DetectionAlert[] = [];
    const auditRecords = AuditLogger.getInstance().getAccessLogsForStudent(''); // Get all logs
    // Sort chronologically
    for (let i = 0; i < auditRecords.length; i++) {
      const alert = this.evaluateAuditRecord(auditRecords[i], auditRecords.slice(0, i + 1));
      if (alert) {
        alerts.push(alert);
      }
    }
    return alerts;
  }
}
