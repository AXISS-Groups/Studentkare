import { checkoutStore } from '../state/CheckoutStore';
import type { CartLineItem, DeliveryMode, PlacedOrder } from '../domain/Checkout';

export interface CheckoutViewModelState {
  cartItems: CartLineItem[];
  deliveryMode: DeliveryMode;
  address: string;
  city: string;
  pincode: string;
  slotDateTime: string;
  itemCount: number;
  totalPaise: number;
  needsSlot: boolean;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
  completedOrder: PlacedOrder | null;
}

export interface CheckoutViewModelActions {
  addItem: (item: Omit<CartLineItem, 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setAddress: (address: string) => void;
  setCity: (city: string) => void;
  setPincode: (pincode: string) => void;
  setSlotDateTime: (dateTime: string) => void;
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
      slotDateTime: checkoutStore.slotDateTime,
      itemCount: checkoutStore.itemCount,
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
      setSlotDateTime: (dt) => checkoutStore.setSlotDateTime(dt),
      submitOrder: () => checkoutStore.submitOrder(),
      reset: () => checkoutStore.reset(),
    },
  };
}

export { checkoutStore };
