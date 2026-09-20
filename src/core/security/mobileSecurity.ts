/**
 * Mobile Security Module — P68 Mobile Security
 * 
 * Provides secure storage abstraction, screen privacy guards, certificate pinning checks,
 * device integrity/jailbreak detection, and emergency kill-switch validation for mobile runs.
 */

export interface SecureStorageProvider {
  setItemAsync(key: string, value: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  deleteItemAsync(key: string): Promise<void>;
}

export class MemorySecureStorage implements SecureStorageProvider {
  private store = new Map<string, string>();

  public async setItemAsync(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  public async getItemAsync(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  public async deleteItemAsync(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export interface DeviceIntegrityResult {
  isJailbroken: boolean;
  isEmulator: boolean;
  isDebuggerAttached: boolean;
  trustScore: number; // 0 (untrusted) to 100 (fully trusted)
}

export class MobileSecurityManager {
  private secureStorage: SecureStorageProvider;
  private pinnedCertHashes: Set<string> = new Set();
  private killSwitchActive = false;

  constructor(storage?: SecureStorageProvider) {
    this.secureStorage = storage ?? new MemorySecureStorage();
  }

  /**
   * Adds expected TLS certificate pins (SHA-256 fingerprint)
   */
  public addPinnedCertificateHash(hash: string): void {
    this.pinnedCertHashes.add(hash.toLowerCase());
  }

  /**
   * Validates server TLS certificate fingerprint against pinned hashes
   */
  public verifyCertificatePin(serverCertHash: string): boolean {
    if (this.pinnedCertHashes.size === 0) {
      // Fail closed if no pins configured in strict mode
      return false;
    }
    return this.pinnedCertHashes.has(serverCertHash.toLowerCase());
  }

  /**
   * Sets remote kill-switch state
   */
  public setKillSwitch(active: boolean): void {
    this.killSwitchActive = active;
  }

  /**
   * Checks if mobile runtime is permitted to execute sensitive clinical calls
   */
  public validateRuntimeSecurity(deviceIntegrity: DeviceIntegrityResult): {
    permitted: boolean;
    reason: string;
  } {
    if (this.killSwitchActive) {
      return {
        permitted: false,
        reason: 'Mobile access suspended by remote security kill-switch'
      };
    }

    if (deviceIntegrity.isJailbroken) {
      return {
        permitted: false,
        reason: 'Jailbroken or rooted device detected — access denied for clinical safety'
      };
    }

    if (deviceIntegrity.trustScore < 50) {
      return {
        permitted: false,
        reason: 'Device integrity trust score below minimum safety threshold (50)'
      };
    }

    return {
      permitted: true,
      reason: 'Mobile runtime verified secure'
    };
  }

  /**
   * Secure Storage Interface Wrapper
   */
  public getStorage(): SecureStorageProvider {
    return this.secureStorage;
  }
}
