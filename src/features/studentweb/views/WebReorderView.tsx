import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { money } from '@/data/types/workflowTypes';
import type { LiveOrder } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { BUY_AGAIN_ORDER_LIMIT, SECOND_MS, buyAgainBlock, buyAgainEntries } from '../data/studentWebData';
import type { BuyAgainBlock } from '../data/studentWebData';
import { useCatalogIndex } from '../data/useCatalogIndex';
import { reorderArt } from './catalogArt';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead, TrustBand } from './parts';

/** How long the "added" message stays (the toast duration of the design system is for RN; this is the web echo). */
const NOTICE_MS = 3000;

const BLOCK: Record<BuyAgainBlock, MessageKey> = {
  unlisted: 'sw.reorder.block.unlisted',
  prescription: 'sw.reorder.block.prescription',
  outOfStock: 'sw.reorder.block.outOfStock',
};

/**
 * Buy again & ratings (canvas 3b, WebReorder, Tier 2) — the student's page at
 * /buy-again. The partner console's /reorder (VendorReorder) is a different
 * page and is not touched.
 *
 * Shop items only, from the student's delivered orders, listed by when they
 * were bought (commerce plane, Rule L). The price and stock are today's
 * listing; a prescription medicine never goes straight back into the cart.
 * "Campus store" purchases and ratings have no service behind them yet, so
 * they are shown as not available rather than drawn with invented rows.
 */
export function WebReorderView() {
  const t = useT();
  const online = useOnline();
  const cart = useLiveCart();
  const [notice, setNotice] = useState('');
  const orders = useApiResource<{ items: LiveOrder[] }>(`/orders?limit=${BUY_AGAIN_ORDER_LIMIT}&offset=0`);
  const entries = useMemo(() => buyAgainEntries(orders.data?.items ?? []), [orders.data]);
  const catalog = useCatalogIndex(entries.length > 0);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const head = (
    <PageHead
      title={t('sw.reorder.title')}
      sub={t('sw.reorder.sub')}
      actions={(
        <div className="sk-sw-tabs" role="group" aria-label={t('sw.reorder.sourceLabel')}>
          <button type="button" className="sk-sw-tab is-dark" aria-pressed="true">{t('sw.reorder.online')}</button>
          <button type="button" className="sk-sw-tab" aria-disabled="true" title={t('shell.unavailable')}>
            {t('sw.reorder.campusStore')}<span className="sk-visually-hidden">, {t('shell.unavailable')}</span>
          </button>
        </div>
      )}
    />
  );

  const retry = () => { orders.reload(); catalog.reload(); };
  const loading = orders.loading || catalog.loading;
  const error = orders.error || catalog.error;

  let body: React.ReactNode;
  if (!online && (loading || error)) body = <OfflinePanel onRetry={retry} />;
  else if (loading) body = <LoadingRows label={t('sw.reorder.loading')} rows={2} />;
  else if (error) body = <ErrorPanel title={t('sw.reorder.errorTitle')} body={t('sw.reorder.errorBody')} onRetry={retry} />;
  else if (!entries.length) body = <EmptyPanel title={t('sw.reorder.emptyTitle')} body={t('sw.reorder.emptyBody')} action={{ label: t('sw.reorder.browse'), onPress: () => navigate('shop') }} />;
  else {
    body = (
      <>
        <ul className="sk-sw-reorder" aria-label={t('sw.reorder.listLabel')}>
          {entries.map((entry) => {
            const item = catalog.items?.get(entry.itemId);
            const block = buyAgainBlock(item);
            return (
              <li key={entry.itemId} className="sk-sw-card sk-sw-reorder__card">
                <span className="sk-sw-reorder__art" aria-hidden="true"><Icon name={reorderArt(item, entry.name)} size={44} strokeWidth={1.8} color="var(--sk-color-action)" /></span>
                <strong className="sk-sw-reorder__name">{entry.name}</strong>
                <small className="sk-sw-muted">{t('sw.reorder.bought', { count: entry.units, date: new Date(entry.lastBoughtAt * SECOND_MS).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) })}</small>
                <div className="sk-sw-reorder__foot">
                  <strong>{item ? money(item.pricePaise) : '—'}</strong>
                  {item && !block ? (
                    <button type="button" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--sm" aria-label={t('sw.reorder.buySpoken', { name: entry.name })} onClick={() => { cart.add(item); setNotice(t('sw.reorder.added', { name: entry.name })); }}>{t('sw.reorder.buy')}</button>
                  ) : (
                    <span className="sk-sw-reorder__block">{t(BLOCK[block ?? 'unlisted'])}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="sk-sw-fine">{t('sw.reorder.fine')}</p>
      </>
    );
  }

  return (
    <div className="sk-sw-page">
      {head}
      {body}
      <div className="sk-sw-toast" role="status" aria-live="polite">
        {notice ? <><span>{notice}</span><button type="button" className="sk-sw-link is-light" onClick={() => navigate('checkout')}>{t('sw.viewCart')}</button></> : null}
      </div>
      <EmptyPanel
        art="illustration-confused-buyer"
        title={t('sw.reorder.ratingsTitle')}
        body={t('sw.reorder.ratingsBody')}
        action={{ label: t('sw.reorder.home'), onPress: () => navigate('home') }}
      />
      <hr className="sk-sw-rule" />
      <TrustBand />
    </div>
  );
}
