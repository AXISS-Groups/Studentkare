import { apiBaseUrl } from '../../core/env';
import { ApiError, apiRequest } from './http';

/**
 * Typed client for a student's prescription uploads and the pharmacist's review
 * of them (backend/services/rx_uploads.py). Data layer only: the student screen
 * (canvas PrescriptionUpload, SK-065) is Tier 1 and waits for design review.
 *
 * Nothing here orders, prices or carts anything — approval records the
 * pharmacist's outcome only.
 */

/** What the server accepts. It reads the type from the file's bytes, so this is a hint for pickers, not a check. */
const PRESCRIPTION_ACCEPT = [
  'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf', 'image/tiff',
] as const;
type PrescriptionMimeType = (typeof PRESCRIPTION_ACCEPT)[number];
const PRESCRIPTION_MAX_BYTES = 10 * 1024 * 1024;

type RxUploadReviewStatus = 'PENDING' | 'RX_VERIFIED' | 'REJECTED' | 'WITHDRAWN';

export interface PharmacyOption {
  id: string;
  name: string;
  /** The pharmacy's pincode. */
  area: string;
}

export interface StoredPrescription {
  id: string;
  title: string;
  filename: string;
  mimeType: PrescriptionMimeType;
  createdAt: number;
  sizeBytes?: number;
}

export interface PrescriptionReview {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  status: RxUploadReviewStatus;
  rejectionReason: string;
  verifiedAt: number | null;
  sentAt: number;
}

interface PrescriptionUpload extends StoredPrescription {
  reviews: PrescriptionReview[];
}

/** One uploaded prescription in a pharmacist's queue: no student details, file name or title. */
interface RxUploadQueueItem {
  reviewId: string;
  receivedAt: number;
  mimeType: PrescriptionMimeType;
  source: 'UPLOAD';
}

export interface RxReviewChecks {
  prescriberRegistration: boolean;
  prescriptionDate: boolean;
  patientMatches: boolean;
  allergyChecked: boolean;
  scheduleLogged: boolean;
}

export interface RxUploadOutcome {
  reviewId: string;
  status: RxUploadReviewStatus;
  verifiedBy: string;
  verifiedAt: number | null;
  rejectionReason: string;
}

export interface RxUploadFileLink {
  /** Absolute URL; works only for the pharmacist's own session, until `expiresAt`. */
  url: string;
  expiresAt: number;
}

/**
 * A file from a web `<input type="file">`. A native picker's { uri, name, type }
 * part needs the native FormData typing, so it belongs beside src/native/recordUpload.ts.
 */
export type PrescriptionFile = Blob;

const enc = encodeURIComponent;

// ── Student ──────────────────────────────────────────────────────────────────

export function listPharmacies(): Promise<{ items: PharmacyOption[]; total: number }> {
  return apiRequest('/pharmacies');
}

export function uploadPrescription(file: PrescriptionFile, title = 'Prescription', filename = 'prescription'): Promise<StoredPrescription> {
  const form = new FormData();
  form.append('title', title);
  form.append('file', file, filename);
  return apiRequest('/health/prescription-uploads', { method: 'POST', body: form });
}

function listPrescriptionUploads(): Promise<{ items: PrescriptionUpload[]; total: number }> {
  return apiRequest('/health/prescription-uploads');
}

export function deletePrescriptionUpload(id: string): Promise<{ success: boolean; withdrawnReviews: number }> {
  return apiRequest(`/health/prescription-uploads/${enc(id)}`, { method: 'DELETE' });
}

export function sendPrescriptionForReview(id: string, pharmacyId: string): Promise<PrescriptionReview> {
  return apiRequest(`/health/prescription-uploads/${enc(id)}/reviews`, {
    method: 'POST', body: JSON.stringify({ pharmacyId }),
  });
}

// ── Pharmacist ───────────────────────────────────────────────────────────────

export async function requestRxUploadLink(reviewId: string): Promise<RxUploadFileLink> {
  const link = await apiRequest<RxUploadFileLink>(`/v1/pharmacy/rx-uploads/${enc(reviewId)}/file-link`, { method: 'POST' });
  // The server answers with its own /api path; point it at this client's API base.
  return { ...link, url: `${apiBaseUrl()}${link.url.replace(/^\/api(?=\/)/, '')}` };
}

export function approveRxUpload(reviewId: string, pharmacistName: string, checks: RxReviewChecks): Promise<RxUploadOutcome> {
  return apiRequest(`/v1/pharmacy/rx-uploads/${enc(reviewId)}/approve`, {
    method: 'POST', body: JSON.stringify({ pharmacistName, checks }),
  });
}

function rejectRxUpload(reviewId: string, reason: string): Promise<RxUploadOutcome> {
  return apiRequest(`/v1/pharmacy/rx-uploads/${enc(reviewId)}/reject`, {
    method: 'POST', body: JSON.stringify({ reason }),
  });
}

// ── Upload state ─────────────────────────────────────────────────────────────

export type UploadProblem = 'tooLarge' | 'unsupported' | 'rejected' | 'failed';

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success'; upload: StoredPrescription }
  | { kind: 'error'; problem: UploadProblem; message: string };

/** Why an upload failed, from the server's status. Unknown failures stay 'failed' — never treated as saved. */
export function uploadProblem(error: unknown): UploadProblem {
  if (!(error instanceof ApiError)) return 'failed';
  if (error.status === 413) return 'tooLarge';
  if (error.status === 415) return 'unsupported';
  if (error.status === 400 || error.status === 422) return 'rejected';
  return 'failed';
}

/**
 * Run one upload and report each state. Fail closed: success only when the
 * server stored the file; any error ends in an error state, never success.
 */
export async function runPrescriptionUpload(
  file: PrescriptionFile,
  onState: (state: UploadState) => void,
  upload: (file: PrescriptionFile) => Promise<StoredPrescription> = (f) => uploadPrescription(f),
): Promise<UploadState> {
  onState({ kind: 'uploading' });
  let state: UploadState;
  try {
    state = { kind: 'success', upload: await upload(file) };
  } catch (error) {
    state = {
      kind: 'error',
      problem: uploadProblem(error),
      message: error instanceof Error ? error.message : 'The upload could not be completed. Please try again.',
    };
  }
  onState(state);
  return state;
}
