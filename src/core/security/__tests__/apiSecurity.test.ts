import { describe, it, expect, beforeEach } from 'vitest';
import { BOLAGuard } from '../bolaGuard';
import { SSRFGuard } from '../ssrfGuard';
import { TransportSecurity } from '../transportSecurity';
import { WebhookGuard } from '../webhookGuard';

describe('P67 — API & Transport Security', () => {
  let bola: BOLAGuard;
  let ssrf: SSRFGuard;
  let transport: TransportSecurity;
  let webhook: WebhookGuard;

  beforeEach(() => {
    bola = BOLAGuard.getInstance();
    ssrf = SSRFGuard.getInstance();
    transport = TransportSecurity.getInstance();
    webhook = WebhookGuard.getInstance();
    webhook.resetForTesting();
  });

  describe('BOLA / IDOR Object-Level Authorization (P67)', () => {
    it('allows record owner to access their own record', () => {
      const res = bola.verifyObjectAccess({
        actingUserId: 'student_101',
        actingUserRole: 'student',
        recordId: 'REC-001',
        recordOwnerId: 'student_101',
      });
      expect(res.allowed).toBe(true);
    });

    it('denies non-owner from accessing another student record (BOLA Attack Block)', () => {
      const res = bola.verifyObjectAccess({
        actingUserId: 'student_999_attacker',
        actingUserRole: 'student',
        recordId: 'REC-001',
        recordOwnerId: 'student_101',
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('BOLA Violation');
    });

    it('allows clinician access when valid student consent grant is presented', () => {
      const res = bola.verifyObjectAccess({
        actingUserId: 'doc_456',
        actingUserRole: 'campus_clinician',
        recordId: 'REC-001',
        recordOwnerId: 'student_101',
        consentGrantId: 'consent_valid_abc123',
      });
      expect(res.allowed).toBe(true);
    });

    it('strictly denies support role from viewing clinical records (P48/P67 Rule)', () => {
      const res = bola.verifyObjectAccess({
        actingUserId: 'support_user_1',
        actingUserRole: 'support',
        recordId: 'REC-001',
        recordOwnerId: 'student_101',
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Support role is strictly prohibited');
    });
  });

  describe('SSRF Protection (P67)', () => {
    it('allows outbound requests to allowlisted domains', () => {
      expect(ssrf.validateOutboundUrl('https://abdm.gov.in/api/v1/consent').safe).toBe(true);
      expect(ssrf.validateOutboundUrl('https://api.studentkare.in/v1/health').safe).toBe(true);
    });

    it('blocks SSRF attempts targeting localhost, private IP ranges, and cloud metadata', () => {
      // Localhost / Loopback
      expect(ssrf.validateOutboundUrl('https://localhost:8080/internal').safe).toBe(false);
      expect(ssrf.validateOutboundUrl('https://127.0.0.1/admin').safe).toBe(false);

      // Cloud Metadata IP
      expect(ssrf.validateOutboundUrl('https://169.254.169.254/latest/meta-data/').safe).toBe(false);

      // RFC 1918 Private IP
      expect(ssrf.validateOutboundUrl('https://10.0.0.5/db').safe).toBe(false);
      expect(ssrf.validateOutboundUrl('https://192.168.1.1/router').safe).toBe(false);

      // Non-HTTPS
      expect(ssrf.validateOutboundUrl('http://api.studentkare.in').safe).toBe(false);
    });
  });

  describe('Transport Security Headers & CORS (P67)', () => {
    it('returns hardened HTTP security headers including HSTS and CSP', () => {
      const headers = transport.getSecurityHeaders();
      expect(headers['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('validates allowed CORS origins and rejects untrusted origins', () => {
      expect(transport.validateCORSOrigin('https://app.studentkare.in').allowed).toBe(true);
      expect(transport.validateCORSOrigin('https://malicious-site.com').allowed).toBe(false);
    });
  });

  describe('Partner Webhook Security & Replay Protection (P67)', () => {
    it('verifies valid partner webhook signature and freshness', () => {
      const res = webhook.verifyWebhook(
        {
          webhookId: 'wh_1001',
          timestampMs: Date.now(),
          signature: 'sig_partner_lab_secret123',
          partnerId: 'partner_lab',
          data: { labReportId: 'REP-99' },
        },
        'secret123'
      );
      expect(res.valid).toBe(true);
    });

    it('rejects stale webhooks (replay attack window >5 min)', () => {
      const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
      const res = webhook.verifyWebhook(
        {
          webhookId: 'wh_replay_1',
          timestampMs: sixMinutesAgo,
          signature: 'sig_partner_lab_secret123',
          partnerId: 'partner_lab',
          data: {},
        },
        'secret123'
      );
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('replay protection window');
    });

    it('rejects duplicate webhook ID (idempotency violation)', () => {
      const payload = {
        webhookId: 'wh_dup_001',
        timestampMs: Date.now(),
        signature: 'sig_partner_lab_secret123',
        partnerId: 'partner_lab',
        data: {},
      };

      expect(webhook.verifyWebhook(payload, 'secret123').valid).toBe(true);
      expect(webhook.verifyWebhook(payload, 'secret123').valid).toBe(false);
    });
  });
});
