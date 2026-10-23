import { apiRequest } from '@/data/services/http';
import type { AyushHealth, IndexStatus, KnowledgeSources, NewKnowledgeSource } from './types';

/** The knowledge base Ayush answers from. The only place that knows the knowledge endpoints. */
export interface KnowledgeRepository {
  sources(signal?: AbortSignal): Promise<KnowledgeSources>;
  indexStatus(signal?: AbortSignal): Promise<IndexStatus>;
  health(signal?: AbortSignal): Promise<AyushHealth>;
  reindex(): Promise<unknown>;
  publish(source: NewKnowledgeSource): Promise<unknown>;
}

export const knowledgeRepository: KnowledgeRepository = {
  sources: signal => apiRequest<KnowledgeSources>('/knowledge/sources', { signal }),
  indexStatus: signal => apiRequest<IndexStatus>('/ops/knowledge/index-status', { signal }),
  health: signal => apiRequest<AyushHealth>('/ops/agents/ayush/health', { signal }),
  reindex: () => apiRequest('/ops/knowledge/reindex', { method: 'POST' }),
  publish: source => apiRequest('/ops/knowledge', { method: 'POST', body: JSON.stringify(source) }),
};
