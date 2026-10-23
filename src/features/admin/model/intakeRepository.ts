import { apiRequest } from '@/data/services/http';
import type { IntakeQueue } from './types';

/**
 * The intake queue. The only place that knows the intake queue endpoint. It is
 * read-only: the extracted values belong to the student, so there is no
 * super-admin decision on them.
 */
export interface IntakeRepository {
  reviewQueue(signal?: AbortSignal): Promise<IntakeQueue>;
}

export const intakeRepository: IntakeRepository = {
  reviewQueue: signal => apiRequest<IntakeQueue>('/ops/intake/review', { signal }),
};
