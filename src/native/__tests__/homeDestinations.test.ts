import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { destinationsFor } from '../homeDestinations';

const app = readFileSync(resolve(process.cwd(), 'src/native/App.tsx'), 'utf8');
const screens = new Set([...app.matchAll(/<Stack\.Screen name="([A-Za-z]+)"/g)].map((m) => m[1]));

describe('native home destinations', () => {
  it.each(['STUDENT', 'NMC_DOCTOR'] as const)('%s: every destination is a registered screen', (role) => {
    for (const d of destinationsFor(role)) expect(screens.has(d.route), d.route).toBe(true);
  });

  it('does not register screens that call endpoints the backend does not have', () => {
    for (const removed of ['LifeShare', 'Claims', 'Incidents', 'Scanners']) expect(screens.has(removed), removed).toBe(false);
  });

  it('does not promise a video consult that cannot start', () => {
    const consult = destinationsFor('STUDENT').find((d) => d.route === 'Teleconsult');
    expect(consult?.hint).toBe('Not available yet');
  });
});
