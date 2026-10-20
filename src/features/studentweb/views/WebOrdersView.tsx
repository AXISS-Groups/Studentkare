import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Icon3d } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import { useMutation } from '@/components/interface/WorkflowUI';
import { money } from '@/data/types/workflowTypes';
import type { LiveOrder, RequestStatus } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { ORDER_TABS, SECOND_MS, TRACK_STEPS, filterOrders, isActiveOrder, orderRef, orderStatus, trackProgress } from '../data/studentWebData';
import type { OrderTab } from '../data/studentWebData';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead, Pill } from './parts';
import type { PillTone } from './parts';

/** Orders per page (the canvas table shows five; the API pages by ten). */
const PAGE_SIZE = 10;

const STATUS: Record<RequestStatus, { label: MessageKey; tone: PillTone }> = {
  REQUESTED: { label: 'sw.orders.status.REQUESTED', tone: 'action' },
  ACCEPTED: { label: 'sw.orders.status.ACCEPTED', tone: 'action' },
  DISPATCHED: { label: 'sw.orders.status.DISPATCHED', tone: 'action' },
  COMPLETED: { label: 'sw.orders.status.COMPLETED', tone: 'muted' },
  DECLINED: { label: 'sw.orders.status.DECLINED', tone: 'attention' },
  CANCELLED: { label: 'sw.orders.status.CANCELLED', tone: 'muted' },
};

const STEP: Record<(typeof TRACK_STEPS)[number], { title: MessageKey; meta: MessageKey }> = {
  placed: { title: 'sw.orders.step.placed', meta: 'sw.orders.step.placedMeta' },
  accepted: { title: 'sw.orders.step.accepted', meta: 'sw.orders.step.acceptedMeta' },
  dispatched: { title: 'sw.orders.step.dispatched', meta: 'sw.orders.step.dispatchedMeta' },
  completed: { title: 'sw.orders.step.completed', meta: 'sw.orders.step.completedMeta' },
};

const when = (seconds: number) => new Date(seconds * SECOND_MS).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * My orders (canvas 3b, WebOrders, Tier 2). The student's own commerce
 * orders (`GET /orders`, commerce plane): no clinical data, and nothing here
 * is ordered or ranked by anything about their health (Rule L).
 *
 * The canvas's courier line ("Ramesh P. is 6 minutes from Block B") and per-step
 * times have nothing behind them, so tracking shows the steps an order's lines
 * have reached and the time it was placed only.
 */
export function WebOrdersView() {
  const t = useT();
  const online = useOnline();
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<OrderTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resource = useApiResource<{ items: LiveOrder[]; total?: number }>(`/orders?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
  const cancel = useMutation();
  const orders = useMemo(() => resource.data?.items ?? [], [resource.data]);
  const shown = useMemo(() => filterOrders(orders, tab), [orders, tab]);
  const total = resource.data?.total ?? orders.length;
  const selected = shown.find((order) => order.id === selectedId) ?? shown.find(isActiveOrder) ?? shown[0] ?? null;
  useEffect(() => { setSelectedId(null); }, [tab, page]);

  const tabLabel: Record<OrderTab, MessageKey> = { all: 'sw.orders.tab.all', active: 'sw.orders.tab.active', lab: 'sw.orders.tab.lab', past: 'sw.orders.tab.past' };
  const head = (
    <PageHead
      title={t('sw.orders.title')}
      sub={resource.data ? t('sw.orders.sub', { count: total, tab: t(tabLabel[tab]).toLowerCase() }) : undefined}
      actions={resource.data && orders.length ? (
        <div className="sk-sw-tabs" role="group" aria-label={t('sw.orders.tabsLabel')}>
          {ORDER_TABS.map((id) => (
            <button key={id} type="button" className="sk-sw-tab" aria-pressed={tab === id} onClick={() => setTab(id)}>{t(tabLabel[id])}</button>
          ))}
        </div>
      ) : null}
    />
  );

  if (!online && (resource.error || resource.loading)) return <div className="sk-sw-page">{head}<OfflinePanel onRetry={resource.reload} /></div>;
  if (resource.loading) return <div className="sk-sw-page">{head}<LoadingRows label={t('sw.orders.loading')} rows={5} /></div>;
  if (resource.error) return <div className="sk-sw-page">{head}<ErrorPanel title={t('sw.orders.errorTitle')} body={t('sw.orders.errorBody')} onRetry={resource.reload} /></div>;
  if (!orders.length && page === 0) {
    return (
      <div className="sk-sw-page">
        {head}
        <EmptyPanel
          icon3d={<Icon3d name="cart-alt--p3" size={88} />}
          title={t('sw.orders.emptyTitle')}
          body={t('sw.orders.emptyBody')}
          action={{ label: t('sw.orders.browse'), onPress: () => navigate('shop') }}
        />
      </div>
    );
  }

  const ctaFor = (order: LiveOrder): { label: MessageKey; onPress: () => void } => {
    if (isActiveOrder(order)) return { label: 'sw.orders.cta.track', onPress: () => setSelectedId(order.id) };
    if (orderStatus(order) === 'COMPLETED' && order.lines.some((line) => line.kind === 'product')) return { label: 'sw.orders.cta.reorder', onPress: () => navigate('buy-again') };
    return { label: 'sw.orders.cta.open', onPress: () => setSelectedId(order.id) };
  };

  return (
    <div className="sk-sw-page">
      {head}
      <div className="sk-sw-orders">
        <div className="sk-sw-orders__main">
          {shown.length ? (
            <div className="sk-sw-card sk-sw-table-wrap">
              <table className="sk-sw-table">
                <caption className="sk-visually-hidden">{t('sw.orders.caption')}</caption>
                <thead>
                  <tr><th scope="col">{t('sw.orders.col.order')}</th><th scope="col">{t('sw.orders.col.items')}</th><th scope="col">{t('sw.orders.col.status')}</th><th scope="col">{t('sw.orders.col.total')}</th><th scope="col"><span className="sk-visually-hidden">{t('sw.orders.col.action')}</span></th></tr>
                </thead>
                <tbody>
                  {shown.map((order) => {
                    const status = STATUS[orderStatus(order)];
                    const cta = ctaFor(order);
                    return (
                      <tr key={order.id} className={selected?.id === order.id ? 'is-selected' : undefined}>
                        <td><strong className="sk-sw-mono">{orderRef(order.id)}</strong><small>{when(order.createdAt)}</small></td>
                        <td><span className="sk-sw-table__items">{order.lines.map((line) => line.name).join(', ')}</span><small>{order.delivery.mode === 'pickup' ? t('sw.orders.pickup', { city: order.delivery.city }) : t('sw.orders.delivery', { city: order.delivery.city })}</small></td>
                        <td><Pill tone={status.tone} dot>{t(status.label)}</Pill></td>
                        <td><strong>{money(order.totalPaise)}</strong><small>{order.paymentStatus === 'PAID' ? t('sw.orders.paid') : t('sw.orders.unpaid')}</small></td>
                        <td className="sk-sw-table__action"><button type="button" className="sk-sw-chip-btn" onClick={cta.onPress} aria-label={`${t(cta.label)} ${orderRef(order.id)}`}>{t(cta.label)}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title={t('sw.orders.filteredTitle')} body={t('sw.orders.filteredBody')} action={{ label: t('sw.orders.showAll'), onPress: () => setTab('all') }} />
          )}
          {total > PAGE_SIZE ? (
            <div className="sk-sw-pager">
              <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><Icon name="arrow-left" size={16} />{t('sw.page.previous')}</button>
              <span>{t('sw.page.of', { page: page + 1, pages: Math.ceil(total / PAGE_SIZE) })}</span>
              <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>{t('sw.page.next')}<Icon name="arrow-right" size={16} /></button>
            </div>
          ) : null}
        </div>
        {selected ? (
          <aside className="sk-sw-track" aria-labelledby="sk-sw-track-title">
            <span className="sk-sw-eyebrow">{t('sw.orders.tracking', { ref: orderRef(selected.id) })}</span>
            <h2 id="sk-sw-track-title" className="sk-sw-track__title">{t(STATUS[orderStatus(selected)].label)}</h2>
            <p className="sk-sw-muted">{selected.paymentStatus === 'PAID' ? t('sw.orders.paidTotal', { total: money(selected.totalPaise) }) : t('sw.orders.unpaidTotal', { total: money(selected.totalPaise) })}</p>
            {trackProgress(selected) > 0 ? (
              <ol className="sk-sw-steps">
                {TRACK_STEPS.map((step, index) => {
                  const done = index < trackProgress(selected);
                  const current = index === trackProgress(selected) - 1 && step !== 'completed';
                  return (
                    <li key={step} className={`sk-sw-steps__item${done ? ' is-done' : ''}${current ? ' is-current' : ''}`} aria-current={current ? 'step' : undefined}>
                      <span className="sk-sw-steps__dot" aria-hidden="true">{done && !current ? <Icon name="check" size={13} /> : null}</span>
                      <span className="sk-sw-steps__text">
                        <strong>{t(STEP[step].title)}</strong>
                        <small>{t(STEP[step].meta)}</small>
                      </span>
                      {step === 'placed' ? <span className="sk-sw-steps__time">{new Date(selected.createdAt * SECOND_MS).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span> : null}
                      <span className="sk-visually-hidden">{done ? t('sw.orders.stepDone') : t('sw.orders.stepTodo')}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="sk-sw-note">{t('sw.orders.closedNote')}</p>
            )}
            {cancel.error ? <p className="sk-sw-error" role="alert">{cancel.error}</p> : null}
            <div className="sk-sw-track__actions">
              {selected.lines.every((line) => line.status === 'REQUESTED') ? (
                <button type="button" className="sk-sw-btn sk-sw-btn--danger-outline" disabled={cancel.busy} onClick={() => cancel.run(() => apiRequest(`/orders/${selected.id}/cancel`, { method: 'POST' }), resource.reload)}>{cancel.busy ? t('sw.orders.cancelling') : t('sw.orders.cancel')}</button>
              ) : null}
              <button type="button" className="sk-sw-btn sk-sw-btn--soft" onClick={() => navigate('buy-again')}>{t('sw.orders.reorder')}</button>
              <button type="button" className="sk-sw-btn sk-sw-btn--ghost" onClick={() => navigate('return-request')}>{t('sw.orders.issue')}</button>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
