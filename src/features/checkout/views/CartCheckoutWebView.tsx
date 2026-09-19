import React from 'react';
import { observer } from 'mobx-react-lite';
import { ShoppingBag, Plus, Minus, Trash2, Tag, Truck, Store, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import type { CartCheckoutViewModel } from '../viewmodel/CartCheckoutViewModel';
import './checkout.css';

interface CartCheckoutWebViewProps {
  viewModel: CartCheckoutViewModel;
}

const formatMoney = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

/**
 * Web View Component for Shopping Cart & Order Checkout Pipeline.
 *
 * Binds reactively to `CartCheckoutViewModel` via MobX `observer`.
 * View layer contains zero inline state mutations.
 */
export const CartCheckoutWebView: React.FC<CartCheckoutWebViewProps> = observer(({ viewModel }) => {
  if (viewModel.completedOrder) {
    return (
      <div className="checkout-success-card">
        <div className="checkout-success-icon">
          <CheckCircle2 size={46} color="#16a34a" />
        </div>
        <h2>Order Request Submitted!</h2>
        <span className="checkout-order-id">Order ID: {viewModel.completedOrder.orderId}</span>

        <div className="checkout-summary-box">
          <div>
            <strong>Total Amount Paid</strong>
            <span className="checkout-total-val">{formatMoney(viewModel.completedOrder.totalPaise)}</span>
          </div>
          <div>
            <strong>Fulfillment Mode</strong>
            <span>{viewModel.completedOrder.deliveryMode === 'delivery' ? '🚀 Campus Delivery' : '🏥 Self Pickup'}</span>
          </div>
          {viewModel.completedOrder.address && (
            <div>
              <strong>Delivery Location</strong>
              <span>{viewModel.completedOrder.address}</span>
            </div>
          )}
          <div>
            <strong>Estimated Fulfillment</strong>
            <span>{viewModel.completedOrder.estimatedFulfillment}</span>
          </div>
        </div>

        <button type="button" className="checkout-btn checkout-btn-primary" onClick={() => viewModel.reset()}>
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <span className="checkout-eyebrow">CAMPUS HEALTHCARE MARKETPLACE</span>
        <h2>Your Shopping Cart ({viewModel.itemCount} items)</h2>
      </div>

      {viewModel.error && (
        <div className="checkout-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{viewModel.error}</span>
        </div>
      )}

      {viewModel.cartItems.length === 0 ? (
        <div className="checkout-empty-state">
          <ShoppingBag size={42} color="#94a3b8" />
          <h3>Your cart is empty</h3>
          <p>Explore wellness products, health checkup lab tests, and doctor teleconsultations.</p>
        </div>
      ) : (
        <div className="checkout-grid">
          {/* Cart Items List */}
          <div className="checkout-items-section">
            {viewModel.cartItems.map(item => (
              <div key={item.id} className="checkout-item-card">
                <div className="checkout-item-info">
                  <span className={`checkout-kind-tag kind-${item.kind}`}>{item.kind.toUpperCase()}</span>
                  <strong>{item.name}</strong>
                  <small>{item.brand}</small>
                  <div className="checkout-item-price">
                    <strong>{formatMoney(item.pricePaise * item.quantity)}</strong>
                    {item.mrpPaise > item.pricePaise && (
                      <del>{formatMoney(item.mrpPaise * item.quantity)}</del>
                    )}
                  </div>
                </div>

                <div className="checkout-item-actions">
                  <div className="checkout-quantity-stepper">
                    <button
                      type="button"
                      onClick={() => viewModel.updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.stock}
                      onClick={() => viewModel.updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="checkout-remove-btn"
                    onClick={() => viewModel.removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Coupon Code Strip */}
            <div className="checkout-coupon-card">
              <label><Tag size={16} /> Have a Promo Code?</label>
              <div className="checkout-coupon-row">
                <input
                  type="text"
                  placeholder="Try CARE10 or STUDENT50"
                  value={viewModel.couponCode}
                  onChange={e => viewModel.setCouponCode(e.target.value)}
                />
                <button type="button" onClick={() => viewModel.applyCoupon()}>Apply</button>
              </div>
              {viewModel.couponError && <small className="coupon-error">{viewModel.couponError}</small>}
              {viewModel.couponDiscountPaise > 0 && (
                <small className="coupon-success">
                  Coupon applied! Saved {formatMoney(viewModel.couponDiscountPaise)}
                </small>
              )}
            </div>
          </div>

          {/* Delivery & Order Summary Form */}
          <div className="checkout-summary-section">
            <h3>Arrangement & Checkout</h3>

            {/* Delivery Mode Options */}
            <div className="checkout-mode-toggle">
              <button
                type="button"
                className={`checkout-mode-btn ${viewModel.deliveryMode === 'pickup' ? 'active' : ''}`}
                onClick={() => viewModel.setDeliveryMode('pickup')}
              >
                <Store size={16} /> Campus Pickup
              </button>
              <button
                type="button"
                className={`checkout-mode-btn ${viewModel.deliveryMode === 'delivery' ? 'active' : ''}`}
                onClick={() => viewModel.setDeliveryMode('delivery')}
              >
                <Truck size={16} /> Home / Hostel Delivery
              </button>
            </div>

            {viewModel.deliveryMode === 'delivery' && (
              <div className="checkout-address-fields">
                <label>Full Delivery Address</label>
                <textarea
                  placeholder="Enter hostel block, room number or campus residence..."
                  value={viewModel.address}
                  onChange={e => viewModel.setAddress(e.target.value)}
                  rows={2}
                />
                <div className="checkout-row">
                  <input
                    type="text"
                    placeholder="City"
                    value={viewModel.city}
                    onChange={e => viewModel.setCity(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    maxLength={6}
                    value={viewModel.pincode}
                    onChange={e => viewModel.setPincode(e.target.value)}
                  />
                </div>
              </div>
            )}

            {viewModel.needsSlot && (
              <div className="checkout-slot-field">
                <label>Requested Slot Date & Time</label>
                <input
                  type="datetime-local"
                  value={viewModel.slotDateTime}
                  onChange={e => viewModel.setSlotDateTime(e.target.value)}
                />
              </div>
            )}

            {/* Bill Summary */}
            <div className="checkout-bill-breakdown">
              <div>
                <span>Items Subtotal</span>
                <strong>{formatMoney(viewModel.itemsSubtotalPaise)}</strong>
              </div>
              <div>
                <span>Delivery Charge</span>
                <strong>{viewModel.deliveryFeePaise === 0 ? 'FREE' : formatMoney(viewModel.deliveryFeePaise)}</strong>
              </div>
              {viewModel.couponDiscountPaise > 0 && (
                <div className="checkout-discount-row">
                  <span>Promo Discount</span>
                  <strong>-{formatMoney(viewModel.couponDiscountPaise)}</strong>
                </div>
              )}
              <hr />
              <div className="checkout-grand-total">
                <span>Total Payable</span>
                <strong>{formatMoney(viewModel.totalPaise)}</strong>
              </div>
            </div>

            <button
              type="button"
              className="checkout-btn checkout-btn-submit"
              disabled={!viewModel.canSubmit}
              onClick={() => viewModel.submitOrder()}
            >
              {viewModel.submitting ? (
                <>
                  <RefreshCw size={16} className="spin" /> Processing Request...
                </>
              ) : (
                <>
                  Submit Order Request <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
