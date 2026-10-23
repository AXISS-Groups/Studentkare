import React from 'react';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { SoftIcon } from '@/design-system/m2';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import type { CartLine } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import { navigate } from '@/lib/utils/workflowRouting';
import { maxQuantity } from '../../data/studentWebData';
import { cartPaise, cartUnits, itemArt } from './shopShared';

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

/** The cart's lines: the listing's soft tile (the shared Mobile 2.0 one), name, pack, stepper (products), price and remove. */
export function CartLines({ lines, onSet, onAdd }: { lines: readonly CartLine[]; onSet: (id: string, quantity: number) => void; onAdd: (item: LiveCatalogItem) => void }) {
  const t = useT();
  return (
    <ul className="sk-m2w-lines">
      {lines.map((line) => {
        const art = itemArt(line.item);
        return (
          <li key={line.item.id}>
            <SoftIcon icon={art.icon} hue={art.hue} tile={40} iconSize={20} />
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

/** Where the cart summary sits, so "View cart" can bring it into view. */
export const CART_RAIL_ID = 'sk-m2w-cart';

/** Brings the cart summary into view and moves focus to it (the signed-out "View cart"). */
export function showCartRail(): void {
  const node = typeof document === 'undefined' ? null : document.getElementById(CART_RAIL_ID);
  if (!node) return;
  node.scrollIntoView({ block: 'nearest' });
  node.focus({ preventScroll: true });
}

/**
 * The cart beside the shop (sticky on desktop): the same LiveCart the checkout
 * uses, with steppers, remove and the items total. Signed in, it opens the
 * checkout; signed out, it says checking out needs an account and opens sign-in
 * (the old marketplace's cart dialog did the same).
 */
export function CartRail({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const cart = useLiveCart();
  const units = cartUnits(cart.lines);
  const total = cartPaise(cart.lines);
  return (
    <section id={CART_RAIL_ID} tabIndex={-1} className="sk-m2w-panel sk-m2w-cart" aria-labelledby="sk-m2w-cart-title" data-testid="m2w-cart">
      <div className="sk-m2w-cart__head">
        <h2 id="sk-m2w-cart-title" className="sk-m2w-h3">{t('cart.title')}</h2>
        {units ? <span className="sk-m2w-count">{units}</span> : null}
      </div>
      {cart.lines.length ? (
        <>
          <CartLines lines={cart.lines} onSet={cart.setQuantity} onAdd={cart.add} />
          <dl className="sk-m2w-totals">
            <div className="is-total"><dt>{t('cart.itemsTotal')}</dt><dd>{money(total)}</dd></div>
          </dl>
        </>
      ) : (
        <p className="sk-m2w-meta">{t('m2w.cart.emptyBody')}</p>
      )}
      {signedIn ? (
        <button type="button" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--block" disabled={!cart.lines.length} onClick={() => navigate('checkout')}>
          {t('m2w.cart.checkout')}<Icon name="arrow-right" size={16} />
        </button>
      ) : (
        <>
          <p className="sk-m2w-meta">{t('shopweb.checkout.signInNote')}</p>
          <button type="button" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--block" onClick={() => navigate('login', 'checkout')}>
            {t('shopweb.checkout.signIn')}<Icon name="arrow-right" size={16} />
          </button>
        </>
      )}
    </section>
  );
}

/** Under 900 px the rail sits below the grid, so a bar at the bottom keeps the cart one tap away. */
export function CartBar({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const cart = useLiveCart();
  const units = cartUnits(cart.lines);
  if (!units) return null;
  return (
    <div className="sk-m2w-cartbar" data-testid="m2w-cartbar">
      <span><Icon name="cart" size={18} />{t('m2w.cart.bar', { count: units, total: money(cartPaise(cart.lines)) })}</span>
      <button type="button" className="sk-m2w-btn sk-m2w-btn--light sk-m2w-btn--sm" onClick={() => (signedIn ? navigate('checkout') : showCartRail())}>
        {signedIn ? t('m2w.cart.checkout') : t('sw.viewCart')}
      </button>
    </div>
  );
}
