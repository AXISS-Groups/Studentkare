/**
 * Deterministic clinical anthropometrics & body metrics calculator.
 *
 * Implements evidence-based ICMR (Indian Council of Medical Research) & WHO
 * Asia-Pacific reference standards for Indian campus populations.
 *
 * Guardrails (Rule 4 / Rule L):
 * - Fail closed on invalid physiological ranges.
 * - Zero gamification, zero ranking, zero before/after imagery, zero calorie deficit targets.
 * - Purely descriptive physiological reference context.
 */

export type BiologicalSex = 'male' | 'female';

export interface BodyMetricInput {
  heightCm: number;
  weightKg: number;
  ageYears?: number;
  sex?: BiologicalSex;
  waistCm?: number;
}

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

export interface BmiResult {
  bmi: number;
  category: BmiCategory;
  categoryDisplay: string;
  referenceBand: string;
  healthyWeightRangeKg: { min: number; max: number };
  clinicalContext: string;
}

export interface BmrResult {
  bmrKcal: number;
  formula: string;
  clinicalContext: string;
}

export interface WhtrResult {
  ratio: number;
  isWithinOptimal: boolean;
  clinicalContext: string;
}

export interface IbwResult {
  idealWeightKg: number;
  formula: string;
}

export interface BodyMetricsReport {
  isPhysiologicallyValid: boolean;
  validationError?: string;
  bmi?: BmiResult;
  bmr?: BmrResult;
  whtr?: WhtrResult;
  ibw?: IbwResult;
  bsaM2?: number;
}

/**
 * Validates physiological plausibility for campus student records.
 * Fails closed if values fall outside standard clinical bounds.
 */
export function validateAnthropometricInputs(input: BodyMetricInput): { valid: boolean; error?: string } {
  const { heightCm, weightKg, ageYears, waistCm } = input;

  if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 250) {
    return { valid: false, error: 'Height must be between 50 cm and 250 cm.' };
  }
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
    return { valid: false, error: 'Weight must be between 20 kg and 300 kg.' };
  }
  if (ageYears !== undefined) {
    if (!Number.isFinite(ageYears) || ageYears < 16 || ageYears > 120) {
      return { valid: false, error: 'Age must be between 16 and 120 years.' };
    }
  }
  if (waistCm !== undefined) {
    if (!Number.isFinite(waistCm) || waistCm < 30 || waistCm > 220) {
      return { valid: false, error: 'Waist circumference must be between 30 cm and 220 cm.' };
    }
  }
  return { valid: true };
}

/**
 * Computes BMI & ICMR / WHO Asia-Pacific classification bands:
 * - Underweight: < 18.5 kg/m²
 * - Healthy range: 18.5 - 22.9 kg/m²
 * - Overweight: 23.0 - 24.9 kg/m²
 * - Obese: >= 25.0 kg/m²
 */
export function calculateBmi(heightCm: number, weightKg: number): BmiResult {
  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10;

  // Calculate healthy weight window corresponding to 18.5 - 22.9 kg/m² (ICMR Asia-Pacific standard)
  const minHealthyKg = Math.round(18.5 * (heightM * heightM) * 10) / 10;
  const maxHealthyKg = Math.round(22.9 * (heightM * heightM) * 10) / 10;

  let category: BmiCategory;
  let categoryDisplay: string;
  let clinicalContext: string;

  if (bmi < 18.5) {
    category = 'underweight';
    categoryDisplay = 'Lower than typical range (Underweight)';
    clinicalContext = 'Weight-for-height falls below the ICMR baseline. Discuss with campus nutrition if persistent.';
  } else if (bmi <= 22.9) {
    category = 'healthy';
    categoryDisplay = 'Optimal healthy range (ICMR Asia-Pacific)';
    clinicalContext = 'Weight-for-height is within the recommended Indian consensus reference window.';
  } else if (bmi <= 24.9) {
    category = 'overweight';
    categoryDisplay = 'Moderate cardiometabolic risk (Overweight)';
    clinicalContext = 'ICMR guidelines designate 23.0 - 24.9 kg/m² as the threshold for early metabolic screening.';
  } else {
    category = 'obese';
    categoryDisplay = 'Elevated cardiometabolic risk (Obese)';
    clinicalContext = 'Exceeds the ICMR consensus threshold for South Asian populations. Routine campus health review advised.';
  }

  return {
    bmi,
    category,
    categoryDisplay,
    referenceBand: '18.5 - 22.9 kg/m²',
    healthyWeightRangeKg: { min: minHealthyKg, max: maxHealthyKg },
    clinicalContext,
  };
}

/**
 * Computes Basal Metabolic Rate using the Mifflin-St Jeor formula.
 * Men: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
 * Women: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
 */
export function calculateBmr(
  heightCm: number,
  weightKg: number,
  ageYears: number,
  sex: BiologicalSex
): BmrResult {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const rawBmr = sex === 'male' ? base + 5 : base - 161;
  const bmrKcal = Math.round(rawBmr);

  return {
    bmrKcal,
    formula: 'Mifflin-St Jeor equation',
    clinicalContext: 'Estimated minimum energy expenditure (kcal/day) required at rest to maintain vital organ processes.',
  };
}

/**
 * Computes Waist-to-Height Ratio (WHtR).
 * Evidence-based ICMR & NICE guideline: Keep waist circumference to less than half of height (< 0.5).
 */
export function calculateWhtr(heightCm: number, waistCm: number): WhtrResult {
  const ratio = Math.round((waistCm / heightCm) * 100) / 100;
  const isWithinOptimal = ratio < 0.5;

  return {
    ratio,
    isWithinOptimal,
    clinicalContext: isWithinOptimal
      ? 'Optimal ratio (< 0.5). Waist circumference is less than half your height.'
      : 'Ratio is 0.5 or higher. Central adiposity marker recommended for annual lipid & HbA1c review.',
  };
}

/**
 * Computes Devine Ideal Body Weight (IBW) reference.
 * Men: 50 kg + 2.3 kg per inch over 5 feet
 * Women: 45.5 kg + 2.3 kg per inch over 5 feet
 */
export function calculateIbw(heightCm: number, sex: BiologicalSex): IbwResult {
  const inchesOver5Feet = Math.max(0, heightCm / 2.54 - 60);
  const base = sex === 'male' ? 50 : 45.5;
  const idealWeightKg = Math.round((base + 2.3 * inchesOver5Feet) * 10) / 10;

  return {
    idealWeightKg,
    formula: 'Devine clinical formula',
  };
}

/**
 * Computes Body Surface Area (BSA) using Mosteller formula:
 * BSA (m²) = sqrt((height(cm) * weight(kg)) / 3600)
 */
export function calculateBsa(heightCm: number, weightKg: number): number {
  const raw = Math.sqrt((heightCm * weightKg) / 3600);
  return Math.round(raw * 100) / 100;
}

/**
 * Master anthropometric calculation engine.
 * Fails closed if inputs violate clinical validation rules.
 */
export function calculateBodyMetrics(input: BodyMetricInput): BodyMetricsReport {
  const validation = validateAnthropometricInputs(input);
  if (!validation.valid) {
    return {
      isPhysiologicallyValid: false,
      validationError: validation.error ?? 'Invalid physiological inputs.',
    };
  }

  const { heightCm, weightKg, ageYears, sex, waistCm } = input;
  const bmi = calculateBmi(heightCm, weightKg);
  const bsaM2 = calculateBsa(heightCm, weightKg);

  let bmr: BmrResult | undefined;
  if (ageYears !== undefined && sex !== undefined) {
    bmr = calculateBmr(heightCm, weightKg, ageYears, sex);
  }

  let whtr: WhtrResult | undefined;
  if (waistCm !== undefined) {
    whtr = calculateWhtr(heightCm, waistCm);
  }

  let ibw: IbwResult | undefined;
  if (sex !== undefined && heightCm >= 152.4) {
    ibw = calculateIbw(heightCm, sex);
  }

  return {
    isPhysiologicallyValid: true,
    bmi,
    bmr,
    whtr,
    ibw,
    bsaM2,
  };
}
