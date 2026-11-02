/**
 * Insights — descriptive only.
 *
 * I-3.1 Value restatement: value + range + plain-language meaning + provenance.
 * I-3.2 Flags come from clinicians, not the app (deterministic range check only).
 * I-3.3 Trends: a series over time. NEVER interpreted — no "improving"/"worsening".
 * I-3.4 Record completeness: what is present, missing, due.
 */
import type { HealthRecord, FHIRObservation, HealthCamp, StudentProfile } from '../../types';
import type { ValueRestatement, TrendSeries, CompletenessItem } from './types';
import { getReferenceRange, isOutsideTypicalRange } from './referenceRanges';

const PLAIN_LANGUAGE: Record<string, string> = {
  '718-7': 'Haemoglobin carries oxygen in your blood.',
  '6690-2': 'White blood cells help your body fight infection.',
  '777-3': 'Platelets help your blood to clot.',
  '1558-6': 'Fasting blood glucose is a measure of sugar in your blood after not eating.',
  '8480-6': 'Systolic blood pressure is the pressure in your arteries when your heart beats.',
  '8462-4': 'Diastolic blood pressure is the pressure in your arteries between beats.',
  '39156-5': 'Body Mass Index (BMI) is a weight-for-height figure. Body metrics are shown for clinical context only.',
};

function sourceLabel(record: HealthRecord): string {
  switch (record.sourceType) {
    case 'CAMP':
      return 'Camp screening';
    case 'ABDM_PULL':
      return 'ABDM record';
    case 'SCAN':
      return 'Document scan';
    case 'UPLOAD':
      return 'Uploaded record';
    case 'MANUAL':
      return 'Manually entered';
    default:
      return 'Recorded';
  }
}

/**
 * I-3.1 Value restatement. Never a diagnosis, prediction, or advice on a
 * clinical finding. `outsideTypicalRange` is a deterministic range check only.
 */
export function restateValue(observation: FHIRObservation, record: HealthRecord): ValueRestatement {
  const range = getReferenceRange(observation.code);
  const typical = range?.typicalRange ?? observation.referenceRange ?? 'Not available';
  const plain = PLAIN_LANGUAGE[observation.code] ?? 'This measurement is recorded in your record.';
  const outside =
    typeof observation.value === 'number'
      ? isOutsideTypicalRange(observation.value, typical)
      : false;

  return {
    display: observation.display,
    value: observation.value,
    unit: observation.unit,
    referenceRange: typical,
    plainLanguage: plain,
    provenance: {
      sourceType: sourceLabel(record),
      facility: record.facilityName,
      takenOn: record.date,
    },
    isBodyMetric: range?.isBodyMetric ?? false,
    outsideTypicalRange: outside,
  };
}

/** I-3.3 A series over time. No trend lines with commentary, no projection. */
export function buildTrendSeries(records: HealthRecord[], code: string): TrendSeries | null {
  const range = getReferenceRange(code);
  const points = records
    .flatMap((r) => r.observations.filter((o) => o.code === code).map((o) => ({ date: r.date, value: o.value, unit: o.unit })))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (points.length === 0) return null;
  return {
    code,
    display: range?.display ?? String(points[0].value),
    unit: points[0].unit,
    points,
  };
}

/** I-3.4 Record completeness: present, missing, due. The safest, most useful surface. */
export function computeRecordCompleteness(
  records: HealthRecord[],
  camp: HealthCamp | null,
  student: StudentProfile,
): CompletenessItem[] {
  const items: CompletenessItem[] = [];
  const hasLab = records.some((r) => r.category === 'LAB');
  const hasVaccine = records.some((r) => r.category === 'VACCINE');
  const hasCampReport = records.some((r) => r.category === 'CAMP_REPORT');
  const hasDischarge = records.some((r) => r.category === 'DISCHARGE_SUMMARY');

  items.push({
    id: 'complete-blood-count',
    label: 'Annual lab screening',
    detail: hasLab ? 'Recorded and available in your vault.' : 'No annual lab record yet.',
    status: hasLab ? 'COMPLETE' : 'MISSING',
  });

  items.push({
    id: 'immunisation',
    label: 'Immunisation records',
    detail: hasVaccine ? 'Vaccination records present.' : 'Immunisation gap — no vaccine record.',
    status: hasVaccine ? 'COMPLETE' : 'MISSING',
  });

  items.push({
    id: 'camp-report',
    label: 'Campus camp report',
    detail: hasCampReport ? 'Most recent camp summary is in your record.' : 'No camp report on file.',
    status: hasCampReport ? 'COMPLETE' : 'MISSING',
  });

  items.push({
    id: 'camp-due',
    label: 'Campus health camp',
    detail: camp
      ? camp.completedCount < camp.totalStations
        ? 'Camp in progress — complete remaining stations.'
        : 'Camp completed.'
      : 'No upcoming camp scheduled.',
    status: camp ? (camp.completedCount < camp.totalStations ? 'DUE' : 'COMPLETE') : 'MISSING',
  });

  items.push({
    id: 'clearance',
    label: 'Medical clearance',
    detail: hasDischarge ? 'Discharge summary on file.' : 'No discharge/clearance record.',
    status: hasDischarge ? 'COMPLETE' : 'MISSING',
  });

  items.push({
    id: 'emergency-contact',
    label: 'Emergency contact',
    detail: student.emergencyContactName
      ? `${student.emergencyContactName} (${student.emergencyContactRelation})`
      : 'No emergency contact set.',
    status: student.emergencyContactName ? 'COMPLETE' : 'MISSING',
  });

  items.push({
    id: 'blood-group',
    label: 'Blood group',
    detail: student.bloodGroup ? student.bloodGroup : 'Not recorded.',
    status: student.bloodGroup ? 'COMPLETE' : 'MISSING',
  });

  return items;
}
