import { ApiError, apiRequest } from '@/data/services/http';
import type { CampusOverviewInput, OpenSosAlert, Part, PendingVerification } from './campusOverviewModel';

export interface CampusOverviewSource {
  load(): Promise<CampusOverviewInput>;
}

const part = <T,>(result: PromiseSettledResult<T>): Part<T> =>
  result.status === 'fulfilled'
    ? { ok: true, value: result.value }
    : { ok: false, status: result.reason instanceof ApiError ? result.reason.status : 0 };

/**
 * Both endpoints are scoped server-side to the admin's campus (campus_scope) and
 * fail closed with a 403 when no campus is set. Only counts and timestamps are
 * read from them here; the payloads' names and contacts are dropped at once.
 */
export const liveCampusOverviewSource: CampusOverviewSource = {
  async load() {
    const [pending, sos] = await Promise.allSettled([
      apiRequest<{ items: Array<{ accountId: string }> }>('/ops/campus/pending')
        .then((body): PendingVerification[] => body.items.map((item) => ({ accountId: item.accountId }))),
      apiRequest<{ items: Array<{ status: OpenSosAlert['status']; createdAt: number }> }>('/ops/sos')
        .then((body): OpenSosAlert[] => body.items.map((item) => ({ status: item.status, createdAt: item.createdAt }))),
    ]);
    return { pending: part(pending), sos: part(sos) };
  },
};
