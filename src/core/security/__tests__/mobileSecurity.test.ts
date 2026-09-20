import { describe, it, expect, beforeEach } from 'vitest';
import { MobileSecurityManager, MemorySecureStorage } from '../mobileSecurity';

describe('MobileSecurityManager (P68)', () => {
  let manager: MobileSecurityManager;

  beforeEach(() => {
    manager = new MobileSecurityManager(new MemorySecureStorage());
  });

  it('stores and retrieves items from secure storage abstraction', async () => {
    const storage = manager.getStorage();
    await storage.setItemAsync('AUTH_TOKEN', 'secret-jwt-token');
    const value = await storage.getItemAsync('AUTH_TOKEN');
    expect(value).toBe('secret-jwt-token');

    await storage.deleteItemAsync('AUTH_TOKEN');
    const deleted = await storage.getItemAsync('AUTH_TOKEN');
    expect(deleted).toBeNull();
  });

  it('verifies certificate pinning against configured hash set', () => {
    manager.addPinnedCertificateHash('SHA256:abc123def4567890');
    expect(manager.verifyCertificatePin('SHA256:abc123def4567890')).toBe(true);
    expect(manager.verifyCertificatePin('SHA256:invalidhash')).toBe(false);
  });

  it('fails closed when checking empty certificate pin set in strict mode', () => {
    expect(manager.verifyCertificatePin('SHA256:somehash')).toBe(false);
  });

  it('blocks execution on jailbroken devices', () => {
    const res = manager.validateRuntimeSecurity({
      isJailbroken: true,
      isEmulator: false,
      isDebuggerAttached: false,
      trustScore: 90
    });
    expect(res.permitted).toBe(false);
    expect(res.reason).toContain('Jailbroken');
  });

  it('blocks execution when remote kill-switch is active', () => {
    manager.setKillSwitch(true);
    const res = manager.validateRuntimeSecurity({
      isJailbroken: false,
      isEmulator: false,
      isDebuggerAttached: false,
      trustScore: 100
    });
    expect(res.permitted).toBe(false);
    expect(res.reason).toContain('kill-switch');
  });

  it('permits execution on secure uncompromised device', () => {
    const res = manager.validateRuntimeSecurity({
      isJailbroken: false,
      isEmulator: false,
      isDebuggerAttached: false,
      trustScore: 95
    });
    expect(res.permitted).toBe(true);
  });
});
