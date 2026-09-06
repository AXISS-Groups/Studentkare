// AI Constitution for Student Health Platform v0.6

export interface ConstitutionRule {
  id: string;
  category: 'STUDENT_CARE' | 'SERVICES_FABRIC' | 'CLAIMS_INTELLIGENCE' | 'COMMERCE_FIREWALL';
  title: string;
  description: string;
  enforcementMechanism:
    | 'SCHEMA_ISOLATION'
    | 'PROVENANCE_MANDATORY'
    | 'HUMAN_IN_THE_LOOP'
    | 'DETERMINISTIC_ROUTING'
    | 'SAFETY_GUARDRAIL';
}

export const CONSTITUTION_RULES = {
  // Rules A-D: Student Care (M5)
  'Rule-A': {
    id: 'Rule-A',
    category: 'STUDENT_CARE',
    title: 'No Prescriptive Diagnosis',
    description: 'AI provides educational symptom triage and suggestions, never legally binding clinical diagnoses or prescriptions.',
    enforcementMechanism: 'SAFETY_GUARDRAIL',
  },
  'Rule-B': {
    id: 'Rule-B',
    category: 'STUDENT_CARE',
    title: 'Emergency Triage Escalation',
    description: 'Red-flag symptoms (severe chest pain, breathing difficulty, acute trauma, self-harm) immediately trigger 108 Emergency card / campus clinic SOS mode.',
    enforcementMechanism: 'SAFETY_GUARDRAIL',
  },
  'Rule-C': {
    id: 'Rule-C',
    category: 'STUDENT_CARE',
    title: 'Zero Training on Student Records',
    description: 'Personal health vault data, lab tests, and chat interactions are NEVER stored to train foundation models or target commerce.',
    enforcementMechanism: 'SAFETY_GUARDRAIL',
  },
  'Rule-D': {
    id: 'Rule-D',
    category: 'STUDENT_CARE',
    title: 'ABDM HIU/HIP Consent Strictness',
    description: 'Data exchange strictly complies with ABDM gateway tokens and user-granted consent artefacts.',
    enforcementMechanism: 'SAFETY_GUARDRAIL',
  },

  // Rules J1-J4: Services Fabric (M19-M21)
  'Rule-J1': {
    id: 'Rule-J1',
    category: 'SERVICES_FABRIC',
    title: 'Deterministic & Auditable Routing',
    description: 'Provider routing is deterministic based on Pincode coverage, NABL accreditation, and SLA records. Weights are inspectable and versioned.',
    enforcementMechanism: 'DETERMINISTIC_ROUTING',
  },
  'Rule-J2': {
    id: 'Rule-J2',
    category: 'SERVICES_FABRIC',
    title: 'State Transitions by Rules & Humans',
    description: 'AI may draft or summarize; order state machine transitions strictly come from deterministic business rules or verified webhook events.',
    enforcementMechanism: 'DETERMINISTIC_ROUTING',
  },
  'Rule-J3': {
    id: 'Rule-J3',
    category: 'SERVICES_FABRIC',
    title: 'Partner Data Isolation',
    description: 'Partner end-user payloads are processed for order fulfilment only. They never enter the student health data plane.',
    enforcementMechanism: 'SCHEMA_ISOLATION',
  },
  'Rule-J4': {
    id: 'Rule-J4',
    category: 'SERVICES_FABRIC',
    title: 'Strict Pincode Serviceability',
    description: 'An unserviceable pincode returns an explicit unserviceable response; never a speculative silent nearest-match substitution.',
    enforcementMechanism: 'DETERMINISTIC_ROUTING',
  },

  // Rules K1-K8: Claims Intelligence (M22-M25)
  'Rule-K1': {
    id: 'Rule-K1',
    category: 'CLAIMS_INTELLIGENCE',
    title: 'Absolute Database Role Isolation',
    description: 'The claims plane has NO READ GRANT on the clinical schema. Enforced at database role level, not a UI permission check.',
    enforcementMechanism: 'SCHEMA_ISOLATION',
  },
  'Rule-K2': {
    id: 'Rule-K2',
    category: 'CLAIMS_INTELLIGENCE',
    title: 'Human Reviewer Required',
    description: 'Adjudication output is a recommendation package prepared for a named human adjudicator. No auto-denial, no auto-approval without human sign-off.',
    enforcementMechanism: 'HUMAN_IN_THE_LOOP',
  },
  'Rule-K3': {
    id: 'Rule-K3',
    category: 'CLAIMS_INTELLIGENCE',
    title: 'No Consumer Cross-Scoring',
    description: 'No FWA or risk model may score an individual using clinical records they uploaded as a consumer.',
    enforcementMechanism: 'SCHEMA_ISOLATION',
  },
  'Rule-K4': {
    id: 'Rule-K4',
    category: 'CLAIMS_INTELLIGENCE',
    title: 'Mandatory Pixel Provenance',
    description: 'Every extracted bill amount and clinical finding must point to its document, page, and bounding box coordinate. Untraceable findings are dropped.',
    enforcementMechanism: 'PROVENANCE_MANDATORY',
  },
  'Rule-K5': {
    id: 'Rule-K5',
    category: 'CLAIMS_INTELLIGENCE',
    title: 'Rules Engine Computes Financials',
    description: 'AI models classify line items and detect text; deterministic tariff/NME rules calculate deductions and currency amounts.',
    enforcementMechanism: 'DETERMINISTIC_ROUTING',
  },
  'Rule-K8': {
    id: 'Rule-K8',
    category: 'CLAIMS_INTELLIGENCE',
    title: 'Sensitive Category Restricted Pool',
    description: 'Claims involving mental health, reproductive health, or HIV route to restricted specialist reviewers with elevated audit trails.',
    enforcementMechanism: 'HUMAN_IN_THE_LOOP',
  },

  // Rules L1-L8: Commerce Firewall (Non-deferrable Phase 1 Rules)
  'Rule-L1': {
    id: 'Rule-L1',
    category: 'COMMERCE_FIREWALL',
    title: 'No Advertising Surface in Clinical Contexts',
    description: 'Clinical care surfaces (triage, lab records, consultations, prescription notes) are strictly ad-free.',
    enforcementMechanism: 'SCHEMA_ISOLATION',
  },
  'Rule-L2': {
    id: 'Rule-L2',
    category: 'COMMERCE_FIREWALL',
    title: 'No Commerce Targeting from Vault Data',
    description: 'Health vault data, diagnoses, and lab results cannot be queried to target ads, offers, or partner promotions.',
    enforcementMechanism: 'SCHEMA_ISOLATION',
  },
  'Rule-L3': {
    id: 'Rule-L3',
    category: 'COMMERCE_FIREWALL',
    title: 'No Revenue Share on Clinical Routing Decisions',
    description: 'Provider, lab, or clinic routing recommendations never take affiliate fees, commissions, or revenue shares.',
    enforcementMechanism: 'DETERMINISTIC_ROUTING',
  },
  'Rule-L4': {
    id: 'Rule-L4',
    category: 'COMMERCE_FIREWALL',
    title: 'No Upsell Inside Crisis or Emergency Flows',
    description: 'Crisis response, 108 emergency, and Tele-MANAS screens must contain zero commercial prompts, upsells, or partner banners.',
    enforcementMechanism: 'SAFETY_GUARDRAIL',
  },
  'Rule-L5': {
    id: 'Rule-L5',
    category: 'COMMERCE_FIREWALL',
    title: 'Separation of Wellness Marketplace from Clinical Recommendation',
    description: 'Student reward points and marketplace discounts exist in a separate room from medical care and lab advice.',
    enforcementMechanism: 'SCHEMA_ISOLATION',
  },
  'Rule-L6': {
    id: 'Rule-L6',
    category: 'COMMERCE_FIREWALL',
    title: 'Zero Student Financial Obligation for Core Care',
    description: 'Students never pay for campus health camp, clinic routing, or emergency records. Institutions or partners bear 100% of core cost.',
    enforcementMechanism: 'SAFETY_GUARDRAIL',
  },
  'Rule-L7': {
    id: 'Rule-L7',
    category: 'COMMERCE_FIREWALL',
    title: 'Consent-Gated Partner Marketplace Access',
    description: 'Third-party discount partners receive only campus name and academic year; no personal or clinical identifiers.',
    enforcementMechanism: 'SCHEMA_ISOLATION',
  },
  'Rule-L8': {
    id: 'Rule-L8',
    category: 'COMMERCE_FIREWALL',
    title: 'Points Ledger Isolation',
    description: 'Points ledger is non-monetary: nothing loaded, nothing withdrawable, nothing transferable. Used solely for wellness engagement.',
    enforcementMechanism: 'DETERMINISTIC_ROUTING',
  },
} as const satisfies Record<string, ConstitutionRule>;

export type RuleId = keyof typeof CONSTITUTION_RULES;

/**
 * Executable Constitution Enforcement Assertor.
 * Throws a runtime error if an invalid RuleId is specified, ensuring rule compliance at system boundaries.
 */
export function assertRule(id: RuleId): ConstitutionRule {
  const rule = CONSTITUTION_RULES[id];
  if (!rule) {
    throw new Error(`[CONSTITUTION VIOLATION]: Unrecognized or unexecuted Constitution Rule ID "${id}"`);
  }
  return rule;
}
