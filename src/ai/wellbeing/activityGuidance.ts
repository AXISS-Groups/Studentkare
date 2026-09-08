/**
 * Activity — grounded in published guidance, NOT in the student's body.
 *
 * A-5.1 Present what is recommended for adults (ICMR-NIN 2024, WHO), not a plan
 *       generated for this student. Population guidance is education; a
 *       generated plan is prescription.
 * A-5.2 Pre-participation screening is mandatory before any structured programme.
 * A-5.3 Campus context is the differentiator (institution-configurable per tenant).
 * A-5.4 Injury routes to care. Return-to-play after any injury is a CLINICIAN
 *       decision, never an app decision, and never a timer.
 *
 * The activity content may NOT: set performance targets tied to body metrics,
 * estimate calorie burn, or provide streaks/leaderboards/comparison.
 */
import type { ActivityGuidance, CampusActivityOption, ScreeningResult } from './types';
import { getApprovedContent } from './contentRegistry';

/** Population recommendation for adults (not a personalised plan). */
export function getPopulationGuidance(): ActivityGuidance {
  return {
    populationGuidance:
      'The ICMR-NIN Dietary Guidelines for Indians (2024) recommend at least 30 to 45 minutes of moderate-intensity physical activity daily, combining cardio-respiratory and muscular work. WHO guidance for adults is 150–300 minutes of moderate aerobic activity weekly plus strengthening on two days.',
    sources: ['ICMR-NIN Dietary Guidelines for Indians 2024', 'WHO physical activity guidelines for adults'],
  };
}

/**
 * A-5.2 If screening is positive, structured content is BLOCKED (not merely
 * warned). Callers must not render a structured programme when this is true.
 */
export function structuredActivityBlocked(screening: ScreeningResult): boolean {
  return screening.blocksStructuredContent;
}

/**
 * A-5.3 Campus context — what is actually available on this campus.
 * Institution-configurable per tenant.
 */
export function getCampusActivityOptions(campusName: string): CampusActivityOption[] {
  return [
    {
      id: 'gym',
      name: `${campusName} Gymnasium`,
      kind: 'FACILITY',
      detail: 'Open 07:00–21:00. Free for students. Strength and cardio equipment.',
      institutionConfigurable: true,
    },
    {
      id: 'ground',
      name: `${campusName} Sports Ground`,
      kind: 'FACILITY',
      detail: 'Open field for jogging, football and athletics. Evening floodlights.',
      institutionConfigurable: true,
    },
    {
      id: 'routes',
      name: 'Safe walking and running routes',
      kind: 'ROUTE',
      detail: 'Well-lit loop around the hostel blocks and the main walkway.',
      institutionConfigurable: true,
    },
    {
      id: 'clubs',
      name: 'Yoga & sports clubs',
      kind: 'GROUP',
      detail: 'Yoga, badminton and swimming clubs run weekly sessions.',
      institutionConfigurable: true,
    },
    {
      id: 'physio',
      name: 'Physiotherapy referral path',
      kind: 'REFERRAL',
      detail: 'Campus clinic can refer you to physiotherapy.',
      institutionConfigurable: true,
    },
  ];
}

/**
 * A-5.4 Injury guidance routes to care. Return-to-play after any injury is a
 * clinician decision — the app never decides, and never runs a timer.
 */
export function getInjuryRouting(): {
  routeToCare: string;
  returnToPlay: string;
  approvedNoteId: string | null;
} {
  const approved = getApprovedContent('act-002'); // warm-up/cool-down content
  return {
    routeToCare: 'If you are injured, stop and see your campus clinic or physiotherapy. Do not push through pain.',
    returnToPlay:
      'Returning to sport after an injury is a clinician decision. There is no app timer and no automatic clearance — your clinician decides when you are ready.',
    approvedNoteId: approved ? approved.id : null,
  };
}
