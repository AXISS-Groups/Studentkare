/**
 * Advisor-approved reference ranges (versioned, sourced).
 *
 * Out-of-range detection against these tables is deterministic and permitted.
 * INTERPRETATION is NOT — a flag reads "outside typical range, flagged for
 * clinical review", never a conclusion.
 *
 * Body metrics (BMI) are flagged `isBodyMetric` and are shown ONLY when a
 * clinician recorded them, with clinical context — never as a score, headline
 * or directional arrow, and never with a target.
 */
import type { ReferenceRange } from './types';

export const REFERENCE_RANGES: ReferenceRange[] = [
  {
    code: '718-7',
    display: 'Haemoglobin',
    unit: 'g/dL',
    typicalRange: '12.0 - 15.0 (women) · 13.0 - 17.0 (men)',
    source: 'Advisor-approved lab reference table',
    version: '1.0.0',
    advisorApproved: true,
    isBodyMetric: false,
  },
  {
    code: '6690-2',
    display: 'Total Leukocyte Count (WBC)',
    unit: '/µL',
    typicalRange: '4,000 - 11,000',
    source: 'Advisor-approved lab reference table',
    version: '1.0.0',
    advisorApproved: true,
    isBodyMetric: false,
  },
  {
    code: '777-3',
    display: 'Platelet Count',
    unit: '/µL',
    typicalRange: '150,000 - 450,000',
    source: 'Advisor-approved lab reference table',
    version: '1.0.0',
    advisorApproved: true,
    isBodyMetric: false,
  },
  {
    code: '1558-6',
    display: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    typicalRange: '70 - 99',
    source: 'Advisor-approved lab reference table',
    version: '1.0.0',
    advisorApproved: true,
    isBodyMetric: false,
  },
  {
    code: '8480-6',
    display: 'Systolic Blood Pressure',
    unit: 'mmHg',
    typicalRange: '90 - 120',
    source: 'Advisor-approved vital reference table',
    version: '1.0.0',
    advisorApproved: true,
    isBodyMetric: false,
  },
  {
    code: '8462-4',
    display: 'Diastolic Blood Pressure',
    unit: 'mmHg',
    typicalRange: '60 - 80',
    source: 'Advisor-approved vital reference table',
    version: '1.0.0',
    advisorApproved: true,
    isBodyMetric: false,
  },
  {
    code: '39156-5',
    display: 'Body Mass Index (BMI)',
    unit: 'kg/m²',
    typicalRange: '18.5 - 24.9',
    source: 'Clinician-recorded camp measurement',
    version: '1.0.0',
    advisorApproved: true,
    isBodyMetric: true,
  },
];

export function getReferenceRange(code: string): ReferenceRange | undefined {
  return REFERENCE_RANGES.find((r) => r.code === code && r.advisorApproved);
}

/**
 * Deterministic out-of-range check for a numeric value against a range string
 * like "90 - 120". Returns true when the value falls outside the typical range.
 * Does NOT interpret — see `restateValue`.
 */
export function isOutsideTypicalRange(value: number, rangeString: string): boolean {
  const m = rangeString.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return false;
  const lo = parseFloat(m[1]);
  const hi = parseFloat(m[2]);
  return value < lo || value > hi;
}
