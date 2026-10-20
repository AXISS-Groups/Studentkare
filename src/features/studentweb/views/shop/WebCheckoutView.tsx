import React, { useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { apiRequest } from '@/data/services/http';
import { useMutation } from '@/components/interface/WorkflowUI';
import { money } from '@/data/types/workflowTypes';
import type { Delivery, LiveOrder } from '@/data/types/workflowTypes';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import { PayStepView } from '@/features/payments/views/PayStepView';
import { navigate } from '@/lib/utils/workflowRouting';
import { maxQuantity } from '../../data/studentWebData';
import { checkoutArt } from '../catalogArt';
import { EmptyPanel, PageHead } from '../parts';

interface Validation { serviceable: boolean; serviceabilityNote?: string; items: { id: string; available: boolean; reason: string }[] }

/**
 * Checkout (canvas 3b, WebCheckout, Tier 2) in the student web shell. The
 * order flow is the shop's (LiveCheckout): validate the cart against live
 * stock and serviceability (fail closed), create the order once per cart with
 * an idempotency key, then the Pay step (PayStepView) takes over.
 *
 * Made true: no room number or campus address is stored, so the student types
 * where it goes; slots are the provider's to confirm (a time is asked only for
 * bookings); no student discount or free-delivery threshold exists, so the
 * summary is the item total. Paying confers no access to anyone's records.
 */
export function WebCheckoutView() {
  const t = useT();
  const cart = useLiveCart();
  const [delivery, setDelivery] = useState<Delivery>({ mode: 'pickup', address: '', city: '', pincode: '' });
  const [slot, setSlot] = useState('');
  const [notice, setNotice] = useState('');
  const key = useRef({ fingerprint: '', id: '' });
  const mutation = useMutation();
  const [placed, setPlaced] = useState<LiveOrder | null>(null);
  const payment = useMemo(() => (placed ? new PayStepViewModel(placed.id, placed.totalPaise) : null), [placed]);
  const needsSlot = cart.lines.some((line) => line.item.kind !== 'product');
  const units = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.lines.reduce((sum, line) => sum + line.item.pricePaise * line.quantity, 0);

  const submit = async () => {
    setNotice('');
    try {
      const validation = await apiRequest<Validation>('/cart/validate', { method: 'POST', body: JSON.stringify({ items: cart.lines.map((line) => ({ id: line.item.id, quantity: line.quantity })), pincode: delivery.pincode }) });
      const blocked = validation.items.filter((item) => !item.available);
      if (blocked.length || !validation.serviceable) {
        setNotice(blocked.length ? t('shopweb.checkout.unavailable', { reasons: blocked.map((item) => item.reason).join(', ') }) : (validation.serviceabilityNote || t('shopweb.checkout.notServiceable')));
        return;
      }
    } catch (error: unknown) {
      // Fail closed: no validation, no order.
      setNotice(error instanceof Error && error.message ? error.message : t('shopweb.checkout.validateFailed'));
      return;
    }
    const payload = { items: cart.lines.map((line) => ({ id: line.item.id, quantity: line.quantity })), delivery, requestedSlot: needsSlot ? new Date(slot).toISOString() : '' };
    const fingerprint = JSON.stringify(payload);
    if (key.current.fingerprint !== fingerprint) key.current = { fingerprint, id: crypto.randomUUID() };
    mutation.run(() => apiRequest<LiveOrder>('/orders', { method: 'POST', headers: { 'Idempotency-Key': key.current.id }, body: fingerprint }), setPlaced);
  };

  const head = (
    <PageHead
      title={t('sw.checkout.title')}
      actions={<span className="sk-sw-secure"><Icon name="lock-3" size={16} color="var(--sk-color-positive)" />{t('sw.checkout.secure')}</span>}
    />
  );

  if (placed && payment) {
    const finish = () => { cart.clear(); navigate('orders'); };
    // Back keeps the cart and the idempotency key: resubmitting unchanged returns the same order.
    return (
      <div className="sk-sw-page">
        {head}
        <section className="sk-sw-card sk-sw-step" aria-labelledby="sk-sw-pay-title">
          <h2 id="sk-sw-pay-title" className="sk-sw-step__title">{t('sw.checkout.step3')}</h2>
          <PayStepView viewModel={payment} onBack={() => setPlaced(null)} onTrack={finish} onOrders={finish} />
        </section>
      </div>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className="sk-sw-page">
        {head}
        <EmptyPanel title={t('cart.emptyTitle')} body={t('shopweb.checkout.emptyBody')} action={{ label: t('shopweb.checkout.keepExploring'), onPress: () => navigate('shop') }} secondary={{ label: t('sw.checkout.orders'), onPress: () => navigate('orders') }} />
      </div>
    );
  }

  const set = (patch: Partial<Delivery>) => setDelivery((previous) => ({ ...previous, ...patch }));

  return (
    <div className="sk-sw-page">
      {head}
      <form className="sk-sw-checkout" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="sk-sw-checkout__main">
          <section className="sk-sw-card sk-sw-step" aria-labelledby="sk-sw-step1">
            <h2 id="sk-sw-step1" className="sk-sw-step__title">{t('sw.checkout.step1')}</h2>
            <div className="sk-sw-options" role="radiogroup" aria-label={t('shopweb.checkout.arrangement')}>
              {(['pickup', 'delivery'] as const).map((mode) => (
                <label key={mode} className={`sk-sw-option${delivery.mode === mode ? ' is-on' : ''}`}>
                  <input type="radio" name="sk-sw-mode" value={mode} checked={delivery.mode === mode} onChange={() => set({ mode })} />
                  <span className="sk-sw-option__icon" aria-hidden="true"><Icon name="house-outline" size={18} /></span>
                  <span className="sk-sw-option__text"><strong>{mode === 'pickup' ? t('cart.pickup') : t('cart.delivery')}</strong><small>{mode === 'pickup' ? t('sw.checkout.pickupMeta') : t('sw.checkout.deliveryMeta')}</small></span>
                </label>
              ))}
            </div>
            <div className="sk-sw-fields">
              {delivery.mode === 'delivery' ? (
                <label className="sk-sw-field sk-sw-field--wide">
                  <span>{t('cart.address')}</span>
                  <textarea required minLength={10} maxLength={300} value={delivery.address} onChange={(event) => set({ address: event.target.value })} />
                </label>
              ) : null}
              <label className="sk-sw-field">
                <span>{t('cart.city')}</span>
                <input required minLength={2} maxLength={100} value={delivery.city} onChange={(event) => set({ city: event.target.value })} />
              </label>
              <label className="sk-sw-field">
                <span>{t('cart.pincode')}</span>
                <input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={delivery.pincode} onChange={(event) => set({ pincode: event.target.value })} />
              </label>
            </div>
          </section>

          <section className="sk-sw-card sk-sw-step" aria-labelledby="sk-sw-step2">
            <h2 id="sk-sw-step2" className="sk-sw-step__title">{t('sw.checkout.step2')}</h2>
            {needsSlot ? (
              <label className="sk-sw-field">
                <span>{t('cart.when')}</span>
                <input required type="datetime-local" value={slot} onChange={(event) => setSlot(event.target.value)} />
              </label>
            ) : (
              <p className="sk-sw-muted">{t('sw.checkout.slotProvider')}</p>
            )}
          </section>

          <section className="sk-sw-card sk-sw-step" aria-labelledby="sk-sw-step3">
            <h2 id="sk-sw-step3" className="sk-sw-step__title">{t('sw.checkout.step3')}</h2>
            <p className="sk-sw-muted">{t('sw.checkout.payLater')}</p>
          </section>
        </div>

        <aside className="sk-sw-checkout__side">
          <section className="sk-sw-card sk-sw-summary" aria-labelledby="sk-sw-cart-title">
            <span id="sk-sw-cart-title" className="sk-sw-eyebrow">{t('sw.checkout.cart', { count: units })}</span>
            <ul className="sk-sw-summary__lines">
              {cart.lines.map((line) => (
                <li key={line.item.id}>
                  <span className="sk-sw-summary__thumb" aria-hidden="true"><Icon name={checkoutArt(line.item)} size={18} /></span>
                  <span className="sk-sw-summary__text">
                    <strong>{line.item.name}</strong>
                    <small>{line.item.pack}</small>
                    {line.item.kind === 'product' ? (
                      <span className="sk-sw-qty sk-sw-qty--sm" role="group" aria-label={t('sw.product.quantity')}>
                        <button type="button" aria-label={t('cart.decrease', { name: line.item.name })} onClick={() => cart.setQuantity(line.item.id, line.quantity - 1)}>−</button>
                        <output>{line.quantity}</output>
                        <button type="button" aria-label={t('cart.increase', { name: line.item.name })} disabled={line.quantity >= maxQuantity(line.item)} onClick={() => cart.add(line.item)}>+</button>
                      </span>
                    ) : null}
                  </span>
                  <span className="sk-sw-summary__price">
                    <strong>{money(line.item.pricePaise * line.quantity)}</strong>
                    <button type="button" className="sk-sw-icon-btn" aria-label={t('cart.remove', { name: line.item.name })} onClick={() => cart.setQuantity(line.item.id, 0)}><Icon name="trash" size={16} /></button>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="sk-sw-summary__totals">
              <div><dt>{t('cart.itemsTotal')}</dt><dd>{money(total)}</dd></div>
              <div className="is-total"><dt>{t('sw.checkout.toPay')}</dt><dd>{money(total)}</dd></div>
            </dl>
            {mutation.error ? <p className="sk-sw-error" role="alert">{mutation.error}</p> : null}
            {notice ? <p className="sk-sw-error" role="alert">{notice}</p> : null}
            <p className="sk-sw-fine">{t('pay.formNote')}</p>
            <button type="submit" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--block" aria-busy={mutation.busy} disabled={mutation.busy}>
              {mutation.busy ? t('sw.checkout.placing') : t('sw.checkout.continue', { total: money(total) })}
            </button>
          </section>
          <p className="sk-sw-fine">{t('sw.checkout.ruleL')}</p>
        </aside>
      </form>
    </div>
  );
}
