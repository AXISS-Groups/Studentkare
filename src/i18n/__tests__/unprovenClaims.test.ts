import { describe, expect, it } from 'vitest';
import { clinicianEn, clinicianHi, clinicianTe } from '../areas/clinician';

// Audit 2026-10-22 (Low): nothing checks a lab's accreditation, so the lab orders
// screen must not claim "NABL labs only" (AGENTS.md rule 6: no compliance claim
// that isn't computed from evidence).
describe('lab orders copy', () => {
  it('makes no accreditation claim the product does not enforce', () => {
    for (const catalogue of [clinicianEn, clinicianTe, clinicianHi]) {
      expect(catalogue['clinLab.subtitle']).not.toMatch(/NABL/);
    }
  });
});
