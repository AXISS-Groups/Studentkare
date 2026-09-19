import { describe, it, expect, beforeEach } from 'vitest';
import { DrBackupManager } from '../drBackupManager';

describe('DrBackupManager (P52)', () => {
  let drManager: DrBackupManager;

  beforeEach(() => {
    drManager = new DrBackupManager();
  });

  it('validates encrypted KMS backup checksum integrity', () => {
    const valid = drManager.validateBackupIntegrity({
      backupId: 'BAK-100',
      timestamp: new Date().toISOString(),
      sizeBytes: 5000000,
      encryptedWithKms: true,
      checksumSha256: 'a'.repeat(64)
    });
    expect(valid).toBe(true);

    const unencrypted = drManager.validateBackupIntegrity({
      backupId: 'BAK-101',
      timestamp: new Date().toISOString(),
      sizeBytes: 5000000,
      encryptedWithKms: false,
      checksumSha256: 'a'.repeat(64)
    });
    expect(unencrypted).toBe(false);
  });

  it('logs PITR drill results against RTO/RPO targets', () => {
    const drill = drManager.logPitrDrill('2026-09-20T00:00:00Z', 30, 2);
    expect(drill.rtoSuccess).toBe(true); // <= 60 mins
    expect(drill.rpoSuccess).toBe(true); // <= 5 mins
  });
});
