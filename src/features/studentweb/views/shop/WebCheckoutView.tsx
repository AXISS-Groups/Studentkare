import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useNavigate } from '@/core/navigation';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { money } from '@/data/types/workflowTypes';
import type { LiveOrder } from '@/data/types/workflowTypes';
import { PhoneShopViewModel } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import type { CartPort } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import { cartMrp, cartTotal } from '@/features/shopPhone/views/shopParts';
import { orderRef } from '@/features/phoneKit/orderRef';
import { plural } from '@/features/phoneKit/plural';
import { PayStepView } from '@/features/payments/views/PayStepView';
import { navigate } from '@/lib/utils/workflowRouting';
import { Rise } from '@/design-system';
import { SoftIcon } from '@/design-system/m2';
import { EmptyPanel } from '../parts';
import { CartLines } from './ShopCartRail';
import { cartUnits } from './shopShared';


const PAID = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);

/**
 * Checkout above phone width (canvas 3b WebCheckout, Tier 2) in the Mobile 2.0
 * look: three step cards beside a sticky cart summary, then the shared Pay
 * step, then the order confirmation. The order rules are the phone shop's
 * view model (PhoneShopViewModel), so web and phone place orders the same
 * way: the city and a 6-digit pincode (and the full address for delivery),
 * a future requested time only when a consult or vaccine is in the cart, then
 * stock and serviceability are checked with the server and the order is not
 * placed if that check fails or cannot run (fail closed), and it is created
 * once per cart with an idempotency key.
 *
 * Made true: no room number or campus address is stored, so the student types
 * where it goes; the provider confirms timing; no student discount or
 * free-delivery threshold exists, so the summary is the item total. Paying
 * confers no access to anyone's records. Payment is the gateway's
 * (PayStepView): when no gateway is connected it says so and nothing is
 * charged.
 */
export const WebCheckoutView = observer(function WebCheckoutView() {
  const t = useT();
  const live = useLiveCart();
  const routerNavigate = useNavigate();
  const cart: CartPort = useMemo(() => ({ lines: live.lines, add: live.add, setQuantity: live.setQuantity, clear: live.clear }), [live]);
  const [vm] = useState(() => new PhoneShopViewModel({ name: 'checkout' }));
  const [saved, setSaved] = useState(0);
  // start() re-arms the view model after a remount (StrictMode runs the cleanup once in development).
  useEffect(() => { vm.start(); return () => vm.dispose(); }, [vm]);
  const screen = vm.screen.name;
  const payment = vm.payment;
  const paidNow = screen === 'pay' && payment?.phase === 'paid';
  useEffect(() => {
    if (!paidNow) return;
    // The saving is worked out before the view model empties the cart.
    setSaved(cartMrp(cart) - cartTotal(cart));
    vm.paid(cart);
  }, [paidNow, vm, cart]);

  const head = (
    <Rise index={0}>
      <div className="sk-m2w-checkout__head">
        <div>
          <span className="sk-m2w-eyebrow">{t('m2.med.eyebrow')}</span>
          <h1 className="sk-m2w-h1">{t('sw.checkout.title')}</h1>
        </div>
        <span className="sk-m2w-secure"><Icon name="lock-3" size={16} color="var(--sk-color-positive)" />{t('sw.checkout.secure')}</span>
      </div>
    </Rise>
  );
  const track = (order: LiveOrder) => routerNavigate(`/orders?order=${encodeURIComponent(order.id)}`);

  if (screen === 'success' && vm.order) {
    return <div className="sk-sw-page sk-m2w">{head}<OrderPlaced order={vm.order} savedPaise={saved} onTrack={track} onShop={() => navigate('shop')} /></div>;
  }

  if (screen === 'pay' && payment) {
    return (
      <div className="sk-sw-page sk-m2w">
        {head}
        <Steps current={3} />
        <section className="sk-m2w-panel sk-m2w-step sk-m2w-paystep" aria-labelledby="sk-m2w-pay-title">
          <h2 id="sk-m2w-pay-title" className="sk-m2w-h3">{t('sw.checkout.step3')}</h2>
          {/* Back keeps the cart and the idempotency key: resubmitting unchanged returns the same order. */}
          {/* Leaving from here (an unpaid request, or no gateway connected) spends the cart, as before: the order exists. */}
          <PayStepView viewModel={payment} onBack={() => vm.back()} onTrack={() => { const order = vm.order; cart.clear(); if (order) track(order); }} onOrders={() => { cart.clear(); navigate('orders'); }} />
        </section>
      </div>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className="sk-sw-page sk-m2w">
        {head}
        <EmptyPanel title={t('cart.emptyTitle')} body={t('shopweb.checkout.emptyBody')} action={{ label: t('shopweb.checkout.keepExploring'), onPress: () => navigate('shop') }} secondary={{ label: t('sw.checkout.orders'), onPress: () => navigate('orders') }} />
      </div>
    );
  }

  const d = vm.delivery;
  const needsSlot = vm.needsSlot(cart);
  const units = cartUnits(cart.lines);
  const total = cartTotal(cart);
  const current = !vm.addressReady ? 1 : needsSlot && !vm.slotReady(cart) ? 2 : 3;
  const error = vm.checkoutError ? (vm.checkoutErrorText ? `${t(vm.checkoutError)} ${vm.checkoutErrorText}` : t(vm.checkoutError)) : '';

  return (
    <div className="sk-sw-page sk-m2w">
      {head}
      <Steps current={current} />
      <div className="sk-m2w-cq">
      <form className="sk-m2w-checkout" onSubmit={(event) => { event.preventDefault(); void vm.placeOrder(cart); }}>
        <div className="sk-m2w-checkout__main">
          <Rise index={1}>
            <section className="sk-m2w-panel sk-m2w-step" aria-labelledby="sk-m2w-step1">
              <h2 id="sk-m2w-step1" className="sk-m2w-h3">{t('sw.checkout.step1')}</h2>
              <div className="sk-m2w-options" role="radiogroup" aria-label={t('shopweb.checkout.arrangement')}>
                {(['pickup', 'delivery'] as const).map((mode) => (
                  <label key={mode} className={`sk-m2w-option${d.mode === mode ? ' is-on' : ''}`}>
                    <input type="radio" name="sk-m2w-mode" value={mode} checked={d.mode === mode} onChange={() => vm.setDelivery({ mode })} />
                    <span className="sk-m2w-option__icon" aria-hidden="true"><Icon name={mode === 'pickup' ? 'house-outline' : 'truck-2'} size={20} /></span>
                    <span className="sk-m2w-option__text"><strong>{mode === 'pickup' ? t('cart.pickup') : t('cart.delivery')}</strong><small>{mode === 'pickup' ? t('sw.checkout.pickupMeta') : t('sw.checkout.deliveryMeta')}</small></span>
                  </label>
                ))}
              </div>
              <div className="sk-m2w-fields">
                {d.mode === 'delivery' ? (
                  <label className="sk-m2w-field sk-m2w-field--wide">
                    <span>{t('cart.address')}</span>
                    <textarea required minLength={10} maxLength={300} value={d.address} onChange={(event) => vm.setDelivery({ address: event.target.value })} />
                  </label>
                ) : null}
                <label className="sk-m2w-field">
                  <span>{t('cart.city')}</span>
                  <input required minLength={2} maxLength={100} value={d.city} onChange={(event) => vm.setDelivery({ city: event.target.value })} />
                </label>
                <label className="sk-m2w-field">
                  <span>{t('cart.pincode')}</span>
                  <input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={d.pincode} onChange={(event) => vm.setDelivery({ pincode: event.target.value })} />
                </label>
              </div>
              <p className="sk-m2w-meta">{t('phone.checkout.whereNote')}</p>
            </section>
          </Rise>

          <Rise index={2}>
            <section className="sk-m2w-panel sk-m2w-step" aria-labelledby="sk-m2w-step2">
              <h2 id="sk-m2w-step2" className="sk-m2w-h3">{t('sw.checkout.step2')}</h2>
              {needsSlot ? (
                <>
                  <p className="sk-m2w-meta">{t('phone.checkout.whenMeta')}</p>
                  <div className="sk-m2w-fields">
                    <label className="sk-m2w-field">
                      <span>{t('m2w.checkout.date')}</span>
                      <input required type="date" value={vm.slotDate} onChange={(event) => vm.setSlot(event.target.value, vm.slotTime)} />
                    </label>
                    <label className="sk-m2w-field">
                      <span>{t('m2w.checkout.time')}</span>
                      <input required type="time" value={vm.slotTime} onChange={(event) => vm.setSlot(vm.slotDate, event.target.value)} />
                    </label>
                  </div>
                  <p className="sk-m2w-meta">{t('phone.checkout.whenNote')}</p>
                </>
              ) : (
                <p className="sk-m2w-meta">{t('sw.checkout.slotProvider')}</p>
              )}
            </section>
          </Rise>

          <Rise index={3}>
            <section className="sk-m2w-panel sk-m2w-step" aria-labelledby="sk-m2w-step3">
              <h2 id="sk-m2w-step3" className="sk-m2w-h3">{t('sw.checkout.step3')}</h2>
              <p className="sk-m2w-meta">{t('sw.checkout.payLater')}</p>
            </section>
          </Rise>
        </div>

        <aside className="sk-m2w-checkout__side">
          <section className="sk-m2w-panel sk-m2w-summary" aria-labelledby="sk-m2w-cart-title">
            <span id="sk-m2w-cart-title" className="sk-m2w-eyebrow">{units === 1 ? t('sw.checkout.cartOne') : t('sw.checkout.cart', { count: units })}</span>
            <CartLines lines={cart.lines} onSet={cart.setQuantity} onAdd={cart.add} />
            <dl className="sk-m2w-totals">
              <div><dt>{t('cart.itemsTotal')}</dt><dd>{money(total)}</dd></div>
              <div className="is-total"><dt>{t('sw.checkout.toPay')}</dt><dd>{money(total)}</dd></div>
            </dl>
            {error ? <p className="sk-m2w-error" role="alert">{error}</p> : null}
            <p className="sk-m2w-fine">{t('pay.formNote')}</p>
            <button type="submit" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--block" aria-busy={vm.placing} disabled={vm.placing}>
              {vm.placing ? t('sw.checkout.placing') : t('sw.checkout.continue', { total: money(total) })}
            </button>
          </section>
          <p className="sk-m2w-fine sk-m2w-fine--icon"><Icon name="shield-check" size={14} />{t('sw.checkout.ruleL')}</p>
        </aside>
      </form>
      </div>
    </div>
  );
});

/** Where the checkout is: 1 where it goes, 2 when, 3 pay. */
function Steps({ current }: { current: number }) {
  const t = useT();
  const labels: MessageKey[] = ['sw.checkout.step1', 'sw.checkout.step2', 'sw.checkout.step3'];
  return (
    <ol className="sk-m2w-steps" aria-label={t('m2w.checkout.steps')}>
      {labels.map((label, i) => (
        <li key={label} className={i + 1 < current ? 'is-done' : i + 1 === current ? 'is-current' : undefined} aria-current={i + 1 === current ? 'step' : undefined}>
          <span className="sk-m2w-steps__dot" aria-hidden="true">{i + 1 < current ? <Icon name="check" size={14} strokeWidth={3} /> : null}</span>
          <span>{t(label)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Order placed (canvas OrderSuccess, as on the phone): the order as the server has it, and the way to track it. */
function OrderPlaced({ order, savedPaise, onTrack, onShop }: { order: LiveOrder; savedPaise: number; onTrack: (order: LiveOrder) => void; onShop: () => void }) {
  const t = useT();
  const paid = PAID.has(order.paymentStatus);
  const d = order.delivery;
  const rows: { key: string; icon: SkIconName; title: string; meta: string }[] = [
    { key: 'delivery', icon: 'truck-2', title: d.mode === 'pickup' ? t('phone.success.pickup') : t('phone.success.delivery'), meta: [d.mode === 'delivery' ? d.address : '', d.city, d.pincode].filter(Boolean).join(' · ') },
    {
      key: 'paid', icon: 'credit-card-2',
      title: paid ? t('phone.success.paid', { amount: money(order.totalPaise) }) : t('phone.success.unpaid', { amount: money(order.totalPaise) }),
      meta: savedPaise > 0 ? t('phone.success.saved', { amount: money(savedPaise) }) : plural(t, order.lines.length, 'phone.success.itemsOne', 'phone.success.items'),
    },
    { key: 'points', icon: 'sparkle', title: t('phone.success.points'), meta: t('phone.shop.pointsNote') },
  ];
  return (
    <Rise index={0}>
      <section className="sk-m2w-panel sk-m2w-placed" aria-labelledby="sk-m2w-placed-title" data-testid="m2w-order-placed">
        <span className="sk-m2w-placed__tick" aria-hidden="true"><Icon name="check" size={28} strokeWidth={3} /></span>
        <div role="status" className="sk-m2w-placed__head">
          <h2 id="sk-m2w-placed-title" className="sk-m2w-h1">{t('phone.success.title')}</h2>
          <p className="sk-m2w-meta">{paid ? t('phone.success.body') : t('phone.success.bodyUnpaid')}</p>
          <span className="sk-m2w-ref">{t('phone.success.order')} <strong>{orderRef(order.id)}</strong></span>
        </div>
        <ul className="sk-m2w-placed__rows">
          {rows.map((row) => (
            <li key={row.key}>
              <SoftIcon icon={row.icon} hue="indigo" tile={40} iconSize={18} />
              <span><strong>{row.title}</strong>{row.meta ? <small>{row.meta}</small> : null}</span>
            </li>
          ))}
        </ul>
        <div className="sk-m2w-placed__ctas">
          <button type="button" className="sk-m2w-btn sk-m2w-btn--primary" onClick={() => onTrack(order)}>{t('phone.success.track')}<Icon name="arrow-right" size={16} /></button>
          <button type="button" className="sk-m2w-btn sk-m2w-btn--outline" onClick={onShop}>{t('phone.success.backToShop')}</button>
          <button type="button" className="sk-m2w-btn sk-m2w-btn--ghost" onClick={() => navigate('orders')}>{t('sw.checkout.orders')}</button>
        </div>
      </section>
    </Rise>
  );
}
