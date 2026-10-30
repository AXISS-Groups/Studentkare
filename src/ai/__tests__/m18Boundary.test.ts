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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');

// Student-facing screen directories (staff/admin/clinician/claims excluded).
const STUDENT_DIRS = [
  'screens/auth',
  'screens/wellbeing',
  'features/vault',
  'features/camp',
  'features/care',
  'features/emergency',
  'features/rewards',
  'features/m2profile',
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
  const full = join(ROOT, dir);
  if (!existsSync(full)) return [];
  const out: string[] = [];
  for (const f of readdirSync(full)) {
    const p = join(full, f);
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
