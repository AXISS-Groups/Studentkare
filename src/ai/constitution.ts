// AI Constitution for Student Health Platform v0.5

export interface ConstitutionRule {
  id: string;
  category: 'STUDENT_CARE' | 'SERVICES_FABRIC' | 'CLAIMS_INTELLIGENCE';
  title: string;
  description: string;
  enforcementMechanism: 'SCHEMA_ISOLATION' | 'PROVENANCE_MANDATORY' | 'HUMAN_IN_THE_LOOP' | 'DETERMINISTIC_ROUTING' | 'SAFETY_GUARDRAIL';
}

export const CONSTITUTION_RULES: Record<string, ConstitutionRule> = {
  // Rules A-H: Student Care (M5)
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

  // Rules J: Services Fabric (M19-M21)
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

  // Rules K: Claims Intelligence (M22-M25)
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
};
