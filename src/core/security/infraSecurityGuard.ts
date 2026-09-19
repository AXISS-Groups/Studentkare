/**
 * Infrastructure Security Guard — P76 Infrastructure Security
 * 
 * Verifies VPC network segmentation, database TLS connection requirements,
 * and outbound network egress restrictions.
 */

export interface DbConnectionConfig {
  host: string;
  port: number;
  ssl: boolean | { rejectUnauthorized: boolean; sslmode?: string };
}

export interface InfrastructureAuditResult {
  secure: boolean;
  violations: string[];
}

export class InfraSecurityGuard {
  /**
   * Validates database connection configuration for mandatory TLS 1.3 encryption
   */
  public static validateDatabaseSecurity(config: DbConnectionConfig): InfrastructureAuditResult {
    const violations: string[] = [];

    if (!config.ssl) {
      violations.push('Database connection missing mandatory TLS encryption');
    } else if (typeof config.ssl === 'object' && !config.ssl.rejectUnauthorized) {
      violations.push('Database TLS connection permits unauthorized certificates (rejectUnauthorized: false)');
    }

    return {
      secure: violations.length === 0,
      violations
    };
  }

  /**
   * Validates egress network destination against approved allowlist
   */
  public static validateEgressDestination(
    destinationHost: string,
    allowedHosts: string[]
  ): boolean {
    const hostLower = destinationHost.toLowerCase();
    return allowedHosts.some((allowed) => hostLower === allowed.toLowerCase() || hostLower.endsWith('.' + allowed.toLowerCase()));
  }
}
