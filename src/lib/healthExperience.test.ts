import { describe, expect, it } from 'vitest';
import { estimateCoverage, getMetricSeries, healthMetrics } from '../data/healthExperience';

describe('Coverage estimates', () => {
  const policy = { remainingCover: 200000, copayPercent: 10 };

  it('applies exclusions before co-pay and reconciles the bill', () => {
    expect(estimateCoverage(45000, 2850, policy)).toEqual({
      covered: 37935, outOfPocket: 7065, copay: 4215, excluded: 2850, limitExcess: 0,
    });
  });

  it('caps the benefit at remaining cover and explains the excess', () => {
    expect(estimateCoverage(300000, 0, policy)).toEqual({
      covered: 200000, outOfPocket: 100000, copay: 30000, excluded: 0, limitExcess: 70000,
    });
  });

  it('handles fully excluded bills and exhausted cover', () => {
    expect(estimateCoverage(100, 100, policy)?.covered).toBe(0);
    expect(estimateCoverage(100, 0, { ...policy, remainingCover: 0 })?.outOfPocket).toBe(100);
    expect(estimateCoverage(0, 0, policy)?.outOfPocket).toBe(0);
  });

  it.each([
    [-1, 0], [100, -1], [100, 101], [NaN, 0], [Infinity, 0], [100, NaN], [1e308, 0],
  ])('rejects invalid monetary input (%s, %s)', (bill, exclusions) => {
    expect(estimateCoverage(bill, exclusions, policy)).toBeNull();
  });

  it.each([-1, 101, NaN, Infinity])('rejects invalid co-pay %s', (copayPercent) => {
    expect(estimateCoverage(100, 0, { ...policy, copayPercent })).toBeNull();
  });

  it('rejects invalid remaining cover and rounds money to paise', () => {
    expect(estimateCoverage(100, 0, { ...policy, remainingCover: -1 })).toBeNull();
    expect(estimateCoverage(100, 0, { ...policy, remainingCover: 1e308 })).toBeNull();
    const result = estimateCoverage(100.99, 0, policy)!;
    expect(result.covered).toBe(90.89);
    expect(result.outOfPocket).toBe(10.10);
    expect(result.covered + result.outOfPocket).toBeCloseTo(100.99);
  });
});

describe('Demo health history', () => {
  it('returns chronological dated samples for each selectable period', () => {
    for (const metric of healthMetrics) {
      const week = getMetricSeries(metric.id, 7);
      const month = getMetricSeries(metric.id, 30);
      const quarter = getMetricSeries(metric.id, 90);
      expect(week).toHaveLength(7);
      expect(month).toHaveLength(30);
      expect(quarter).toHaveLength(90);
      expect(month.slice(-7)).toEqual(week);
      expect(quarter.slice(-30)).toEqual(month);
      expect(week.map(sample => sample.date)).toEqual(week.map(sample => sample.date).sort());
      expect(week.every(sample => Number.isFinite(sample.value))).toBe(true);
    }
  });
});
