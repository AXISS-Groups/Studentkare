import { checkoutStore } from '../state/CheckoutStore';
import type { CartLineItem, OrderSummary } from '../domain/Checkout';

export interface CheckoutViewModelState {
  cartItems: CartLineItem[];
  deliveryMode: 'pickup' | 'delivery';
  address: string;
  city: string;
  pincode: string;
  couponCode: string;
  couponDiscountPaise: number;
  couponError: string | null;
  slotDateTime: string;
  itemCount: number;
  itemsSubtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  needsSlot: boolean;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
  completedOrder: OrderSummary | null;
}

export interface CheckoutViewModelActions {
  addItem: (item: Omit<CartLineItem, 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  setDeliveryMode: (mode: 'pickup' | 'delivery') => void;
  setAddress: (address: string) => void;
  setCity: (city: string) => void;
  setPincode: (pincode: string) => void;
  setCouponCode: (code: string) => void;
  setSlotDateTime: (dateTime: string) => void;
  applyCoupon: () => void;
  submitOrder: () => Promise<boolean>;
  reset: () => void;
}

export interface CheckoutViewModelHook {
  state: CheckoutViewModelState;
  actions: CheckoutViewModelActions;
}

export function useCheckoutViewModel(): CheckoutViewModelHook {
  return {
    state: {
      cartItems: checkoutStore.cartItems,
      deliveryMode: checkoutStore.deliveryMode,
      address: checkoutStore.address,
      city: checkoutStore.city,
      pincode: checkoutStore.pincode,
      couponCode: checkoutStore.couponCode,
      couponDiscountPaise: checkoutStore.couponDiscountPaise,
      couponError: checkoutStore.couponError,
      slotDateTime: checkoutStore.slotDateTime,
      itemCount: checkoutStore.itemCount,
      itemsSubtotalPaise: checkoutStore.itemsSubtotalPaise,
      deliveryFeePaise: checkoutStore.deliveryFeePaise,
      totalPaise: checkoutStore.totalPaise,
      needsSlot: checkoutStore.needsSlot,
      canSubmit: checkoutStore.canSubmit,
      submitting: checkoutStore.isSubmitting,
      error: checkoutStore.errorMessage,
      completedOrder: checkoutStore.completedOrder,
    },
    actions: {
      addItem: (item) => checkoutStore.addItem(item),
      updateQuantity: (id, qty) => checkoutStore.updateQuantity(id, qty),
      removeItem: (id) => checkoutStore.removeItem(id),
      setDeliveryMode: (mode) => checkoutStore.setDeliveryMode(mode),
      setAddress: (addr) => checkoutStore.setAddress(addr),
      setCity: (city) => checkoutStore.setCity(city),
      setPincode: (pin) => checkoutStore.setPincode(pin),
      setCouponCode: (code) => checkoutStore.setCouponCode(code),
      setSlotDateTime: (dt) => checkoutStore.setSlotDateTime(dt),
      applyCoupon: () => checkoutStore.applyCoupon(),
      submitOrder: () => checkoutStore.submitOrder(),
      reset: () => checkoutStore.reset(),
    },
  };
}

export { checkoutStore };
