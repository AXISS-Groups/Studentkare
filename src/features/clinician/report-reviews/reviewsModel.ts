import { apiBaseUrl } from '@/core/env';
import { ApiError, apiRequest } from '@/data/services/http';
import type { Request } from '../shared/clinicalData';

/**
 * ReportReviews (design page 5, Tier 1, approved 2026-10-21) on the real
 * preventive-care review contract:
 * `GET /preventive/work/report-reviews` lists the requests assigned to this
 * doctor that still have a current share from the student, and
 * `POST /preventive/work/report-reviews/{id}/review` records the decision.
 *
 * A clinician reads, not a model: approval needs the doctor's own summary, at
 * least one next step and at least one HTTPS source (the server enforces it
 * too). The request carries no question text, no student name and no SLA, and
 * there is no read receipt — the screen shows none of those rather than guess.
 */

/** Server limits (preventive_care ReviewInput / GuidanceLine / SourceRef). */
export const REVIEW_LIMITS = { summary: 4000, lines: 10, line: 1000, sources: 10, titleMin: 2, title: 160, url: 2000 } as const;
export const QUEUE_PAGE = 100;

export interface QueueReview {
  id: string;
  documentId: string;
  shareId: string;
  version: number;
  createdAt: number;
}

export interface ReviewsData {
  reviews: QueueReview[];
  total: number;
}

export type Decision = 'APPROVED' | 'REJECTED';
export interface SourceRef { title: string; url: string }

export interface ReviewDraft {
  decision: Decision;
  summary: string;
  questions: string;
  nextSteps: string;
  sources: SourceRef[];
}

export type ReviewInvalid = 'summary' | 'nextSteps' | 'questions' | 'sources';

export interface ReviewsSource {
  load(): Promise<ReviewsData | null>;
  /** Records the decision. Absent = cannot. */
  submit?: (review: QueueReview, body: ReviewBody) => Promise<'saved' | 'stale'>;
}

export type ReviewBody =
  | { expectedVersion: number; decision: 'REJECTED' }
  | { expectedVersion: number; decision: 'APPROVED'; summary: string; questions: string[]; nextSteps: string[]; sourceRefs: SourceRef[] };

export function lines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function httpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

/** What is wrong with the draft, field by field; empty when it can be sent. A decline sends nothing else. */
export function reviewProblems(draft: ReviewDraft): ReviewInvalid[] {
  if (draft.decision === 'REJECTED') return [];
  const problems: ReviewInvalid[] = [];
  const summary = draft.summary.trim();
  if (!summary || summary.length > REVIEW_LIMITS.summary) problems.push('summary');
  const steps = lines(draft.nextSteps);
  if (steps.length === 0 || steps.length > REVIEW_LIMITS.lines || steps.some((l) => l.length > REVIEW_LIMITS.line)) problems.push('nextSteps');
  const questions = lines(draft.questions);
  if (questions.length > REVIEW_LIMITS.lines || questions.some((l) => l.length > REVIEW_LIMITS.line)) problems.push('questions');
  const sourcesOk = draft.sources.length >= 1 && draft.sources.length <= REVIEW_LIMITS.sources && draft.sources.every((s) => {
    const title = s.title.trim();
    const url = s.url.trim();
    return title.length >= REVIEW_LIMITS.titleMin && title.length <= REVIEW_LIMITS.title && url.length <= REVIEW_LIMITS.url && httpsUrl(url);
  });
  if (!sourcesOk) problems.push('sources');
  return problems;
}

/** A rejection never transmits an unfinished guidance draft. */
export function reviewBody(review: QueueReview, draft: ReviewDraft): ReviewBody {
  if (draft.decision === 'REJECTED') return { expectedVersion: review.version, decision: 'REJECTED' };
  return {
    expectedVersion: review.version,
    decision: 'APPROVED',
    summary: draft.summary.trim(),
    questions: lines(draft.questions),
    nextSteps: lines(draft.nextSteps),
    sourceRefs: draft.sources.map((s) => ({ title: s.title.trim(), url: s.url.trim() })),
  };
}

/** Where the shared report opens (access is checked again by the server when it does). */
export function sharedReportUrl(shareId: string): string {
  return `${apiBaseUrl()}/records/shares/${encodeURIComponent(shareId)}/document`;
}

export function reviewsApiSource(request: Request = apiRequest): ReviewsSource {
  return {
    async load() {
      const page = await request<{ items: QueueReview[]; total: number }>(`/preventive/work/report-reviews?offset=0&limit=${QUEUE_PAGE}`);
      return { reviews: page.items, total: page.total };
    },
    async submit(review, body) {
      try {
        await request(`/preventive/work/report-reviews/${encodeURIComponent(review.id)}/review`, { method: 'POST', body: JSON.stringify(body) });
        return 'saved';
      } catch (reason) {
        // Stale version, withdrawn, already decided, or the share ended: nothing was recorded.
        if (reason instanceof ApiError && (reason.status === 409 || reason.status === 403 || reason.status === 404)) return 'stale';
        throw reason;
      }
    },
  };
}
