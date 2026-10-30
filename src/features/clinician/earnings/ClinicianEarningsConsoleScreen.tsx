import React, { useMemo, useState } from 'react';
import { apiRequest } from '@/data/services/http';
import { DestinationButton } from '@/design-system';
import type { DataTableRow } from '@/design-system';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { muted, pill, strong } from '../shared/cells';

type T = (key: MessageKey, vars?: Vars) => string;

/**
 * ClinicianEarnings (design page 5, Tier 3), from `GET /work/earnings` in every
 * build. Every amount on this page is one the server sent. The endpoint reports
 * volume and gross only: no commission rate is configured and no settlement
 * exists, so where the design prints commission, net, a payout date and
 * "Paid 18 Sep", this screen says they are not set up. It never works out a
 * commission or a net itself — a figure a doctor would plan around has to come
 * from the server that will pay it.
 */
export function earningsConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinEarnings.title'),
    subtitle: t('clinEarnings.subtitle'),
    caption: t('clinEarnings.caption'),
    columns: [
      { label: t('clinEarnings.colPeriod'), width: '146px' },
      { label: t('clinEarnings.colVolume'), width: '136px' },
      { label: t('clinEarnings.colGross'), width: '126px' },
      { label: t('clinEarnings.colCommission'), width: '126px' },
      { label: t('clinEarnings.colNet') },
      { label: t('clinEarnings.colStatus'), width: '170px', align: 'end' },
    ],
    footnote: t('clinEarnings.footnote'),
    empty: { title: t('clinEarnings.emptyTitle'), body: t('clinEarnings.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    emptyAction: { label: t('clinEarnings.emptyAction'), route: 'clinician/schedule' },
    unconnected: { title: t('clinEarnings.unconnectedTitle'), body: t('clinEarnings.unconnectedBody') },
    errorTitle: t('clinEarnings.errorTitle'),
    reference: t('clinEarnings.reference'),
    statLabels: [t('clinEarnings.statGrossPlain'), t('clinEarnings.statConsults'), t('clinEarnings.statCommission'), t('clinEarnings.statPayout')],
  };
}

/* ----------------------------------------------------------- API mapping */

interface EarningsPeriod {
  start: string;
  end: string;
  consults: number;
  grossPaise: number;
  /** Per-line deduction and net, only if the server ever reports them. */
  commissionPaise?: number | null;
  netPaise?: number | null;
}

export interface EarningsResponse {
  periods: EarningsPeriod[];
  grossPaise: number;
  consults: number;
  windowDays: number;
  /** Null: no platform commission is configured. The client renders the absence, never a default. */
  commissionRate: number | null;
  settlementConfigured: boolean;
}

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_PER_MONTH = 30;
const PERCENT = 100;

/** "Sep 1–15", as on the canvas. */
export function periodLabel({ start, end }: { start: string; end: string }): string {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  return `${MONTHS[to.getUTCMonth()]} ${from.getUTCDate()}–${to.getUTCDate()}`;
}

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

function earningsApiSource(t: T, request: typeof apiRequest = apiRequest): ConsoleTableSource {
  return { load: async () => mapEarnings(await request<EarningsResponse>('/work/earnings'), t) };
}

export function ClinicianEarningsConsoleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => earningsConfig(t), [t]);
  const [fallback] = useState(() => earningsApiSource(t));
  return (
    <ConsoleTableScreen
      navId="earnings"
      config={config}
      source={source ?? fallback}
      headerAction={
        // Nothing generates a statement yet; a file finance has not defined is worse than none.
        <DestinationButton route={null} onNavigate={navigate} className="sk-btn sk-btn--secondary">
          {t('clinEarnings.download')}
        </DestinationButton>
      }
    />
  );
}
