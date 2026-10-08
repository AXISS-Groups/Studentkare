import React from 'react';
import { isDev } from '@/core/env';
import { apiRequest } from '@/data/http';
import { DestinationButton } from '@/design-system';
import type { DataTableRow } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { muted, pill, strong } from '../shared/cells';

/**
 * ClinicianEarnings (design page 5, Tier 3).
 *
 * Production reads `/work/earnings`. That endpoint has volume and gross only:
 * no commission rate is configured and no settlement exists, so where the
 * design prints commission, net and "Due 3 October" this screen says they are
 * not set up rather than computing a figure a doctor would plan around.
 */
export const earningsConfig: ConsoleTableConfig = {
  title: 'Earnings',
  subtitle: 'Fortnightly settlement · commission printed on every line',
  caption: 'Your earnings by fortnight: consults, gross, commission, net and status',
  columns: [
    { label: 'Period', width: '146px' },
    { label: 'Volume', width: '136px' },
    { label: 'Gross', width: '126px' },
    { label: 'Commission', width: '126px' },
    { label: 'Net to you' },
    { label: 'Status', width: '150px', align: 'end' },
  ],
  footnote:
    'Commission is deducted at the published rate and shown per line, never as a lump adjustment. A disputed line is held, not silently netted off the next payout.',
  empty: { title: 'Nothing in earnings yet.', body: 'Once you complete a consult it appears here, grouped by fortnight. A cancellation or a no-show does not count.' },
  unconnected: { title: 'Earnings aren’t connected yet.', body: 'Completed consults will appear here once earnings are connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load your earnings',
  reference: 'Ref EARNINGS · ClinicianEarnings',
};

/* ----------------------------------------------------------- API mapping */

export interface EarningsPeriod {
  start: string;
  end: string;
  consults: number;
  grossPaise: number;
}

export interface EarningsResponse {
  periods: EarningsPeriod[];
  grossPaise: number;
  consults: number;
  windowDays: number;
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

/** "Sep 1-15", as on the canvas. */
export function periodLabel({ start, end }: { start: string; end: string }): string {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  return `${MONTHS[to.getUTCMonth()]} ${from.getUTCDate()}-${to.getUTCDate()}`;
}

export function mapEarnings(data: EarningsResponse): ConsoleTableData {
  const rate = data.commissionRate;
  const rows: DataTableRow[] = data.periods.map((period) => {
    // Rounded to whole paise, per line — never a lump adjustment.
    const commissionPaise = rate === null ? null : Math.round(period.grossPaise * rate);
    return {
      id: period.start,
      cells: [
        strong(periodLabel(period)),
        muted(`${period.consults} consult${period.consults === 1 ? '' : 's'}`),
        strong(rupees(period.grossPaise)),
        muted(commissionPaise === null ? 'Not set' : `−${rupees(commissionPaise).slice(1)}`),
        strong(commissionPaise === null ? '—' : rupees(period.grossPaise - commissionPaise)),
        // The API has no per-period payout status, so none is invented.
        data.settlementConfigured ? muted('—') : pill('Settlement not set up', 'neutral'),
      ],
    };
  });
  const months = Math.max(1, Math.round(data.windowDays / 30));
  return {
    subtitle: rate === null
      ? 'Completed consults by fortnight · no commission rate is set yet, so figures are gross'
      : `Fortnightly settlement · ${Math.round(rate * 100)}% commission, printed on every line`,
    badge: data.settlementConfigured ? undefined : { label: 'Settlement not set up', tone: 'attention' },
    stats: [
      { value: rupees(data.grossPaise), label: `Gross, last ${months} month${months === 1 ? '' : 's'}` },
      { value: String(data.consults), label: 'Consults completed' },
      { value: rate === null ? 'Not set' : `${Math.round(rate * 100)}%`, label: 'Our commission' },
    ],
    rows,
  };
}

export const earningsApiSource: ConsoleTableSource = {
  async load() {
    return mapEarnings(await apiRequest<EarningsResponse>('/work/earnings'));
  },
};

/* ------------------------------------------------------ development sample */

export function earningsSample(): ConsoleTableData {
  return {
    subtitle: 'Fortnightly settlement · 10% commission, printed on every line',
    stats: [
      { value: '₹6,806', label: 'Due 3 October', tone: 'attention' },
      { value: '₹31,880', label: 'Paid, last 90 days', tone: 'positive' },
      { value: '10%', label: 'Our commission' },
      { value: '₹199', label: 'Your consult rate' },
    ],
    rows: [
      { id: 'e1', cells: [strong('Sep 1-15'), muted('42 consults'), strong('₹8,358'), muted('−836'), strong('₹7,522'), pill('Paid 18 Sep', 'positive')] },
      { id: 'e2', cells: [strong('Sep 16-30'), muted('38 consults'), strong('₹7,562'), muted('−756'), strong('₹6,806'), pill('Due 3 Oct', 'attention')] },
      { id: 'e3', cells: [strong('Aug 16-31'), muted('51 consults'), strong('₹10,149'), muted('−1,015'), strong('₹9,134'), pill('Paid 3 Sep', 'positive')] },
      { id: 'e4', cells: [strong('Aug 1-15'), muted('47 consults'), strong('₹9,353'), muted('−935'), strong('₹8,418'), pill('Paid 18 Aug', 'positive')] },
    ],
  };
}

export function defaultEarningsSource(): ConsoleTableSource {
  return isDev() ? { load: async () => earningsSample() } : earningsApiSource;
}

export function ClinicianEarningsConsoleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return (
    <ConsoleTableScreen
      navId="earnings"
      config={earningsConfig}
      source={source ?? defaultEarningsSource()}
      headerAction={
        // Nothing generates a statement yet; a file finance has not defined is worse than none.
        <DestinationButton route={null} onNavigate={navigate} className="sk-btn sk-btn--secondary">
          Download statement
        </DestinationButton>
      }
    />
  );
}
