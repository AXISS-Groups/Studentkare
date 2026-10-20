import { describe, expect, it, vi } from 'vitest';
import { fakeRequest, listing } from '@/features/phoneKit/__tests__/fixtures';
import { forgetListings } from '@/features/phoneKit/listingCache';
import { MedicineRepository } from '@/features/marketplace/data/MedicineRepository';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import { PhoneShopViewModel, cannotAdd, requestedSlot } from '../viewmodel/PhoneShopViewModel';
import type { CartPort } from '../viewmodel/PhoneShopViewModel';

function cart(lines: CartPort['lines'] = []): CartPort & { cleared: boolean } {
  const port = { lines: [...lines], cleared: false, add: vi.fn(), setQuantity: vi.fn(), clear: () => { port.cleared = true; } };
  return port;
}

function vmWith(routes: Record<string, unknown>, initial: ConstructorParameters<typeof PhoneShopViewModel>[0] = { name: 'home' }) {
  const { request, calls } = fakeRequest(routes);
  const pay = vi.fn((id: string, amount: number) => new PayStepViewModel(id, amount));
  const vm = new PhoneShopViewModel(initial, request, new MedicineRepository(request), pay);
  return { vm, calls, pay };
}

const ADDRESS = { mode: 'pickup' as const, address: '', city: 'Hyderabad', pincode: '500090' };

describe('PhoneShopViewModel', () => {
  it('opens the home with the first shelf, the points balance and the cheapest lab package', async () => {
    const { vm, calls } = vmWith({
      '/catalog': { items: [listing({})], total: 51 },
      '/points/me': { balance: 1240, pointsNote: 'Points only.' },
      '/lab-packages': { items: [{ pricePaise: 49900 }, { pricePaise: 39900 }] },
    });
    vm.start();
    await vi.waitFor(() => expect(vm.homePhase).toBe('ready'));
    expect(calls[0].path).toBe('/catalog?kind=product&limit=6&offset=0');
    expect(vm.featuredTotal).toBe(51);
    expect(vm.points).toBe(1240);
    expect(vm.labFromPaise).toBe(39900);
  });

  it('says points could not load instead of showing zero', async () => {
    const { vm } = vmWith({ '/catalog': { items: [], total: 0 }, '/points/me': new Error('down'), '/lab-packages': { items: [] } });
    await vm.loadHome();
    expect(vm.homePhase).toBe('ready');
    expect(vm.points).toBeNull();
    expect(vm.labFromPaise).toBeNull();
  });

  it('lists a category and sorts by price or discount without changing the catalogue order for "name"', async () => {
    const items = [listing({ id: 'a', pricePaise: 300, mrpPaise: 300 }), listing({ id: 'b', pricePaise: 100, mrpPaise: 400 }), listing({ id: 'c', pricePaise: 200, mrpPaise: 220 })];
    const { vm, calls } = vmWith({ '/catalog': { items, total: 3 } }, { name: 'list', category: 'vitamins', query: '' });
    vm.start();
    await vi.waitFor(() => expect(vm.listPhase).toBe('ready'));
    expect(calls.some((c) => c.path.startsWith('/catalog?kind=product&limit=24&offset=0&category=vitamins'))).toBe(true);
    expect(vm.sortedList.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    vm.setSort('price');
    expect(vm.sortedList.map((i) => i.id)).toEqual(['b', 'c', 'a']);
    vm.setSort('discount');
    expect(vm.sortedList.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('finds a linked product in the catalogue and reads its same-composition alternatives', async () => {
    forgetListings();
    const { vm } = vmWith({
      '/catalog': { items: [listing({ id: 'm1', medicineId: 'med1' })], total: 1 },
      '/catalog/m1/alternatives': { itemId: 'm1', composition: 'Cholecalciferol 60000 IU', dosageForm: 'sachet', restricted: false,
        items: [{ id: 'm2', name: 'D-Rise', brand: 'X', pack: '4 sachets', pricePaise: 9900, mrpPaise: 12000, stock: 3, imageUrl: null, manufacturer: '', dosageForm: 'sachet', composition: 'Cholecalciferol 60000 IU', schedule: '', requiresPrescription: false }] },
    }, { name: 'detail', itemId: 'm1' });
    vm.start();
    await vi.waitFor(() => expect(vm.alternativesPhase).toBe('ready'));
    expect(vm.detail?.id).toBe('m1');
    expect(vm.composition).toBe('Cholecalciferol 60000 IU');
    vm.chooseAlternative(vm.alternatives[0]);
    expect(vm.detail?.id).toBe('m2');
    expect(vm.screen).toEqual({ name: 'detail', itemId: 'm2' });
  });

  it('says a linked product is not available when the catalogue does not have it', async () => {
    forgetListings();
    const { vm } = vmWith({ '/catalog': { items: [], total: 0 } }, { name: 'detail', itemId: 'gone' });
    vm.start();
    await vi.waitFor(() => expect(vm.detailPhase).toBe('error'));
    expect(vm.detail).toBeNull();
  });

  it('refuses to place an order without a city and pincode, and never calls the server', async () => {
    const { vm, calls } = vmWith({});
    await vm.placeOrder(cart([{ item: listing({}), quantity: 1 }]));
    expect(vm.checkoutError).toBe('phone.checkout.needAddress');
    expect(calls).toHaveLength(0);
  });

  it('fails closed when stock cannot be checked: no order is placed', async () => {
    const { vm, calls } = vmWith({ 'POST /cart/validate': new Error('down') });
    vm.setDelivery(ADDRESS);
    await vm.placeOrder(cart([{ item: listing({}), quantity: 1 }]));
    expect(vm.checkoutError).toBe('phone.checkout.validateFailed');
    expect(calls.map((c) => c.path)).toEqual(['/cart/validate']);
  });

  it('stops on unavailable items with the server’s reason', async () => {
    const { vm } = vmWith({ 'POST /cart/validate': { serviceable: true, items: [{ id: 'p1', available: false, reason: 'Out of stock' }] } });
    vm.setDelivery(ADDRESS);
    await vm.placeOrder(cart([{ item: listing({}), quantity: 1 }]));
    expect(vm.checkoutError).toBe('phone.checkout.unavailable');
    expect(vm.checkoutErrorText).toBe('Out of stock');
  });

  it('places the order once per content (idempotency key) and hands over to the Pay step at the server’s total', async () => {
    const placed = { id: 'ord1', totalPaise: 14900, createdAt: 1, delivery: ADDRESS, requestedSlot: '', paymentStatus: 'UNPAID', lines: [] };
    const { vm, calls, pay } = vmWith({ 'POST /cart/validate': { serviceable: true, items: [{ id: 'p1', available: true, reason: '' }] }, 'POST /orders': placed });
    vm.setDelivery(ADDRESS);
    const c = cart([{ item: listing({}), quantity: 1 }]);
    await vm.placeOrder(c);
    expect(vm.screen).toEqual({ name: 'pay' });
    expect(pay).toHaveBeenCalledWith('ord1', 14900);
    vm.back();
    await vm.placeOrder(c);
    const keys = calls.filter((x) => x.path === '/orders').map((x) => new Headers(x.init?.headers).get('Idempotency-Key'));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('empties the cart and shows the order summary once the Pay step is paid', () => {
    const { vm } = vmWith({});
    const c = cart([{ item: listing({}), quantity: 1 }]);
    vm.order = { id: 'ord1', totalPaise: 14900, createdAt: 1, delivery: ADDRESS, requestedSlot: '', paymentStatus: 'UNPAID', lines: [] };
    vm.paid(c);
    expect(c.cleared).toBe(true);
    expect(vm.screen).toEqual({ name: 'success' });
    expect(vm.order?.paymentStatus).toBe('PAID');
  });

  it('needs a time only for a consultation or vaccine, and only a real future one', () => {
    const { vm } = vmWith({});
    expect(vm.needsSlot(cart([{ item: listing({}), quantity: 1 }]))).toBe(false);
    expect(vm.needsSlot(cart([{ item: listing({ kind: 'consultation' }), quantity: 1 }]))).toBe(true);
    expect(requestedSlot('2020-01-01', '09:00')).toBeNull();
    expect(requestedSlot('2099-01-01', '25:00')).toBeNull();
    expect(requestedSlot('2099-01-01', '09:30')).not.toBeNull();
  });

  it('never lets a prescription item or an out-of-stock product into the cart', () => {
    expect(cannotAdd(listing({ requiresPrescription: true }))).toBe(true);
    expect(cannotAdd(listing({ stock: 0 }))).toBe(true);
    expect(cannotAdd(listing({}))).toBe(false);
  });
});
