import { apiRequest } from '@/data/services/http';

/**
 * The partner console's reads and writes, typed to what the server returns
 * today (backend/services/workflow_api.py, student_requests.py,
 * lab_booking.py, clinical_api.py). Nothing here invents a field: where a
 * board shows a figure no endpoint reports (commission, payouts, accept rate,
 * reorder rules, camp batches), the screen says "not connected" instead.
 *
 * Rule L: order lines are commerce rows (sk_commerce). The customer's name
 * comes back from the identity session; screens show initials only, and only
 * what the endpoints below already return.
 */

/** Order-line states (workflow_api.update_request transitions; CANCELLED is set by the student, POST /orders/{id}/cancel). */
export type RequestStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';

export interface PartnerDelivery {
  mode?: 'delivery' | 'pickup';
  address?: string;
  city?: string;
  pincode?: string;
}

/** One line of `GET /work/requests`. */
export interface PartnerRequest {
  id: string;
  orderId: string;
  itemId: string;
  name: string;
  kind: string;
  quantity: number;
  pricePaise: number;
  status: RequestStatus;
  customer: string;
  delivery: PartnerDelivery | null;
  requestedSlot: string;
  createdAt: number;
  /** Placed with online payment on offer and not paid yet: nothing may be accepted or sent (server-enforced). */
  awaitingPayment?: boolean;
  paymentStatus?: string;
}

/** A queue filter: a line status, everything, or the placed-but-unpaid lines kept apart from "New". */
export type QueueFilter = RequestStatus | 'ALL' | 'AWAITING_PAYMENT';

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export function requestsPath(options: { status?: QueueFilter; limit?: number; offset?: number } = {}): string {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit ?? 20));
  params.set('offset', String(options.offset ?? 0));
  if (options.status && options.status !== 'ALL') params.set('status', options.status);
  return `/work/requests?${params.toString()}`;
}

export function loadRequests(options: { status?: QueueFilter; limit?: number; offset?: number } = {}, signal?: AbortSignal): Promise<Page<PartnerRequest>> {
  return apiRequest<Page<PartnerRequest>>(requestsPath(options), { signal });
}

/** How many lines are in a state: the server's own `total`, one row fetched. */
export async function countRequests(status: QueueFilter, signal?: AbortSignal): Promise<number> {
  const page = await loadRequests({ status, limit: 1 }, signal);
  return page.total;
}

export function updateRequest(lineId: string, status: Exclude<RequestStatus, 'REQUESTED' | 'CANCELLED'>): Promise<PartnerRequest> {
  return apiRequest<PartnerRequest>(`/work/requests/${encodeURIComponent(lineId)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

/**
 * Prescriptions waiting for this pharmacy's pharmacist. Only the two totals are
 * kept: the review payload itself is clinical and stays on the Rx review page.
 */
export async function countRxReviews(signal?: AbortSignal): Promise<number> {
  const queue = await apiRequest<{ total: number; uploadsTotal: number }>('/v1/pharmacy/rx-reviews', { signal });
  return queue.total + queue.uploadsTotal;
}

/* ------------------------------------------------------------------ returns */

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'DECLINED' | 'PICKED_UP' | 'CANCELLED';
export type ReturnReason = 'WRONG_ITEM' | 'DAMAGED' | 'NOT_NEEDED' | 'OTHER';

/** One row of `GET /work/returns` (the student's name is returned but not shown). */
export interface PartnerReturn {
  id: string;
  orderLineId: string;
  item: string;
  reason: ReturnReason | string;
  note: string | null;
  hasPhoto: boolean;
  status: ReturnStatus | string;
  refundPaise: number | null;
  refundStatus: 'TO_ARRANGE' | null;
  decisionNote: string | null;
  createdAt: number;
  updatedAt: number | null;
}

export function loadReturns(signal?: AbortSignal): Promise<{ items: PartnerReturn[] }> {
  return apiRequest<{ items: PartnerReturn[] }>('/work/returns', { signal });
}

export function decideReturn(id: string, decision: 'APPROVED' | 'DECLINED', refundPaise: number, note: string): Promise<unknown> {
  return apiRequest(`/work/returns/${encodeURIComponent(id)}/decide`, { method: 'POST', body: JSON.stringify({ decision, refundPaise, note }) });
}

export function markReturnPickedUp(id: string): Promise<unknown> {
  return apiRequest(`/work/returns/${encodeURIComponent(id)}/picked-up`, { method: 'POST', body: '{}' });
}

/* ---------------------------------------------------------- lab collectors */

/** One row of `GET /work/lab-collectors`: a lab's own sample collectors. */
export interface LabCollector {
  id: string;
  accountId: string;
  labId: string;
  fullName: string;
  identifier: string;
  channel: 'EMAIL' | 'WHATSAPP' | string;
  active: boolean;
  createdAt: number;
}

export function loadCollectors(signal?: AbortSignal): Promise<{ items: LabCollector[]; total: number }> {
  return apiRequest<{ items: LabCollector[]; total: number }>('/work/lab-collectors', { signal });
}

export function addCollector(body: { fullName: string; identifier: string; channel: 'EMAIL' | 'WHATSAPP' }): Promise<LabCollector> {
  return apiRequest<LabCollector>('/work/lab-collectors', { method: 'POST', body: JSON.stringify(body) });
}

/** Retiring a collector also deactivates their account: the server refuses them at once. */
export function retireCollector(id: string): Promise<LabCollector> {
  return apiRequest<LabCollector>(`/work/lab-collectors/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ active: false }) });
}

/* ------------------------------------------------------- partner enquiries */

/** The body `POST /billing/inquiries` accepts (backend/services/billing.py, InquiryInput). */
export interface PartnerEnquiryBody {
  organization: string;
  contactName: string;
  email: string;
  seats: 0;
  planId: 'ENTERPRISE';
  message: string;
  consent: true;
}

export function sendPartnerEnquiry(body: PartnerEnquiryBody): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>('/billing/inquiries', { method: 'POST', body: JSON.stringify(body) });
}
