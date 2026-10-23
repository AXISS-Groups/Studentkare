import React, { useCallback, useState } from 'react';
import { Icon } from '@/design-system/icons';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { DataTable } from '@/design-system/data/DataTable';
import type { DataTableColumn, DataTableRow } from '@/design-system/data/DataTable';
import { useAuth } from '@/data/contexts/AuthContext';
import { money } from '@/data/types/workflowTypes';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { useEffectivePartnerKind } from './partnerPreview';
import { countRequests, countRxReviews, loadRequests } from '@/features/partner/partnerApi';
import type { Page, PartnerRequest } from '@/features/partner/partnerApi';
import { isClosedLine, lineState } from '@/features/partner/lineState';
import { initialsOf, PartnerEmpty, PartnerError, PartnerLoading, PartnerNote, PartnerPage, shortRef, usePartnerLoad } from '@/features/partner/PartnerPage';
import './vendor-console.css';

/**
 * VendorConsole — the fulfilment queue (design page 6, "Performance", Tier 3).
 *
 * Every row is one of this partner's order lines (`GET /work/requests`; the
 * server scopes it and filters by state). The chips and the "Today" figures
 * are the server's own totals. A customer shows as initials only. "Settlement
 * due" has no endpoint, so it reads "—". The board's "Blocked" chip has no
 * state behind it (order lines are never held): it is not shown.
 */

export type ConsoleFilter = 'ALL' | 'REQUESTED' | 'ACCEPTED' | 'DISPATCHED' | 'AWAITING_PAYMENT';
const FILTERS: ConsoleFilter[] = ['ALL', 'REQUESTED', 'ACCEPTED', 'DISPATCHED', 'AWAITING_PAYMENT'];
const PAGE_SIZE = 20;

export interface ConsoleData {
  page: Page<PartnerRequest>;
  totals: Record<ConsoleFilter, number>;
  /** Prescriptions waiting for this pharmacy's pharmacist; null when not a pharmacy or not reported. */
  rxWaiting: number | null;
}

export type ConsoleSource = (filter: ConsoleFilter, offset: number, pharmacy: boolean, signal: AbortSignal) => Promise<ConsoleData>;

export const liveConsoleSource: ConsoleSource = async (filter, offset, pharmacy, signal) => {
  const [page, all, requested, accepted, dispatched, unpaid, rxWaiting] = await Promise.all([
    loadRequests({ status: filter, limit: PAGE_SIZE, offset }, signal),
    countRequests('ALL', signal),
    countRequests('REQUESTED', signal),
    countRequests('ACCEPTED', signal),
    countRequests('DISPATCHED', signal),
    countRequests('AWAITING_PAYMENT', signal),
    pharmacy ? countRxReviews(signal).catch(() => null) : Promise.resolve(null),
  ]);
  return { page, totals: { ALL: all, REQUESTED: requested, ACCEPTED: accepted, DISPATCHED: dispatched, AWAITING_PAYMENT: unpaid }, rxWaiting };
};

export interface VendorConsoleScreenProps {
  source?: ConsoleSource;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function VendorConsoleScreen({ source = liveConsoleSource, onNavigate }: VendorConsoleScreenProps) {
  const t = useT();
  const { user } = useAuth();
  const pharmacy = useEffectivePartnerKind(user) === 'PHARMACY';
  const [filter, setFilter] = useState<ConsoleFilter>('ALL');
  const [offset, setOffset] = useState(0);
  const load = useCallback((signal: AbortSignal) => source(filter, offset, pharmacy, signal), [source, filter, offset, pharmacy]);
  const queue = usePartnerLoad<ConsoleData>(load);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const title = t('pc.console.title');
  const data = queue.data;
  if (queue.status === 'loading' && !data) return <PartnerPage><PartnerLoading label={t('console.loading', { title })} /></PartnerPage>;
  if (queue.status === 'error' || !data) {
    return <PartnerPage><PartnerError title={t('pc.console.errorTitle')} reference={t('pc.console.ref')} detail={queue.error || undefined} onRetry={queue.reload} onHelp={() => go('support')} /></PartnerPage>;
  }
  if (data.totals.ALL === 0) {
    return <PartnerPage><PartnerEmpty icon3d="cart-alt--p3" title={t('pc.console.emptyTitle')} body={t('pc.home.emptyBody')} action={{ label: t('partner.vhome.home.emptyCta'), onSelect: () => go('catalogue') }} /></PartnerPage>;
  }

  const columns: DataTableColumn[] = [
    { label: t('pc.console.col.order'), width: '130px' },
    { label: t('pc.console.col.items') },
    { label: t('pc.console.col.drop'), width: '170px' },
    { label: t('pc.console.col.slot'), width: '150px' },
    { label: t('pc.console.col.status'), width: '140px', align: 'end' },
  ];
  const rows: DataTableRow[] = data.page.items.map((line) => ({
    id: line.id,
    muted: isClosedLine(line),
    cells: [
      { text: shortRef(line.orderId), sub: initialsOf(line.customer), weight: 'strong', mono: true },
      { text: line.name, sub: t('pc.console.itemsMeta', { qty: line.quantity, amount: money(line.pricePaise * line.quantity) }), weight: 'regular' },
      { text: dropPoint(line, t), weight: 'regular' },
      { text: line.requestedSlot || t('pc.console.noSlot'), weight: line.requestedSlot ? 'regular' : 'muted' },
      { pill: { label: t(lineState(line).key), tone: lineState(line).tone } },
    ],
  }));
  const pages = Math.max(1, Math.ceil(data.page.total / PAGE_SIZE));
  const pageNo = Math.floor(offset / PAGE_SIZE) + 1;

  const subtitle = data.rxWaiting
    ? t('pc.console.subRx', { total: data.totals.ALL, waiting: data.totals.REQUESTED, rx: data.rxWaiting })
    : t('pc.console.sub', { total: data.totals.ALL, waiting: data.totals.REQUESTED });

  return (
    <PartnerPage className="vc-page">
      <ConsolePageHeader
        title={title}
        subtitle={subtitle}
        actions={<span className="vc-fields"><Icon name="lock-4" size={16} strokeWidth={2} />{t('pc.console.fieldsOnly')}</span>}
      />
      <div className="vc-chips" role="group" aria-label={t('pc.console.filtersLabel')}>
        {FILTERS.map((id) => (
          <button key={id} type="button" className={`vc-chip${filter === id ? ' is-on' : ''}`} aria-pressed={filter === id} onClick={() => { setFilter(id); setOffset(0); }}>
            {t(`pc.console.filter.${id}` as MessageKey)}
            <span className="vc-chip__count">{data.totals[id].toLocaleString('en-IN')}</span>
          </button>
        ))}
      </div>

      <div className="vc-layout">
        <div className="vc-main">
          <DataTable
            caption={t('pc.console.caption')}
            columns={columns}
            rows={rows}
            emptyMessage={{ title: t('pc.console.noMatchTitle'), body: t('pc.console.noMatchBody') }}
            footer={pages > 1 ? (
              <nav className="vc-pages" aria-label={t('console.pagination.label')}>
                <span>{t('console.pagination.summary', { shown: String(rows.length), total: data.page.total.toLocaleString('en-IN'), page: pageNo, pages })}</span>
                <span className="vc-pages__buttons">
                  <button type="button" className="pc-link-btn" disabled={pageNo <= 1} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>{t('console.pagination.previous')}</button>
                  <button type="button" className="pc-link-btn" disabled={pageNo >= pages} onClick={() => setOffset(offset + PAGE_SIZE)}>{t('console.pagination.next')}</button>
                </span>
              </nav>
            ) : undefined}
          />
        </div>

        <aside className="vc-side" aria-label={t('pc.console.sideLabel')}>
          <section className="pc-panel vc-today" aria-labelledby="vc-today-title">
            <h2 id="vc-today-title" className="pc-eyebrow">{t('pc.console.today')}</h2>
            <dl className="pc-lines">
              <div className="pc-line"><dt>{t('pc.console.stat.received')}</dt><dd>{data.totals.ALL.toLocaleString('en-IN')}</dd></div>
              <div className="pc-line"><dt>{t('pc.console.stat.toPack')}</dt><dd>{data.totals.ACCEPTED.toLocaleString('en-IN')}</dd></div>
              <div className="pc-line"><dt>{t('pc.console.stat.out')}</dt><dd>{data.totals.DISPATCHED.toLocaleString('en-IN')}</dd></div>
              <div className="pc-line"><dt>{t('pc.console.stat.settlement')}</dt><dd className="is-unknown" aria-label={t('pc.notConnected')}>—</dd></div>
            </dl>
          </section>
          {data.rxWaiting ? (
            <PartnerNote tone="attention" eyebrow={t('pc.console.awaitingTitle')}>{t('pc.console.awaitingBody', { count: data.rxWaiting })}</PartnerNote>
          ) : null}
          <PartnerNote tone="info" eyebrow={t('pc.console.cannotSeeTitle')}>{t('pc.console.cannotSeeBody')}</PartnerNote>
        </aside>
      </div>
    </PartnerPage>
  );
}

function dropPoint(line: PartnerRequest, t: ReturnType<typeof useT>): string {
  const delivery = line.delivery;
  if (delivery?.mode === 'pickup') return t('pc.delivery.pickup');
  const place = [delivery?.city, delivery?.pincode].filter(Boolean).join(' ');
  return place || t('pc.delivery.delivery');
}
