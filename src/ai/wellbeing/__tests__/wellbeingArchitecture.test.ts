/**
 * W-7.2 Architecture tests — the boundaries this module must never cross.
 *
 * 1. No body-metric type appears in a goal / target / streak / comparison /
 *    notification code path.
 * 2. No suggestion generator reads a diagnosis, lab value, medication, or
 *    mental-health record.
 * 3. No predictive output reaches a student-facing render.
 * 6. Referral numbers resolve to live services (Tele-MANAS, no dead NEDA).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WELLBEING_DIR = join(process.cwd(), 'src/ai/wellbeing');

function readModuleSources(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of readdirSync(WELLBEING_DIR)) {
    // Scan only the production module files, never the __tests__ directory
    // (the tests themselves legitimately mention prohibited words to assert).
    if (f === '__tests__') continue;
    if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      out[f] = stripComments(readFileSync(join(WELLBEING_DIR, f), 'utf8'));
    }
  }
  return out;
}

/** Remove block and line comments so the audit checks code, not prose. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('W-7.2 wellbeing architecture boundaries', () => {
  it('1. no body-metric type in goal/target/streak/comparison/notification paths', () => {
    const forbidden = [
      'weightGoal', 'calorieTarget', 'calorieGoal', 'bodyFatGoal', 'bodyFatTarget',
      'streak', 'targetWeight', 'targetBMI', 'targetCalorie', 'dailyCalorie',
      'weightLossGoal', 'calorie', 'weightTarget',
    ];
    const sources = readModuleSources();
    for (const [file, src] of Object.entries(sources)) {
      for (const word of forbidden) {
        // "calorie" is banned entirely (calorie counting is prohibited).
        expect(src.toLowerCase(), `${file} must not contain ${word}`).not.toContain(word);
      }
    }
  });

  it('2. suggestion generator never reads a diagnosis/lab/medication/mental-health record', () => {
    const suggestionsSrc = readModuleSources()['suggestions.ts'] ?? '';
    const typesSrc = readModuleSources()['types.ts'] ?? '';
    const ctxBlock = typesSrc.split('export interface SuggestionContext')[1] ?? '';
    const ctxBody = ctxBlock.split('export interface')[0];
    const clinicalKeys = ['diagnosis', 'labValue', 'lab', 'medication', 'mentalHealth', 'observation', 'record', 'clinical'];
    for (const key of clinicalKeys) {
      expect(ctxBody.toLowerCase(), `SuggestionContext must not contain ${key}`).not.toContain(key.toLowerCase());
    }
    // suggestions.ts must not import clinical modules.
    expect(suggestionsSrc).not.toMatch(/from '\.\.\/\.\.\/types'/);
    expect(suggestionsSrc).not.toMatch(/from '\.\.\/wellbeing\/insights/);
    expect(suggestionsSrc).not.toMatch(/restateValue|buildTrendSeries/);
  });

  it('3. no predictive output reaches a student-facing render', () => {
    const forbidden = ['predict', 'riskScore', 'probability', 'risk_score', 'prognosis', 'likelihood'];
    const sources = readModuleSources();
    for (const [file, src] of Object.entries(sources)) {
      for (const word of forbidden) {
        expect(src.toLowerCase(), `${file} must not contain ${word}`).not.toContain(word);
      }
    }
  });

  it('6. referral numbers resolve to live services (Tele-MANAS, no dead NEDA)', () => {
    const sources = readModuleSources();
    const all = Object.values(sources).join('\n');
    // Live Tele-MANAS must be present and reachable.
    expect(all).toContain('14416');
    expect(all).toContain('1800 891 4416');
    // The permanently-disconnected NEDA helpline must never be hardcoded.
    expect(all).not.toContain('NEDA');
  });
});
