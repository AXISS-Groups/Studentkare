import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MapPin, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { useMarketplace } from '../../data/MarketplaceStore';
import { calculateCart } from '../../data/marketplaceCart';
import { formatRupees } from '../../data/healthExperience';
import { ProductArtwork } from './ProductArtwork';

export interface DemoOrder {
  reference: string;
  total: number;
  count: number;
  city: string;
  destination: string;
  slot: string;
}

export function CartPanel({ onContinueShopping, onOrder }: {
  onContinueShopping: () => void;
  onOrder: (order: DemoOrder) => void;
}) {
  const { cart, dispatch } = useMarketplace();
  const totals = calculateCart(cart);
  const [couponInput, setCouponInput] = useState<string>(cart.coupon);
  const [couponError, setCouponError] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [destination, setDestination] = useState('Campus reception');
  const [slot, setSlot] = useState('');
  const hasLabs = totals.lines.some(line => line.item.kind === 'lab');
  const hasProducts = totals.lines.some(line => line.item.kind === 'product');

  const placeDemoOrder = () => {
    if (!totals.count || (hasLabs && !slot)) return;
    const order: DemoOrder = {
      reference: `DEMO-${Date.now().toString(36).toUpperCase()}`,
      total: totals.total,
      count: totals.count,
      city: cart.city,
      destination: cart.deliveryMode === 'pickup' ? 'Campus health desk' : destination,
      slot: hasLabs ? slot : '',
    };
    dispatch({ type: 'clear' });
    onOrder(order);
  };

  if (!totals.count) return <div className="shop-empty-cart">
    <span><ShoppingBag size={39} strokeWidth={1.4} /></span>
    <h3>A little care belongs here.</h3>
    <p>Your demo cart is empty. Explore everyday essentials or select a lab package.</p>
    <button className="shop-button shop-primary" onClick={onContinueShopping}>Continue exploring <ArrowRight size={16} /></button>
  </div>;

  return <div className="shop-cart-grid">
    <div>
      <div className="shop-cart-intro"><span className="shop-demo-label">DEMO CART</span><p>{totals.count} {totals.count === 1 ? 'item' : 'items'} · Prices and services are illustrative.</p></div>
      {!checkout ? <>
        <div className="shop-cart-items">{totals.lines.map(line => <article key={line.id} className="shop-cart-item">
          <div className="shop-cart-art"><ProductArtwork item={line.item} /></div>
          <div className="shop-cart-item-info"><strong>{line.item.name}</strong><span>{line.item.pack}</span><b>{formatRupees(line.item.price * line.quantity)}</b>
            {line.item.kind === 'product' ? <div className="shop-quantity"><button onClick={() => dispatch({ type: 'quantity', id: line.id, quantity: line.quantity - 1 })} aria-label={`Decrease ${line.item.name}`}><Minus size={13} /></button><output aria-label={`Quantity of ${line.item.name}`}>{line.quantity}</output><button onClick={() => dispatch({ type: 'add', id: line.id })} disabled={line.quantity >= 10} aria-label={`Increase ${line.item.name}`}><Plus size={13} /></button></div> : <span className="shop-small">1 sample collection</span>}
          </div>
          <button className="shop-icon-button shop-remove-item" onClick={() => dispatch({ type: 'remove', id: line.id })} aria-label={`Remove ${line.item.name}`}><Trash2 size={16} /></button>
        </article>)}</div>
        {hasProducts && <fieldset className="shop-delivery-options"><legend>Delivery preference</legend><label><input type="radio" name="delivery-mode" checked={cart.deliveryMode === 'delivery'} onChange={() => dispatch({ type: 'delivery', mode: 'delivery' })} />Demo delivery</label><label><input type="radio" name="delivery-mode" checked={cart.deliveryMode === 'pickup'} onChange={() => dispatch({ type: 'delivery', mode: 'pickup' })} />Campus pickup · free</label><p className="shop-small">Demo delivery is ₹40 below ₹399 in physical products; free otherwise. Lab collections have no delivery fee.</p></fieldset>}
      </> : <div className="shop-checkout">
        <button className="shop-text-button" onClick={() => setCheckout(false)}><ArrowLeft size={15} />Back to cart</button>
        <h3>Try the checkout experience.</h3><p>Use a sample location to complete the demo. No personal details or payment are needed.</p>
        <div className="shop-demo-address"><MapPin size={20} /><div><strong>{cart.city}</strong><span>Sample address · University Road, Campus Block A</span></div></div>
        {hasProducts && cart.deliveryMode === 'delivery' && <label className="shop-field">Demo delivery location<select aria-label="Demo delivery location" value={destination} onChange={event => setDestination(event.target.value)}><option>Campus reception</option><option>Demo home address</option></select></label>}
        {hasProducts && cart.deliveryMode === 'pickup' && <div className="shop-inline-note"><Check size={17} />Sample pickup point: Campus health desk</div>}
        {hasLabs && <label className="shop-field">Sample collection slot<select aria-label="Sample collection slot" value={slot} onChange={event => setSlot(event.target.value)} required><option value="">Choose a demo slot</option><option>Tomorrow · 8–10 AM</option><option>Tomorrow · 10 AM–12 PM</option><option>Day after tomorrow · 8–10 AM</option></select></label>}
        {hasLabs && <p className="shop-small">These are illustrative slots, not actual lab availability. Confirm preparation with the lab for any real booking.</p>}
      </div>}
    </div>
    <aside className="shop-order-summary">
      <h3>Order summary</h3>
      <div className="shop-savings-note"><Tag size={16} />You save {formatRupees(totals.savings)} in this demo</div>
      <dl><div><dt>MRP total</dt><dd>{formatRupees(totals.mrp)}</dd></div><div><dt>Product savings</dt><dd className="shop-green">−{formatRupees(totals.mrp - totals.subtotal)}</dd></div><div><dt>Subtotal</dt><dd>{formatRupees(totals.subtotal)}</dd></div><div><dt>Coupon savings</dt><dd className="shop-green">−{formatRupees(totals.discount)}</dd></div><div><dt>Delivery</dt><dd>{totals.delivery ? formatRupees(totals.delivery) : 'FREE'}</dd></div></dl>
      <form className="shop-coupon" onSubmit={event => { event.preventDefault(); if (couponInput.trim().toUpperCase() !== 'CARE10') { setCouponError('Try CARE10 for this demo offer.'); return; } dispatch({ type: 'coupon', code: couponInput }); setCouponError(''); }}>
        <label htmlFor="shop-coupon-code">Have a coupon?</label><div><input id="shop-coupon-code" placeholder="Try CARE10" value={couponInput} onChange={event => { setCouponInput(event.target.value); setCouponError(''); }} aria-invalid={Boolean(couponError)} aria-describedby={couponError ? 'shop-coupon-error' : undefined} /><button type="submit">Apply</button></div>
        {couponError && <p id="shop-coupon-error" className="shop-form-error" role="alert">{couponError}</p>}
        {cart.coupon && <p className="shop-coupon-success">CARE10 applied · 10% off, up to ₹150 <button type="button" onClick={() => { dispatch({ type: 'coupon', code: '' }); setCouponInput(''); }}>Remove</button></p>}
      </form>
      <div className="shop-total"><span>Demo total</span><strong>{formatRupees(totals.total)}</strong></div>
      <button className="shop-button shop-primary" disabled={checkout && hasLabs && !slot} onClick={() => checkout ? placeDemoOrder() : setCheckout(true)}>{checkout ? 'Create demo order' : 'Continue to demo checkout'}<ArrowRight size={16} /></button>
      <p className="shop-small">No payment is collected. No products or lab services will be fulfilled. Cart contents last until this page is refreshed.</p>
    </aside>
  </div>;
}
