import { isDev } from '@/core/env';
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

/** Development-only sample matching the canvas. Never served outside `isDev()`. */
export const sampleConsoleSummarySource: ConsoleSummarySource = {
  async load() {
    return {
      counts: { inbox: 9, 'critical-results': 1, 'report-reviews': 3 },
      unreadNotifications: true,
      credentials: 'MBBS, MD · NMC 71842',
      twoFactorOn: true,
    };
  },
};

export const unconnectedConsoleSummarySource: ConsoleSummarySource = {
  async load() {
    return null;
  },
};

export function defaultConsoleSummarySource(): ConsoleSummarySource {
  return isDev() ? sampleConsoleSummarySource : unconnectedConsoleSummarySource;
}
