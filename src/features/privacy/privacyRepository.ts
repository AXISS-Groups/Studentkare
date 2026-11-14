import { apiRequest } from '@/data/services/http';
import type { Lang } from '@/i18n';

/** backend/services/consent_ledger.py OPTIONAL_PURPOSES, sorted. */
export const OPTIONAL_PURPOSES = ['AYUSH_HISTORY', 'BLOOD_DONOR_CONTACT', 'PICKUP_LOCATION', 'PREVENTIVE_OFFERS', 'SEASONAL_EDUCATION', 'WALLET_GOOGLE'] as const;
export type OptionalPurpose = (typeof OPTIONAL_PURPOSES)[number];

/** What GET /privacy/consents answers. */
export interface ConsentOverview {
  required: {
    purposes: string[];
    version: string;
    language: string;
    givenAt: number;
    noticeVersion: string | null;
    termsVersion: string | null;
  } | null;
  optional: Array<{
    purpose: OptionalPurpose;
    on: boolean;
    canGiveHere: boolean;
    version: string | null;
    givenAt: number | null;
    withdrawnAt: number | null;
  }>;
  history: Array<{ purposes: string[]; version: string; givenAt: number; withdrawnAt: number | null }>;
}

const INVALID_CONSENT_RESPONSE = 'INVALID_CONSENT_RESPONSE';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNullableTime = (value: unknown): value is number | null => value === null || isTime(value);
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';

/** Unknown purposes cannot inherit a switch or wording from a different consent. */
function isOptionalConsent(value: unknown): value is ConsentOverview['optional'][number] {
  return isRecord(value) && OPTIONAL_PURPOSES.some((purpose) => purpose === value.purpose)
    && typeof value.on === 'boolean' && typeof value.canGiveHere === 'boolean'
    && isNullableString(value.version) && isNullableTime(value.givenAt) && isNullableTime(value.withdrawnAt);
}

function isConsentOverview(value: unknown): value is ConsentOverview {
  if (!isRecord(value)) return false;
  const required = value.required;
  return (required === null || (isRecord(required) && isStrings(required.purposes)
    && typeof required.version === 'string' && typeof required.language === 'string' && isTime(required.givenAt)
    && isNullableString(required.noticeVersion) && isNullableString(required.termsVersion)))
    && Array.isArray(value.optional) && value.optional.every(isOptionalConsent)
    && new Set(value.optional.map((item) => item.purpose)).size === value.optional.length
    && Array.isArray(value.history) && value.history.every((item: unknown) => isRecord(item)
      && isStrings(item.purposes) && typeof item.version === 'string'
      && isTime(item.givenAt) && isNullableTime(item.withdrawnAt));
}

/** Reject unsupported/malformed ledger data into the existing error/retry state. */
export function readConsentOverview(value: unknown): ConsentOverview {
  if (!isConsentOverview(value)) throw new Error(INVALID_CONSENT_RESPONSE);
  return value;
}

export type LegalKind = 'PRIVACY_NOTICE' | 'TERMS' | 'GRIEVANCE_OFFICER';
export { UNPUBLISHED } from '@/features/auth/viewmodel/useSignupLegal';

/** GET /legal/{kind}: the published version, or published: false. */
export interface LegalDocument {
  kind: LegalKind;
  published: boolean;
  version: string | null;
  title: string | null;
  body: string | null;
  publishedAt: number | null;
}

/** A version as Super admin → Legal documents sees it. */
export interface LegalDocumentVersion {
  id: string;
  kind: LegalKind;
  version: string;
  title: string;
  body: string;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

export const privacyRepository = {
  consents: async (): Promise<ConsentOverview> => readConsentOverview(await apiRequest<unknown>('/privacy/consents')),
  change: (purpose: OptionalPurpose, granted: boolean, language: Lang): Promise<ConsentOverview> =>
    apiRequest<unknown>(`/privacy/consents/${purpose}`, { method: 'POST', body: JSON.stringify({ granted, language }) }).then(readConsentOverview),
  legal: (kind: LegalKind): Promise<LegalDocument> => apiRequest<LegalDocument>(`/legal/${kind}`),
};

export const legalAdminRepository = {
  list: (): Promise<{ items: LegalDocumentVersion[] }> => apiRequest('/ops/legal-documents'),
  create: (input: { kind: LegalKind; version: string; title: string; body: string }): Promise<LegalDocumentVersion> =>
    apiRequest('/ops/legal-documents', { method: 'POST', body: JSON.stringify(input) }),
  edit: (id: string, input: { title: string; body: string }): Promise<LegalDocumentVersion> =>
    apiRequest(`/ops/legal-documents/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  publish: (id: string): Promise<LegalDocumentVersion> =>
    apiRequest(`/ops/legal-documents/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
};
export type LegalAdminRepository = typeof legalAdminRepository;

/** A legal text's paragraphs: a blank line starts a new one (as the admin form says). */
export function paragraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}
