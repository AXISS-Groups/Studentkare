import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartLineItem } from '../../domain/Checkout';

const storage = vi.hoisted(() => ({
  remove: vi.fn(async (_key: string): Promise<void> => undefined),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@/core/storage/CrossPlatformStorage', () => ({ CrossPlatformStorage: storage }));

let session: typeof import('@/core/session/sessionScope');
let port: typeof import('../CheckoutStoragePort').CheckoutStoragePort;

const line = (id = 'account-a-item'): CartLineItem => ({
  id, name: 'Test item', brand: 'Test provider', kind: 'product', pricePaise: 100, mrpPaise: 100,
  quantity: 1, stock: 10, requiresPrescription: false,
});

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  session = await import('@/core/session/sessionScope');
  port = (await import('../CheckoutStoragePort')).CheckoutStoragePort;
  session.setSessionAccount('account-a');
});

describe('session-owned checkout cache', () => {
  it('removes the unowned legacy cart and never reads or writes persistent cart data', async () => {
    expect(storage.remove).toHaveBeenCalledWith('studentkare_live_cart_v1');
    await port.setCachedCart([line()]);
    expect(await port.getCachedCart()).toEqual([line()]);
    expect(storage.get).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('preserves the cart when the same account refreshes and clones read/write snapshots', async () => {
    const items = [line()];
    await port.setCachedCart(items);
    items[0].quantity = 3;
    session.setSessionAccount('account-a');
    const cached = await port.getCachedCart();
    expect(cached[0].quantity).toBe(1);
    cached[0].quantity = 4;
    expect((await port.getCachedCart())[0].quantity).toBe(1);
  });

  it('discards account A cache on switch and cannot restore it by signing back in', async () => {
    await port.setCachedCart([line()]);
    session.setSessionAccount('account-b');
    expect(await port.getCachedCart()).toEqual([]);
    await port.setCachedCart([line('account-b-item')]);
    session.setSessionAccount('account-a');
    expect(await port.getCachedCart()).toEqual([]);
  });

  it('rejects late writes and clears captured for the previous account', async () => {
    const ownerA = session.captureSessionScope();
    await port.setCachedCart([line()], ownerA);
    session.setSessionAccount('account-b');
    await port.setCachedCart([line('account-b-item')]);
    await port.setCachedCart([line('late-account-a-item')], ownerA);
    await port.clearCachedCart(ownerA);
    expect(await port.getCachedCart(ownerA)).toEqual([]);
    expect(await port.getCachedCart()).toEqual([line('account-b-item')]);
  });

  it('rejects operations from an ended session even when the same account signs back in', async () => {
    const ended = session.captureSessionScope();
    session.invalidateSessionScope();
    await port.setCachedCart([line('anonymous-item')]);
    expect(await port.getCachedCart()).toEqual([]);
    session.setSessionAccount('account-a');
    await port.setCachedCart([line('new-session-item')]);
    await port.setCachedCart([line('old-session-item')], ended);
    await port.clearCachedCart(ended);
    expect(await port.getCachedCart()).toEqual([line('new-session-item')]);
  });
});
