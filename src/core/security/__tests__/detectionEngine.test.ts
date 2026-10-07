import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityDetectionEngine } from '../securityDetectionEngine';
import { AuditLogger, AuditRecord } from '../../audit/auditLogger';

describe('P75 — Security Detection & Monitoring Engine', () => {
  let engine: SecurityDetectionEngine;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    engine = SecurityDetectionEngine.getInstance();
    auditLogger = AuditLogger.getInstance();

    engine.resetForTesting();
    auditLogger.resetForTesting();
  });

  it('triggers CRITICAL alert when an identity accesses >100 distinct student records in 5 minutes (Priority Detection #1)', async () => {
    const actingUserId = 'insider_user_bad';
    const recentHistory: AuditRecord[] = [];

    // Simulate reading 105 distinct student records
    for (let i = 1; i <= 105; i++) {
      const record = await auditLogger.logAccess({
        actingUserId,
        targetUserId: `student_${i}`,
        action: 'READ',
        resource: `clinical.vitals.${i}`,
      });
      recentHistory.push(record);
    }

    const lastRecord = recentHistory[recentHistory.length - 1];
    const alert = engine.evaluateAuditRecord(lastRecord, recentHistory);

    expect(alert).not.toBeNull();
    expect(alert?.ruleId).toBe('BULK_ACCESS_EXCEEDED');
    expect(alert?.severity).toBe('CRITICAL');
    expect(alert?.eventCount).toBeGreaterThanOrEqual(100);
    expect(alert?.runbookUrl).toContain('RB-75-BULK-ACCESS.md');
    expect(alert?.owner).toBe('secops-oncall@studentkare.co');
  });

  it('triggers HIGH alert immediately on break-glass invocation (Priority Detection #2)', async () => {
    const record = await auditLogger.logAccess({
      actingUserId: 'doc_emergency_1',
      targetUserId: 'student_trauma_99',
      action: 'BREAK_GLASS',
      resource: 'emergency_break_glass:bg_123',
    });

    const alert = engine.evaluateAuditRecord(record, [record]);

    expect(alert).not.toBeNull();
    expect(alert?.ruleId).toBe('UNAUTHORIZED_BREAK_GLASS');
    expect(alert?.severity).toBe('HIGH');
    expect(alert?.runbookUrl).toContain('RB-48-BREAK-GLASS.md');
    expect(alert?.owner).toBe('clinical-compliance@studentkare.co');
  });

  it('strictly rejects generating an alert that contains clinical record content (P75 Guardrail)', () => {
    expect(() => {
      engine.triggerAlert({
        ruleId: 'BULK_ACCESS_EXCEEDED',
        severity: 'CRITICAL',
        actingUserId: 'user_1',
        eventCount: 10,
        timeWindowMinutes: 5,
        timestamp: new Date(),
        runbookUrl: 'https://docs.studentkare.co/runbooks/RB-75.md',
        owner: 'secops@studentkare.co',
        details: 'Accessed student record with diagnosis: acute depression', // Contains clinical content -> REJECT!
      });
    }).toThrow(/\[P75 Security Defect\]/);
  });
});
