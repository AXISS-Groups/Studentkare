import React from 'react';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import type { CartLine } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import { labArt, productArt } from '@/features/m2store/data/storeArt';
import type { Art } from '@/features/m2store/data/storeArt';
import { maxQuantity } from '../../data/studentWebData';
import { cannotAdd, kindLabel } from './shopShared';
import './m2webshop.css';

/**
 * The Mobile 2.0 look at tablet and desktop widths (WebShop, WebSearchResults,
 * WebProduct, WebCheckout): DOM pieces drawn with the same service palette,
 * soft tiles, gradients and lift as the phone boards, and the same drawings
 * (`storeArt`). Decoration only: a listing's art follows its kind, category
 * and name, never anything about the person looking (Rule L).
 */

/** The soft-tile pair of a service hue as CSS variables (indigo's soft pair is the surface-3 / action roles). */
export function hueStyle(hue: ServiceHue): React.CSSProperties {
  const soft = hue === 'indigo' ? 'var(--sk-color-surface-3)' : `var(--sk-color-service-${hue}-soft)`;
  const ink = hue === 'indigo' ? 'var(--sk-color-action)' : `var(--sk-color-service-${hue}-ink)`;
  return { '--sk-m2w-soft': soft, '--sk-m2w-ink': ink } as React.CSSProperties;
}

/** The drawing on a card: products and labs as on the phone boards; consults and vaccines by their service. */
export function itemArt(item: Pick<LiveCatalogItem, 'kind' | 'name' | 'category'>): Art {
  if (item.kind === 'lab') return labArt(item.name);
  if (item.kind === 'consultation') return { icon: 'stetho', hue: 'blue' };
  if (item.kind === 'vaccine') return { icon: 'syringe', hue: 'amber' };
  return productArt(item);
}

/** Rise-in order for a section (CSS; none when motion is reduced). */
export const rise = (index: number): React.CSSProperties => ({ '--sk-m2w-i': index } as React.CSSProperties);

/** A soft service tile with its icon (categories, row icons). */
export function SoftIcon({ icon, hue, size = 'md' }: { icon: SkIconName; hue: ServiceHue; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`sk-m2w-soft sk-m2w-soft--${size}`} style={hueStyle(hue)} aria-hidden="true">
      <Icon name={icon} size={size === 'lg' ? 40 : size === 'sm' ? 20 : 24} strokeWidth={size === 'lg' ? 1.8 : 2} />
    </span>
  );
}

/** A feature with no backend yet: drawn muted with "not available yet" or "coming soon", never a button. */
export function NotYetCard({ icon, title, note, testID }: { icon: SkIconName; title: string; note: string; testID?: string }) {
  return (
    <div className="sk-m2w-qcard sk-m2w-qcard--muted" role="group" aria-label={`${title}, ${note}`} data-testid={testID}>
      <Icon name={icon} size={22} color="var(--sk-color-text-2)" />
      <strong>{title}</strong>
      <small>{note}</small>
    </div>
  );
}

/** One catalogue listing: art, off badge, brand, name, pack, availability, price, and its one action. */
export function ProductCard({ item, inCart, onOpen, onAdd, index = 0 }: {
  item: LiveCatalogItem; inCart: boolean; onOpen: () => void; onAdd: () => void; index?: number;
}) {
  const t = useT();
  const art = itemArt(item);
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const blocked = cannotAdd(item);
  const availability = item.kind === 'product'
    ? (item.stock > 0 ? t('shopweb.card.available', { count: item.stock }) : t('shop.outOfStock'))
    : item.kind === 'vaccine' ? t('shopweb.card.eligibility') : t('shopweb.card.providerBooking');
  let action: string;
  if (item.kind === 'product') action = inCart ? t('shopweb.card.inCart') : t('shopweb.card.add');
  else if (item.kind === 'lab') action = t('shopweb.card.bookSlot');
  else action = inCart ? t('shopweb.card.inCart') : t('shopweb.card.bookSlot');
  return (
    <li className="sk-m2w-card sk-m2w-lift sk-m2w-rise" style={rise(index)} data-testid={`m2w-card-${item.id}`}>
      {/* The art opens the item for a pointer; keyboard and screen readers use the name button below (one stop, named by its text). */}
      <button type="button" className="sk-m2w-card__art" style={hueStyle(art.hue)} tabIndex={-1} aria-hidden="true" onClick={onOpen}>
        {off > 0 ? <span className="sk-m2w-off">{t('m2.med.off', { percent: off })}</span> : null}
        <Icon name={art.icon} size={40} strokeWidth={1.8} />
        <span className="sk-m2w-card__artnote">{t('shopweb.card.illustration')}</span>
      </button>
      <div className="sk-m2w-card__body">
        <span className="sk-m2w-eyebrow">{item.brand}</span>
        <button type="button" className="sk-m2w-card__name" onClick={onOpen}>{item.name}</button>
        <span className="sk-m2w-meta">{item.pack}</span>
        {item.requiresPrescription ? <span className="sk-m2w-tag sk-m2w-tag--rx">{t('shopweb.card.rxRequired')}</span> : null}
        <span className={item.kind === 'product' ? 'sk-m2w-meta' : 'sk-m2w-meta is-positive'}>{availability}</span>
        <div className="sk-m2w-card__foot">
          <span className="sk-m2w-price">
            <strong>{money(item.pricePaise)}</strong>
            {off > 0 ? <del>{money(item.mrpPaise)}</del> : null}
          </span>
          <button
            type="button"
            className={item.kind === 'product' ? 'sk-m2w-btn sk-m2w-btn--outline sk-m2w-btn--sm' : 'sk-m2w-btn sk-m2w-btn--positive sk-m2w-btn--sm'}
            disabled={blocked}
            // Starts with what it shows (label-in-name, WCAG 2.5.3), then which item.
            aria-label={`${action}, ${item.name}`}
            onClick={onAdd}
          >
            {action}
          </button>
        </div>
        <span className="sk-m2w-kind">{item.requiresPrescription ? t('m2.med.rxNeeded') : t(kindLabel(item.kind))}</span>
      </div>
    </li>
  );
}

/** The quantity stepper used in every cart (− count +), capped as the cart caps it. */
export function QtyStepper({ line, onSet, onAdd }: { line: CartLine; onSet: (quantity: number) => void; onAdd: () => void }) {
  const t = useT();
  return (
    <span className="sk-m2w-qty" role="group" aria-label={t('sw.product.quantity')}>
      <button type="button" aria-label={t('cart.decrease', { name: line.item.name })} onClick={() => onSet(line.quantity - 1)}><Icon name="minus" size={14} strokeWidth={2.6} /></button>
      <output>{line.quantity}</output>
      <button type="button" aria-label={t('cart.increase', { name: line.item.name })} disabled={line.quantity >= maxQuantity(line.item)} onClick={onAdd}><Icon name="plus" size={14} strokeWidth={2.6} /></button>
    </span>
  );
}

/** The cart's lines: art, name, pack, stepper (products), price and remove. */
export function CartLines({ lines, onSet, onAdd }: { lines: readonly CartLine[]; onSet: (id: string, quantity: number) => void; onAdd: (item: LiveCatalogItem) => void }) {
  const t = useT();
  return (
    <ul className="sk-m2w-lines">
      {lines.map((line) => {
        const art = itemArt(line.item);
        return (
          <li key={line.item.id}>
            <SoftIcon icon={art.icon} hue={art.hue} size="sm" />
            <span className="sk-m2w-lines__text">
              <strong>{line.item.name}</strong>
              <small>{line.item.pack}</small>
              {line.item.kind === 'product' ? <QtyStepper line={line} onSet={(q) => onSet(line.item.id, q)} onAdd={() => onAdd(line.item)} /> : null}
            </span>
            <span className="sk-m2w-lines__price">
              <strong>{money(line.item.pricePaise * line.quantity)}</strong>
              <button type="button" className="sk-m2w-iconbtn" aria-label={t('cart.remove', { name: line.item.name })} onClick={() => onSet(line.item.id, 0)}><Icon name="trash" size={16} /></button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export const cartUnits = (lines: readonly CartLine[]): number => lines.reduce((sum, line) => sum + line.quantity, 0);
export const cartPaise = (lines: readonly CartLine[]): number => lines.reduce((sum, line) => sum + line.item.pricePaise * line.quantity, 0);
