import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { CanvasVideo } from '@/design-system/art';
import { useSearchParams } from '@/core/navigation';
import { useApiResource } from '@/hooks/api/useApiResource';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { LabBookingOverlay } from '@/features/labBooking/views/LabBookingOverlay';
import { navigate } from '@/lib/utils/workflowRouting';
import { shopArt } from '../catalogArt';
import { ErrorPanel, EmptyPanel, LoadingRows } from '../parts';
import { DiscountBadge, ShopSearch, cannotAdd, kindLabel, useAddToCart } from './shopShared';
import { WebSearchResultsView } from './WebSearchResultsView';
import { WebProductView } from './WebProductView';

/** Cards per catalogue page (two rows of five on the board). */
const PAGE_SIZE = 10;
type ShopKind = 'all' | 'product' | 'lab' | 'consultation' | 'vaccine';
const KINDS: readonly ShopKind[] = ['all', 'product', 'lab', 'consultation', 'vaccine'];
/** Categories the catalogue uses (`shopweb.category.<id>` labels). */
const CATEGORIES = ['vitamins', 'skin', 'devices', 'nutrition', 'first-aid', 'ayurveda', 'medicines', 'labs', 'general-care', 'diabetes', 'heart', 'stomach', 'liver', 'bone-joint', 'kidney', 'respiratory', 'eye', 'vaccines'] as const;

interface Tile { id: string; label: MessageKey; art?: string; icon?: SkIconName; onPress: () => void }

/**
 * The shop in the student web shell (canvas 3b: WebShop, WebSearchResults,
 * WebProduct). /shop shows the catalogue; /shop?q= the search results; a card
 * opens the product. Everything is the published catalogue (`GET /catalog`,
 * commerce plane): nothing is ordered or chosen using health records, and no
 * placement is for sale (Rule L).
 */
export function WebShopView() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [product, setProduct] = useState<LiveCatalogItem | null>(null);
  const [labItem, setLabItem] = useState<LiveCatalogItem | null>(null);
  const search = (next: string) => { setProduct(null); setParams(next ? { q: next } : {}); };

  let page: React.ReactNode;
  if (product) page = <WebProductView item={product} onBack={() => setProduct(null)} onBookLab={setLabItem} />;
  else if (query) page = <WebSearchResultsView query={query} onSearch={search} onOpen={setProduct} onBookLab={setLabItem} />;
  else page = <ShopCatalogue onSearch={search} onOpen={setProduct} onBookLab={setLabItem} />;

  return (
    <>
      {page}
      {/* A lab test is booked as a lab order (slot, address, pay), never a cart line. */}
      {labItem ? <LabBookingOverlay itemId={labItem.id} onClose={() => setLabItem(null)} /> : null}
    </>
  );
}

function ShopCatalogue({ onSearch, onOpen, onBookLab }: { onSearch: (query: string) => void; onOpen: (item: LiveCatalogItem) => void; onBookLab: (item: LiveCatalogItem) => void }) {
  const t = useT();
  const [kind, setKind] = useState<ShopKind>('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const resource = useApiResource<{ items: LiveCatalogItem[]; total: number }>(
    `/catalog?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${kind !== 'all' ? `&kind=${kind}` : ''}${category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''}`,
  );
  const { add, inCart, toast } = useAddToCart(onBookLab);
  const browse = (nextKind: ShopKind, nextCategory = 'all') => { setKind(nextKind); setCategory(nextCategory); setPage(0); };
  const categoryLabel = (value: string) => t(`shopweb.category.${value}` as MessageKey);

  // The board's eight tiles. "Nearby pharmacy" and "Ask a pharmacist" have no
  // service behind them, so those two places hold lab tests and vaccines, which do.
  const tiles: Tile[] = [
    { id: 'medicines', label: 'shopweb.front.tile.medicines', art: 'everyday-medicines', onPress: () => browse('product', 'medicines') },
    { id: 'prescription', label: 'shopweb.front.tile.prescription', art: 'upload-prescription', onPress: () => navigate('prescriptions') },
    { id: 'devices', label: 'shopweb.front.tile.devices', art: 'health-devices', onPress: () => browse('product', 'devices') },
    { id: 'ayurveda', label: 'shopweb.front.tile.ayurveda', art: 'ayurveda', onPress: () => browse('product', 'ayurveda') },
    { id: 'cold', label: 'shopweb.front.tile.cold', art: 'cold-allergy', onPress: () => browse('all', 'respiratory') },
    { id: 'heart', label: 'shopweb.front.tile.heart', art: 'heart-care', onPress: () => browse('all', 'heart') },
    { id: 'labs', label: 'shopweb.front.tile.labs', icon: 'file-text-2', onPress: () => browse('lab') },
    { id: 'vaccines', label: 'shopweb.front.tile.vaccines', icon: 'pipette', onPress: () => browse('vaccine') },
  ];

  const items = resource.data?.items ?? [];
  const total = resource.data?.total ?? 0;

  return (
    <div className="sk-sw-page sk-sw-shop">
      <ShopSearch initial="" onSearch={onSearch} />

      <section className="sk-sw-shopbanner" aria-labelledby="sk-sw-shopbanner-title">
        <CanvasVideo name="video-93a060.mp4" className="sk-sw-shopbanner__video" />
        <div className="sk-sw-shopbanner__copy">
          <span className="sk-sw-shopbanner__eyebrow">{t('shopweb.front.eyebrow')}</span>
          <h1 id="sk-sw-shopbanner-title">{t('shopweb.front.title')}</h1>
          <ul className="sk-sw-shopbanner__chips" aria-label={t('shopweb.front.chipsLabel')}>
            <li>{t('shopweb.front.chipPrice')}</li>
            <li>{t('shopweb.front.chipTiming')}</li>
            <li>{t('shopweb.front.chipPlacement')}</li>
          </ul>
        </div>
      </section>

      <nav className="sk-sw-tiles" aria-label={t('shopweb.front.tilesLabel')}>
        {tiles.map((tile) => (
          <button key={tile.id} type="button" className="sk-sw-tile" onClick={tile.onPress}>
            <span className="sk-sw-tile__art" aria-hidden="true">
              {tile.art ? <img src={`/brand/shop/${tile.art}.png`} alt="" width={64} height={64} /> : tile.icon ? <Icon name={tile.icon} size={34} color="var(--sk-color-action)" /> : null}
            </span>
            <span className="sk-sw-tile__label">{t(tile.label)}</span>
          </button>
        ))}
      </nav>

      <section aria-labelledby="sk-sw-catalog-title">
        <div className="sk-sw-catalog-head">
          <div>
            <h2 id="sk-sw-catalog-title" className="sk-sw-h2">{kind === 'all' ? t('shopweb.catalog.heading.shopAll') : t(`shopweb.catalog.heading.${kind}` as MessageKey)}</h2>
            <p className="sk-sw-muted">{resource.data ? t('shopweb.catalog.countShop', { count: total }) : t('shopweb.catalog.loading')}</p>
          </div>
          <div className="sk-sw-catalog-tools">
            <div className="sk-sw-tabs" role="group" aria-label={t('shopweb.tabs.label')}>
              {KINDS.map((id) => <button key={id} type="button" className="sk-sw-tab" aria-pressed={kind === id} onClick={() => browse(id, category)}>{t(`shopweb.tabs.${id}` as MessageKey)}</button>)}
            </div>
            <label className="sk-sw-select">
              <span className="sk-visually-hidden">{t('shopweb.catalog.category')}</span>
              <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}>
                <option value="all">{t('shopweb.catalog.allCategories')}</option>
                {CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}
              </select>
              <Icon name="chevron-down" size={16} />
            </label>
          </div>
        </div>

        {resource.loading ? <LoadingRows label={t('shopweb.catalog.loading')} rows={4} /> : null}
        {resource.error ? <ErrorPanel title={t('shopweb.catalog.errorTitle')} body={t('sw.shop.errorBody')} onRetry={resource.reload} /> : null}
        {resource.data && !items.length ? (
          <EmptyPanel
            title={category !== 'all' || kind !== 'all' ? t('shopweb.empty.filteredTitle') : t('shopweb.empty.title')}
            body={category !== 'all' || kind !== 'all' ? t('shopweb.empty.filteredBody') : t('shopweb.empty.body')}
            action={category !== 'all' || kind !== 'all' ? { label: t('shopweb.filter.clear'), onPress: () => browse('all') } : undefined}
          />
        ) : null}
        {items.length ? (
          <ul className="sk-sw-grid">
            {items.map((item) => (
              <li key={item.id} className="sk-sw-card sk-sw-product">
                <button type="button" className="sk-sw-product__visual" aria-label={t('shopweb.view', { name: item.name })} onClick={() => onOpen(item)}>
                  <DiscountBadge item={item} />
                  <Icon name={shopArt(item)} size={40} strokeWidth={1.6} />
                  <span className="sk-sw-product__artnote">{t('shopweb.card.illustration')}</span>
                </button>
                <div className="sk-sw-product__body">
                  <span className="sk-sw-product__brand">{item.brand}</span>
                  <button type="button" className="sk-sw-product__name" onClick={() => onOpen(item)}>{item.name}</button>
                  <span className="sk-sw-muted">{item.pack}</span>
                  <span className="sk-sw-price"><strong>{money(item.pricePaise)}</strong>{item.mrpPaise > item.pricePaise ? <del>{money(item.mrpPaise)}</del> : null}</span>
                  <span className={item.kind === 'product' ? 'sk-sw-muted' : 'sk-sw-positive'}>
                    {item.kind === 'product' ? (item.stock > 0 ? t('shopweb.card.available', { count: item.stock }) : t('shop.outOfStock')) : item.kind === 'vaccine' ? t('shopweb.card.eligibility') : t('shopweb.card.providerBooking')}
                  </span>
                  <div className="sk-sw-product__foot">
                    <span className="sk-sw-muted">{item.requiresPrescription ? t('shopweb.card.rxRequired') : t(kindLabel(item.kind))}</span>
                    {item.kind === 'product' ? (
                      <button type="button" className="sk-sw-btn sk-sw-btn--outline sk-sw-btn--sm" disabled={cannotAdd(item)} aria-label={t('shop.addSpoken', { name: item.name })} onClick={() => add(item)}>
                        {inCart(item) ? t('shopweb.card.inCart') : t('shopweb.card.add')}
                      </button>
                    ) : (
                      <button type="button" className="sk-sw-btn sk-sw-btn--positive sk-sw-btn--sm" disabled={cannotAdd(item)} onClick={() => add(item)} aria-label={t('sw.shop.bookSpoken', { name: item.name })}>
                        {item.kind === 'lab' ? t('shopweb.card.bookSlot') : inCart(item) ? t('shopweb.card.inCart') : t('shopweb.card.bookSlot')}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {total > PAGE_SIZE ? (
          <div className="sk-sw-pager">
            <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><Icon name="arrow-left" size={16} />{t('sw.page.previous')}</button>
            <span>{t('sw.page.of', { page: page + 1, pages: Math.ceil(total / PAGE_SIZE) })}</span>
            <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>{t('sw.page.next')}<Icon name="arrow-right" size={16} /></button>
          </div>
        ) : null}
        <p className="sk-sw-fine">{t('shopweb.shopNote')}</p>
      </section>
      {toast}
    </div>
  );
}
