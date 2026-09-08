/**
 * Studentkare — Wellbeing module types (Insights · Suggestions · Activity).
 *
 * BOUNDARY: This module is DESCRIPTIVE + EDUCATIONAL + ROUTING. It NEVER
 * predicts, scores, sets targets, or compares body metrics. Predictive output
 * belongs to the clinician-facing M18 surface / licensed SaMD path (Phase 8).
 *
 * See the architecture tests in __tests__/wellbeingArchitecture.test.ts.
 */

export type WellnessLanguage = 'EN' | 'TE';

export type ContentKind = 'GUIDANCE' | 'SUGGESTION' | 'ACTIVITY' | 'NUTRITION';

export interface AdvisorContent {
  id: string;
  kind: ContentKind;
  titleEn: string;
  bodyEn: string;
  titleTe?: string;
  bodyTe?: string;
  source: string;
  /** Release gate: content without an explicit advisor sign-off does NOT render. */
  advisorApproved: boolean;
  version: string;
  approvedAt?: string;
}

export interface ReferenceRange {
  code: string;
  display: string;
  unit: string;
  typicalRange: string;
  source: string;
  version: string;
  advisorApproved: boolean;
  /** Body metric (weight/BMI/body-fat/waist) — shown only if clinician-recorded, never as a target. */
  isBodyMetric: boolean;
}

export interface ProvenanceNote {
  sourceType: string;
  facility?: string;
  takenOn?: string;
}

export interface ValueRestatement {
  display: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  /** Plain-language meaning of the measure — never a diagnosis or prediction. */
  plainLanguage: string;
  provenance: ProvenanceNote;
  isBodyMetric: boolean;
  /** Deterministic out-of-range check only. Interpretation is clinician's, never the app's. */
  outsideTypicalRange: boolean;
}

export interface TrendPoint {
  date: string;
  value: string | number;
  unit: string;
}

export interface TrendSeries {
  code: string;
  display: string;
  unit: string;
  points: TrendPoint[];
}

export type CompletenessStatus = 'COMPLETE' | 'MISSING' | 'DUE' | 'EXPIRING' | 'OVERDUE';

export interface CompletenessItem {
  id: string;
  label: string;
  detail: string;
  status: CompletenessStatus;
}

export interface RiskSignal {
  kind: 'RESTRICTION' | 'COMPENSATORY' | 'WEIGHT_QUERY' | 'EXCESSIVE_ACTIVITY';
  matched: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type SuggestionTrigger =
  | 'SEASONAL'
  | 'ACADEMIC'
  | 'CAMPUS_EVENT'
  | 'ADMIN_STATE'
  | 'ENVIRONMENTAL'
  | 'AGGREGATE_SIGNAL';

export interface SuggestionContext {
  campusName: string;
  region: string;
  month: number; // 1-12
  isExamWeek: boolean;
  campDaySoon: boolean;
  monsoonSeason: boolean;
  summerHeat: boolean;
  clearanceExpiring: boolean;
  immunisationDue: boolean;
  campOverdue: boolean;
  aggregateGiReports: boolean;
}

export interface Suggestion {
  id: string;
  trigger: SuggestionTrigger;
  title: string;
  body: string;
  source: string;
  advisorApproved: boolean;
  /** Never more than one suggestion surface per session. */
  dismissible: boolean;
}

export type ScreeningQuestion = {
  id: string;
  prompt: string;
  /** A positive answer routes to a clinician and blocks structured content. */
  contraindication: boolean;
};

export interface ScreeningResult {
  anyPositive: boolean;
  positiveQuestionIds: string[];
  /** TRUE => route to clinician and block structured activity content. */
  blocksStructuredContent: boolean;
  /** T3. Not an analytics event. */
  sensitive: boolean;
}

export interface CampusActivityOption {
  id: string;
  name: string;
  kind: 'FACILITY' | 'ROUTE' | 'GROUP' | 'REFERRAL';
  detail: string;
  institutionConfigurable: boolean;
}

export interface ActivityGuidance {
  /** Population recommendation for adults — NOT a plan generated for this student. */
  populationGuidance: string;
  sources: string[];
}
