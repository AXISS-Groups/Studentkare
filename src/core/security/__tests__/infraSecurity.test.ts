import { describe, it, expect } from 'vitest';
import { InfraSecurityGuard } from '../infraSecurityGuard';

describe('InfraSecurityGuard (P76)', () => {
  it('detects unencrypted database connections and rejects them', () => {
    const res = InfraSecurityGuard.validateDatabaseSecurity({
      host: 'db.internal',
      port: 5432,
      ssl: false
    });
    expect(res.secure).toBe(false);
    expect(res.violations[0]).toContain('missing mandatory TLS encryption');
  });

  it('detects insecure SSL configs where rejectUnauthorized is set to false', () => {
    const res = InfraSecurityGuard.validateDatabaseSecurity({
      host: 'db.internal',
      port: 5432,
      ssl: { rejectUnauthorized: false }
    });
    expect(res.secure).toBe(false);
    expect(res.violations[0]).toContain('rejectUnauthorized: false');
  });

  it('validates egress destinations against approved domain allowlist', () => {
    const allowlist = ['api.abdm.gov.in', 'studentkare.in'];
    expect(InfraSecurityGuard.validateEgressDestination('api.abdm.gov.in', allowlist)).toBe(true);
    expect(InfraSecurityGuard.validateEgressDestination('malicious-site.com', allowlist)).toBe(false);
  });
});
