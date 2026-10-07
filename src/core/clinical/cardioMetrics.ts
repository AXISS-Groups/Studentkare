/**
 * Clinical cardiovascular hemodynamics & heart rate metrics engine.
 *
 * Implements deterministic clinical formulas:
 * - Mean Arterial Pressure (MAP) = (2 * DBP + SBP) / 3
 * - Pulse Pressure = SBP - DBP
 * - AHA / ICMR Blood Pressure Category
 * - Karvonen Heart Rate Target Zones
 */

export interface CardioInput {
  systolicBp: number;
  diastolicBp: number;
  restingHeartRateBpm?: number;
  ageYears?: number;
}

export type BloodPressureCategory = 'optimal' | 'elevated' | 'stage1' | 'stage2' | 'hypotensive';

export interface HeartRateZone {
  name: string;
  intensityRange: string;
  bpmRange: { min: number; max: number };
  purpose: string;
}

export interface CardioMetricsReport {
  isPhysiologicallyValid: boolean;
  validationError?: string;
  meanArterialPressureMmHg?: number;
  pulsePressureMmHg?: number;
  bpCategory?: BloodPressureCategory;
  bpCategoryDisplay?: string;
  clinicalContext?: string;
  maxHeartRateBpm?: number;
  heartRateZones?: HeartRateZone[];
}

export function validateCardioInputs(input: CardioInput): { valid: boolean; error?: string } {
  const { systolicBp, diastolicBp, restingHeartRateBpm, ageYears } = input;

  if (!Number.isFinite(systolicBp) || systolicBp < 60 || systolicBp > 280) {
    return { valid: false, error: 'Systolic blood pressure must be between 60 mmHg and 280 mmHg.' };
  }
  if (!Number.isFinite(diastolicBp) || diastolicBp < 30 || diastolicBp > 180) {
    return { valid: false, error: 'Diastolic blood pressure must be between 30 mmHg and 180 mmHg.' };
  }
  if (systolicBp <= diastolicBp) {
    return { valid: false, error: 'Systolic pressure must be greater than diastolic pressure.' };
  }
  if (restingHeartRateBpm !== undefined) {
    if (!Number.isFinite(restingHeartRateBpm) || restingHeartRateBpm < 30 || restingHeartRateBpm > 220) {
      return { valid: false, error: 'Resting heart rate must be between 30 bpm and 220 bpm.' };
    }
  }
  if (ageYears !== undefined) {
    if (!Number.isFinite(ageYears) || ageYears < 16 || ageYears > 120) {
      return { valid: false, error: 'Age must be between 16 and 120 years.' };
    }
  }
  return { valid: true };
}

export function calculateCardioMetrics(input: CardioInput): CardioMetricsReport {
  const validation = validateCardioInputs(input);
  if (!validation.valid) {
    return {
      isPhysiologicallyValid: false,
      validationError: validation.error ?? 'Invalid cardiovascular inputs.',
    };
  }

  const { systolicBp, diastolicBp, restingHeartRateBpm = 72, ageYears = 20 } = input;

  // MAP = (2 * DBP + SBP) / 3
  const rawMap = (2 * diastolicBp + systolicBp) / 3;
  const meanArterialPressureMmHg = Math.round(rawMap * 10) / 10;

  // Pulse Pressure = SBP - DBP
  const pulsePressureMmHg = systolicBp - diastolicBp;

  // BP Classification
  let bpCategory: BloodPressureCategory;
  let bpCategoryDisplay: string;
  let clinicalContext: string;

  if (systolicBp < 90 || diastolicBp < 60) {
    bpCategory = 'hypotensive';
    bpCategoryDisplay = 'Low Blood Pressure (Hypotension)';
    clinicalContext = 'Sub-typical perfusion pressure. Hydrate and check posture/dizziness symptoms.';
  } else if (systolicBp < 120 && diastolicBp < 80) {
    bpCategory = 'optimal';
    bpCategoryDisplay = 'Optimal Blood Pressure (<120/<80 mmHg)';
    clinicalContext = 'Within standard clinical resting perfusion parameters.';
  } else if (systolicBp <= 129 && diastolicBp < 80) {
    bpCategory = 'elevated';
    bpCategoryDisplay = 'Elevated Blood Pressure (120–129/<80 mmHg)';
    clinicalContext = 'Pre-hypertensive range. Periodic campus health station follow-up recommended.';
  } else if (systolicBp <= 139 || (diastolicBp >= 80 && diastolicBp <= 89)) {
    bpCategory = 'stage1';
    bpCategoryDisplay = 'Stage 1 Hypertension (130–139 or 80–89 mmHg)';
    clinicalContext = 'Outside typical range. Flagged for verification with manual clinic sphygmomanometer.';
  } else {
    bpCategory = 'stage2';
    bpCategoryDisplay = 'Stage 2 Hypertension (≥140 or ≥90 mmHg)';
    clinicalContext = 'Significantly elevated resting pressure. Campus clinic evaluation advised.';
  }

  // Karvonen Heart Rate Zones
  const maxHeartRateBpm = 220 - ageYears;
  const hrReserve = Math.max(0, maxHeartRateBpm - restingHeartRateBpm);

  const calculateZoneBpm = (intensity: number) =>
    Math.round(restingHeartRateBpm + hrReserve * intensity);

  const heartRateZones: HeartRateZone[] = [
    {
      name: 'Zone 1: Active Recovery',
      intensityRange: '50% – 60%',
      bpmRange: { min: calculateZoneBpm(0.5), max: calculateZoneBpm(0.6) },
      purpose: 'Warm-up, cooldown, active recovery after exams or strenuous study.',
    },
    {
      name: 'Zone 2: Aerobic Base',
      intensityRange: '60% – 70%',
      bpmRange: { min: calculateZoneBpm(0.6), max: calculateZoneBpm(0.7) },
      purpose: 'Cardiovascular endurance building and lipid substrate utilization.',
    },
    {
      name: 'Zone 3: Aerobic Tempo',
      intensityRange: '70% – 85%',
      bpmRange: { min: calculateZoneBpm(0.7), max: calculateZoneBpm(0.85) },
      purpose: 'Cardiorespiratory capacity expansion.',
    },
    {
      name: 'Zone 4: Anaerobic Peak',
      intensityRange: '85% – 100%',
      bpmRange: { min: calculateZoneBpm(0.85), max: maxHeartRateBpm },
      purpose: 'Maximum exertion interval training (short bursts only).',
    },
  ];

  return {
    isPhysiologicallyValid: true,
    meanArterialPressureMmHg,
    pulsePressureMmHg,
    bpCategory,
    bpCategoryDisplay,
    clinicalContext,
    maxHeartRateBpm,
    heartRateZones,
  };
}
