import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { Rise, useOnline } from '@/design-system';
import { M2ProductCard, M2Responsive, ServiceRail } from '@/design-system/m2';
import type { ServiceTile } from '@/design-system/m2';
import { useSearchParams } from '@/core/navigation';
import { useApiResource } from '@/hooks/api/useApiResource';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { LabBookingOverlay } from '@/features/labBooking/views/LabBookingOverlay';
import { rememberListing } from '@/features/phoneKit/listingCache';
import type { ShopFilter } from '@/features/m2store/data/storeArt';
import { navigate } from '@/lib/utils/workflowRouting';
import { sortItems } from '../../data/studentWebData';
import type { SortOrder } from '../../data/studentWebData';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel } from '../parts';
import { ShopSearch, cannotAdd, itemArt, kindLabel, useAddToCart } from './shopShared';
import { CartBar, CartRail, showCartRail } from './ShopCartRail';
import { GenericsTable, WebShopFront } from './WebShopFront';
import { SHOP_KINDS, ShopFilterPanel, ShopHelpRail, asShopKind } from './WebSearchResultsView';
import type { ShopKind } from './WebSearchResultsView';
import { WebProductView } from './WebProductView';

/** Listings per page: fills three and four columns. */
const PAGE_SIZE = 12;
/** Cards rise in one after another up to this many steps, then together. */
const RISE_STEPS = 6;
/** A grid cell's card grows to the row's height, so the cards in a row line up. */
const CELL = { flexGrow: 1 } as const;

/**
 * One catalogue listing: the shared Mobile 2.0 product card (M2Medicines'
 * "Below MRP"), with the web's extra lines: the maker, availability, a note
 * that the art is a drawing, and what kind of listing it is. Its one action is
 * Add (products) or Book a slot (labs, consults, vaccines).
 */
function ShopCard({ item, inCart, onOpen, onAdd }: { item: LiveCatalogItem; inCart: boolean; onOpen: () => void; onAdd: () => void }) {
  const t = useT();
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const availability = item.kind === 'product'
    ? (item.stock > 0 ? t('shopweb.card.available', { count: item.stock }) : t('shop.outOfStock'))
    : item.kind === 'vaccine' ? t('shopweb.card.eligibility') : t('shopweb.card.providerBooking');
  let action: string;
  if (item.kind === 'product') action = inCart ? t('shopweb.card.inCart') : t('shopweb.card.add');
  else if (item.kind === 'lab') action = t('shopweb.card.bookSlot');
  else action = inCart ? t('shopweb.card.inCart') : t('shopweb.card.bookSlot');
  return (
    <M2ProductCard
      testID={`m2w-card-${item.id}`}
      art={itemArt(item)}
      artNote={t('shopweb.card.illustration')}
      off={off > 0 ? t('m2.med.off', { percent: off }) : undefined}
      eyebrow={item.brand}
      name={item.name}
      pack={item.pack}
      notes={[
        ...(item.requiresPrescription ? [{ text: t('shopweb.card.rxRequired'), tone: 'attention' as const }] : []),
        { text: availability, tone: item.kind === 'product' ? 'meta' as const : 'positive' as const },
      ]}
      price={money(item.pricePaise)}
      mrp={off > 0 ? money(item.mrpPaise) : undefined}
      footnote={item.requiresPrescription ? t('m2.med.rxNeeded') : t(kindLabel(item.kind))}
      onOpen={onOpen}
      label={`${item.name}, ${item.pack}, ${money(item.pricePaise)}`}
      // Starts with what it shows (label-in-name, WCAG 2.5.3), then which item.
      action={{ label: action, spoken: `${action}, ${item.name}`, onPress: onAdd, disabled: cannotAdd(item), tone: item.kind === 'product' ? 'outline' : 'positive' }}
    />
  );
}

interface Filters { q: string; kind: ShopKind; category: string }
type FilterPatch = Partial<Filters> & { product?: string | null };

/**
 * /shop above phone width, in the Mobile 2.0 language (canvas 3b WebShop,
 * WebSearchResults and WebProduct, merged with M2Medicines and M2Product;
 * plan docs/plans/m2-web-shop-2026-10-21.md). One page for the signed-in
 * student (inside the student web shell) and for a visitor (inside the public
 * site's header and footer): the catalogue, its search (`?q=`), filters
 * (`?kind=`, `?category=`) and a listing (`?product=`), with the cart beside it.
 *
 * Everything is the published catalogue (`GET /catalog`, commerce plane):
 * nothing is ordered or chosen using health records, and no placement is for
 * sale (Rule L). Prices are the catalogue's.
 */
export function WebShopView({ signedIn = true }: { signedIn?: boolean }) {
  const [params, setParams] = useSearchParams();
  const filters: Filters = { q: params.get('q') ?? '', kind: asShopKind(params.get('kind')), category: params.get('category') ?? 'all' };
  const productId = params.get('product');
  const [labItem, setLabItem] = useState<LiveCatalogItem | null>(null);
  // A lab test is booked as a lab order (slot, address, pay), never a cart line; signing in comes first.
  const bookLab = (item: LiveCatalogItem) => { if (signedIn) setLabItem(item); else navigate('login', 'shop'); };

  const update = (patch: FilterPatch) => {
    const next = new URLSearchParams(params);
    const set = (key: string, value: string | null | undefined, empty: string) => {
      if (value === undefined) return;
      if (value === null || value === empty) next.delete(key); else next.set(key, value);
    };
    set('q', patch.q, '');
    set('kind', patch.kind, 'all');
    set('category', patch.category, 'all');
    set('product', patch.product, '');
    if (patch.product === undefined) next.delete('product');
    setParams(next);
  };
  const open = (item: LiveCatalogItem) => { rememberListing(item); update({ product: item.id }); };

  return (
    <>
      {productId ? (
        <WebProductView key={productId} itemId={productId} signedIn={signedIn} onBack={() => update({ product: null })} onOpen={(id) => update({ product: id })} onBookLab={bookLab} />
      ) : (
        <ShopBrowse signedIn={signedIn} filters={filters} onFilter={update} onOpen={open} onBookLab={bookLab} />
      )}
      {labItem ? <LabBookingOverlay itemId={labItem.id} onClose={() => setLabItem(null)} /> : null}
    </>
  );
}

const countPath = (filters: Filters, kind: ShopKind) => `/catalog?limit=1&offset=0${query(filters, kind)}`;
function query(filters: Filters, kind: ShopKind): string {
  return `${filters.q ? `&query=${encodeURIComponent(filters.q)}` : ''}${kind !== 'all' ? `&kind=${kind}` : ''}${filters.category !== 'all' ? `&category=${encodeURIComponent(filters.category)}` : ''}`;
}

function ShopBrowse({ signedIn, filters, onFilter, onOpen, onBookLab }: {
  signedIn: boolean; filters: Filters; onFilter: (patch: FilterPatch) => void; onOpen: (item: LiveCatalogItem) => void; onBookLab: (item: LiveCatalogItem) => void;
}) {
  const t = useT();
  const online = useOnline();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortOrder>('name');
  const filterKey = `${filters.q}|${filters.kind}|${filters.category}`;
  useEffect(() => { setPage(0); }, [filterKey]);
  const results = useApiResource<{ items: LiveCatalogItem[]; total: number }>(`/catalog?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${query(filters, filters.kind)}`);
  const all = useApiResource<{ total: number }>(countPath(filters, 'all'));
  const products = useApiResource<{ total: number }>(countPath(filters, 'product'));
  const labs = useApiResource<{ total: number }>(countPath(filters, 'lab'));
  const consults = useApiResource<{ total: number }>(countPath(filters, 'consultation'));
  const vaccines = useApiResource<{ total: number }>(countPath(filters, 'vaccine'));
  const counts = { all: all.data?.total, product: products.data?.total, lab: labs.data?.total, consultation: consults.data?.total, vaccine: vaccines.data?.total };
  const items = useMemo(() => sortItems(results.data?.items ?? [], sort), [results.data, sort]);
  const total = results.data?.total ?? 0;
  const { add, inCart, toast } = useAddToCart(onBookLab, signedIn ? undefined : showCartRail);
  const filtered = filters.kind !== 'all' || filters.category !== 'all';
  const front = !filters.q && !filtered && page === 0;

  const applyFilter = (filter: ShopFilter | { kind: 'product' | 'lab' }) => {
    if ('kind' in filter) onFilter({ kind: filter.kind, category: 'all', q: '' });
    else if ('category' in filter) onFilter({ kind: 'product', category: filter.category, q: '' });
    else onFilter({ q: filter.query, kind: 'all', category: 'all' });
  };

  const rail: ServiceTile[] = [
    ...SHOP_KINDS.map((id): ServiceTile => ({
      key: id,
      label: t(({ all: 'm2w.rail.all', product: 'm2.svc.medicines', lab: 'm2.svc.labs', consultation: 'm2.svc.consults', vaccine: 'm2.svc.vaccines' } as const)[id]),
      icon: ({ all: 'star', product: 'pill-3', lab: 'lab', consultation: 'stetho', vaccine: 'syringe' } as const)[id],
      hue: ({ all: 'indigo', product: 'teal', lab: 'violet', consultation: 'blue', vaccine: 'amber' } as const)[id],
      onPress: () => onFilter({ kind: id, category: 'all' }),
    })),
    { key: 'rx', label: t('m2w.rail.rx'), icon: 'doc-upload', hue: 'green', onPress: () => navigate('prescriptions') },
  ];

  let heading: string;
  if (filters.q) heading = t('sw.search.heading', { query: filters.q });
  else heading = filters.kind === 'all' ? t('shopweb.catalog.heading.shopAll') : t(`shopweb.catalog.heading.${filters.kind}` as MessageKey);
  const countLine = results.data ? (filters.q ? t('sw.search.count', { count: total }) : t('shopweb.catalog.countShop', { count: total })) : t('shopweb.catalog.loading');

  let body: React.ReactNode = null;
  if (!online && (results.error || results.loading)) body = <OfflinePanel onRetry={results.reload} />;
  else if (results.loading) body = <LoadingRows label={t('shopweb.catalog.loading')} rows={4} />;
  else if (results.error) body = <ErrorPanel title={t('shopweb.catalog.errorTitle')} body={t('sw.shop.errorBody')} onRetry={results.reload} />;
  else if (results.data && !items.length) {
    body = filters.q ? (
      <EmptyPanel title={t('sw.search.emptyTitle', { query: filters.q })} body={t('sw.search.emptyBody')} action={{ label: t('sw.search.askAyush'), onPress: () => navigate('ayush') }} secondary={{ label: t('sw.search.clear'), onPress: () => onFilter({ q: '' }) }} />
    ) : (
      <EmptyPanel
        title={filtered ? t('shopweb.empty.filteredTitle') : t('shopweb.empty.title')}
        body={filtered ? t('shopweb.empty.filteredBody') : t('shopweb.empty.body')}
        action={filtered ? { label: t('shopweb.filter.clear'), onPress: () => onFilter({ kind: 'all', category: 'all' }) } : undefined}
      />
    );
  } else if (items.length) {
    body = (
      <ul className="sk-m2w-grid" aria-label={t('m2w.catalogue')}>
        {items.map((item, index) => (
          <li key={item.id}>
            <Rise index={Math.min(index, RISE_STEPS)} style={CELL}>
              <ShopCard item={item} inCart={inCart(item)} onOpen={() => onOpen(item)} onAdd={() => add(item)} />
            </Rise>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="sk-sw-page sk-m2w" data-testid="m2w-shop">
      {/* Signed in, the shell's top bar has the one search box (founder decision, 23 Oct 2026); a visitor's shop keeps its own. */}
      {signedIn ? null : (
        <Rise>
          <div className="sk-m2w-top">
            <ShopSearch initial={filters.q} onSearch={(next) => onFilter({ q: next })} />
          </div>
        </Rise>
      )}
      <Rise index={1}>
        <M2Responsive>
          <ServiceRail label={t('m2w.railLabel')} tiles={rail} current={filters.kind} testID="m2w-rail" />
        </M2Responsive>
      </Rise>

      {front ? <div className="sk-m2w-cq"><WebShopFront signedIn={signedIn} onFilter={applyFilter} /></div> : null}

      <div className="sk-m2w-cq">
      <div className="sk-m2w-browse">
        <ShopFilterPanel
          kind={filters.kind}
          category={filters.category}
          sort={sort}
          counts={counts}
          onKind={(kind) => onFilter({ kind })}
          onCategory={(category) => onFilter({ category })}
          onSort={setSort}
        />
        <section className="sk-m2w-results" aria-labelledby="sk-m2w-results-title">
          <div className="sk-m2w-results__head">
            <div>
              {front ? <h2 id="sk-m2w-results-title" className="sk-m2w-h2">{heading}</h2> : <h1 id="sk-m2w-results-title" className="sk-m2w-h1">{heading}</h1>}
              <p className="sk-m2w-meta">{countLine}</p>
            </div>
            {filters.category !== 'all' || filters.q ? (
              <div className="sk-m2w-active">
                <span>{t('shopweb.filter.showing', { what: filters.q ? `“${filters.q}”` : t(`shopweb.category.${filters.category}` as MessageKey) })}</span>
                <button type="button" className="sk-m2w-chip" onClick={() => onFilter({ q: '', kind: 'all', category: 'all' })}>{t('shopweb.filter.clear')}<Icon name="x" size={14} /></button>
              </div>
            ) : null}
          </div>
          {body}
          {total > PAGE_SIZE ? (
            <div className="sk-m2w-pager">
              <button type="button" className="sk-m2w-btn sk-m2w-btn--ghost" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><Icon name="arrow-left" size={16} />{t('sw.page.previous')}</button>
              <span>{t('sw.page.of', { page: page + 1, pages: Math.ceil(total / PAGE_SIZE) })}</span>
              <button type="button" className="sk-m2w-btn sk-m2w-btn--ghost" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>{t('sw.page.next')}<Icon name="arrow-right" size={16} /></button>
            </div>
          ) : null}
          <p className="sk-m2w-fine">{t('shopweb.shopNote')}</p>
        </section>
        <div className="sk-m2w-side">
          <CartRail signedIn={signedIn} />
          <ShopHelpRail />
        </div>
      </div>
      </div>

      {front ? <GenericsTable /> : null}
      <p className="sk-m2w-firewall"><Icon name="shield-check" size={16} />{t('phone.shop.firewall')}</p>
      <CartBar signedIn={signedIn} />
      {toast}
    </div>
  );
}
