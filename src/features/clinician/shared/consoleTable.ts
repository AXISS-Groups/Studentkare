import { makeAutoObservable, runInAction } from 'mobx';
import { isDev } from '@/core/env';
import type { DataTableColumn, DataTableRow, SkTone, Stat } from '@/design-system';

/**
 * The shape shared by the clinician list screens (lab orders, referrals,
 * renewals, chronic care, AYUSH, decision support, patients, schedule,
 * earnings): a status badge, four figures, one table.
 */
export interface ConsoleTableData {
  /** Top-right summary, e.g. "1 urgent, same day". Omit when nothing needs flagging. */
  badge?: { label: string; tone: Extract<SkTone, 'danger' | 'action' | 'attention' | 'positive'> };
  stats: Stat[];
  rows: DataTableRow[];
  /** Replaces the configured subtitle when it depends on the data (e.g. a commission rate). */
  subtitle?: string;
}

export interface ConsoleTableSource {
  /** Null when not connected to anything real. */
  load(): Promise<ConsoleTableData | null>;
}

/** Copy and columns for one screen. Everything a reviewer would compare to the picture. */
export interface ConsoleTableConfig {
  title: string;
  subtitle: string;
  /** Visually hidden table caption. */
  caption: string;
  columns: DataTableColumn[];
  /** The design shows no column headings (schedule); they stay for screen readers. */
  hideColumnHeadings?: boolean;
  /** Title inside the table card, e.g. "This week". */
  tableTitle?: string;
  /** The design's closing sentence — why the screen works as it does. */
  footnote: string;
  empty: { title: string; body: string };
  unconnected: { title: string; body: string };
  errorTitle: string;
  /** "Ref LAB-ORDERS · ClinicianLabOrder" */
  reference: string;
}

export const unconnectedTableSource: ConsoleTableSource = {
  async load() {
    return null;
  },
};

/**
 * The sample in development, nothing outside it (DESIGN.md §6: no demo
 * content in production builds). Built lazily so dates are fresh.
 */
export function sampleInDevelopment(sample: () => ConsoleTableData): ConsoleTableSource {
  if (!isDev()) return unconnectedTableSource;
  return { load: async () => sample() };
}

export type ConsoleTableStatus = 'loading' | 'ready' | 'empty' | 'unconnected' | 'error';

export class ConsoleTableViewModel {
  status: ConsoleTableStatus = 'loading';
  data: ConsoleTableData | null = null;

  constructor(private readonly source: ConsoleTableSource) {
    makeAutoObservable<ConsoleTableViewModel, 'source'>(this, { source: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.status = 'loading';
    try {
      const data = await this.source.load();
      runInAction(() => {
        this.data = data;
        if (data === null) this.status = 'unconnected';
        else if (data.rows.length === 0) this.status = 'empty';
        else this.status = 'ready';
      });
    } catch {
      runInAction(() => {
        this.data = null;
        this.status = 'error';
      });
    }
  }
}
