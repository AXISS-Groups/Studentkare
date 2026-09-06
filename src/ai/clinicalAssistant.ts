// M18 Clinical Intelligence — Clinician-Facing Only (Strict Rule K1 & Rule A Isolation)

import { assertRule } from './constitution';

export interface PatientVitals {
  tempF?: number;
  bp?: string;
  pulse?: number;
  spo2?: number;
  weightKg?: number;
  plateletCount?: number;
}

export interface ClinicalEvaluationResult {
  differentialDiagnoses: { condition: string; confidence: number; evidence: string }[];
  interactionAlerts: { pair: string; severity: 'HIGH' | 'MODERATE'; detail: string }[];
  abnormalTrends: { test: string; status: string; note: string }[];
  recommendedGuidelines: string[];
}

/**
 * Evaluates patient vitals and clinical history to output differential diagnostic assistance.
 * Governed strictly under Rule-A (Educational / Non-prescriptive Triage) and Rule-K1 (Clinical Isolation).
 */
export function evaluateClinicalPatientData(
  patientVitals: PatientVitals = {},
  historyText: string = ''
): ClinicalEvaluationResult {
  assertRule('Rule-A');
  assertRule('Rule-K1');

  const historyLower = historyText.toLowerCase();
  const tempF = patientVitals.tempF ?? 98.6;
  const platelet = patientVitals.plateletCount ?? 240000;
  const isFever = tempF > 100.0;

  const differentials: { condition: string; confidence: number; evidence: string }[] = [];
  const alerts: { pair: string; severity: 'HIGH' | 'MODERATE'; detail: string }[] = [];
  const trends: { test: string; status: string; note: string }[] = [];
  const guidelines: string[] = ['National Tele-Consultation Standards (NRCES)'];

  if (isFever || historyLower.includes('dengue') || historyLower.includes('headache')) {
    const isLowPlatelet = platelet < 150000;
    differentials.push({
      condition: 'Viral Pyrexia / Suspected Dengue Fever',
      confidence: isLowPlatelet ? 88 : 74,
      evidence: `Recorded temperature ${tempF}°F, reported symptoms in history, platelet count ${platelet} /µL.`,
    });
    alerts.push({
      pair: 'NSAID (Ibuprofen) + Suspected Dengue / Thrombocytopenia',
      severity: 'HIGH',
      detail: 'Avoid NSAIDs/Aspirin in suspected dengue due to increased risk of platelet dysfunction and GI bleeding. Paracetamol 650mg is safe alternative.',
    });
    guidelines.push('ICMR Guidelines for Management of Dengue in Outpatient Setup (2025)');
  }

  if (historyLower.includes('cough') || historyLower.includes('throat') || historyLower.includes('cold')) {
    differentials.push({
      condition: 'Acute Upper Respiratory Tract Infection',
      confidence: 68,
      evidence: 'Pharyngeal complaints and respiratory history notes.',
    });
  }

  if (differentials.length === 0) {
    differentials.push({
      condition: 'Routine Clinical Evaluation / Observation',
      confidence: 50,
      evidence: 'Vitals stable. No high-risk symptom cluster detected in initial screen.',
    });
  }

  if (platelet < 150000) {
    trends.push({
      test: 'Platelet Count Monitor',
      status: 'ALERT',
      note: `Platelet count is currently ${platelet} /µL (below normal range). Recommend immediate repeat CBC in 12-24 hours.`,
    });
  } else {
    trends.push({
      test: 'Platelet Count Monitor',
      status: 'WATCH',
      note: `Platelet count is currently ${platelet} /µL. Recommend repeat CBC if fever persists beyond 72 hours.`,
    });
  }

  return {
    differentialDiagnoses: differentials,
    interactionAlerts: alerts,
    abnormalTrends: trends,
    recommendedGuidelines: guidelines,
  };
}

/**
 * @deprecated Legacy mock clinical evaluation fallback. Use evaluateClinicalPatientData instead.
 */
export function getMockClinicalEvaluation(
  vitals: PatientVitals = {},
  history: string = ''
): ClinicalEvaluationResult {
  return evaluateClinicalPatientData(vitals, history);
}
