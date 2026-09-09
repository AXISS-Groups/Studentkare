/**
 * M18 boundary — predictive output must never reach a student-facing render.
 *
 * Descriptive restatement (e.g. "outside typical range") is allowed. Estimating
 * what will happen to a person ("you are likely...", "you will develop...",
 * "risk score", "probability") is prediction and belongs behind the M18
 * boundary / licensed SaMD path.
 *
 * This scans the student-facing surfaces and fails if any predictive phrase
 * appears in rendered text.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');

// Student-facing screen directories (staff/admin/clinician/claims excluded).
const STUDENT_DIRS = [
  'screens/dashboard',
  'screens/auth',
  'screens/vault',
  'screens/camp',
  'screens/care',
  'screens/emergency',
  'screens/learn',
  'screens/rewards',
  'screens/profile',
  'screens/community',
  'screens/wellbeing',
];

const PREDICTIVE_PHRASES = [
  'you are likely',
  'you will develop',
  'you will be',
  'you may develop',
  'you will have',
  'likely to develop',
  'risk score',
  'probability of',
  'prognosis',
];

function collectTsx(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(join(ROOT, dir))) {
    const p = join(ROOT, dir, f);
    if (statSync(p).isDirectory()) out.push(...collectTsx(join(dir, f)));
    else if (f.endsWith('.tsx')) out.push(p);
  }
  return out;
}

describe('M18 boundary — no predictive output to students', () => {
  for (const dir of STUDENT_DIRS) {
    const files = collectTsx(dir);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const textOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      for (const phrase of PREDICTIVE_PHRASES) {
        it(`${file} must not contain "${phrase}"`, () => {
          expect(textOnly.toLowerCase()).not.toContain(phrase.toLowerCase());
        });
      }
    }
  }
});
