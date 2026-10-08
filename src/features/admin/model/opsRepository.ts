import { apiRequest } from '@/data/http';
import type { IntegrationHealth, OpsFeed, OpsSummary } from '@/data/workflowTypes';
import type { FeedQuery, OpsFeedCounts } from './types';

/** The operations activity feed. The only place that knows the /ops/feed, /ops/summary and /ops/integration-health endpoints. */
export interface OpsRepository {
  feed(query: FeedQuery, signal?: AbortSignal): Promise<OpsFeed>;
  feedCounts(signal?: AbortSignal): Promise<OpsFeedCounts>;
  /** One domain's events, as /ops/feed?domain=…&limit=… (domain first). */
  domainFeed(domain: string, limit: number, signal?: AbortSignal): Promise<OpsFeed>;
  acknowledge(eventId: string): Promise<unknown>;
}

/** The platform summary and service probes, on the same repository (Overview). */
export interface OpsStatusRepository {
  summary(signal?: AbortSignal): Promise<OpsSummary>;
  integrationHealth(signal?: AbortSignal): Promise<IntegrationHealth>;
}

/** /ops/feed?limit=…[&domain=…][&unacknowledgedOnly=true] */
const feedPath = ({ limit, domain, unacknowledgedOnly }: FeedQuery) =>
  `/ops/feed?limit=${limit}${domain ? `&domain=${domain}` : ''}${unacknowledgedOnly ? '&unacknowledgedOnly=true' : ''}`;

export const opsRepository: OpsRepository & OpsStatusRepository = {
  feed: (query, signal) => apiRequest<OpsFeed>(feedPath(query), { signal }),
  feedCounts: signal => apiRequest<OpsFeedCounts>('/ops/feed/counts', { signal }),
  domainFeed: (domain, limit, signal) => apiRequest<OpsFeed>(`/ops/feed?domain=${domain}&limit=${limit}`, { signal }),
  acknowledge: eventId => apiRequest(`/ops/feed/${eventId}/acknowledge`, { method: 'POST' }),
  summary: signal => apiRequest<OpsSummary>('/ops/summary', { signal }),
  integrationHealth: signal => apiRequest<IntegrationHealth>('/ops/integration-health', { signal }),
};
