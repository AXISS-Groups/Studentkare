export type MetricId = 'heart' | 'oxygen' | 'sleep' | 'steps';
export type MetricPeriod = 7 | 30 | 90;

export const healthMetrics = [
  { id: 'heart' as const, label: 'Resting heart rate', unit: 'bpm', color: '#d96785', base: 72, amplitude: 5, precision: 0, description: 'Your resting pulse over time. Activity, stress, and sleep can influence this measurement.' },
  { id: 'oxygen' as const, label: 'Blood oxygen', unit: '%', color: '#458dcb', base: 98, amplitude: 1, precision: 0, description: 'An oxygen saturation trend. Device fit and movement can affect the reading.' },
  { id: 'sleep' as const, label: 'Sleep duration', unit: 'hrs', color: '#8270d8', base: 7.5, amplitude: 0.8, precision: 1, description: 'Time asleep each night. Look for a consistent routine rather than a single perfect night.' },
  { id: 'steps' as const, label: 'Daily movement', unit: 'steps', color: '#269d89', base: 7200, amplitude: 1800, precision: 0, description: 'Daily steps in this sample history. Set an activity goal that fits your circumstances.' },
];

// Fixed, reproducible sample history. Never presented as live device measurements.
export function getMetricSeries(id: MetricId, period: MetricPeriod) {
  const metric = healthMetrics.find(item => item.id === id)!;
  return Array.from({ length: period }, (_, index) => {
    const day = 90 - period + index;
    const date = new Date(Date.UTC(2026, 5, 12 + day)).toISOString().slice(0, 10);
    const wave = Math.sin(day * 1.7) * 0.6 + Math.cos(day * 0.45) * 0.4;
    const value = Number((metric.base + metric.amplitude * wave).toFixed(metric.precision));
    return { date, value };
  });
}

export const demoPolicy = {
  name: 'Campus Care Plus',
  sumInsured: 200000,
  remainingCover: 200000,
  copayPercent: 10,
  period: '01 Sep 2026 – 31 Aug 2027',
};

export const demoClaims = [
  { id: 'sample-01', title: 'Outpatient consultation', date: '06 Sep 2026', amount: 1500, status: 'Under review', stage: 1, description: 'The consultation invoice has been received. A reviewer will check the documents and policy terms.' },
  { id: 'sample-02', title: 'Annual diagnostic screening', date: '02 Sep 2026', amount: 2800, status: 'Documents needed', stage: 0, description: 'An itemised lab invoice is missing from this example. Prepare the invoice, report, and referral before contacting your insurer.' },
];

export function estimateCoverage(
  bill: number,
  exclusions: number,
  policy: { remainingCover: number; copayPercent: number },
) {
  if (![bill, exclusions, policy.remainingCover, policy.copayPercent].every(Number.isFinite)
    || bill < 0 || exclusions < 0 || exclusions > bill || policy.remainingCover < 0
    || policy.copayPercent < 0 || policy.copayPercent > 100) return null;

  const billPaise = Math.round(bill * 100);
  const excludedPaise = Math.round(exclusions * 100);
  const remainingPaise = Math.round(policy.remainingCover * 100);
  if (![billPaise, excludedPaise, remainingPaise].every(Number.isSafeInteger)) return null;
  const eligiblePaise = billPaise - excludedPaise;
  const copayPaise = Math.round(eligiblePaise * policy.copayPercent / 100);
  const benefitPaise = eligiblePaise - copayPaise;
  const coveredPaise = Math.min(benefitPaise, remainingPaise);
  return {
    covered: coveredPaise / 100,
    outOfPocket: (billPaise - coveredPaise) / 100,
    copay: copayPaise / 100,
    excluded: excludedPaise / 100,
    limitExcess: (benefitPaise - coveredPaise) / 100,
  };
}

export const formatRupees = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(value);
