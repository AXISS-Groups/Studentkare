import { apiRequest } from '@/data/http';
import type { AyushQuality } from './types';

/** AI governance figures. The only place that knows the Agent Ayush quality endpoint. */
export interface AiGovernanceRepository {
  ayushQuality(signal?: AbortSignal): Promise<AyushQuality>;
}

export const aiGovernanceRepository: AiGovernanceRepository = {
  ayushQuality: signal => apiRequest<AyushQuality>('/ops/agents/ayush/quality', { signal }),
};
