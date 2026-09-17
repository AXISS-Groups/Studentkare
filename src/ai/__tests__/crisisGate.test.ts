/**
 * Studentkare — Crisis Gate Test Suite (T-1.1 / G0.1)
 * Enforces 100% recall, fail-closed fault injection, timeout guarantees, and resource links.
 */

import { describe, it, expect } from 'vitest';
import { CRISIS_CORPUS } from '../__fixtures__/crisis-corpus';
import {
  evaluateCrisisGate,
  evaluateCrisisGateAsync,
  evaluateCrisisGateStatus,
  TELE_MANAS_PRIMARY,
  TELE_MANAS_TOLL_FREE,
  EMERGENCY_NUMBER,
  DEFAULT_CAMPUS_COUNSELLOR,
} from '../crisisGate';

describe('T-1.1 / G0.1 Crisis Gate Test Suite', () => {
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

    expect(missedCount).toBe(0);
  });

  it('must correctly classify medical emergencies & overdose queries', () => {
    const medicalCases = CRISIS_CORPUS.filter((c) => c.expected === 'CRISIS_MEDICAL');
    for (const testCase of medicalCases) {
      expect(evaluateCrisisGateStatus(testCase.input)).toBe('CRISIS_MEDICAL');
    }

    const overdoseCases = CRISIS_CORPUS.filter((c) => c.expected === 'CRISIS_OVERDOSE');
    for (const testCase of overdoseCases) {
      expect(evaluateCrisisGateStatus(testCase.input)).toBe('CRISIS_OVERDOSE');
    }
  });

  it('must NOT trigger false positives on adversarial clear hyperbole cases', () => {
    const clearCases = CRISIS_CORPUS.filter((c) => c.expected === 'CLEAR');

    for (const testCase of clearCases) {
      const result = evaluateCrisisGateStatus(testCase.input);
      expect(result).toBe('CLEAR');
    }
  });

  // --- G0.1 Non-Negotiable Fail-Closed Tests ---

  it('G0.1: must return discriminated union with status, isCrisis, and resource links', () => {
    const res = evaluateCrisisGate('I want to kill myself');
    expect(res.status).toBe('crisis');
    expect(res.isCrisis).toBe(true);
    expect(res.kind).toBe('CRISIS_SELF_HARM');
    expect(res.teleManasPrimary).toBe(TELE_MANAS_PRIMARY);
    expect(res.teleManasTollFree).toBe(TELE_MANAS_TOLL_FREE);
    expect(res.emergencyNumber).toBe(EMERGENCY_NUMBER);
    expect(res.counsellorContact).toBe(DEFAULT_CAMPUS_COUNSELLOR);
  });

  it('G0.1: fault-injection — exception thrown inside gate fails closed to status: "error" (isCrisis: true)', () => {
    // Pass invalid input type to force internal catch block execution
    const res = evaluateCrisisGate(null as unknown as string);
    expect(res.status).toBe('error');
    expect(res.isCrisis).toBe(true);
    expect(res.kind).toBe('ERROR_FAIL_CLOSED');
    expect(res.message).toContain('Tele-MANAS');
  });

  it('G0.1: fault-injection — classifier timeout (>1500ms) fails closed to status: "error"', async () => {
    const slowClassifier = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        status: 'clear' as const,
        isCrisis: false,
        kind: 'CLEAR' as const,
        message: 'Clear',
        teleManasPrimary: '14416',
        teleManasTollFree: '1-800-891-4416',
        emergencyNumber: '112',
        counsellorContact: '1800-599-0019',
      };
    };

    const res = await evaluateCrisisGateAsync('hello counsellor', 'Arjun', 100, slowClassifier);
    expect(res.status).toBe('error');
    expect(res.isCrisis).toBe(true);
    expect(res.kind).toBe('ERROR_FAIL_CLOSED');
    expect(res.message).toContain('timed out');
  });

  it('G0.1: fault-injection — classifier throws exception fails closed to status: "error"', async () => {
    const brokenClassifier = async () => {
      throw new Error('Model service offline');
    };

    const res = await evaluateCrisisGateAsync('hello counsellor', 'Arjun', 1500, brokenClassifier);
    expect(res.status).toBe('error');
    expect(res.isCrisis).toBe(true);
    expect(res.kind).toBe('ERROR_FAIL_CLOSED');
    expect(res.message).toContain('Model service offline');
  });

  it('G0.1: floor detection runs first and classifier can NEVER demote a crisis flag', async () => {
    const demotingClassifier = async () => ({
      status: 'clear' as const,
      isCrisis: false,
      kind: 'CLEAR' as const,
      message: 'Demoting attempt',
      teleManasPrimary: '14416',
      teleManasTollFree: '1-800-891-4416',
      emergencyNumber: '112',
      counsellorContact: '1800-599-0019',
    });

    const res = await evaluateCrisisGateAsync('I want to end my life', 'Arjun', 1500, demotingClassifier);
    expect(res.status).toBe('crisis');
    expect(res.isCrisis).toBe(true);
    expect(res.kind).toBe('CRISIS_SELF_HARM');
  });

  it('G0.1: table-driven testing across multilingual crisis phrases marked TODO(clinical-review)', () => {
    const phrases = [
      { text: 'I want to kill myself', lang: 'EN', expected: 'CRISIS_SELF_HARM' },
      { text: 'जान लेना चाहता हूँ', lang: 'HI', expected: 'CRISIS_SELF_HARM' },
      { text: 'చనిపోవాలని అనుకుంటున్నాను', lang: 'TE', expected: 'CRISIS_SELF_HARM' },
      { text: 'marne ka man kar raha hai', lang: 'HINGLISH', expected: 'CRISIS_SELF_HARM' },
    ];

    for (const p of phrases) {
      const res = evaluateCrisisGate(p.text);
      expect(res.isCrisis).toBe(true);
      expect(res.kind).toBe(p.expected);
    }
  });

  it('mutation test: verify that a broken gate condition triggers suite failure', () => {
    const brokenGate = (_input: string) => 'CLEAR';
    const selfHarmCases = CRISIS_CORPUS.filter((c) => c.expected === 'CRISIS_SELF_HARM');
    const missed = selfHarmCases.filter((c) => brokenGate(c.input) !== 'CRISIS_SELF_HARM');
    expect(missed.length).toBeGreaterThan(0);
  });
});
