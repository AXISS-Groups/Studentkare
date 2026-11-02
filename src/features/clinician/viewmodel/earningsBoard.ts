import { apiRequest } from '@/data/services/http';
import type { DataTableRow } from '@/design-system';
import type { ConsoleTableData, ConsoleTableSource } from './ConsoleTableViewModel';
import { muted, pill, strong } from './cells';
import type { T } from '../model/clinicalData';
import { periodLabel, rupees } from '../model/earnings';
import type { EarningsResponse } from '../model/earnings';

/* ----------------------------------------------------------- API mapping */

const DAYS_PER_MONTH = 30;
const PERCENT = 100;

/** The rate as the server sent it, e.g. 0.1 is "10%". */
function percent(rate: number): string {
  return `${Math.round(rate * PERCENT * PERCENT) / PERCENT}%`;
}

export function mapEarnings(data: EarningsResponse, t: T): ConsoleTableData {
  const rate = data.commissionRate;
  const rows: DataTableRow[] = data.periods.map((period) => ({
    id: period.start,
    cells: [
      strong(periodLabel(period)),
      muted(t(period.consults === 1 ? 'clinEarnings.consultOne' : 'clinEarnings.consults', { count: period.consults })),
      strong(rupees(period.grossPaise)),
      muted(typeof period.commissionPaise === 'number' ? `−${rupees(period.commissionPaise).slice(1)}` : t('clinEarnings.notSet')),
      strong(typeof period.netPaise === 'number' ? rupees(period.netPaise) : '—'),
      // The API has no per-period payout status, so none is invented.
      data.settlementConfigured ? muted('—') : pill(t('clinEarnings.settlementNotSetUp'), 'neutral'),
    ],
  }));
  const months = Math.max(1, Math.round(data.windowDays / DAYS_PER_MONTH));
  return {
    subtitle: rate === null ? t('clinEarnings.subtitleGross') : t('clinEarnings.subtitleRate', { rate: percent(rate) }),
    badge: data.settlementConfigured ? undefined : { label: t('clinEarnings.settlementNotSetUp'), tone: 'attention' },
    stats: [
      { value: rupees(data.grossPaise), label: t(months === 1 ? 'clinEarnings.statGrossOne' : 'clinEarnings.statGross', { months }) },
      { value: String(data.consults), label: t('clinEarnings.statConsults') },
      { value: rate === null ? t('clinEarnings.notSet') : percent(rate), label: t('clinEarnings.statCommission') },
      { value: data.settlementConfigured ? null : t('clinEarnings.notSetUp'), label: t('clinEarnings.statPayout') },
    ],
    rows,
  };
}

export function earningsApiSource(t: T, request: typeof apiRequest = apiRequest): ConsoleTableSource {
  return { load: async () => mapEarnings(await request<EarningsResponse>('/work/earnings'), t) };
}
