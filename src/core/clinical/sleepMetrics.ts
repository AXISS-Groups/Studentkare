/**
 * Evidence-based clinical sleep metrics and efficiency calculation engine.
 *
 * Implements standard polysomnography clinical formulas:
 * - Sleep Efficiency % = (Total Sleep Time / Total Time in Bed) * 100
 * - Cumulative Sleep Debt calculation
 * - Epworth Sleepiness Scale (ESS) clinical evaluation
 */

export interface SleepCalculationInput {
  timeInBedMinutes: number;
  totalSleepMinutes: number;
  sleepLatencyMinutes?: number;
  targetSleepMinutes?: number; // defaults to 480 (8 hours)
  epworthAnswers?: number[]; // 8 questions scored 0-3
}

export type SleepEfficiencyBand = 'optimal' | 'borderline' | 'fragmented';

export interface SleepMetricsReport {
  isPhysiologicallyValid: boolean;
  validationError?: string;
  sleepEfficiencyPct?: number;
  efficiencyBand?: SleepEfficiencyBand;
  efficiencyDisplay?: string;
  sleepDebtMinutes?: number;
  sleepDebtDisplay?: string;
  clinicalContext?: string;
  epworthTotalScore?: number;
  epworthInterpretation?: string;
}

export function validateSleepInputs(input: SleepCalculationInput): { valid: boolean; error?: string } {
  const { timeInBedMinutes, totalSleepMinutes, sleepLatencyMinutes } = input;

  if (!Number.isFinite(timeInBedMinutes) || timeInBedMinutes < 60 || timeInBedMinutes > 1440) {
    return { valid: false, error: 'Time in bed must be between 1 hour and 24 hours.' };
  }
  if (!Number.isFinite(totalSleepMinutes) || totalSleepMinutes < 30 || totalSleepMinutes > timeInBedMinutes) {
    return { valid: false, error: 'Total sleep duration cannot exceed time spent in bed.' };
  }
  if (sleepLatencyMinutes !== undefined) {
    if (!Number.isFinite(sleepLatencyMinutes) || sleepLatencyMinutes < 0 || sleepLatencyMinutes > 360) {
      return { valid: false, error: 'Sleep latency must be between 0 and 360 minutes.' };
    }
  }
  return { valid: true };
}

export function calculateSleepMetrics(input: SleepCalculationInput): SleepMetricsReport {
  const validation = validateSleepInputs(input);
  if (!validation.valid) {
    return {
      isPhysiologicallyValid: false,
      validationError: validation.error ?? 'Invalid sleep inputs.',
    };
  }

  const { timeInBedMinutes, totalSleepMinutes, targetSleepMinutes = 480, epworthAnswers } = input;

  const rawEfficiency = (totalSleepMinutes / timeInBedMinutes) * 100;
  const sleepEfficiencyPct = Math.round(rawEfficiency * 10) / 10;

  let efficiencyBand: SleepEfficiencyBand;
  let efficiencyDisplay: string;
  let clinicalContext: string;

  if (sleepEfficiencyPct >= 85) {
    efficiencyBand = 'optimal';
    efficiencyDisplay = 'Optimal Consolidated Sleep (≥ 85%)';
    clinicalContext = 'Normal clinical sleep architecture with minimal night-time fragmentation.';
  } else if (sleepEfficiencyPct >= 75) {
    efficiencyBand = 'borderline';
    efficiencyDisplay = 'Borderline Sleep Quality (75 - 84%)';
    clinicalContext = 'Moderate sleep fragmentation or prolonged latency. Consider regular circadian wake-times.';
  } else {
    efficiencyBand = 'fragmented';
    efficiencyDisplay = 'Fragmented Sleep (< 75%)';
    clinicalContext = 'Significant time awake in bed. Clinically associated with sleep-onset anxiety or environmental disruption.';
  }

  const sleepDebtMinutes = Math.max(0, targetSleepMinutes - totalSleepMinutes);
  const debtHours = Math.round((sleepDebtMinutes / 60) * 10) / 10;
  const sleepDebtDisplay = sleepDebtMinutes > 0 ? `${debtHours} hrs sleep debt` : 'Zero sleep debt';

  let epworthTotalScore: number | undefined;
  let epworthInterpretation: string | undefined;

  if (epworthAnswers && epworthAnswers.length === 8) {
    const total = epworthAnswers.reduce((sum, score) => sum + Math.max(0, Math.min(3, score)), 0);
    epworthTotalScore = total;
    if (total <= 10) {
      epworthInterpretation = 'Normal daytime alertness (0–10).';
    } else if (total <= 15) {
      epworthInterpretation = 'Mild to moderate excessive daytime sleepiness (11–15).';
    } else {
      epworthInterpretation = 'Severe daytime somnolence (16–24). Campus physician consultation recommended.';
    }
  }

  return {
    isPhysiologicallyValid: true,
    sleepEfficiencyPct,
    efficiencyBand,
    efficiencyDisplay,
    sleepDebtMinutes,
    sleepDebtDisplay,
    clinicalContext,
    epworthTotalScore,
    epworthInterpretation,
  };
}
