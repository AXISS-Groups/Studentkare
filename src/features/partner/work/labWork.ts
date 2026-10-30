import { apiRequest } from '@/data/services/http';

/**
 * The lab desk's reads and writes (WP-15), typed to what the server returns
 * today (backend/services/clinical_api.py `lab_payload`, `/work/lab-orders`,
 * `/lab-orders/{id}`, `/work/lab-orders/{id}/report`,
 * `/work/lab-orders/awaiting-collection`).
 *
 * Nothing here invents a field. The lab payload carries no student name, no
 * result value and no reference range: a report is a filed document, and a
 * doctor reviews and releases it (`REPORT_RELEASED` is never a lab action).
 * The critical flag and note are the lab's own, set when it files the report.
 */

type LabStatus =
  | 'BOOKED' | 'ASSIGNED' | 'SAMPLE_COLLECTED' | 'IN_TRANSIT' | 'RECEIVED_AT_LAB' | 'IN_ANALYSIS'
  | 'REPORT_READY' | 'REPORT_RELEASED' | 'SAMPLE_REJECTED' | 'RECOLLECTION_REQUIRED' | 'CANCELLED';

export interface LabOrder {
  id: string;
  patientId: string;
  testPanel: string[];
  collectionMode: string;
  slotStart: string;
  fastingRequired: boolean;
  collectorName: string;
  collectorId: string;
  collectionAddress: string | null;
  tubeCount: number;
  collectedAt: number | null;
  handedOverAt: number | null;
  sampleId: string;
  status: LabStatus | string;
  criticalFlag: boolean;
  criticalNote: string;
  criticalAcknowledgedAt: number | null;
  rejectionReason: string;
  hasHeldReport: boolean;
  reviewedAt: number | null;
  awaitingDoctorReview: boolean;
  createdAt: number;
  updatedAt: number;
  nextStates: string[];
}

export interface LabQueue {
  items: LabOrder[];
  total: number;
  critical: number;
}

/** The server's maximum page (`limit` le=200). */
const LAB_PAGE = 200;

export function loadLabOrders(signal?: AbortSignal, status = ''): Promise<LabQueue> {
  const params = new URLSearchParams({ limit: String(LAB_PAGE) });
  if (status) params.set('status', status);
  return apiRequest<LabQueue>(`/work/lab-orders?${params.toString()}`, { signal });
}

/** Booked and never collected: the server decides what is overdue (`F.overdue_collection`). */
export interface OverdueCollection {
  id: string;
  overdueReason: string;
  waitingSeconds: number;
}

export function loadAwaitingCollection(signal?: AbortSignal): Promise<{ items: OverdueCollection[]; total: number }> {
  return apiRequest<{ items: OverdueCollection[]; total: number }>('/work/lab-orders/awaiting-collection', { signal });
}

/** A lifecycle step the lab may take (the server checks the transition and the lab's ownership). */
export function advanceLabOrder(id: string, status: string, extra: { collectorId?: string; sampleId?: string; rejectionReason?: string } = {}): Promise<LabOrder> {
  return apiRequest<LabOrder>(`/lab-orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status, ...extra }) });
}

/** Files the report for a doctor. A critical flag needs the lab's note on which value. */
export function fileLabReport(id: string, file: File, critical: { flag: boolean; note: string }): Promise<LabOrder> {
  const form = new FormData();
  form.append('file', file);
  if (critical.flag) {
    form.append('criticalFlag', 'true');
    form.append('criticalNote', critical.note.trim());
  }
  return apiRequest<LabOrder>(`/work/lab-orders/${encodeURIComponent(id)}/report`, { method: 'POST', body: form });
}

/* --------------------------------------------------------------- pipeline */

/** The board's pipeline: Booked, Collected, Transit, Analysed, Released. */
export type LabStage = 'booked' | 'collected' | 'transit' | 'analysed' | 'released';
export const LAB_STAGES: readonly LabStage[] = ['booked', 'collected', 'transit', 'analysed', 'released'];

const STAGE_OF: Record<string, LabStage> = {
  BOOKED: 'booked',
  ASSIGNED: 'booked',
  RECOLLECTION_REQUIRED: 'booked',
  SAMPLE_COLLECTED: 'collected',
  SAMPLE_REJECTED: 'collected',
  IN_TRANSIT: 'transit',
  RECEIVED_AT_LAB: 'analysed',
  IN_ANALYSIS: 'analysed',
  REPORT_READY: 'analysed',
  REPORT_RELEASED: 'released',
};

/** Where an order sits on the board; a cancelled (or unknown) order is not on it. */
export function stageOf(order: Pick<LabOrder, 'status'>): LabStage | null {
  return STAGE_OF[order.status] ?? null;
}

/** States where a sample is still to be taken (the run sheet). */
export const COLLECTION_STATES = new Set(['BOOKED', 'ASSIGNED', 'RECOLLECTION_REQUIRED', 'SAMPLE_COLLECTED', 'SAMPLE_REJECTED']);

/** A critical value the lab flagged that still needs someone: with the doctor, or released and not acknowledged. */
export function criticalOpen(order: LabOrder): boolean {
  if (!order.criticalFlag) return false;
  if (order.status === 'REPORT_READY') return true;
  return order.status === 'REPORT_RELEASED' && !order.criticalAcknowledgedAt;
}

/** A slot's clock time ("07:40"), or null when the free-text slot does not parse. */
export function slotTime(slot: string): string | null {
  const text = slot.trim();
  if (!text) return null;
  const when = Date.parse(text);
  if (Number.isNaN(when)) return null;
  return new Date(when).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Sorts by slot (unparseable slots last), then by when it was booked. */
export function bySlot(a: LabOrder, b: LabOrder): number {
  const left = Date.parse(a.slotStart);
  const right = Date.parse(b.slotStart);
  const l = Number.isNaN(left) ? Number.POSITIVE_INFINITY : left;
  const r = Number.isNaN(right) ? Number.POSITIVE_INFINITY : right;
  if (l !== r) return l - r;
  return a.createdAt - b.createdAt;
}
