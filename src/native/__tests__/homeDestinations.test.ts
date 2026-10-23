import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { destinationsFor } from '../homeDestinations';
import { translate } from '@/i18n';

const app = readFileSync(resolve(process.cwd(), 'src/native/App.tsx'), 'utf8');
const screens = new Set([...app.matchAll(/<Stack\.Screen name="([A-Za-z]+)"/g)].map((m) => m[1]));

describe('native home destinations', () => {
  it.each(['STUDENT', 'NMC_DOCTOR'] as const)('%s: every destination is a registered screen', (role) => {
    for (const d of destinationsFor(role)) expect(screens.has(d.route), d.route).toBe(true);
  });

  it('does not register screens that call endpoints the backend does not have', () => {
    for (const removed of ['LifeShare', 'Claims', 'Incidents', 'Scanners']) expect(screens.has(removed), removed).toBe(false);
  });

  it.each(['STUDENT', 'NMC_DOCTOR'] as const)('%s: every label and hint is an i18n key with copy in every language', (role) => {
    for (const d of destinationsFor(role)) {
      for (const lang of ['en', 'te', 'hi'] as const) {
        expect(translate(lang, d.label), `${lang} ${d.label}`).toMatch(/\S/);
        expect(translate(lang, d.hint), `${lang} ${d.hint}`).toMatch(/\S/);
      }
    }
  });

  it('does not promise a video consult that cannot start', () => {
    const consult = destinationsFor('STUDENT').find((d) => d.route === 'Teleconsult');
    expect(consult?.hint).toBe('dest.Teleconsult.hint');
    expect(translate('en', 'dest.Teleconsult.hint')).toBe('Not available yet');
  });
});
