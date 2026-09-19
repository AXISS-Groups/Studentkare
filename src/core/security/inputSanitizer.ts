/**
 * Input Validation & Sanitization Module — P71 Input Validation
 * 
 * Provides strict format validators for Indian healthcare primitives (ABHA, Phone, Email),
 * SQL injection detection, and CSV formula injection escaping.
 */

export class InputSanitizer {
  private static ABHA_REGEX = /^\d{2}-\d{4}-\d{4}-\d{4}$/;
  private static PHONE_REGEX = /^\+91[6-9]\d{9}$/;
  private static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|CREATE|TRUNCATE)\b)|(--)|(;)/i;

  /**
   * Validates ABHA ID (format XX-XXXX-XXXX-XXXX)
   */
  public static validateAbhaId(abhaId: string): boolean {
    return this.ABHA_REGEX.test(abhaId.trim());
  }

  /**
   * Validates Indian phone number (format +91XXXXXXXXXX)
   */
  public static validatePhoneNumber(phone: string): boolean {
    return this.PHONE_REGEX.test(phone.trim());
  }

  /**
   * Validates Email address format
   */
  public static validateEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email.trim());
  }

  /**
   * Detects raw SQL injection tokens in user inputs
   */
  public static containsSqlInjection(input: string): boolean {
    return this.SQL_INJECTION_PATTERN.test(input);
  }

  /**
   * Sanitizes string values for safe CSV exports.
   * Prevents formula injection (OWASP CSV Injection) by prefixing leading
   * `=`, `+`, `-`, `@`, `\t`, `\r` symbols with a single quote `'`.
   */
  public static sanitizeCsvCell(cell: string): string {
    if (!cell) return '';
    const trimmed = cell.toString();
    const leadingChar = trimmed.charAt(0);

    if (['=', '+', '-', '@', '\t', '\r'].includes(leadingChar)) {
      return `'${trimmed}`;
    }
    return trimmed;
  }
}
