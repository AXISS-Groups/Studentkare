/**
 * careerConstants.ts
 *
 * Single source of truth for Career AI formula constants shared across:
 *   - career-ai.tsx (dashboard page)
 *   - careerReportPdf.ts (PDF generation)
 *
 * DO NOT duplicate these values in other files.
 */

import type { SkColorRole } from '../../theme/tokens/generated/skTokens';

/** Points gained toward readiness score for completing each milestone type. */
export const GAINS: Record<string, number> = {
  RESUME: 8,
  PROJECT: 12,
  LINKEDIN: 5,
  PORTFOLIO: 7,
  CERTIFICATION: 6,
  MOCK_INTERVIEW: 8,
  NETWORKING: 4,
  SKILLS: 5,
  PROFILE: 3,
  JOB_APPLICATION: 2,
  PHOTO: 3,
  EDUCATION: 4,
};

/**
 * Maps LLM roadmap skill_score keys (short camelCase) to the canonical
 * SKILL_META keys used throughout the frontend.
 *
 * Roadmap LLM returns: { communication, soft_skills, technical, interview_prep, networking, leadership }
 * SKILL_META expects:  { "Technical Excellence", "Professional Communication", ... }
 */
export const ROADMAP_SKILL_KEY_MAP: Record<string, string> = {
  technical:        'Technical Excellence',
  communication:    'Professional Communication',
  soft_skills:      'Personal Brand',
  leadership:       'Leadership & Collaboration',
  interview_prep:   'Career Preparation',
  networking:       'Industry Presence',
};

/** Inverse map – canonical key → short LLM key */
export const CANONICAL_TO_ROADMAP_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(ROADMAP_SKILL_KEY_MAP).map(([k, v]) => [v, k]),
);

/** Ordered list of canonical skill category keys (matches SKILL_META order). */
export const SKILL_CATEGORY_KEYS = [
  'Technical Excellence',
  'Professional Communication',
  'Personal Brand',
  'Leadership & Collaboration',
  'Career Preparation',
  'Industry Presence',
] as const;

export type SkillCategoryKey = typeof SKILL_CATEGORY_KEYS[number];

/**
 * A categorical chart token NAME (chart-categorical-1…8, DESIGN.md §3), not a
 * value. Resolve it at render time with `color[name]` from
 * '@/design-system/theme' (web: a CSS variable; native: the scheme's value), or
 * `skTokens.color[scheme][name]` where a raw value is needed (PDF), so dark mode
 * follows the theme. Always shown with its text label, never colour alone.
 */
export type CareerSeriesColor = Extract<SkColorRole, `chartCategorical${number}`>;

/** Impact label thresholds (matches IMPACT_LABEL in career-ai.tsx). */
export const IMPACT_THRESHOLDS = [
  { min: 10, text: 'High Impact',   color: 'chartCategorical1' },
  { min: 6,  text: 'Medium Impact', color: 'chartCategorical3' },
  { min: 0,  text: 'Low Impact',    color: 'chartCategorical2' },
] as const satisfies readonly { min: number; text: string; color: CareerSeriesColor }[];

export function getImpactLabel(gain: number): { text: string; color: CareerSeriesColor } {
  for (const t of IMPACT_THRESHOLDS) {
    if (gain >= t.min) return { text: t.text, color: t.color };
  }
  return { text: 'Low Impact', color: 'chartCategorical2' };
}

/**
 * Normalize a roadmap skill_scores object (with short LLM keys) to canonical keys.
 * Any key already in canonical form is kept as-is.
 */
export function normalizeRoadmapSkillScores(
  raw: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonical = ROADMAP_SKILL_KEY_MAP[k] ?? k;
    out[canonical] = Number(v) || 0;
  }
  return out;
}

/** Each action is labelled; its colour is a chart token name (see CareerSeriesColor). */
export const SIM_ACTIONS: { type: string; label: string; color: CareerSeriesColor }[] = [
  { type: 'RESUME', label: 'Upload Resume', color: 'chartCategorical1' },
  { type: 'PROJECT', label: 'Add a Project', color: 'chartCategorical3' },
  { type: 'SKILLS', label: 'List 3+ Skills', color: 'chartCategorical2' },
  { type: 'LINKEDIN', label: 'Link LinkedIn', color: 'chartCategorical5' },
  { type: 'PORTFOLIO', label: 'Build Portfolio', color: 'chartCategorical4' },
  { type: 'MOCK_INTERVIEW', label: 'Practice Mock Interview', color: 'chartCategorical8' },
  { type: 'CERTIFICATION', label: 'Get Certified', color: 'chartCategorical2' },
  { type: 'NETWORKING', label: 'Network with Alumni', color: 'chartCategorical3' },
  { type: 'PROFILE', label: 'Complete Profile', color: 'chartCategorical1' },
  { type: 'EDUCATION', label: 'Add Education Details', color: 'chartCategorical5' },
];

