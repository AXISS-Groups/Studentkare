import { CrossPlatformStorage } from '@/core/storage/CrossPlatformStorage';
import { captureSessionScope, isCurrentSessionScope, subscribeSessionScope } from '@/core/session/sessionScope';
import type { SessionScope } from '@/core/session/sessionScope';
import type { CartLineItem } from '../domain/Checkout';

const CART_STORAGE_KEY = 'studentkare_live_cart_v1';

// The legacy disk entry has no owner. Never restore it into an authenticated checkout.
void CrossPlatformStorage.remove(CART_STORAGE_KEY).catch(() => undefined);

let owner = captureSessionScope();
let cart: CartLineItem[] = [];

subscribeSessionScope(() => {
  owner = captureSessionScope();
  cart = [];
});

// Keep commercial cart data only for the current session. Delivery and order data are never cached.
export const CheckoutStoragePort = {
  async getCachedCart(scope: SessionScope = captureSessionScope()): Promise<CartLineItem[]> {
    if (!isCurrentSessionScope(scope) || scope !== owner) return [];
    return cart.map(item => ({ ...item }));
  },

  async setCachedCart(items: CartLineItem[], scope: SessionScope = captureSessionScope()): Promise<void> {
    if (!isCurrentSessionScope(scope) || scope !== owner) return;
    cart = items.map(item => ({ ...item }));
  },

  async clearCachedCart(scope: SessionScope = captureSessionScope()): Promise<void> {
    if (!isCurrentSessionScope(scope) || scope !== owner) return;
    cart = [];
  },
};
