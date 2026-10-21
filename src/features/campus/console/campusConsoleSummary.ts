import { apiRequest } from '@/data/services/http';
import type { CampusNavId } from '@/design-system';

/**
 * What the campus shell shows around every board: sidebar badges, the 2FA chip
 * and the unread dot. One source for all boards, so a badge cannot say 3 on
 * one page and 2 on the next. Each part is loaded on its own; a part that fails
 * or has no source is simply absent (no badge, no chip, no dot), never guessed.
 */
export interface CampusConsoleSummary {
  counts: Partial<Record<CampusNavId, number>>;
  /** Only when the server reports it (AGENTS.md guardrail 6). */
  twoFactorOn?: boolean;
  unreadNotifications: number;
}

export interface CampusConsoleSummarySource {
  load(): Promise<CampusConsoleSummary>;
}

interface PendingResponse { items: unknown[] }
interface SosResponse { items: Array<{ status: string }> }
interface TwoFactorStatus { enabled: boolean }
interface NotificationsResponse { items: Array<{ readAt?: number | null }> }

const settledValue = <T,>(result: PromiseSettledResult<T>): T | null => (result.status === 'fulfilled' ? result.value : null);

/**
 * Live sources: campus verification requests (`/ops/campus/pending`), open SOS
 * alerts not yet acknowledged (`/ops/sos`), the account's 2FA status and its
 * notifications. Incidents, certificates, access requests and the counsellor
 * queue have no count endpoint yet, so they carry no badge.
 */
export const liveCampusConsoleSummarySource: CampusConsoleSummarySource = {
  async load() {
    const [pending, sos, twoFactor, inbox] = await Promise.allSettled([
      apiRequest<PendingResponse>('/ops/campus/pending'),
      apiRequest<SosResponse>('/ops/sos'),
      apiRequest<TwoFactorStatus>('/auth/2fa/status'),
      apiRequest<NotificationsResponse>('/notifications'),
    ]);
    const counts: Partial<Record<CampusNavId, number>> = {};
    const pendingValue = settledValue(pending);
    if (pendingValue) counts.verification = pendingValue.items.length;
    const sosValue = settledValue(sos);
    if (sosValue) counts.sos = sosValue.items.filter((alert) => alert.status === 'ACTIVE').length;
    const twoFactorValue = settledValue(twoFactor);
    const inboxValue = settledValue(inbox);
    return {
      counts,
      twoFactorOn: twoFactorValue ? twoFactorValue.enabled === true : undefined,
      unreadNotifications: inboxValue ? inboxValue.items.filter((item) => !item.readAt).length : 0,
    };
  },
};
