import React from 'react';
import { observer } from 'mobx-react-lite';
import { ShoppingBag, Trash2, Tag, CheckCircle2, AlertCircle, Truck, Store, Calendar } from 'lucide-react';
import { useCheckoutViewModel } from '../viewmodel/useCheckoutViewModel';
import './checkout.css';

const formatRupees = (paise: number): string => `₹${(paise / 100).toLocaleString('en-IN')}`;

export const CartCheckoutWebView: React.FC = observer(() => {
  const { state, actions } = useCheckoutViewModel();

  if (state.completedOrder) {
    return (
      <div className="checkout-success-card">
        <CheckCircle2 size={56} color="#16a34a" />
        <h2>Order Confirmed!</h2>
        <p className="checkout-order-id">Order ID: {state.completedOrder.orderId}</p>

        <div className="checkout-summary-box">
          <div>
            <strong>Fulfillment Status</strong>
            <span>{state.completedOrder.status}</span>
          </div>
          <div>
            <strong>Estimated Timeline</strong>
            <span>{state.completedOrder.estimatedFulfillment}</span>
          </div>
          {state.completedOrder.address && (
            <div>
              <strong>Delivery Address</strong>
              <span>{state.completedOrder.address}</span>
            </div>
          )}
          <div>
            <strong>Total Amount Paid</strong>
            <span className="checkout-total-val">{formatRupees(state.completedOrder.totalPaise)}</span>
          </div>
        </div>

        <button
          type="button"
          className="checkout-btn checkout-btn-primary"
          onClick={() => actions.reset()}
        >
          Back to Campus Store
        </button>
      </div>
    );
  }

  if (state.cartItems.length === 0) {
    return (
      <div className="checkout-container">
        <div className="checkout-empty-state">
          <ShoppingBag size={48} color="#94a3b8" />
          <h3>Your Campus Cart is Empty</h3>
          <p>Explore healthcare services, lab checkups, and wellness products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <span className="checkout-eyebrow">Campus Checkout Pipeline</span>
        <h2>Review Cart & Payment</h2>
      </div>

      {state.error && (
        <div className="checkout-error-banner">
          <AlertCircle size={16} />
          <span>{state.error}</span>
        </div>
      )}

      <div className="checkout-grid">
        {/* Cart Line Items */}
        <div className="checkout-items-section">
          {state.cartItems.map(item => (
            <div key={item.id} className="checkout-item-card">
              <div className="checkout-item-info">
                <span className={`checkout-kind-tag kind-${item.kind}`}>{item.kind.toUpperCase()}</span>
                <strong>{item.name}</strong>
                <small>{item.brand}</small>
                <div className="checkout-item-price">
                  <strong>{formatRupees(item.pricePaise)}</strong>
                  {item.mrpPaise > item.pricePaise && <del>{formatRupees(item.mrpPaise)}</del>}
                </div>
              </div>

              <div className="checkout-item-actions">
                <div className="checkout-quantity-stepper">
                  <button type="button" onClick={() => actions.updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => actions.updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className="checkout-remove-btn"
                  onClick={() => actions.removeItem(item.id)}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Coupon Code Section */}
          <div className="checkout-coupon-card">
            <label>
              <Tag size={14} color="#4f46e5" />
              Campus Coupon Code
            </label>
            <div className="checkout-coupon-row">
              <input
                type="text"
                placeholder="Enter CARE10 or STUDENT50"
                value={state.couponCode}
                onChange={e => actions.setCouponCode(e.target.value)}
              />
              <button type="button" onClick={() => actions.applyCoupon()}>Apply</button>
            </div>
            {state.couponError && <span className="coupon-error">{state.couponError}</span>}
            {state.couponDiscountPaise > 0 && (
              <span className="coupon-success">
                Coupon Applied! Saved {formatRupees(state.couponDiscountPaise)}
              </span>
            )}
          </div>
        </div>

        {/* Fulfillment & Payment Summary */}
        <div className="checkout-summary-section">
          <h3>Delivery & Fulfillment</h3>

          <div className="checkout-mode-toggle">
            <button
              type="button"
              className={`checkout-mode-btn ${state.deliveryMode === 'pickup' ? 'active' : ''}`}
              onClick={() => actions.setDeliveryMode('pickup')}
            >
              <Store size={14} />
              Campus Pickup
            </button>
            <button
              type="button"
              className={`checkout-mode-btn ${state.deliveryMode === 'delivery' ? 'active' : ''}`}
              onClick={() => actions.setDeliveryMode('delivery')}
            >
              <Truck size={14} />
              Hostel Delivery
            </button>
          </div>

          {state.deliveryMode === 'delivery' && (
            <div className="checkout-address-fields">
              <label>Hostel / Room Address</label>
              <textarea
                rows={2}
                placeholder="Room No, Hostel Block name..."
                value={state.address}
                onChange={e => actions.setAddress(e.target.value)}
              />
              <div className="checkout-row">
                <input
                  type="text"
                  placeholder="City"
                  value={state.city}
                  onChange={e => actions.setCity(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={state.pincode}
                  onChange={e => actions.setPincode(e.target.value)}
                />
              </div>
            </div>
          )}

          {state.needsSlot && (
            <div className="checkout-slot-field">
              <label>
                <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                Appointment / Sample Collection Slot
              </label>
              <input
                type="datetime-local"
                value={state.slotDateTime}
                onChange={e => actions.setSlotDateTime(e.target.value)}
              />
            </div>
          )}

          <div className="checkout-bill-breakdown">
            <div>
              <span>Items Subtotal ({state.itemCount})</span>
              <span>{formatRupees(state.itemsSubtotalPaise)}</span>
            </div>
            <div>
              <span>Delivery Fee</span>
              <span>{state.deliveryFeePaise === 0 ? 'FREE' : formatRupees(state.deliveryFeePaise)}</span>
            </div>
            {state.couponDiscountPaise > 0 && (
              <div className="checkout-discount-row">
                <span>Coupon Discount</span>
                <span>-{formatRupees(state.couponDiscountPaise)}</span>
              </div>
            )}
            <hr />
            <div className="checkout-grand-total">
              <span>Total Payable</span>
              <span>{formatRupees(state.totalPaise)}</span>
            </div>
          </div>

          <button
            type="button"
            className="checkout-btn checkout-btn-submit"
            disabled={!state.canSubmit}
            onClick={() => actions.submitOrder()}
          >
            {state.submitting ? 'Processing Order...' : `Pay ${formatRupees(state.totalPaise)}`}
          </button>
        </div>
      </div>
    </div>
  );
});
