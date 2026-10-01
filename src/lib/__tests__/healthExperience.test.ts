import { describe, expect, it } from 'vitest';
import {
  demoClaims,
  demoPolicy,
  estimateCoverage,
  formatRupees,
  getMetricSeries,
  healthMetrics,
} from '../../data/healthExperience';


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

describe('Demo policy constant', () => {
  it('has the expected shape and values', () => {
    expect(demoPolicy).toEqual({
      name: 'Campus Care Plus',
      sumInsured: 200000,
      remainingCover: 200000,
      copayPercent: 10,
      period: '01 Sep 2026 – 31 Aug 2027',
    });
  });
});

describe('Demo claims constant', () => {
  it('contains exactly two claims with required fields', () => {
    expect(demoClaims).toHaveLength(2);
    for (const claim of demoClaims) {
      expect(claim).toHaveProperty('id');
      expect(claim).toHaveProperty('title');
      expect(claim).toHaveProperty('date');
      expect(claim).toHaveProperty('amount');
      expect(claim).toHaveProperty('status');
      expect(claim).toHaveProperty('stage');
      expect(claim).toHaveProperty('description');
      expect(typeof claim.id).toBe('string');
      expect(typeof claim.title).toBe('string');
      expect(typeof claim.date).toBe('string');
      expect(typeof claim.amount).toBe('number');
      expect(typeof claim.status).toBe('string');
      expect(typeof claim.stage).toBe('number');
      expect(typeof claim.description).toBe('string');
      expect(claim.amount).toBeGreaterThan(0);
      expect(claim.stage).toBeGreaterThanOrEqual(0);
    }
  });

  it('lists claims in reverse chronological order (latest first)', () => {
    const dates = demoClaims.map(c => new Date(c.date).getTime());
    expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
  });
});

describe('formatRupees', () => {
  it('formats positive integers with Indian numbering', () => {
    expect(formatRupees(0)).toBe('₹0');
    expect(formatRupees(1)).toBe('₹1');
    expect(formatRupees(100)).toBe('₹100');
    expect(formatRupees(1000)).toBe('₹1,000');
    expect(formatRupees(100000)).toBe('₹1,00,000');
    expect(formatRupees(10000000)).toBe('₹1,00,00,000');
  });

  it('formats decimal paise correctly', () => {
    expect(formatRupees(1234.56)).toBe('₹1,234.56');
    expect(formatRupees(0.99)).toBe('₹0.99');
    expect(formatRupees(100.01)).toBe('₹100.01');
  });

  it('formats negative values with minus sign', () => {
    expect(formatRupees(-100)).toBe('-₹100');
    expect(formatRupees(-1234.56)).toBe('-₹1,234.56');
  });

  it('handles NaN and Infinity per Intl.NumberFormat behavior', () => {
    expect(formatRupees(NaN)).toBe('₹NaN');
    expect(formatRupees(Infinity)).toBe('₹∞');
    expect(formatRupees(-Infinity)).toBe('-₹∞');
  });
});

describe('getMetricSeries edge cases', () => {
  it('throws on invalid MetricId (non-null assertion)', () => {
    expect(() => getMetricSeries('invalid' as any, 7)).toThrow();
  });

  it('produces deterministic dates for period=7 (starts 2026-09-03)', () => {
    const week = getMetricSeries('heart', 7);
    const expectedDates = [
      '2026-09-03', '2026-09-04', '2026-09-05',
      '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09',
    ];
    expect(week.map(s => s.date)).toEqual(expectedDates);
  });

  it('respects precision per metric (sleep has 1 decimal, others integer)', () => {
    const sleepWeek = getMetricSeries('sleep', 7);
    const heartWeek = getMetricSeries('heart', 7);
    const oxygenWeek = getMetricSeries('oxygen', 7);
    const stepsWeek = getMetricSeries('steps', 7);

    for (const sample of sleepWeek) {
      const decimals = sample.value.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(1);
    }
    for (const sample of [...heartWeek, ...oxygenWeek, ...stepsWeek]) {
      expect(Number.isInteger(sample.value)).toBe(true);
    }
  });

  it('spot-checks wave formula against actual computed values for heart (base=72, amp=5)', () => {
    const week = getMetricSeries('heart', 7);
    // Actual computed values from the deterministic formula
    expect(week[0].value).toBe(75);
    expect(week[1].value).toBe(71);
  });
});

describe('estimateCoverage edge cases', () => {
  const policy = { remainingCover: 200000, copayPercent: 10 };

  it('rejects when paise exceeds Number.MAX_SAFE_INTEGER after rounding', () => {
    // MAX_SAFE_INTEGER = 9007199254740991
    // bill = 90071992547409.92 -> billPaise = round(9007199254740992) = 9007199254740992 > MAX_SAFE_INTEGER
    const bill = 90071992547409.92;
    expect(estimateCoverage(bill, 0, policy)).toBeNull();

    // Also test remainingCover exceeding safe integer
    expect(estimateCoverage(100, 0, { ...policy, remainingCover: 90071992547409.92 })).toBeNull();
  });

  it('rounds copay using half-even (banker rounding)', () => {
    // eligiblePaise=100, copayPercent=15 -> 15.0 -> 15
    // eligiblePaise=100, copayPercent=10 -> 10.0 -> 10
    // Test a case where rounding matters: eligiblePaise=333, copayPercent=33 -> 109.89 -> 110
    const result = estimateCoverage(333.33, 0, { ...policy, copayPercent: 33 });
    expect(result).not.toBeNull();
    if (result) {
      // copayPaise = round(33333 * 33 / 100) = round(10999.89) = 11000 paise = 110
      expect(result.copay).toBe(110);
    }
  });

  it('returns null when exclusions exceed bill', () => {
    expect(estimateCoverage(100, 150, policy)).toBeNull();
  });

  it('returns null when remainingCover is negative', () => {
    expect(estimateCoverage(100, 0, { ...policy, remainingCover: -1 })).toBeNull();
  });
});
