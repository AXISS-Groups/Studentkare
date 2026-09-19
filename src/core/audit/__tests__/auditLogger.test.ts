import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from '../auditLogger';

describe('AuditLogger (P45)', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = AuditLogger.getInstance();
    logger.resetForTesting();
  });

  it('logs clinical data accesses with hash chaining', async () => {
    const record1 = await logger.logAccess({
      actingUserId: 'user_doctor_1',
      targetUserId: 'student_101',
      action: 'READ',
      resource: 'clinical.records.vitals',
      consentId: 'consent_abc',
    });

    const record2 = await logger.logAccess({
      actingUserId: 'user_doctor_1',
      targetUserId: 'student_101',
      action: 'WRITE',
      resource: 'clinical.records.lab_report',
      consentId: 'consent_abc',
    });

    expect(record1.previousHash).toBe('GENESIS_HASH');
    expect(record2.previousHash).toBe(record1.currentHash);
    expect(logger.verifyIntegrity()).toBe(true);
  });

  it('returns student-visible access logs for transparency (P45)', async () => {
    await logger.logAccess({
      actingUserId: 'user_doctor_1',
      targetUserId: 'student_101',
      action: 'READ',
      resource: 'clinical.records.vitals',
    });

    await logger.logAccess({
      actingUserId: 'user_admin_2',
      targetUserId: 'student_202',
      action: 'READ',
      resource: 'operational.profile',
    });

    const studentLogs = logger.getAccessLogsForStudent('student_101');
    expect(studentLogs.length).toBe(1);
    expect(studentLogs[0].targetUserId).toBe('student_101');
  });
});
