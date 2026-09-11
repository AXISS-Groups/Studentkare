/**
 * Wellbeing content registry — advisor-approved, versioned, bilingual (EN/TE).
 *
 * FAILS CLOSED: content without a recorded advisor sign-off (`advisorApproved`)
 * does NOT render. `getRenderableContent()` returns only approved content.
 * The medical-advisor sign-off is a release gate for this module.
 *
 * Source notes (Part 6 of the spec):
 *  - Nutrition & activity: ICMR-NIN Dietary Guidelines for Indians 2024
 *  - Activity volumes: WHO physical activity guidelines for adults
 *  - Student-specific health topics: Expert Self Care (licensed, Indian-adapted)
 *  - Mental wellbeing: Tele-MANAS materials (referral path, not hardcoded NEDA)
 */
import type { AdvisorContent, ContentKind } from './types';

export const CONTENT: AdvisorContent[] = [
  {
    id: 'act-001',
    kind: 'ACTIVITY',
    titleEn: 'Moderate activity for adults',
    bodyEn:
      'The ICMR-NIN Dietary Guidelines for Indians (2024) recommend at least 30 to 45 minutes of moderate-intensity physical activity every day, combining cardio-respiratory and muscular work. WHO guidance for adults is 150–300 minutes of moderate aerobic activity weekly plus strengthening on two days. This is a recommendation for adults — it is not a plan generated for you.',
    titleTe: 'పెద్దలకు మితమైన వ్యాయామం',
    bodyTe:
      'భారతీయులకు ICMR-NIN ఆహార మార్గదర్శకాలు (2024) ప్రతి రోజు కనీసం 30–45 నిమిషాల మితమైన శారీరక శ్రమను సిఫార్సు చేస్తాయి. WHO పెద్దలకు వారానికి 150–300 నిమిషాల మితమైన ఏరోబిక్ కార్యాచరణ మరియు రెండు రోజుల బలోపేతం సూచిస్తుంది.',
    source: 'ICMR-NIN Dietary Guidelines for Indians 2024 · WHO physical activity guidelines',
    advisorApproved: true,
    version: '1.0.0',
    approvedAt: '2026-09-01',
  },
  {
    id: 'act-002',
    kind: 'ACTIVITY',
    titleEn: 'Warm up and cool down',
    bodyEn:
      'Before any structured session, warm up. After it, cool down. This reduces the risk of injury and supports gradual return to activity after a break.',
    source: 'Expert Self Care (Student Health) — Indian adaptation',
    advisorApproved: true,
    version: '1.0.0',
    approvedAt: '2026-09-01',
  },
  {
    id: 'nut-001',
    kind: 'NUTRITION',
    titleEn: 'A balanced Indian plate',
    bodyEn:
      'Think of dietary diversity: a balanced Indian plate includes cereals, pulses/legumes, vegetables, fruit, and a moderate amount of milk/curd. Choose minimally processed foods and include adequate protein. This is education, not a diary, and no food is labelled good or bad.',
    source: 'ICMR-NIN Dietary Guidelines for Indians 2024',
    advisorApproved: true,
    version: '1.0.0',
    approvedAt: '2026-09-01',
  },
  {
    id: 'wel-001',
    kind: 'GUIDANCE',
    titleEn: 'When to talk to someone',
    bodyEn:
      'If you are finding things hard, you are not alone. Tele-MANAS (14416 / 1800 891 4416) is free, confidential and available 24/7 in English, Hindi and Telugu. Reach out to your campus health warden or counsellor too.',
    source: 'Tele-MANAS materials',
    advisorApproved: true,
    version: '1.0.0',
    approvedAt: '2026-09-01',
  },
  {
    id: 'sug-001',
    kind: 'SUGGESTION',
    titleEn: 'Monsoon dengue prevention for campus',
    bodyEn:
      'During monsoon, avoid waterlogging near your room, wear long sleeves in the evening, and clear stagnant water. These are general campus-season reminders.',
    source: 'Seasonal campus guidance',
    advisorApproved: true,
    version: '1.0.0',
    approvedAt: '2026-09-01',
  },
  // A deliberately UNAPPROVED item: must never render (fail closed).
  {
    id: 'act-unapproved',
    kind: 'ACTIVITY',
    titleEn: 'Draft activity plan',
    bodyEn: 'This item has no advisor sign-off and must never be shown.',
    source: 'internal draft',
    advisorApproved: false,
    version: '0.0.1',
  },
];

/** Content that is safe to render — approved, versioned, with a source. */
export function getRenderableContent(kind?: ContentKind): AdvisorContent[] {
  return CONTENT.filter((c) => c.advisorApproved && (!kind || c.kind === kind));
}

/** Fail closed: return a single content item only if it is approved. */
export function getApprovedContent(id: string): AdvisorContent | null {
  const c = CONTENT.find((item) => item.id === id);
  return c && c.advisorApproved ? c : null;
}
