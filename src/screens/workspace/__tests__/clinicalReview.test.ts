import { describe, expect, it } from 'vitest';
import { overdueReason, waited } from '../ClinicalReviewPanel';

describe('waited', () => {
  it('uses seconds, minutes and hours at the scales they suit', () => {
    expect(waited(45)).toBe('45s');
    expect(waited(300)).toBe('5 min');
    expect(waited(7200)).toBe('2 hr 0 min');
  });

  it('switches to days rather than making the reader divide', () => {
    // An uncollected sample can sit for a week. "168 hr" is a number you have
    // to stop and work out.
    expect(waited(86400)).toBe('1 day');
    expect(waited(86400 * 4 + 3600 * 5)).toBe('4 days 5 hr');
  });

  it('says day, not days, for exactly one', () => {
    expect(waited(86400 + 60)).toBe('1 day');
  });
});

describe('overdueReason', () => {
  it('distinguishes a passed slot from one that was never recorded', () => {
    expect(overdueReason('slot_passed')).toMatch(/slot has passed/i);
    expect(overdueReason('no_slot_recorded')).toMatch(/no collection slot/i);
  });

  it('never shows the raw reason code', () => {
    for (const code of ['slot_passed', 'no_slot_recorded', 'something_new']) {
      expect(overdueReason(code)).not.toMatch(/_/);
    }
  });
});
