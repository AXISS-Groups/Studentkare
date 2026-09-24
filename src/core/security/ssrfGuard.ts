/**
 * Studentkare — P67 Server-Side Request Forgery (SSRF) Guard
 * Validates all outbound server-side requests (webhooks, partner calls, document fetches)
 * to block internal IP ranges, cloud metadata endpoints, and non-allowlisted domains.
 */

export interface SSRFValidationResult {
  safe: boolean;
  reason: string;
}

export class SSRFGuard {
  private static instance: SSRFGuard;

  private domainAllowlist: Set<string> = new Set([
    'api.studentkare.co',
    'abdm.gov.in',
    'tata1mg.com',
    'api.razorpay.com',
    'api.twilio.com',
  ]);

  private constructor() {}

  public static getInstance(): SSRFGuard {
    if (!SSRFGuard.instance) {
      SSRFGuard.instance = new SSRFGuard();
    }
    return SSRFGuard.instance;
  }

  public allowDomain(domain: string): void {
    this.domainAllowlist.add(domain.toLowerCase());
  }

  /**
   * Validates an outbound URL to prevent SSRF attacks targeting internal infrastructure.
   */
  public validateOutboundUrl(targetUrl: string): SSRFValidationResult {
    try {
      const url = new URL(targetUrl);

      // 1. Enforce HTTPS protocol only
      if (url.protocol !== 'https:') {
        return {
          safe: false,
          reason: '[P67 SSRF Defect] Outbound server-side requests must use HTTPS protocol.',
        };
      }

      const hostname = url.hostname.toLowerCase();

      // 2. Block Loopback & Localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
        return {
          safe: false,
          reason: '[P67 SSRF Violation] Outbound requests to loopback addresses are blocked.',
        };
      }

      // 3. Block AWS / GCP / Azure Cloud Metadata IP (169.254.169.254)
      if (hostname.startsWith('169.254.') || hostname === 'metadata.google.internal') {
        return {
          safe: false,
          reason: '[P67 SSRF Violation] Outbound requests to cloud metadata endpoints are strictly blocked.',
        };
      }

      // 4. Block RFC 1918 Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        return {
          safe: false,
          reason: '[P67 SSRF Violation] Outbound requests to private IP ranges are blocked.',
        };
      }

      // 5. Check Domain Allowlist
      const isAllowedDomain = Array.from(this.domainAllowlist).some(
        (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
      );

      if (!isAllowedDomain) {
        return {
          safe: false,
          reason: `[P67 SSRF Defect] Domain ${hostname} is not on the outbound SSRF allowlist.`,
        };
      }

      return {
        safe: true,
        reason: 'Outbound URL validated safe.',
      };
    } catch {
      return {
        safe: false,
        reason: '[P67 SSRF Defect] Malformed URL format.',
      };
    }
  }
}
