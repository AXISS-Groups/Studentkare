import { describe, it, expect, beforeEach } from 'vitest';
import { RetentionLifecycleEngine, RetentionStatus } from '../retentionLifecycleEngine';

describe('RetentionLifecycleEngine (P57)', () => {
  let engine: RetentionLifecycleEngine;

  beforeEach(() => {
    engine = new RetentionLifecycleEngine();
  });

  it('transitions active student status to GRADUATED with 7-year legal hold', () => {
    const status: RetentionStatus = {
      state: 'ACTIVE',
      medicalHoldActive: false
    };

    const graduated = engine.processGraduation(status);
    expect(graduated.state).toBe('GRADUATED');
    expect(graduated.medicalHoldActive).toBe(true);
    expect(graduated.legalPurgeDate).toBeDefined();
  });

  it('archives record after graduation', () => {
    const status: RetentionStatus = {
      state: 'GRADUATED',
      medicalHoldActive: true
    };

    const archived = engine.processArchival(status);
    expect(archived.state).toBe('ARCHIVED');
    expect(archived.archivedAt).toBeDefined();
  });

  it('evaluates purge eligibility only after 7-year retention window passes', () => {
    const now = Date.now();
    const sevenYearsMs = 7 * 365.25 * 24 * 60 * 60 * 1000;
    const purgeDateStr = new Date(now + sevenYearsMs).toISOString();

    const status: RetentionStatus = {
      state: 'ARCHIVED',
      medicalHoldActive: true,
      legalPurgeDate: purgeDateStr
    };

    // Before 7 years pass -> Remains ARCHIVED
    const currentEval = engine.evaluatePurgeEligibility(status, now);
    expect(currentEval.state).toBe('ARCHIVED');
    expect(currentEval.medicalHoldActive).toBe(true);

    // After 7 years pass -> Transitions to ELIGIBLE_FOR_PURGE
    const futureEval = engine.evaluatePurgeEligibility(status, now + sevenYearsMs + 1000);
    expect(futureEval.state).toBe('ELIGIBLE_FOR_PURGE');
    expect(futureEval.medicalHoldActive).toBe(false);
  });
});
