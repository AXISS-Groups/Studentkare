/**
 * careerConstants.ts
 *
 * Single source of truth for Career AI formula constants shared across:
 *   - career-ai.tsx (dashboard page)
 *   - careerReportPdf.ts (PDF generation)
 *
 * DO NOT duplicate these values in other files.
 */

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

/** Impact label thresholds (matches IMPACT_LABEL in career-ai.tsx). */
export const IMPACT_THRESHOLDS = [
  { min: 10, text: 'High Impact',   color: '#a78bfa' },
  { min: 6,  text: 'Medium Impact', color: '#2dd4bf' },
  { min: 0,  text: 'Low Impact',    color: '#fbbf24' },
] as const;

export function getImpactLabel(gain: number): { text: string; color: string } {
  for (const t of IMPACT_THRESHOLDS) {
    if (gain >= t.min) return { text: t.text, color: t.color };
  }
  return { text: 'Low Impact', color: '#fbbf24' };
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

export const SIM_ACTIONS = [
  { type: 'RESUME', label: 'Upload Resume', color: '#818CF8' },
  { type: 'PROJECT', label: 'Add a Project', color: '#2DD4BF' },
  { type: 'SKILLS', label: 'List 3+ Skills', color: '#F59E0B' },
  { type: 'LINKEDIN', label: 'Link LinkedIn', color: '#3B82F6' },
  { type: 'PORTFOLIO', label: 'Build Portfolio', color: '#EC4899' },
  { type: 'MOCK_INTERVIEW', label: 'Practice Mock Interview', color: '#10B981' },
  { type: 'CERTIFICATION', label: 'Get Certified', color: '#F59E0B' },
  { type: 'NETWORKING', label: 'Network with Alumni', color: '#2DD4BF' },
  { type: 'PROFILE', label: 'Complete Profile', color: '#818CF8' },
  { type: 'EDUCATION', label: 'Add Education Details', color: '#3B82F6' },
];

