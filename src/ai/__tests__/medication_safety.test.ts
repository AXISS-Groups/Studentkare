/**
 * Studentkare — Medication Safety Test Suite (M-5.2)
 * Compliance: Medication Information Specification
 *
 * Tests:
 * 1. Overdose queries trigger Crisis Gate & Poison Helpline (1800-116-117) with zero toxicity info.
 * 2. Deterministic allergy cross-check matching.
 * 3. OCR confidence scoring and low-confidence resolution handling.
 * 4. Unlabelled pill resolution refusal.
 */

import { describe, it, expect } from 'vitest';
import { evaluateCrisisGate } from '../crisisGate';
import { performAllergyCrossCheck, StudentAllergyRecord } from '../allergyCrossCheck';
import { resolveOCRTextToCDCI, normalizeOCRText } from '../ocrResolutionPipeline';

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

  it('must handle low-confidence OCR scans without guessing', () => {
    const unreadableText = "XYZ_BLURRED_TEXT_99";
    const result = resolveOCRTextToCDCI(unreadableText);
    expect(result.status).toBe('LOW_CONFIDENCE_UNRESOLVED');
    expect(result.confidenceScore).toBeLessThan(0.5);
    expect(result.message).toContain("I couldn't read this clearly enough");
  });

  it('must normalize common OCR character confusions correctly', () => {
    const raw = "crocin 65O mg";
    const clean = normalizeOCRText(raw);
    expect(clean).toBe("CROCIN 650 MG");
  });
});
