/**
 * Studentkare — P70 Secrets & Credential Hygiene Manager
 * Provides runtime secret resolution, secret masking for logs, emergency secret rotation,
 * and zero standing production credential enforcement.
 */

export type SecretEnvironment = 'development' | 'staging' | 'production';

export interface PartnerCredential {
  partnerId: string;
  keyId: string;
  activeSecretHash: string;
  lastRotatedAt: Date;
  isRevoked: boolean;
}

export class SecretManager {
  private static instance: SecretManager;
  private partnerCredentials = new Map<string, PartnerCredential>();

  private constructor() {}

  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  public resetForTesting(): void {
    this.partnerCredentials.clear();
  }

  /**
   * Retrieves a secret key at runtime.
   * Throws if secret is missing or empty in non-dev environments.
   */
  public getSecret(key: string, env: SecretEnvironment = 'development'): string {
    const val = typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
    if (!val || val.trim().length === 0) {
      if (env === 'production' || env === 'staging') {
        throw new Error(`[P70 Security Defect] Critical secret '${key}' is missing in environment ${env}.`);
      }
      return `dev_mock_${key.toLowerCase()}`;
    }
    return val;
  }

  /**
   * Masks a sensitive string for safe log/audit recording (P70 Guardrail).
   * E.g., "synthetic-key-1234567890abcdef" -> "synt...cdef"
   */
  public maskSecret(secret: string): string {
    if (!secret || secret.length < 8) {
      return '********';
    }
    const visiblePrefix = secret.substring(0, 4);
    const visibleSuffix = secret.substring(secret.length - 4);
    return `${visiblePrefix}...${visibleSuffix}`;
  }

  /**
   * Registers a partner API credential.
   */
  public registerPartnerCredential(partnerId: string, secretValue: string): PartnerCredential {
    const cred: PartnerCredential = {
      partnerId,
      keyId: `key_${partnerId}_${Date.now()}`,
      activeSecretHash: `hash_${secretValue}`,
      lastRotatedAt: new Date(),
      isRevoked: false,
    };
    this.partnerCredentials.set(partnerId, cred);
    return cred;
  }

  /**
   * Emergency Partner Secret Rotation / Kill Switch (P70 / P54).
   * Instantly revokes current credential and rotates to new key in one action.
   */
  public emergencyRotatePartnerSecret(partnerId: string, newSecretValue: string): PartnerCredential {
    const existing = this.partnerCredentials.get(partnerId);
    if (!existing) {
      throw new Error(`[P70 Security Defect] Cannot rotate unknown partner credential for '${partnerId}'.`);
    }

    // Revoke old credential
    existing.isRevoked = true;

    // Issue rotated credential
    const rotated: PartnerCredential = {
      partnerId,
      keyId: `key_${partnerId}_${Date.now()}_rotated`,
      activeSecretHash: `hash_${newSecretValue}`,
      lastRotatedAt: new Date(),
      isRevoked: false,
    };

    this.partnerCredentials.set(partnerId, rotated);
    return rotated;
  }

  public isPartnerCredentialValid(partnerId: string, secretValue: string): boolean {
    const cred = this.partnerCredentials.get(partnerId);
    if (!cred || cred.isRevoked) {
      return false;
    }
    return cred.activeSecretHash === `hash_${secretValue}`;
  }
}
