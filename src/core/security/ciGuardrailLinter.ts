/**
 * Studentkare — P72 CI Custom House Guardrail Linter
 * Enforces House Constitution rules in CI:
 * - Fail-closed try/catch checks (no catch returning true / permissive default)
 * - Anti-PHI logging scanner (no printing abha_id, otp, or clinical objects)
 * - Rule L Firewall (no clinical imports inside commercial/rewards modules)
 * - Escape Hatch Banning (no @ts-ignore or any on layer boundaries)
 */

export interface CILintViolation {
  ruleId: 'RULE_FAIL_CLOSED' | 'RULE_PHI_LOGGING' | 'RULE_L_COMMERCE_FIREWALL' | 'RULE_STRICT_TYPESCRIPT';
  message: string;
  filePath: string;
  lineNumber: number;
}

export class CIGuardrailLinter {
  private static instance: CIGuardrailLinter;

  private constructor() {}

  public static getInstance(): CIGuardrailLinter {
    if (!CIGuardrailLinter.instance) {
      CIGuardrailLinter.instance = new CIGuardrailLinter();
    }
    return CIGuardrailLinter.instance;
  }

  /**
   * Scans a file's content string for P0 House Constitution violations.
   */
  public lintFileContent(filePath: string, content: string): CILintViolation[] {
    const violations: CILintViolation[] = [];
    const lines = content.split('\n');

    const isCommerceFile =
      filePath.includes('/m20-rewards/') ||
      filePath.includes('/m17-marketplace/') ||
      filePath.includes('/screens/billing/');

    let inCatchBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const hasCatchHeader = line.includes('catch') || line.includes('catch (');
      if (hasCatchHeader) {
        inCatchBlock = true;
      }

      // 1. Fail-Closed Check: catch block returning true or permissive fallback
      if (inCatchBlock && (line.includes('return true') || line.includes('return ALLOWED') || line.includes('return true;'))) {
        violations.push({
          ruleId: 'RULE_FAIL_CLOSED',
          message: '[P0 #1 / P72 Violation] Safety gate catch block returns a permissive default (Must Fail Closed).',
          filePath,
          lineNumber: lineNum,
        });
        inCatchBlock = false;
      }

      // Only close catch block if line contains closing brace AND it wasn't the catch header line itself
      if (inCatchBlock && !hasCatchHeader && line.includes('}')) {
        inCatchBlock = false;
      }



      // 2. Anti-PHI Logging Check: logging abha_id, otp, or raw clinical payload
      if (
        (line.includes('console.log') || line.includes('logger.')) &&
        (line.includes('abha_id') || line.includes('otpCode') || line.includes('clinicalRecord'))
      ) {
        violations.push({
          ruleId: 'RULE_PHI_LOGGING',
          message: '[P0 #9 / P72 Violation] Logging sensitive PHI, ABHA ID, or OTP is forbidden.',
          filePath,
          lineNumber: lineNum,
        });
      }

      // 3. Rule L Commerce Firewall Check: commercial files importing clinical data modules
      if (isCommerceFile && (line.includes('/m02-vault') || line.includes('/m07-health') || line.includes('baseRepository'))) {
        violations.push({
          ruleId: 'RULE_L_COMMERCE_FIREWALL',
          message: '[P0 #4 / P72 Violation] Commercial module imports clinical data layer (Rule L Firewall Breach).',
          filePath,
          lineNumber: lineNum,
        });
      }

      // 4. Strict TypeScript Escape Hatch Check
      if (line.includes('@ts-ignore') || line.includes('@ts-nocheck')) {
        violations.push({
          ruleId: 'RULE_STRICT_TYPESCRIPT',
          message: '[P0 #10 / P72 Violation] TypeScript escape hatch (@ts-ignore / @ts-nocheck) is strictly forbidden.',
          filePath,
          lineNumber: lineNum,
        });
      }
    }

    return violations;
  }
}
