import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autorun } from 'mobx';
import { invalidateSessionScope, setSessionAccount } from '@/core/session/sessionScope';
import type { SessionScope } from '@/core/session/sessionScope';
import { CheckoutRepository } from '../../data/CheckoutRepository';
import type { CartValidation, OrderRequest } from '../../data/CheckoutRepository';
import type { CartLineItem, PlacedOrder } from '../../domain/Checkout';
import { CheckoutStore } from '../CheckoutStore';

vi.mock('../../platform/CheckoutStoragePort', () => ({
  CheckoutStoragePort: { getCachedCart: async () => [], setCachedCart: async () => undefined, clearCachedCart: async () => undefined },
}));

const line = (id = 'account-a-item'): CartLineItem => ({
  id, name: 'Test item', brand: 'Test provider', kind: 'product', pricePaise: 100, mrpPaise: 100,
  quantity: 1, stock: 10, requiresPrescription: false,
});

const validation = (): CartValidation => ({ serviceable: true, items: [] });
const placedOrder = (): PlacedOrder => ({
  id: 'account-a-order', createdAt: 1, totalPaise: 100,
  delivery: { mode: 'pickup', address: '', city: 'Hyderabad', pincode: '500090' },
  requestedSlot: '', paymentStatus: 'NOT_COLLECTED',
});

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Deferred promise is not initialized'); };
  let reject: (reason: Error) => void = () => { throw new Error('Deferred promise is not initialized'); };
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class SessionCheckoutRepository extends CheckoutRepository {
  getCachedCart = vi.fn(async (_scope?: SessionScope): Promise<CartLineItem[]> => []);
  saveCart = vi.fn(async (_items: CartLineItem[], _scope?: SessionScope): Promise<void> => undefined);
  clearCart = vi.fn(async (_scope?: SessionScope): Promise<void> => undefined);
  validate = vi.fn(async (_order: OrderRequest): Promise<CartValidation> => validation());
  submitOrder = vi.fn(async (_order: OrderRequest, _key: string): Promise<PlacedOrder> => placedOrder());
}

const stores: CheckoutStore[] = [];

function checkout(repository = new SessionCheckoutRepository()) {
  const store = new CheckoutStore(repository);
  stores.push(store);
  store.addItem(line());
  store.setCity('Hyderabad');
  store.setPincode('500090');
  return { store, repository };
}

beforeEach(() => {
  invalidateSessionScope();
  setSessionAccount('account-a');
});

afterEach(() => {
  stores.splice(0).forEach(store => store.dispose());
  invalidateSessionScope();
});

describe('checkout account ownership', () => {
  it('clears the cart, delivery information and completed order on an account change', () => {
    const { store } = checkout();
    store.setDeliveryMode('delivery');
    store.setAddress('Account A address');
    store.setSlotDateTime('2030-01-01T10:00');
    store.completedOrder = placedOrder();
    setSessionAccount('account-b');
    expect(store.cartItems).toEqual([]);
    expect(store.deliveryMode).toBe('pickup');
    expect(store.address).toBe('');
    expect(store.city).toBe('');
    expect(store.pincode).toBe('');
    expect(store.slotDateTime).toBe('');
    expect(store.completedOrder).toBeNull();
    expect(store.status).toEqual({ kind: 'idle' });
  });

  it('preserves checkout and retry identity when the same account refreshes', async () => {
    const { store, repository } = checkout();
    repository.submitOrder.mockRejectedValue(new Error('Response dropped'));
    expect(await store.submitOrder()).toBe(false);
    setSessionAccount('account-a');
    expect(store.cartItems.map(item => item.id)).toEqual(['account-a-item']);
    expect(await store.submitOrder()).toBe(false);
    expect(repository.submitOrder.mock.calls[0][1]).toBe(repository.submitOrder.mock.calls[1][1]);
  });

  it('reactively denies submission after logout and enables it for a new authenticated owner', () => {
    const { store, repository } = checkout();
    const permissions: boolean[] = [];
    const stop = autorun(() => { permissions.push(store.canSubmit); });
    invalidateSessionScope();
    store.addItem(line('anonymous-item'));
    store.setCity('Hyderabad');
    store.setPincode('500090');
    expect(store.canSubmit).toBe(false);
    expect(repository.validate).not.toHaveBeenCalled();
    setSessionAccount('account-b');
    store.addItem(line('account-b-item'));
    store.setCity('Hyderabad');
    store.setPincode('500090');
    expect(store.canSubmit).toBe(true);
    expect(permissions).toContain(false);
    expect(permissions[permissions.length - 1]).toBe(true);
    stop();
  });

  it('does not validate or submit an anonymous cart', async () => {
    invalidateSessionScope();
    const { store, repository } = checkout();
    expect(await store.submitOrder()).toBe(false);
    expect(repository.validate).not.toHaveBeenCalled();
    expect(repository.submitOrder).not.toHaveBeenCalled();
  });

  it.each(['switch', 'logout', 'reauthenticate'] as const)('does not post the old order when validation finishes after %s', async change => {
    const { store, repository } = checkout();
    const pending = deferred<CartValidation>();
    repository.validate.mockReturnValueOnce(pending.promise);
    const result = store.submitOrder();
    if (change === 'switch') setSessionAccount('account-b');
    else invalidateSessionScope();
    if (change === 'reauthenticate') setSessionAccount('account-a');
    store.addItem(line('next-owner-item'));
    pending.resolve(validation());
    expect(await result).toBe(false);
    expect(repository.submitOrder).not.toHaveBeenCalled();
    expect(store.cartItems.map(item => item.id)).toEqual(['next-owner-item']);
    expect(store.status).toEqual({ kind: 'idle' });
  });

  it.each([
    ['resolve', 'switch'], ['reject', 'switch'], ['resolve', 'reauthenticate'], ['reject', 'reauthenticate'],
  ] as const)('ignores an old order %s after %s starts a new cart', async (outcome, change) => {
    const { store, repository } = checkout();
    const pending = deferred<PlacedOrder>();
    repository.submitOrder.mockReturnValueOnce(pending.promise);
    const result = store.submitOrder();
    await vi.waitFor(() => expect(repository.submitOrder).toHaveBeenCalledOnce());
    if (change === 'switch') setSessionAccount('account-b');
    else {
      invalidateSessionScope();
      setSessionAccount('account-a');
    }
    store.addItem(line('account-b-item'));
    if (outcome === 'resolve') pending.resolve(placedOrder());
    else pending.reject(new Error('Account A order failed'));
    expect(await result).toBe(false);
    expect(store.cartItems.map(item => item.id)).toEqual(['account-b-item']);
    expect(store.completedOrder).toBeNull();
    expect(store.status).toEqual({ kind: 'idle' });
    expect(repository.clearCart).not.toHaveBeenCalled();
  });

  it('does not let a late validation resume a checkout that was explicitly reset', async () => {
    const { store, repository } = checkout();
    const pending = deferred<CartValidation>();
    repository.validate.mockReturnValueOnce(pending.promise);
    const result = store.submitOrder();
    store.reset();
    store.addItem(line('new-item'));
    pending.resolve(validation());
    expect(await result).toBe(false);
    expect(repository.submitOrder).not.toHaveBeenCalled();
    expect(store.cartItems.map(item => item.id)).toEqual(['new-item']);
    expect(store.status).toEqual({ kind: 'idle' });
  });

  it('ignores cache hydration from the previous account', async () => {
    const repository = new SessionCheckoutRepository();
    const pending = deferred<CartLineItem[]>();
    repository.getCachedCart.mockReturnValueOnce(pending.promise);
    const store = new CheckoutStore(repository);
    stores.push(store);
    setSessionAccount('account-b');
    store.addItem(line('account-b-item'));
    pending.resolve([line()]);
    await pending.promise;
    expect(store.cartItems.map(item => item.id)).toEqual(['account-b-item']);
  });

  it('does not overwrite a newly edited cart with a late cache read', async () => {
    const repository = new SessionCheckoutRepository();
    const pending = deferred<CartLineItem[]>();
    repository.getCachedCart.mockReturnValueOnce(pending.promise);
    const { store } = checkout(repository);
    pending.resolve([line('cached-item')]);
    await pending.promise;
    expect(store.cartItems.map(item => item.id)).toEqual(['account-a-item']);
  });

  it('passes the captured owner and an immutable item snapshot to persistence', () => {
    const { store, repository } = checkout();
    const saved = repository.saveCart.mock.calls[0][0];
    store.updateQuantity('account-a-item', 3);
    expect(saved[0].quantity).toBe(1);
    expect(repository.saveCart.mock.calls[0][1]?.accountId).toBe('account-a');
  });
});
