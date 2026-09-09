/**
 * Pre-participation screening (PAR-Q+ style) — MANDATORY before any structured
 * activity programme. Advisor-approved questions.
 *
 * Any positive answer routes to a clinician and BLOCKS the structured content
 * (it does not merely warn). Hard contraindications are a stop condition.
 *
 * Screening answers are T3 — they are NOT analytics events (Part 7.3).
 */
import type { ScreeningQuestion, ScreeningResult } from './types';

export const PARQ_QUESTIONS: ScreeningQuestion[] = [
  { id: 'q1', prompt: 'Has a doctor ever said you have a heart condition and that you should only do physical activity approved by a doctor?', contraindication: true },
  { id: 'q2', prompt: 'Do you feel pain in your chest when you do physical activity?', contraindication: true },
  { id: 'q3', prompt: 'In the past month, have you lost consciousness or felt dizzy during physical activity?', contraindication: true },
  { id: 'q4', prompt: 'Do you have a bone or joint problem (knee, hip, shoulder) that could be made worse by a change in activity?', contraindication: true },
  { id: 'q5', prompt: 'Are you currently taking medication for blood pressure or a heart condition?', contraindication: true },
  { id: 'q6', prompt: 'Do you have an uncontrolled medical condition that makes exercise unsafe?', contraindication: true },
  { id: 'q7', prompt: 'Are you pregnant, or have you given birth in the last six weeks?', contraindication: true },
  { id: 'q8', prompt: 'Have you had a recent injury or surgery?', contraindication: true },
  { id: 'q9', prompt: 'Do you have an active clinical flag on your health record?', contraindication: true },
];

/** `answers` maps question id -> yes. A missing id is treated as "no". */
export function evaluateScreening(answers: Record<string, boolean>): ScreeningResult {
  const positive = PARQ_QUESTIONS.filter((q) => answers[q.id] === true);
  return {
    anyPositive: positive.length > 0,
    positiveQuestionIds: positive.map((q) => q.id),
    blocksStructuredContent: positive.length > 0,
    sensitive: true, // T3 — never an analytics event.
  };
}
