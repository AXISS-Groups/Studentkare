import { CrossPlatformStorage } from '@/core/storage/CrossPlatformStorage';
import type { CartLineItem } from '../domain/Checkout';

const CART_STORAGE_KEY = 'studentkare_live_cart_v1';

export const CheckoutStoragePort = {
  async getCachedCart(): Promise<CartLineItem[]> {
    return await CrossPlatformStorage.get<CartLineItem[]>(CART_STORAGE_KEY, []);
  },

  async setCachedCart(items: CartLineItem[]): Promise<void> {
    await CrossPlatformStorage.set(CART_STORAGE_KEY, items);
  },

  async clearCachedCart(): Promise<void> {
    await CrossPlatformStorage.remove(CART_STORAGE_KEY);
  },
};
