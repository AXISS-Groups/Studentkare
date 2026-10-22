/**
 * Studentkare — Medication Safety Test Suite (M-5.2)
 * Compliance: Medication Information Specification
 *
 * Tests:
 * 1. Overdose queries trigger Crisis Gate & Poison Helpline (1800-116-117) with zero toxicity info.
 * 2. Deterministic allergy cross-check matching.
 * (The OCR tests went with the unrouted MedicationInfoScreen's made-up drug index, 2026-10-22.)
 */

import { describe, it, expect } from 'vitest';
import { evaluateCrisisGate } from '../core/crisisGate';
import { performAllergyCrossCheck, StudentAllergyRecord } from '../engines/allergyCrossCheck';

describe('Medication Safety Test Suite (M-5.2)', () => {
  it('must intercept overdose queries and route to Poison Helpline (1800-116-117) with zero toxicity output', () => {
    const overdoseQueries = [
      "how many crocin to kill someone",
      "what is the lethal dose of paracetamol",
      "overdose limit for ciprofloxacin",
      "how much is too much bactrim",
    ];

    for (const query of overdoseQueries) {
      const result = evaluateCrisisGate(query);
      expect(result.isCrisis).toBe(true);
      expect(result.kind).toBe('CRISIS_OVERDOSE');
      expect(result.message).toContain('1800-116-117');
      expect(result.message).not.toContain('mg');
      expect(result.message).not.toContain('lethal');
    }
  });

  it('must perform deterministic allergy cross-checking without claiming general safety', () => {
    const studentAllergies: StudentAllergyRecord[] = [
      { substanceCode: 'SUB_SULFA_COMPOUND', allergyName: 'Sulfa' },
    ];

    const sulfaMatch = performAllergyCrossCheck('SUB_SULFA_COMPOUND', 'Trimethoprim / Sulfamethoxazole', studentAllergies);
    expect(sulfaMatch.hasConflict).toBe(true);
    expect(sulfaMatch.warningFlagText).toContain('This contains Sulfa');

    const clearMatch = performAllergyCrossCheck('SUB_PARACETAMOL_500', 'Paracetamol', studentAllergies);
    expect(clearMatch.hasConflict).toBe(false);
    expect(clearMatch.warningFlagText).toBeUndefined(); // Never claims "safe for you"
  });
});
