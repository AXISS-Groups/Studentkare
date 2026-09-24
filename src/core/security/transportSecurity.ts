/**
 * Studentkare — P67 API Transport Security & Headers Policy
 * Computes hardened response headers (HSTS, CSP, CORS, Frame Options) and enforces domain origins.
 */

export interface SecurityHeadersOptions {
  enableHSTS?: boolean;
  strictCORS?: boolean;
}

export class TransportSecurity {
  private static instance: TransportSecurity;

  private allowedOrigins: Set<string> = new Set([
    'https://studentkare.co',
    'https://app.studentkare.co',
    'https://admin.studentkare.co',
  ]);

  private constructor() {}

  public static getInstance(): TransportSecurity {
    if (!TransportSecurity.instance) {
      TransportSecurity.instance = new TransportSecurity();
    }
    return TransportSecurity.instance;
  }

  /**
   * Generates standard hardened HTTP security headers.
   */
  public getSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    if (options.enableHSTS !== false) {
      headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
    }

    return headers;
  }

  /**
   * Validates CORS request origin.
   */
  public validateCORSOrigin(origin: string): { allowed: boolean; originHeader: string } {
    if (this.allowedOrigins.has(origin)) {
      return { allowed: true, originHeader: origin };
    }
    return { allowed: false, originHeader: 'null' };
  }
}
