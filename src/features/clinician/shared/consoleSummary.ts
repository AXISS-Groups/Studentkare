import type { ClinicianNavId } from '@/design-system';

/**
 * What every clinician screen's frame shows around the page: sidebar badges
 * and the profile facts in the top bar. One source for all screens, so a badge
 * cannot say 3 on one page and 2 on the next.
 */
export interface ConsoleSummary {
  counts: Partial<Record<ClinicianNavId, number>>;
  unreadNotifications: boolean;
  /** e.g. "MBBS, MD · NMC 71842" — only when the account carries it. */
  credentials?: string;
  /** Only when the session reports it (AGENTS.md guardrail 6). */
  twoFactorOn?: boolean;
}

export interface ConsoleSummarySource {
  /** Null when not connected; the frame then shows no badges and no claims. */
  load(): Promise<ConsoleSummary | null>;
}

export const unconnectedConsoleSummarySource: ConsoleSummarySource = {
  async load() {
    return null;
  },
};

/**
 * No endpoint reports these yet, so the frame shows no badges, credentials, 2FA
 * pill or unread dot — in development too. The design's sample numbers were shown
 * in the sidebar as if they were real, which is what this replaced.
 */
export function defaultConsoleSummarySource(): ConsoleSummarySource {
  return unconnectedConsoleSummarySource;
}
