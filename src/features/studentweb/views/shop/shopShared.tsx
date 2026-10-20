import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { discountPercent } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';

/** How long the "added" message stays on screen. */
const NOTICE_MS = 3000;

/** The cart refuses these (LiveCartContext); say so instead of announcing an add that did not happen. */
export const cannotAdd = (item: LiveCatalogItem): boolean => item.requiresPrescription || (item.kind === 'product' && item.stock < 1);

export const kindLabel = (kind: LiveCatalogItem['kind']): MessageKey => `shopweb.kind.${kind}` as MessageKey;

/** Adds to the cart (labs open their own booking) and echoes it once, politely. */
export function useAddToCart(onBookLab: (item: LiveCatalogItem) => void) {
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
  const inCart = (item: LiveCatalogItem) => cart.lines.some((line) => line.item.id === item.id);
  const toast = (
    <div className="sk-sw-toast" role="status" aria-live="polite">
      {notice ? <><span>{notice}</span><button type="button" className="sk-sw-link is-light" onClick={() => navigate('checkout')}>{t('sw.viewCart')}</button></> : null}
    </div>
  );
  return { add, inCart, toast };
}

/** "42% OFF" corner badge, only when the listing really has an MRP above its price. */
export function DiscountBadge({ item }: { item: LiveCatalogItem }) {
  const t = useT();
  const percent = discountPercent(item.mrpPaise, item.pricePaise);
  return percent > 0 ? <span className="sk-sw-off">{t('shopweb.percentOffBadge', { percent })}</span> : null;
}

/** The search field used on the shop and its results. */
export function ShopSearch({ initial, onSearch }: { initial: string; onSearch: (query: string) => void }) {
  const t = useT();
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  return (
    <form className="sk-sw-search sk-sw-search--bar" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(value.trim()); }}>
      <Icon name="search-2" size={20} color="var(--sk-color-text-3)" />
      <input type="search" value={value} onChange={(event) => setValue(event.target.value)} placeholder={t('sw.search.placeholder')} aria-label={t('sw.search.label')} />
      {value ? (
        <button type="button" className="sk-sw-icon-btn" aria-label={t('shopweb.search.clear')} onClick={() => { setValue(''); onSearch(''); }}>
          <Icon name="x" size={18} />
        </button>
      ) : null}
    </form>
  );
}
