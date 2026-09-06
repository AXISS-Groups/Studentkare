import { describe, it, expect } from 'vitest';
import { normalizeInput, evaluateCrisisGate } from '../crisisGate';

describe('Crisis Gate Classifier (P0.1)', () => {
  describe('normalizeInput', () => {
    it('normalises casing, whitespace, and curly apostrophes', () => {
      expect(normalizeInput("  CAN’T  take   it  ")).toBe("can't take it");
      expect(normalizeInput("KİL MYSELF")).toBe("kil myself");
    });

    it('strips zero-width characters and control codes', () => {
      const inputWithZeroWidth = "kill\u200Bmyself";
      expect(normalizeInput(inputWithZeroWidth)).toBe("killmyself");
    });
  });

  describe('evaluateCrisisGate - Self-Harm & Suicide Triage', () => {
    it('flags straight-quote and curly-quote self-harm phrases', () => {
      const res1 = evaluateCrisisGate("can't take it anymore", 'Arjun');
      expect(res1.kind).toBe('CRISIS_SELF_HARM');
      if (res1.kind === 'CRISIS_SELF_HARM') {
        expect(res1.severity).toBe('URGENT');
        expect(res1.phone).toBe('14416');
      }

      const res2 = evaluateCrisisGate("I can’t take it", 'Arjun');
      expect(res2.kind).toBe('CRISIS_SELF_HARM');
    });

    it('flags common misspellings (kil myself, suicid, end it all)', () => {
      expect(evaluateCrisisGate('want to kil myself').kind).toBe('CRISIS_SELF_HARM');
      expect(evaluateCrisisGate('feeling suicidal today').kind).toBe('CRISIS_SELF_HARM');
      expect(evaluateCrisisGate('i want to end it all').kind).toBe('CRISIS_SELF_HARM');
    });

    it('flags Hindi transliterated self-harm queries', () => {
      expect(evaluateCrisisGate('mujhe mar jana hai').kind).toBe('CRISIS_SELF_HARM');
      expect(evaluateCrisisGate('khudkhushi karna chahta hu').kind).toBe('CRISIS_SELF_HARM');
    });

    it('flags Telugu transliterated self-harm queries', () => {
      expect(evaluateCrisisGate('naaku chachipovala ani undi').kind).toBe('CRISIS_SELF_HARM');
      expect(evaluateCrisisGate('chavalanipistondi').kind).toBe('CRISIS_SELF_HARM');
    });
  });

  describe('evaluateCrisisGate - Acute Medical Emergencies', () => {
    it('flags chest pain and breathing difficulty', () => {
      const res = evaluateCrisisGate('I am having severe chest pain', 'Arjun');
      expect(res.kind).toBe('CRISIS_MEDICAL');
      if (res.kind === 'CRISIS_MEDICAL') {
        expect(res.severity).toBe('URGENT');
        expect(res.phone).toBe('108');
      }
    });

    it('flags Hindi & Telugu medical emergency phrases', () => {
      expect(evaluateCrisisGate('mujhe saans nahi aa rahi').kind).toBe('CRISIS_MEDICAL');
      expect(evaluateCrisisGate('gunde noppi vastondi').kind).toBe('CRISIS_MEDICAL');
    });
  });

  describe('evaluateCrisisGate - CLEAR inputs', () => {
    it('returns CLEAR for routine wellness and lab queries', () => {
      expect(evaluateCrisisGate('What is my platelet count in CBC?').kind).toBe('CLEAR');
      expect(evaluateCrisisGate('When is the health camp active today?').kind).toBe('CLEAR');
    });
  });
});
