import { describe, it, expect, beforeEach } from 'vitest';
import { SecretManager } from '../secretManager';
import { SecretScanner } from '../secretScanner';

describe('P70 — Secrets & Credential Hygiene', () => {
  let secMgr: SecretManager;
  let secScanner: SecretScanner;

  beforeEach(() => {
    secMgr = SecretManager.getInstance();
    secScanner = SecretScanner.getInstance();
    secMgr.resetForTesting();
  });

  describe('SecretManager (Runtime & Masking)', () => {
    it('throws error when critical secret is missing in production (P70 Guardrail)', () => {
      expect(() => {
        secMgr.getSecret('NON_EXISTENT_PROD_SECRET_KEY', 'production');
      }).toThrow(/\[P70 Security Defect\]/);
    });

    it('returns dev fallback string when secret is missing in development mode', () => {
      const val = secMgr.getSecret('OPTIONAL_KEY', 'development');
      expect(val).toBe('dev_mock_optional_key');
    });

    it('masks raw secrets for safe logging without exposing full secret string', () => {
      const masked = secMgr.maskSecret('sk_live_998877665544332211');
      expect(masked).toBe('sk_l...2211');
      expect(masked).not.toContain('99887766554433');
    });

    it('performs emergency partner secret rotation and revokes old credential (P70 / P54)', () => {
      secMgr.registerPartnerCredential('partner_tata1mg', 'secret_v1_old');
      expect(secMgr.isPartnerCredentialValid('partner_tata1mg', 'secret_v1_old')).toBe(true);

      // Emergency rotation
      const rotated = secMgr.emergencyRotatePartnerSecret('partner_tata1mg', 'secret_v2_new');
      expect(rotated.keyId).toContain('rotated');

      // Old secret is REVOKED
      expect(secMgr.isPartnerCredentialValid('partner_tata1mg', 'secret_v1_old')).toBe(false);

      // New secret is ACTIVE
      expect(secMgr.isPartnerCredentialValid('partner_tata1mg', 'secret_v2_new')).toBe(true);
    });
  });

  describe('SecretScanner (Pre-commit & CI Scanner)', () => {
    it('detects embedded hardcoded API keys and private keys in code content', () => {
      const codeWithSecret = `
        const apiKey = "sk_live_1234567890abcdef1234";
        const awsKey = "AKIAIOSFODNN7EXAMPLE";
      `;

      const findings = secScanner.scanContent(codeWithSecret);
      expect(findings.length).toBe(2);
      expect(findings[0].patternName).toContain('Generic API Key');
      expect(findings[1].patternName).toContain('AWS Access Key');
    });

    it('returns 0 findings for clean code without secrets', () => {
      const cleanCode = `
        const apiKey = process.env.API_KEY;
        console.log("System initialized");
      `;

      const findings = secScanner.scanContent(cleanCode);
      expect(findings.length).toBe(0);
    });
  });
});
