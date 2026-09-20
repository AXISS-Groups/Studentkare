import { describe, it, expect } from 'vitest';
import { InputSanitizer } from '../inputSanitizer';

describe('InputSanitizer (P71)', () => {
  it('validates ABHA ID formats', () => {
    expect(InputSanitizer.validateAbhaId('12-3456-7890-1234')).toBe(true);
    expect(InputSanitizer.validateAbhaId('12345678901234')).toBe(false);
    expect(InputSanitizer.validateAbhaId('AB-CDEF-GHIJ-KLMN')).toBe(false);
  });

  it('validates Indian phone numbers', () => {
    expect(InputSanitizer.validatePhoneNumber('+919876543210')).toBe(true);
    expect(InputSanitizer.validatePhoneNumber('9876543210')).toBe(false);
    expect(InputSanitizer.validatePhoneNumber('+15551234567')).toBe(false);
  });

  it('validates email addresses', () => {
    expect(InputSanitizer.validateEmail('student@inst.ac.in')).toBe(true);
    expect(InputSanitizer.validateEmail('invalid-email')).toBe(false);
  });

  it('detects SQL injection keywords and syntax tokens', () => {
    expect(InputSanitizer.containsSqlInjection("SELECT * FROM users WHERE '1'='1'")).toBe(true);
    expect(InputSanitizer.containsSqlInjection('DROP TABLE audit_logs;')).toBe(true);
    expect(InputSanitizer.containsSqlInjection('admin\' --')).toBe(true);
    expect(InputSanitizer.containsSqlInjection('Normal clinical consultation note')).toBe(false);
  });

  it('escapes CSV formula injection symbols to prevent Excel execution', () => {
    expect(InputSanitizer.sanitizeCsvCell('=SUM(A1:A100)')).toBe("'=SUM(A1:A100)");
    expect(InputSanitizer.sanitizeCsvCell('+cmd|/C calc!A0')).toBe("'+cmd|/C calc!A0");
    expect(InputSanitizer.sanitizeCsvCell('-100')).toBe("'-100");
    expect(InputSanitizer.sanitizeCsvCell('@cmd')).toBe("'@cmd");
    expect(InputSanitizer.sanitizeCsvCell('Normal Text')).toBe('Normal Text');
  });
});
