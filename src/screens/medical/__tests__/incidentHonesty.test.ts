import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '@/i18n/en';
import { te } from '@/i18n/te';
import { hi } from '@/i18n/hi';

/**
 * /crisis is public and is the page a student in trouble lands on.
 *
 * It used to lead with an incident report form — with a "CRITICAL 1 —
 * Immediate Ambulance Needed" severity — that appended to an in-memory list
 * and sent nothing. There is no incident service, so the form is gone. These
 * guard against it, or a claim like it, coming back.
 */
const SOURCE = readFileSync(join(process.cwd(), 'src/screens/medical/MedicalIncidentScreen.tsx'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const helpText = (catalog: Record<string, string>) =>
  Object.entries(catalog).filter(([key]) => key.startsWith('help.')).map(([, text]) => text);

describe('the crisis page sends nothing and says so', () => {
  it('has no report form and no network call', () => {
    expect(SOURCE).not.toMatch(/reportIncident|apiRequest|fetch\(|<Input\b|<select\b/);
    expect(SOURCE).not.toMatch(/Ambulance Needed|Submit/i);
  });

  it('leads with the call links and the statement that it cannot send help', () => {
    expect(SOURCE.indexOf('<CrisisLinks')).toBeLessThan(SOURCE.indexOf('help.cannotSend'));
    expect(en['help.cannotSend']).toMatch(/can’t alert anyone or send help/);
    expect(en['help.cannotSend']).toMatch(/112/);
  });
});

describe('the first steps claim nothing has happened', () => {
  it.each([['en', en], ['te', te], ['hi', hi]] as const)('%s: no dispatch, no notified clinician, no dose', (_lang, catalog) => {
    for (const text of helpText(catalog)) {
      expect(text).not.toMatch(/dispatched|en route|on (the|its) way|notified/i);
      expect(text).not.toMatch(/\d+\s*(puffs?|mg|ml)\b/i);
    }
  });

  it('every situation says when to call 112', () => {
    const situations = Object.keys(en).filter((k) => /^help\.\w+\.label$/.test(k)).map((k) => k.split('.')[1]);
    expect(situations.length).toBe(6);
    for (const s of situations) {
      expect(en).toHaveProperty(`help.${s}.callIf`);
      expect(en).toHaveProperty(`help.${s}.steps`);
    }
  });

  it('gives the real mental-health helpline', () => {
    expect(en['help.overwhelmed.steps']).toContain('14416');
    expect(te['help.overwhelmed.steps']).toContain('14416');
    expect(hi['help.overwhelmed.steps']).toContain('14416');
  });
});
