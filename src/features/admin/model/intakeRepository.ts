import { apiRequest } from '@/data/http';
import type { FieldDecision, IntakeQueue } from './types';

/** The OCR intake review queue. The only place that knows the intake review endpoints. */
export interface IntakeRepository {
  reviewQueue(signal?: AbortSignal): Promise<IntakeQueue>;
  /** The review endpoint takes one field at a time. */
  decideField(fieldId: string, decision: FieldDecision): Promise<unknown>;
}

export const intakeRepository: IntakeRepository = {
  reviewQueue: signal => apiRequest<IntakeQueue>('/ops/intake/review', { signal }),
  decideField: (fieldId, decision) => apiRequest(`/ops/intake/review/${fieldId}`, { method: 'PATCH', body: JSON.stringify(decision) }),
};
