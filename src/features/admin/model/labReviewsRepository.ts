import { apiRequest } from '@/data/http';
import type { AccountPage, ReviewerChoice, UnassignedLabReviews } from './types';

/** The most doctors one request may list (the /ops/accounts limit). */
export const REVIEWER_LIST_LIMIT = 200;

/**
 * Held lab reports waiting for a reviewer, for Super Admin. The only place that knows
 * /work/lab-reviews as an admin uses it. It never reads a report: the admin assigns, a doctor reviews.
 */
export interface LabReviewsRepository {
  /** Reports nobody can review yet, critical first (the server's order). */
  listUnassigned(signal?: AbortSignal): Promise<UnassignedLabReviews>;
  /** Active doctor accounts, by name only, and whether the list was cut at the limit. */
  listReviewers(signal?: AbortSignal): Promise<{ items: ReviewerChoice[]; truncated: boolean }>;
  assign(orderId: string, doctorId: string): Promise<unknown>;
}

/** Only what the picker needs: no contact details leave this function. */
const reviewers = (page: AccountPage): { items: ReviewerChoice[]; truncated: boolean } => ({
  items: page.items.filter(account => account.role === 'NMC_DOCTOR' && account.active).map(account => ({ id: account.id, fullName: account.fullName })),
  truncated: page.total > page.items.length,
});

export const labReviewsRepository: LabReviewsRepository = {
  listUnassigned: signal => apiRequest<UnassignedLabReviews>('/work/lab-reviews', { signal }),
  listReviewers: async signal => reviewers(await apiRequest<AccountPage>(`/ops/accounts?limit=${REVIEWER_LIST_LIMIT}&offset=0&role=NMC_DOCTOR`, { signal })),
  assign: (orderId, doctorId) => apiRequest(`/work/lab-reviews/${encodeURIComponent(orderId)}/assign`, { method: 'POST', body: JSON.stringify({ doctorId }) }),
};
