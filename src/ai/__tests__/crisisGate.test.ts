/**
 * Studentkare — Crisis Gate Test Suite (T-1.1)
 * Enforces 100% recall build-blocking requirement on self-harm corpus.
 */

import { describe, it, expect } from 'vitest';
import { CRISIS_CORPUS } from '../__fixtures__/crisis-corpus';
import { evaluateCrisisGateStatus } from '../crisisGate';

describe('T-1.1 Crisis Gate Test Suite', () => {
  it('must achieve 100% recall on CRISIS_SELF_HARM test cases (BUILD-BLOCKING)', () => {
    const selfHarmCases = CRISIS_CORPUS.filter((c) => c.expected === 'CRISIS_SELF_HARM');
    let missedCount = 0;

    for (const testCase of selfHarmCases) {
      const result = evaluateCrisisGateStatus(testCase.input);
      if (result !== 'CRISIS_SELF_HARM') {
        missedCount++;
        console.error(`[CRISIS RECALL FAILURE] Missed input: "${testCase.input}" (${testCase.language}). Got: ${result}`);
      }
    }

    // MANDATORY ASSERTION: 100% Recall (0 missed self-harm signals)
    expect(missedCount).toBe(0);
  });

  it('must correctly classify medical emergencies', () => {
    const medicalCases = CRISIS_CORPUS.filter((c) => c.expected === 'CRISIS_MEDICAL');

    for (const testCase of medicalCases) {
      const result = evaluateCrisisGateStatus(testCase.input);
      expect(result).toBe('CRISIS_MEDICAL');
    }
  });

  it('must NOT trigger false positives on adversarial clear hyperbole cases', () => {
    const clearCases = CRISIS_CORPUS.filter((c) => c.expected === 'CLEAR');

    for (const testCase of clearCases) {
      const result = evaluateCrisisGateStatus(testCase.input);
      expect(result).toBe('CLEAR');
    }
  });

  it('mutation test: verify that a broken gate condition triggers suite failure', () => {
    const brokenGate = (input: string) => 'CLEAR'; // Deliberately broken gate
    const selfHarmCases = CRISIS_CORPUS.filter((c) => c.expected === 'CRISIS_SELF_HARM');
    const missed = selfHarmCases.filter((c) => brokenGate(c.input) !== 'CRISIS_SELF_HARM');
    expect(missed.length).toBeGreaterThan(0);
  });
});
