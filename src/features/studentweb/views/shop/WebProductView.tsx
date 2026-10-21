import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { maxQuantity } from '../../data/studentWebData';
import { productArt } from '../catalogArt';
import { cannotAdd, useAddToCart } from './shopShared';

/** Facts beside the product: each one true of every listing, from how the shop works. */
const FACTS: { icon: SkIconName; title: MessageKey; meta: MessageKey; tone: string }[] = [
  { icon: 'truck-2', title: 'sw.product.fact.delivery', meta: 'sw.product.fact.deliveryMeta', tone: 'lab' },
  { icon: 'rotate-cw', title: 'sw.product.fact.returns', meta: 'sw.product.fact.returnsMeta', tone: 'doctor' },
  { icon: 'star-filled', title: 'sw.product.fact.ratings', meta: 'sw.product.fact.ratingsMeta', tone: 'pill' },
];

/**
 * Product (canvas 3b, WebProduct, Tier 2): one published listing — brand,
 * pack, price against MRP, stock, quantity and Add to cart.
 *
 * Made true: no star rating or review count (there are no ratings yet: the
 * fact card says so), no "Earn 30 Kare points" (points are not tied to a
 * purchase), and the description and preparation are the listing's own.
 */
export function WebProductView({ item, onBack, onBookLab }: { item: LiveCatalogItem; onBack: () => void; onBookLab: (item: LiveCatalogItem) => void }) {
  const t = useT();
  const cart = useLiveCart();
  const [quantity, setQuantity] = useState(1);
  const { add, toast } = useAddToCart(onBookLab);
  const cartTotal = cart.lines.reduce((sum, line) => sum + line.item.pricePaise * line.quantity, 0);
  const max = maxQuantity(item);
  const save = item.mrpPaise > item.pricePaise ? item.mrpPaise - item.pricePaise : 0;
  const blocked = cannotAdd(item);

  return (
    <div className="sk-sw-page sk-sw-pdp">
      <div className="sk-sw-pdp__bar">
        <button type="button" className="sk-sw-link" onClick={onBack}><Icon name="arrow-left" size={16} />{t('sw.product.back')}</button>
        <button type="button" className="sk-sw-btn sk-sw-btn--primary" onClick={() => navigate('checkout')}>
          {cart.lines.length ? t('sw.product.cartTotal', { total: money(cartTotal) }) : t('sw.product.cart')}
        </button>
      </div>
      <div className="sk-sw-pdp__layout">
        <div className="sk-sw-pdp__art">
          <span className="sk-sw-pdp__glyph" aria-hidden="true"><Icon name={productArt(item)} size={72} strokeWidth={1.6} /></span>
          <span className="sk-sw-pdp__artnote">{t('shopweb.card.illustration')}</span>
        </div>

        <div className="sk-sw-pdp__info">
          <span className="sk-sw-product__brand">{item.brand}</span>
          <h1 className="sk-sw-pdp__name">{item.name}</h1>
          <p className="sk-sw-muted">{[item.composition, item.pack].filter(Boolean).join(' · ')}</p>
          <span className="sk-sw-pill sk-sw-pill--action">{item.requiresPrescription ? t('shopweb.card.rxRequired') : t(`shopweb.kind.${item.kind}` as MessageKey)}</span>
          <div className="sk-sw-pdp__price">
            <strong>{money(item.pricePaise)}</strong>
            {save ? <><del>{money(item.mrpPaise)}</del><span className="sk-sw-positive">{t('sw.product.save', { amount: money(save) })}</span></> : null}
          </div>
          {item.kind === 'product' ? (
            <div className="sk-sw-pdp__stock">
              <span className="sk-sw-eyebrow">{t('sw.product.stock')}</span>
              <span className={item.stock > 0 ? 'sk-sw-attention' : 'sk-sw-danger'}>{item.stock > 0 ? t('sw.product.left', { count: item.stock }) : t('shop.outOfStock')}</span>
            </div>
          ) : null}
          {item.description ? <p className="sk-sw-pdp__desc">{item.description}</p> : null}
          {item.preparation ? <p className="sk-sw-note">{item.preparation}</p> : null}
          <div className="sk-sw-pdp__buy">
            {item.kind === 'product' && !blocked ? (
              <div className="sk-sw-qty" role="group" aria-label={t('sw.product.quantity')}>
                <button type="button" aria-label={t('cart.decrease', { name: item.name })} disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <output aria-live="polite">{quantity}</output>
                <button type="button" aria-label={t('cart.increase', { name: item.name })} disabled={quantity >= max} onClick={() => setQuantity((value) => Math.min(max, value + 1))}>+</button>
              </div>
            ) : null}
            <button type="button" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--lg sk-sw-pdp__add" disabled={blocked} onClick={() => add(item, quantity)}>
              {item.kind === 'lab' ? t('shopweb.card.bookSlot') : t('sw.product.add')}
            </button>
          </div>
          {item.requiresPrescription ? (
            <p className="sk-sw-note">{t('shopweb.detail.rxNote')} <button type="button" className="sk-sw-link" onClick={() => navigate('prescriptions')}>{t('sw.product.rxLink')}</button></p>
          ) : null}
        </div>

        <aside className="sk-sw-pdp__facts" aria-label={t('sw.product.factsLabel')}>
          {FACTS.map((fact) => (
            <div key={fact.title} className="sk-sw-card sk-sw-fact">
              <span className={`sk-sw-tile-icon is-${fact.tone}`} aria-hidden="true"><Icon name={fact.icon} size={18} /></span>
              <span><strong>{t(fact.title)}</strong><small>{t(fact.meta)}</small></span>
            </div>
          ))}
          <div className="sk-sw-advice">
            <span className="sk-sw-eyebrow">{t('sw.product.adviceEyebrow')}</span>
            <p>{t('sw.product.adviceBody')}</p>
            <div className="sk-sw-advice__links">
              <button type="button" className="sk-sw-link" onClick={() => navigate('care')}>{t('sw.product.findClinician')}<Icon name="arrow-right" size={14} /></button>
              <button type="button" className="sk-sw-link" onClick={() => navigate('ayush')}><Icon name="sparkle" size={14} />{t('sw.product.askAyush')}</button>
            </div>
          </div>
        </aside>
      </div>
      {toast}
    </div>
  );
}
