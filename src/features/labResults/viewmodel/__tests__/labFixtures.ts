import type { LabValue, LabValuesList } from '../../data/LabResultsRepository';

let n = 0;

export function value(over: Partial<LabValue> = {}): LabValue {
  n += 1;
  return {
    id: `v${n}`, testKey: '4548-4', testCode: '4548-4', testName: 'HbA1c', testNameAsPrinted: 'HbA1c',
    bodySystem: 'BLOOD_SUGAR', valueNumeric: 6.1, valueText: '', unit: '%', refLow: 4, refHigh: 5.6,
    refText: '4.0 - 5.6', rangeState: 'ABOVE', rangeSource: 'TYPED_FROM_REPORT', collectedOn: '2026-06-20',
    labName: 'City Lab', source: 'STUDENT_CONFIRMED', documentId: 'doc-1', labOrderId: null, status: 'CONFIRMED',
    createdAt: n, confirmedAt: n, ...over,
  };
}

export function list(items: LabValue[]): LabValuesList {
  const counts = { IN_RANGE: 0, ABOVE: 0, BELOW: 0, NO_RANGE: 0 };
  items.forEach(i => { counts[i.rangeState] += 1; });
  return {
    reports: items.length ? [{ key: 'doc-1', documentId: 'doc-1', labOrderId: null, labName: 'City Lab',
      collectedOn: '2026-06-20', source: 'STUDENT_CONFIRMED', rangeCounts: counts, items }] : [],
    bodySystems: [],
    total: items.length,
  };
}
