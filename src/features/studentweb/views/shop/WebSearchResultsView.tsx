import React, { useMemo, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useApiResource } from '@/hooks/api/useApiResource';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { SEARCH_KINDS, SORT_ORDERS, sortItems } from '../../data/studentWebData';
import type { SearchKind, SortOrder } from '../../data/studentWebData';
import { EmptyPanel, ErrorPanel, Eyebrow, LoadingRows, UrgentNote } from '../parts';
import { ShopSearch, cannotAdd, useAddToCart } from './shopShared';

/** Results per page (three rows of two on the board, doubled). */
const PAGE_SIZE = 12;

const KIND_LABEL: Record<SearchKind, MessageKey> = { all: 'sw.search.kind.all', product: 'sw.search.kind.product', lab: 'sw.search.kind.lab', consultation: 'sw.search.kind.consultation' };
const SORT_LABEL: Record<SortOrder, MessageKey> = { name: 'sw.search.sort.name', priceLow: 'sw.search.sort.priceLow', priceHigh: 'sw.search.sort.priceHigh' };
const ICON: Record<LiveCatalogItem['kind'], { icon: SkIconName; tone: string }> = {
  product: { icon: 'pill-2', tone: 'pill' },
  lab: { icon: 'flask-2', tone: 'lab' },
  consultation: { icon: 'doctor-2', tone: 'doctor' },
  vaccine: { icon: 'pipette', tone: 'lab' },
};

const countPath = (query: string, kind: SearchKind) => `/catalog?limit=1&offset=0&query=${encodeURIComponent(query)}${kind === 'all' ? '' : `&kind=${kind}`}`;

/**
 * Search results (canvas 3b, WebSearchResults, Tier 2). One query across the
 * published catalogue, with counts per kind from the server.
 *
 * Made true: results are listed by name (the server's order), never "ranked
 * clinically" and never by anything about the student; the board's fulfilment
 * and price filters have no server field behind them, so they are not drawn,
 * and price sorting re-sorts only the page on screen. "Delivering to" names no
 * address: pickup or delivery is chosen at checkout.
 */
export function WebSearchResultsView({ query, onSearch, onOpen, onBookLab }: {
  query: string;
  onSearch: (query: string) => void;
  onOpen: (item: LiveCatalogItem) => void;
  onBookLab: (item: LiveCatalogItem) => void;
}) {
  const t = useT();
  const [kind, setKind] = useState<SearchKind>('all');
  const [sort, setSort] = useState<SortOrder>('name');
  const [page, setPage] = useState(0);
  const results = useApiResource<{ items: LiveCatalogItem[]; total: number }>(
    `/catalog?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&query=${encodeURIComponent(query)}${kind === 'all' ? '' : `&kind=${kind}`}`,
  );
  const all = useApiResource<{ total: number }>(countPath(query, 'all'));
  const products = useApiResource<{ total: number }>(countPath(query, 'product'));
  const labs = useApiResource<{ total: number }>(countPath(query, 'lab'));
  const consults = useApiResource<{ total: number }>(countPath(query, 'consultation'));
  const counts: Record<SearchKind, number | undefined> = { all: all.data?.total, product: products.data?.total, lab: labs.data?.total, consultation: consults.data?.total };
  const items = useMemo(() => sortItems(results.data?.items ?? [], sort), [results.data, sort]);
  const total = results.data?.total ?? 0;
  const { add, inCart, toast } = useAddToCart(onBookLab);
  const pick = (next: SearchKind) => { setKind(next); setPage(0); };

  const cta = (item: LiveCatalogItem): string => {
    if (item.kind === 'lab') return t('sw.search.cta.slots');
    if (item.kind === 'product') return inCart(item) ? t('shopweb.card.inCart') : t('sw.search.cta.cart');
    return inCart(item) ? t('shopweb.card.inCart') : t('sw.search.cta.book');
  };
  const tag = (item: LiveCatalogItem): string | null => {
    const percent = discountPercent(item.mrpPaise, item.pricePaise);
    if (percent > 0) return t('shopweb.percentOff', { percent });
    if (item.kind === 'product') return item.stock > 0 ? t('sw.search.inStock') : t('shop.outOfStock');
    return null;
  };

  return (
    <div className="sk-sw-page sk-sw-results">
      <ShopSearch initial={query} onSearch={onSearch} />
      <div className="sk-sw-results__layout">
        <aside className="sk-sw-results__filters" aria-label={t('sw.search.filtersLabel')}>
          <Eyebrow>{t('sw.search.category')}</Eyebrow>
          <div className="sk-sw-results__kinds" role="group" aria-label={t('sw.search.category')}>
            {SEARCH_KINDS.map((id) => (
              <button key={id} type="button" className="sk-sw-kind" aria-pressed={kind === id} onClick={() => pick(id)}>
                <span>{t(KIND_LABEL[id])}</span>
                <span className="sk-sw-kind__count">{counts[id] ?? '—'}</span>
              </button>
            ))}
          </div>
          <div className="sk-sw-results__ranked">
            <strong>{t('sw.search.rankedTitle')}</strong>
            <small>{t('sw.search.rankedBody')}</small>
          </div>
        </aside>

        <section className="sk-sw-results__main" aria-labelledby="sk-sw-results-title">
          <div className="sk-sw-catalog-head">
            <div>
              <h1 id="sk-sw-results-title" className="sk-sw-title">{t('sw.search.heading', { query })}</h1>
              <p className="sk-sw-muted">{results.data ? t('sw.search.count', { count: total }) : t('shopweb.catalog.loading')}</p>
            </div>
            <label className="sk-sw-select sk-sw-select--pill">
              <span>{t('sw.search.sortLabel')}</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}>
                {SORT_ORDERS.map((id) => <option key={id} value={id}>{t(SORT_LABEL[id])}</option>)}
              </select>
              <Icon name="chevron-down" size={16} />
            </label>
          </div>
          {results.loading ? <LoadingRows label={t('shopweb.catalog.loading')} rows={4} /> : null}
          {results.error ? <ErrorPanel title={t('shopweb.catalog.errorTitle')} body={t('sw.shop.errorBody')} onRetry={results.reload} /> : null}
          {results.data && !items.length ? (
            <EmptyPanel title={t('sw.search.emptyTitle', { query })} body={t('sw.search.emptyBody')} action={{ label: t('sw.search.askAyush'), onPress: () => navigate('ayush') }} secondary={{ label: t('sw.search.clear'), onPress: () => onSearch('') }} />
          ) : null}
          {items.length ? (
            <ul className="sk-sw-results__grid">
              {items.map((item) => {
                const icon = ICON[item.kind];
                const label = tag(item);
                return (
                  <li key={item.id} className="sk-sw-card sk-sw-result">
                    <div className="sk-sw-result__top">
                      <span className={`sk-sw-tile-icon is-${icon.tone}`} aria-hidden="true"><Icon name={icon.icon} size={20} /></span>
                      <span className="sk-sw-result__text">
                        <button type="button" className="sk-sw-result__name" onClick={() => onOpen(item)}>{item.name}</button>
                        <small>{[t(`shopweb.kind.${item.kind}` as MessageKey), item.brand, item.pack].filter(Boolean).join(' • ')}</small>
                      </span>
                      {label ? <span className="sk-sw-result__tag">{label}</span> : null}
                    </div>
                    <div className="sk-sw-result__foot">
                      <strong>{item.pricePaise === 0 ? t('sw.search.free') : money(item.pricePaise)}</strong>
                      <button type="button" className="sk-sw-btn sk-sw-btn--primary" disabled={cannotAdd(item)} onClick={() => add(item)} aria-label={`${cta(item)}: ${item.name}`}>{item.requiresPrescription ? t('shopweb.card.rxRequired') : cta(item)}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {total > PAGE_SIZE ? (
            <div className="sk-sw-pager">
              <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><Icon name="arrow-left" size={16} />{t('sw.page.previous')}</button>
              <span>{t('sw.page.of', { page: page + 1, pages: Math.ceil(total / PAGE_SIZE) })}</span>
              <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>{t('sw.page.next')}<Icon name="arrow-right" size={16} /></button>
            </div>
          ) : null}
        </section>

        <aside className="sk-sw-results__rail" aria-label={t('sw.search.railLabel')}>
          <div className="sk-sw-ayush">
            <span className="sk-sw-ayush__eyebrow"><span className="sk-sw-badge__dot" aria-hidden="true" />{t('sw.search.ayushEyebrow')}</span>
            <strong>{t('sw.search.ayushTitle')}</strong>
            <p>{t('sw.search.ayushBody')}</p>
            <button type="button" className="sk-sw-btn sk-sw-btn--light" onClick={() => navigate('ayush')}>{t('sw.search.askAyush')}</button>
          </div>
          <div className="sk-sw-results__deliver">
            <Eyebrow>{t('sw.search.deliveringTo')}</Eyebrow>
            <div className="sk-sw-card sk-sw-deliver">
              <Icon name="pin-drop" size={18} color="var(--sk-color-action)" />
              <span><strong>{t('sw.search.deliverTitle')}</strong><small>{t('sw.search.deliverBody')}</small></span>
            </div>
          </div>
          <UrgentNote />
        </aside>
      </div>
      {toast}
    </div>
  );
}
