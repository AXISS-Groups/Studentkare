import { apiRequest } from '@/data/services/http';

/**
 * The pharmacy desk's reads and writes (WP-15), typed to what the server
 * returns today (backend/services/clinical_api.py `dispense_payload`,
 * `fulfilment_prescription_payload`, `/ops/dispense-register`,
 * `/v1/pharmacy/rx-reviews`; backend/services/rx_uploads.py).
 *
 * Rule L: a dispense carries one commerce fact, `quoteStatus`, never an
 * amount. A partner never gets a diagnosis, advice or allergy record. The
 * prescriber decides a substitution; the pharmacy only proposes one.
 */

export interface DispenseItem {
  id: string;
  genericName: string;
  brandName?: string;
  strength: string;
  form?: string;
  dose: string;
  frequency: string;
  quantity: number;
  scheduleClass: string;
  registerRequired: boolean;
  substitutionAllowed: boolean;
}

export interface Dispense {
  id: string;
  prescriptionId: string;
  patientId: string;
  status: string;
  verifiedBy: string;
  verifiedAt: number | null;
  substitutionNote: string;
  rejectionReason: string;
  delivery: { mode?: string; address?: string; city?: string; pincode?: string } | null;
  createdAt: number;
  updatedAt: number;
  quoteStatus: 'NONE' | 'QUOTED' | 'PAYMENT_STARTED' | 'PAID' | 'CANCELLED' | string;
  nextStates: string[];
  prescription: { id: string; prescriberRegNo: string; issuedAt: number; validUntil: number; items: DispenseItem[] } | null;
}

const DISPENSE_PAGE = 200;

export function loadDispenses(signal?: AbortSignal): Promise<{ items: Dispense[]; total: number }> {
  return apiRequest<{ items: Dispense[]; total: number }>(`/work/dispenses?limit=${DISPENSE_PAGE}`, { signal });
}

/** PACKED and OUT_FOR_DELIVERY only: the server refuses packing anything unpaid. */
export function advanceDispense(id: string, status: 'PACKED' | 'OUT_FOR_DELIVERY'): Promise<Dispense> {
  return apiRequest<Dispense>(`/dispenses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export const TERMINAL_DISPENSE = new Set(['DELIVERED', 'REJECTED', 'CANCELLED', 'RETURNED']);

/* ---------------------------------------------------------------- register */

/** One entry of `GET /ops/dispense-register`: a delivered dispense with Schedule H1 / X lines. */
export interface RegisterEntry {
  dispenseId: string;
  prescriptionId: string;
  verifiedBy: string;
  verifiedAt: number | null;
  dispensedAt: number;
  items: Array<{ genericName: string; strength: string; quantity: number; scheduleClass: string }>;
}

export function loadRegister(signal?: AbortSignal): Promise<{ items: RegisterEntry[]; total: number }> {
  return apiRequest<{ items: RegisterEntry[]; total: number }>('/ops/dispense-register?limit=500', { signal });
}

/* ----------------------------------------------------------- substitutions */

export interface SubstitutionProposalBody {
  prescriptionItemId: string;
  proposedGeneric: string;
  proposedBrand: string;
  reason: string;
}

/** The pharmacy proposes; the prescriber decides (`/substitutions/{id}/decide` is theirs). */
export function proposeSubstitution(dispenseId: string, body: SubstitutionProposalBody): Promise<unknown> {
  return apiRequest(`/dispenses/${encodeURIComponent(dispenseId)}/substitutions`, { method: 'POST', body: JSON.stringify(body) });
}

/* --------------------------------------------------------------- rx review */

export interface RxReview {
  dispenseId: string;
  receivedAt: number;
  prescriberRegNo: string;
  issuedAt: number;
  validUntil: number;
  expired: boolean;
  items: DispenseItem[];
}

/** A prescription a student uploaded: no medicine lines, opened through a short-lived link. */
export interface RxUpload {
  reviewId: string;
  receivedAt: number;
  mimeType: string;
  source: 'UPLOAD';
}

export interface RxReviewQueue {
  reviews: RxReview[];
  total: number;
  uploads: RxUpload[];
  uploadsTotal: number;
}

export function loadRxReviews(signal?: AbortSignal): Promise<RxReviewQueue> {
  return apiRequest<RxReviewQueue>('/v1/pharmacy/rx-reviews', { signal });
}

/** The server's five checks; it refuses an approval unless every one is true. */
export interface RxChecks {
  prescriberRegistration: boolean;
  prescriptionDate: boolean;
  patientMatches: boolean;
  allergyChecked: boolean;
  scheduleLogged: boolean;
}

export function approveRx(kind: 'review' | 'upload', id: string, pharmacistName: string, checks: RxChecks): Promise<unknown> {
  const base = kind === 'review' ? '/v1/pharmacy/rx-reviews' : '/v1/pharmacy/rx-uploads';
  return apiRequest(`${base}/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ pharmacistName, checks }) });
}

export function rejectRx(kind: 'review' | 'upload', id: string, reason: string): Promise<unknown> {
  const base = kind === 'review' ? '/v1/pharmacy/rx-reviews' : '/v1/pharmacy/rx-uploads';
  return apiRequest(`${base}/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}

/** A two-minute link to an uploaded prescription, for this pharmacist's session only. */
export function rxUploadLink(reviewId: string): Promise<{ url: string; expiresAt: number }> {
  return apiRequest<{ url: string; expiresAt: number }>(`/v1/pharmacy/rx-uploads/${encodeURIComponent(reviewId)}/file-link`, { method: 'POST', body: '{}' });
}

/* -------------------------------------------------------------- two-step */

export function loadTwoFactorStatus(signal?: AbortSignal): Promise<{ enabled: boolean; required: boolean }> {
  return apiRequest<{ enabled: boolean; required: boolean }>('/auth/2fa/status', { signal });
}

/** Schedule classes the pharmacist logs (`REGISTER_CLASSES` plus H, as the review screen flags them). */
export const SCHEDULED_CLASSES = new Set(['H', 'H1', 'X']);

/** A short, stable reference the boards print ("RX-2231" style), from the id. */
export function refOf(id: string): string {
  return id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
}
