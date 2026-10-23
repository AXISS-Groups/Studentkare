import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import type { CartLine } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import { labArt, productArt } from '@/features/m2store/data/storeArt';
import type { Art } from '@/features/m2store/data/storeArt';
import { navigate } from '@/lib/utils/workflowRouting';
import './webshop.css';

/**
 * The drawing on a listing, as the phone boards draw it (`storeArt`): products
 * and labs by name and category; consults and vaccines by their service.
 * Decoration only: it follows the listing, never anything about the person
 * looking (Rule L).
 */
export function itemArt(item: Pick<LiveCatalogItem, 'kind' | 'name' | 'category'>): Art {
  if (item.kind === 'lab') return labArt(item.name);
  if (item.kind === 'consultation') return { icon: 'stetho', hue: 'blue' };
  if (item.kind === 'vaccine') return { icon: 'syringe', hue: 'amber' };
  return productArt(item);
}

export const cartUnits = (lines: readonly CartLine[]): number => lines.reduce((sum, line) => sum + line.quantity, 0);
export const cartPaise = (lines: readonly CartLine[]): number => lines.reduce((sum, line) => sum + line.item.pricePaise * line.quantity, 0);

/** How long the "added" message stays on screen. */
const NOTICE_MS = 3000;

/** The cart refuses these (LiveCartContext); say so instead of announcing an add that did not happen. */
export const cannotAdd = (item: LiveCatalogItem): boolean => item.requiresPrescription || (item.kind === 'product' && item.stock < 1);

export const kindLabel = (kind: LiveCatalogItem['kind']): MessageKey => `shopweb.kind.${kind}` as MessageKey;

/** Adds to the cart (labs open their own booking) and echoes it once, politely. "View cart" opens the checkout unless the page says otherwise. */
export function useAddToCart(onBookLab: (item: LiveCatalogItem) => void, onViewCart: () => void = () => navigate('checkout')) {
  const t = useT();
  const cart = useLiveCart();
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const add = (item: LiveCatalogItem, quantity = 1) => {
    if (item.kind === 'lab') { onBookLab(item); return; }
    if (cannotAdd(item)) { setNotice(t('shopweb.notice.cannotAdd', { name: item.name })); return; }
    cart.add(item);
    if (quantity > 1) cart.setQuantity(item.id, quantity);
    setNotice(t('shopweb.notice.added', { name: item.name }));
  };
  /** Says an item went in when the caller added it itself (the product page adds a chosen quantity). */
  const announce = (item: LiveCatalogItem) => setNotice(t('shopweb.notice.added', { name: item.name }));
  const inCart = (item: LiveCatalogItem) => cart.lines.some((line) => line.item.id === item.id);
  const toast = (
    <div className="sk-m2w-toast" role="status" aria-live="polite">
      {notice ? <><Icon name="cart" size={18} /><span>{notice}</span><button type="button" className="sk-m2w-toast__link" onClick={() => { setNotice(''); onViewCart(); }}>{t('sw.viewCart')}</button></> : null}
    </div>
  );
  return { add, announce, inCart, toast };
}

/** The Mobile 2.0 search field used on the shop and its results (white, rounded, the magnifier first). */
export function ShopSearch({ initial, onSearch }: { initial: string; onSearch: (query: string) => void }) {
  const t = useT();
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  return (
    <form className="sk-m2w-search" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(value.trim()); }}>
      <Icon name="search-2" size={20} color="var(--sk-color-text-3)" />
      <input type="search" value={value} onChange={(event) => setValue(event.target.value)} placeholder={t('sw.search.placeholder')} aria-label={t('sw.search.label')} />
      {value ? (
        <button type="button" className="sk-m2w-iconbtn" aria-label={t('shopweb.search.clear')} onClick={() => { setValue(''); onSearch(''); }}>
          <Icon name="x" size={18} />
        </button>
      ) : null}
    </form>
  );
}
