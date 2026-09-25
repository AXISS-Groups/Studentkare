import { describe, expect, it } from 'vitest';
import { adherenceSummary, shortDate } from '../MedicationPanel';

describe('adherence summary', () => {
  it('states the days covered over a full window', () => {
    expect(adherenceSummary({ daysCovered: 4, daysActive: 7, rate: 0.57 }, 7))
      .toBe('Logged on 4 of the last 7 days.');
  });

  it('counts only the days tracked when the plan is newer than the window', () => {
    // "3 of the last 30 days" would read as failure for someone three days in.
    expect(adherenceSummary({ daysCovered: 3, daysActive: 3, rate: 1 }, 30))
      .toBe('Logged on 3 of the 3 days you have been tracking.');
  });

  it('says day, not days, on the first day', () => {
    expect(adherenceSummary({ daysCovered: 1, daysActive: 1, rate: 1 }, 7))
      .toBe('Logged on 1 of the 1 day you have been tracking.');
  });

  it('says nothing at all when there is nothing to report', () => {
    expect(adherenceSummary(undefined, 7)).toBe('');
    expect(adherenceSummary({ daysCovered: 0, daysActive: 0, rate: null }, 7)).toBe('');
  });

  it('never frames the number as a score or a streak', () => {
    const text = adherenceSummary({ daysCovered: 7, daysActive: 7, rate: 1 }, 7);
    expect(text).not.toMatch(/streak|score|%|perfect|well done/i);
  });
});

describe('shortDate', () => {
  it('formats an ISO date for reading', () => {
    expect(shortDate('2026-09-23')).toMatch(/23/);
    expect(shortDate('2026-09-23')).toMatch(/Sep/);
  });

  it('returns anything unparseable unchanged rather than showing Invalid Date', () => {
    expect(shortDate('not-a-date')).toBe('not-a-date');
  });
});
