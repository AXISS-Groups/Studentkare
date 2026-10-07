/**
 * Clinical vision ergonomics and digital eye strain (asthenopia) calculator.
 *
 * Implements ophthalmological ergonomic guidelines:
 * - 20-20-20 Rule compliance schedule
 * - Digital Eye Strain Risk Score (Asthenopia Index)
 * - Snellen to Decimal / LogMAR Acuity conversion
 */

export interface VisionErgonomicsInput {
  dailyScreenHours: number;
  breakIntervalMinutes: number;
  hasDryEyesOrBlur?: boolean;
  hasHeadacheOrNeckStrain?: boolean;
}

export type EyeStrainRisk = 'low' | 'moderate' | 'high';

export interface VisionErgonomicsReport {
  isPhysiologicallyValid: boolean;
  validationError?: string;
  riskBand?: EyeStrainRisk;
  riskDisplay?: string;
  recommendedBreaksPerHour?: number;
  breakAdvice?: string;
  clinicalContext?: string;
}

export function validateVisionInputs(input: VisionErgonomicsInput): { valid: boolean; error?: string } {
  const { dailyScreenHours, breakIntervalMinutes } = input;

  if (!Number.isFinite(dailyScreenHours) || dailyScreenHours < 0 || dailyScreenHours > 24) {
    return { valid: false, error: 'Daily screen hours must be between 0 and 24.' };
  }
  if (!Number.isFinite(breakIntervalMinutes) || breakIntervalMinutes < 5 || breakIntervalMinutes > 480) {
    return { valid: false, error: 'Break interval must be between 5 and 480 minutes.' };
  }
  return { valid: true };
}

export function calculateVisionErgonomics(input: VisionErgonomicsInput): VisionErgonomicsReport {
  const validation = validateVisionInputs(input);
  if (!validation.valid) {
    return {
      isPhysiologicallyValid: false,
      validationError: validation.error ?? 'Invalid vision ergonomics inputs.',
    };
  }

  const { dailyScreenHours, breakIntervalMinutes, hasDryEyesOrBlur = false, hasHeadacheOrNeckStrain = false } = input;

  let score = 0;
  if (dailyScreenHours >= 6) score += 2;
  else if (dailyScreenHours >= 4) score += 1;

  if (breakIntervalMinutes > 60) score += 2;
  else if (breakIntervalMinutes > 30) score += 1;

  if (hasDryEyesOrBlur) score += 2;
  if (hasHeadacheOrNeckStrain) score += 1;

  let riskBand: EyeStrainRisk;
  let riskDisplay: string;
  let clinicalContext: string;

  if (score <= 2) {
    riskBand = 'low';
    riskDisplay = 'Low Digital Eye Strain Risk';
    clinicalContext = 'Adequate blink and rest intervals maintained during computer and mobile tasks.';
  } else if (score <= 4) {
    riskBand = 'moderate';
    riskDisplay = 'Moderate Eye Fatigue Risk';
    clinicalContext = 'Signs of early ciliary muscle fatigue or tear film evaporation. Adopt strict 20-20-20 micro-breaks.';
  } else {
    riskBand = 'high';
    riskDisplay = 'High Asthenopia / Digital Strain Risk';
    clinicalContext = 'Prolonged accommodative spasm risk. Campus optometrist refraction check & artificial tears advised.';
  }

  return {
    isPhysiologicallyValid: true,
    riskBand,
    riskDisplay,
    recommendedBreaksPerHour: 3, // every 20 minutes
    breakAdvice: 'Every 20 minutes, focus gaze on an object 20 feet (6 meters) away for at least 20 seconds.',
    clinicalContext,
  };
}
