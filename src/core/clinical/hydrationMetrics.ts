/**
 * Clinical daily hydration and fluid requirement calculator.
 *
 * Implements Indian Council of Medical Research (ICMR) dietary and fluid intake
 * recommendations calibrated for Indian campus temperatures and exertion levels.
 */

export interface HydrationInput {
  weightKg: number;
  activityMinutesDaily?: number;
  isHotClimate?: boolean;
}

export interface HydrationReport {
  isPhysiologicallyValid: boolean;
  validationError?: string;
  recommendedDailyLiters?: number;
  glassCount8Oz?: number;
  clinicalContext?: string;
}

export function validateHydrationInputs(input: HydrationInput): { valid: boolean; error?: string } {
  const { weightKg, activityMinutesDaily } = input;

  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
    return { valid: false, error: 'Weight must be between 20 kg and 300 kg.' };
  }
  if (activityMinutesDaily !== undefined) {
    if (!Number.isFinite(activityMinutesDaily) || activityMinutesDaily < 0 || activityMinutesDaily > 480) {
      return { valid: false, error: 'Activity duration must be between 0 and 480 minutes.' };
    }
  }
  return { valid: true };
}

export function calculateHydration(input: HydrationInput): HydrationReport {
  const validation = validateHydrationInputs(input);
  if (!validation.valid) {
    return {
      isPhysiologicallyValid: false,
      validationError: validation.error ?? 'Invalid hydration inputs.',
    };
  }

  const { weightKg, activityMinutesDaily = 0, isHotClimate = false } = input;

  // Base requirement: 35 ml / kg (ICMR guideline)
  let fluidMl = weightKg * 35;

  // Activity adjustment: ~350 ml per 30 minutes of moderate-to-vigorous exercise
  if (activityMinutesDaily > 0) {
    fluidMl += (activityMinutesDaily / 30) * 350;
  }

  // Subtropical heat adjustment: +500 ml
  if (isHotClimate) {
    fluidMl += 500;
  }

  const recommendedDailyLiters = Math.round((fluidMl / 1000) * 10) / 10;
  const glassCount8Oz = Math.round(fluidMl / 250);

  return {
    isPhysiologicallyValid: true,
    recommendedDailyLiters,
    glassCount8Oz,
    clinicalContext: `Estimated baseline fluid intake including water and dietary moisture. Increase intake during fever, monsoon gastroenteritis, or outdoor sports.`,
  };
}
