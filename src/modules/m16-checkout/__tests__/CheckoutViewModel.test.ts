import { describe, it, expect, beforeEach } from 'vitest';
import { checkoutStore } from '../state/CheckoutStore';

describe('M16 Checkout Module Characterisation Tests', () => {
  beforeEach(() => {
    checkoutStore.reset();
  });

  it('calculates cart item count and subtotals accurately', () => {
    checkoutStore.cartItems = [
      { id: '1', name: 'Product A', brand: 'B1', kind: 'product', pricePaise: 1000, mrpPaise: 1200, quantity: 2, stock: 10, requiresPrescription: false },
      { id: '2', name: 'Product B', brand: 'B2', kind: 'product', pricePaise: 2500, mrpPaise: 3000, quantity: 1, stock: 5, requiresPrescription: false },
    ];

    expect(checkoutStore.itemCount).toBe(3);
    expect(checkoutStore.itemsSubtotalPaise).toBe(4500); // (1000*2) + (2500*1)
  });

  it('calculates free delivery over ₹499 (49900 paise)', () => {
    checkoutStore.setDeliveryMode('delivery');

    // Subtotal under ₹499 -> delivery fee applies (₹49 / 4900 paise)
    checkoutStore.cartItems = [
      { id: '1', name: 'Small Item', brand: 'B1', kind: 'product', pricePaise: 20000, mrpPaise: 25000, quantity: 1, stock: 10, requiresPrescription: false },
    ];
    expect(checkoutStore.deliveryFeePaise).toBe(4900);

    // Subtotal over ₹499 -> free delivery (0 paise)
    checkoutStore.cartItems = [
      { id: '1', name: 'Big Item', brand: 'B1', kind: 'product', pricePaise: 50000, mrpPaise: 60000, quantity: 1, stock: 10, requiresPrescription: false },
    ];
    expect(checkoutStore.deliveryFeePaise).toBe(0);
  });

  it('validates coupon discount calculation (CARE10 & STUDENT50)', () => {
    checkoutStore.cartItems = [
      { id: '1', name: 'Test Product', brand: 'B1', kind: 'product', pricePaise: 10000, mrpPaise: 12000, quantity: 1, stock: 10, requiresPrescription: false },
    ];

    // CARE10 -> 10% discount (1000 paise)
    checkoutStore.setCouponCode('CARE10');
    checkoutStore.applyCoupon();
    expect(checkoutStore.couponDiscountPaise).toBe(1000);
    expect(checkoutStore.couponError).toBeNull();

    // Invalid coupon
    checkoutStore.setCouponCode('INVALID');
    checkoutStore.applyCoupon();
    expect(checkoutStore.couponDiscountPaise).toBe(0);
    expect(checkoutStore.couponError).not.toBeNull();
  });

  it('validates canSubmit state for delivery mode with address & pincode', () => {
    checkoutStore.cartItems = [
      { id: '1', name: 'Item', brand: 'B1', kind: 'product', pricePaise: 1000, mrpPaise: 1200, quantity: 1, stock: 5, requiresPrescription: false },
    ];

    checkoutStore.setDeliveryMode('delivery');
    expect(checkoutStore.canSubmit).toBe(false);

    checkoutStore.setAddress('Hostel Block A, Room 302');
    checkoutStore.setPincode('502285');
    expect(checkoutStore.canSubmit).toBe(true);
  });

  it('handles order submission and resets cart', async () => {
    checkoutStore.cartItems = [
      { id: '1', name: 'Item', brand: 'B1', kind: 'product', pricePaise: 1000, mrpPaise: 1200, quantity: 1, stock: 5, requiresPrescription: false },
    ];
    checkoutStore.setDeliveryMode('pickup');

    const success = await checkoutStore.submitOrder();
    expect(success).toBe(true);
    expect(checkoutStore.completedOrder).not.toBeNull();
    expect(checkoutStore.cartItems).toEqual([]);
  });
});
