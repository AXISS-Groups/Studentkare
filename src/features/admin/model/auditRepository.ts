import { apiRequest } from '@/data/http';
import type { AuditPage } from './types';

/** Audit events, read a page at a time. The only place that knows the audit endpoint. */
export interface AuditRepository {
  listEvents(offset: number, limit: number, signal?: AbortSignal): Promise<AuditPage>;
}

export const auditRepository: AuditRepository = {
  listEvents: (offset, limit, signal) => apiRequest<AuditPage>(`/ops/audit?limit=${limit}&offset=${offset}`, { signal }),
};
