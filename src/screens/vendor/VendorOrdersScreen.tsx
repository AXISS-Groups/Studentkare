import React, { useCallback, useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow, DataTableRowAction } from '@/design-system/data/DataTable';
import type { SkTone } from '@/design-system/primitives';
import { Toast } from '@/design-system/primitives';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PARTNER_EMPTY_TILE, PartnerNote, usePartnerLoad } from '@/features/partner/PartnerPage';
import { advanceDispense, loadDispenses, refOf, TERMINAL_DISPENSE } from '@/features/partner/work/pharmacyWork';
import type { Dispense } from '@/features/partner/work/pharmacyWork';
import { dispenseStatusKey, useOnline } from '@/features/partner/work/workCopy';
import '@/features/partner/work/partner-work.css';

/**
 * VendorOrders — the pharmacy's prescription orders (design page 6, Tier 1, approved 2026-10-21).
 *
 * Wired to the pharmacy's own dispenses (`GET /work/dispenses`). It used to
 * draw only what a caller passed in, so it was empty in the app.
 *
 * - Pack is offered only when the server lists it as the next step, which it
 *   does only once the student has paid the pharmacy's quote; for a
 *   prescription awaiting a pharmacist the button is absent, not disabled, and
 *   the row says why ("Blocked"), never what the student was treated for.
 * - Rule L (approved decision): no price on a prescription row. The dispense
 *   carries one commerce fact, whether the quote is paid; the amount stays on
 *   the commerce plane.
 * - Handing over and delivering stay on the OTP handover and dispensing desk;
 *   this list never marks an order delivered.
 * - "Median pack time" has no source: "—". Offline, nothing can be packed.
 */

export type OrdersSource = (signal: AbortSignal) => Promise<{ items: Dispense[] }>;

const QUOTE_KEY: Record<string, MessageKey> = {
  NONE: 'pt.ord.quote.NONE',
  QUOTED: 'pt.ord.quote.QUOTED',
  PAYMENT_STARTED: 'pt.ord.quote.PAYMENT_STARTED',
  PAID: 'pt.ord.quote.PAID',
  CANCELLED: 'pt.ord.quote.CANCELLED',
};

function rxState(row: Dispense): { key: MessageKey; tone: SkTone } {
  if (row.status === 'RX_ISSUED') return { key: 'pt.ord.rx.awaiting', tone: 'attention' };
  if (row.status === 'REJECTED') return { key: 'pt.ord.rx.refused', tone: 'danger' };
  if (row.status === 'SUBSTITUTION_PROPOSED') return { key: 'pt.ord.rx.swap', tone: 'attention' };
  return { key: 'pt.ord.rx.verified', tone: 'positive' };
}

export function VendorOrdersScreen({ source = loadDispenses, onNavigate }: { source?: OrdersSource; onNavigate?: (route: string) => void; onLogout?: () => void }) {
  const t = useT();
  const online = useOnline();
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const orders = usePartnerLoad<{ items: Dispense[] }>(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const items = orders.data?.items ?? [];
  const status: ConsoleTableStatus = orders.status === 'loading' && !orders.data ? 'loading' : orders.status === 'error' ? 'error' : 'ready';
  const open = items.filter((row) => !TERMINAL_DISPENSE.has(row.status));
  const blocked = items.filter((row) => row.status === 'RX_ISSUED').length;
  const out = items.filter((row) => row.status === 'OUT_FOR_DELIVERY').length;

  const step = async (row: Dispense, next: 'PACKED' | 'OUT_FOR_DELIVERY') => {
    if (!online) return;
    setBusyId(row.id);
    try {
      await advanceDispense(row.id, next);
      setToast(t('pt.ord.moved', { ref: refOf(row.id), status: t(dispenseStatusKey(next)) }));
      orders.reload();
    } catch (error) {
      setToast(error instanceof Error && error.message ? error.message : t('pt.saveFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const rows: DataTableRow[] = items.map((row) => {
    const count = row.prescription?.items.length ?? 0;
    const rx = rxState(row);
    const mode = row.delivery?.mode === 'delivery' ? t('pc.delivery.delivery') : row.delivery?.mode === 'pickup' ? t('pc.delivery.pickup') : '—';
    const actions: DataTableRowAction[] = [];
    if (row.status === 'RX_ISSUED') actions.push({ label: t('pt.ord.review'), onSelect: () => go('rx-review'), accessibleLabel: t('pt.ord.reviewFor', { ref: refOf(row.id) }) });
    if (row.nextStates.includes('PACKED')) actions.push({ label: t('pt.ord.pack'), variant: 'primary', disabled: !online || busyId !== null, onSelect: () => { void step(row, 'PACKED'); }, accessibleLabel: t('pt.ord.packFor', { ref: refOf(row.id) }) });
    if (row.nextStates.includes('OUT_FOR_DELIVERY') && row.delivery?.mode === 'delivery') actions.push({ label: t('pt.ord.send'), disabled: !online || busyId !== null, onSelect: () => { void step(row, 'OUT_FOR_DELIVERY'); }, accessibleLabel: t('pt.ord.sendFor', { ref: refOf(row.id) }) });
    return {
      id: row.id,
      muted: TERMINAL_DISPENSE.has(row.status),
      cells: [
        { text: `#${refOf(row.id)}`, weight: 'strong', mono: true },
        { text: mode, sub: row.delivery?.mode === 'delivery' ? [row.delivery.address, row.delivery.pincode].filter(Boolean).join(' · ') || undefined : undefined, weight: 'regular' },
        { text: count === 1 ? t('pt.ord.itemsOne') : t('pt.ord.itemsOther', { count }), sub: t(QUOTE_KEY[row.quoteStatus] ?? 'pt.ord.quote.NONE'), weight: 'regular' },
        { text: t(rx.key), tone: rx.tone === 'positive' ? 'positive' : rx.tone === 'danger' ? 'danger' : 'attention', weight: 'strong' },
        { pill: { label: row.status === 'RX_ISSUED' ? t('pt.ord.blocked') : t(dispenseStatusKey(row.status)), tone: row.status === 'RX_ISSUED' ? 'attention' : row.status === 'DELIVERED' ? 'positive' : row.status === 'REJECTED' ? 'danger' : 'action' } },
      ],
      actions,
    };
  });

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{ title: t('pt.ord.title'), subtitle: t('pt.ord.sub'), badge: blocked ? { label: t('pt.ord.blockedBadge', { count: blocked }), tone: 'attention' } : undefined }}
        note={!online && status === 'ready' ? <PartnerNote tone="attention">{t('pt.offline.readOnly')}</PartnerNote> : undefined}
        stats={[
          { label: t('pt.ord.stat.open'), value: String(open.length) },
          { label: t('pt.ord.stat.awaiting'), value: String(blocked), tone: blocked ? 'attention' : 'text' },
          { label: t('pt.ord.stat.out'), value: String(out) },
          { label: t('pt.ord.stat.median'), value: null },
        ]}
        statsLabel={t('pt.ord.statsLabel')}
        table={{
          caption: t('pt.ord.caption'),
          columns: [
            { label: t('pt.ord.col.order'), width: '130px' },
            { label: t('pt.ord.col.deliver'), width: '200px' },
            { label: t('pt.ord.col.contents'), width: '200px' },
            { label: t('pt.ord.col.rx') },
            { label: t('pt.ord.col.status'), width: '190px', align: 'end' },
          ],
          rows,
          rowActions: true,
          footnote: t('pt.ord.footnote'),
        }}
        empty={{ title: t('pt.ord.emptyTitle'), body: t('pt.ord.emptyBody'), icon3d: PARTNER_EMPTY_TILE, action: { label: t('pt.ord.emptyAction'), onSelect: () => go('catalogue') } }}
        unconnected={{ title: t('pt.ord.emptyTitle'), body: t('pt.ord.emptyBody') }}
        error={{ title: t('pt.ord.errorTitle'), reference: t('pt.ord.ref'), detail: orders.error || undefined, onRetry: orders.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pt.ord.title') })}
      />
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </main>
  );
}
