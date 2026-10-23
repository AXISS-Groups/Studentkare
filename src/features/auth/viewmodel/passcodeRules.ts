import { ApiError } from '@/data/services/http';
import type { MessageKey } from '@/i18n';

/**
 * The student passcode's shape, as the server defines it (backend/services/
 * student_passcode.py PASSCODE_LENGTHS, PASSCODE_CHARACTERS). The server is the
 * judge: these only give instant feedback while typing. Whether a passcode is too
 * easy to guess (common, repeated, a run, personal) is decided only by the server.
 */
export const PASSCODE_LENGTHS: readonly number[] = [4, 6, 8];
export const PASSCODE_MAX_LENGTH = Math.max(...PASSCODE_LENGTHS);
const PRINTABLE_NO_SPACE = /^[\x21-\x7e]*$/;

export type PasscodeStrength = 'empty' | 'weak' | 'fair' | 'strong';

/** How many of digits, lower case, upper case and symbols a passcode mixes. */
function kinds(passcode: string): number {
  return [/\d/, /[a-z]/, /[A-Z]/, /[^a-zA-Z0-9]/].filter((pattern) => pattern.test(passcode)).length;
}

/**
 * A plain hint, not a promise: 4 characters is always weak (the founder's rule
 * and the screen says so), 8 with a mix is strong, everything between is fair.
 */
export function passcodeStrength(passcode: string): PasscodeStrength {
  if (!passcode) return 'empty';
  const [shortest, , longest] = PASSCODE_LENGTHS;
  if (passcode.length <= shortest) return 'weak';
  if (passcode.length >= longest && kinds(passcode) > 1) return 'strong';
  return 'fair';
}

/** What can be told before asking the server: the length and the characters. */
export function localPasscodeProblem(passcode: string): MessageKey | null {
  if (!PRINTABLE_NO_SPACE.test(passcode)) return 'authpc.set.badChars';
  if (!PASSCODE_LENGTHS.includes(passcode.length)) return 'authpc.set.badLength';
  return null;
}

export function isPasscodeShape(passcode: string): boolean {
  return localPasscodeProblem(passcode) === null;
}

interface PasscodeDetail {
  code?: unknown;
  reason?: unknown;
}

/** The server's `{ code, reason }` detail, when it sent one. */
export function passcodeDetail(error: unknown): { code: string; reason: string } {
  if (error instanceof ApiError && error.detail && typeof error.detail === 'object' && !Array.isArray(error.detail)) {
    const detail = error.detail as PasscodeDetail;
    return { code: typeof detail.code === 'string' ? detail.code : '', reason: typeof detail.reason === 'string' ? detail.reason : '' };
  }
  return { code: '', reason: '' };
}

const WEAK_REASONS: Record<string, MessageKey> = {
  COMMON: 'authpc.set.weak.COMMON',
  REPEATED: 'authpc.set.weak.REPEATED',
  SEQUENCE: 'authpc.set.weak.SEQUENCE',
  PERSONAL: 'authpc.set.weak.PERSONAL',
};

/** A refused save, in the student's language. Unknown answers fall back to the generic message. */
export function saveProblemKey(error: unknown): MessageKey {
  const { code, reason } = passcodeDetail(error);
  switch (code) {
    case 'PASSCODE_LENGTH': return 'authpc.set.badLength';
    case 'PASSCODE_CHARACTERS': return 'authpc.set.badChars';
    case 'PASSCODE_WEAK': return WEAK_REASONS[reason] ?? 'authpc.set.weak.COMMON';
    case 'PASSCODE_PROOF_NEEDED': return 'authpc.set.proof';
    case 'PASSCODE_DISABLED': return 'authpc.set.off';
    case 'PASSCODE_STUDENTS_ONLY': return 'authpc.set.studentsOnly';
    default: return 'authpc.set.failed';
  }
}
