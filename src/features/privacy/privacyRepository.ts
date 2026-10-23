import { apiRequest } from '@/data/services/http';
import type { Lang } from '@/i18n';

/** backend/services/consent_ledger.py OPTIONAL_PURPOSES, sorted. */
export const OPTIONAL_PURPOSES = ['AYUSH_HISTORY', 'BLOOD_DONOR_CONTACT', 'PICKUP_LOCATION', 'PREVENTIVE_OFFERS', 'SEASONAL_EDUCATION'] as const;
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
  consents: (): Promise<ConsentOverview> => apiRequest<ConsentOverview>('/privacy/consents'),
  change: (purpose: OptionalPurpose, granted: boolean, language: Lang): Promise<ConsentOverview> =>
    apiRequest<ConsentOverview>(`/privacy/consents/${purpose}`, { method: 'POST', body: JSON.stringify({ granted, language }) }),
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
