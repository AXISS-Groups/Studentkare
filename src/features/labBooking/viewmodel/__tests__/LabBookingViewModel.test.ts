import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { PaymentRepository } from '@/features/payments/data/PaymentRepository';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import { LabBookingRepository } from '../../data/LabBookingRepository';
import { LabBookingViewModel } from '../LabBookingViewModel';
import { PACKAGE, SLOTS, booking } from './labFixtures';

type Requester = typeof import('@/data/services/http').apiRequest;

function setup(routes: Record<string, unknown>) {
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    const answer = routes[`${init?.method ?? 'GET'} ${path}`];
    if (answer instanceof Error) throw answer;
    if (typeof answer === 'function') return (answer as () => unknown)();
    return answer;
  }) as unknown as Requester & ReturnType<typeof vi.fn>;
  const vm = new LabBookingViewModel(new LabBookingRepository(request),
    (id, amount) => new PayStepViewModel(id, amount, new PaymentRepository(request, '/lab-orders')));
  return { vm, request };
}

const calls = (request: ReturnType<typeof vi.fn>, key: string) =>
  request.mock.calls.filter(([path, init]) => `${(init as RequestInit | undefined)?.method ?? 'GET'} ${path}` === key);

async function ready(vm: LabBookingViewModel) {
  await vm.load();
  vm.open('pkg');
  await vi.waitFor(() => expect(vm.slotPhase).toBe('ready'));
}

describe('LabBookingViewModel', () => {
  const base = {
    'GET /lab-packages': { items: [PACKAGE] },
    'GET /lab-packages/pkg/slots': { slots: SLOTS },
  };

  it('opens a package with its first open slot chosen', async () => {
    const { vm } = setup(base);
    await ready(vm);
    expect(vm.sheetOpen).toBe(true);
    expect(vm.slotId).toBe('s-am');
    expect(vm.canConfirm).toBe(false);   // no address yet
  });

  it('asks for the address instead of booking without one', async () => {
    const { vm, request } = setup(base);
    await ready(vm);
    await vm.confirm();
    expect(vm.showAddressErrors).toBe(true);
    expect(calls(request, 'POST /lab-bookings')).toHaveLength(0);
  });

  it('books once, moves to Pay, and shows the booking only once the server says paid', async () => {
    const { vm, request } = setup({ ...base, 'POST /lab-bookings': booking('UNPAID'),
      'GET /lab-bookings/order-abcdef12': booking('PAID') });
    await ready(vm);
    vm.setAddress('hostelBlock', 'Block B');
    vm.setAddress('room', '214');
    await vm.confirm();
    expect(vm.step).toBe('pay');
    expect(vm.payment?.orderId).toBe('order-abcdef12');
    expect(vm.payment?.amountPaise).toBe(64900);
    const [, init] = calls(request, 'POST /lab-bookings')[0];
    expect(new Headers((init as RequestInit).headers).get('Idempotency-Key')).toMatch(/^lab-/);
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      catalogItemId: 'pkg', slotId: 's-am', address: { kind: 'HOSTEL', hostelBlock: 'Block B', room: '214' } });

    vm.payment!.phase = 'paid';   // what PayStepViewModel sets after the server verified
    await vi.waitFor(() => expect(vm.outcome).toBe('booked'));
    expect(vm.step).toBe('result');
    expect(vm.result?.booking.labName).toBe('Demo Diagnostics');
  });

  it('going back and confirming again reuses the booking, moving its slot', async () => {
    const { vm, request } = setup({ ...base, 'POST /lab-bookings': booking('UNPAID'),
      'PUT /lab-orders/order-abcdef12/slot': { id: 'order-abcdef12' } });
    await ready(vm);
    vm.setAddress('hostelBlock', 'Block B');
    vm.setAddress('room', '214');
    await vm.confirm();
    vm.backToSlot();
    expect(vm.step).toBe('browse');
    vm.chooseSlot('s-am2');
    await vm.confirm();
    expect(vm.step).toBe('pay');
    expect(calls(request, 'POST /lab-bookings')).toHaveLength(1);
    expect(calls(request, 'PUT /lab-orders/order-abcdef12/slot')).toHaveLength(1);
  });

  it('a different address is a new booking; the old one is cancelled', async () => {
    const { vm, request } = setup({ ...base, 'POST /lab-bookings': booking('UNPAID'),
      'PATCH /lab-orders/order-abcdef12': { id: 'order-abcdef12' } });
    await ready(vm);
    vm.setAddress('hostelBlock', 'Block B');
    vm.setAddress('room', '214');
    await vm.confirm();
    vm.backToSlot();
    vm.setAddress('room', '215');
    await vm.confirm();
    expect(calls(request, 'POST /lab-bookings')).toHaveLength(2);
    expect(calls(request, 'PATCH /lab-orders/order-abcdef12')).toHaveLength(1);
    const keys = calls(request, 'POST /lab-bookings').map(([, init]) => new Headers((init as RequestInit).headers).get('Idempotency-Key'));
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('a slot taken meanwhile says so and reloads the slots', async () => {
    const { vm, request } = setup({ ...base, 'POST /lab-bookings': new ApiError('taken', 409) });
    await ready(vm);
    vm.setAddressKind('HOME');
    vm.setAddress('line', '12 Lake View Road, Kukatpally');
    vm.setAddress('city', 'Hyderabad');
    vm.setAddress('pincode', '500072');
    await vm.confirm();
    expect(vm.error).toBe('labbook.error.slotTaken');
    expect(vm.step).toBe('browse');
    await vi.waitFor(() => expect(calls(request, 'GET /lab-packages/pkg/slots')).toHaveLength(2));
  });

  it('says plainly when payment is not connected', async () => {
    const { vm } = setup({ ...base, 'POST /lab-bookings': new ApiError('no payment', 503) });
    await ready(vm);
    vm.setAddress('hostelBlock', 'B');
    vm.setAddress('room', '1');
    await vm.confirm();
    expect(vm.error).toBe('labbook.error.noPayment');
  });

  it.each([['UNPAID', 'pending'], ['EXPIRED', 'failed'], ['CANCELLED', 'failed'], ['REFUNDED', 'booked']])(
    'a booking the server reports %s shows as %s', async (status, outcome) => {
      const { vm } = setup({ ...base, 'POST /lab-bookings': booking('UNPAID'),
        'GET /lab-bookings/order-abcdef12': booking(status) });
      await ready(vm);
      vm.setAddress('hostelBlock', 'B');
      vm.setAddress('room', '1');
      await vm.confirm();
      await vm.showResult();
      expect(vm.outcome).toBe(outcome);
    });

  it('shows an error state when the list fails', async () => {
    const { vm } = setup({ 'GET /lab-packages': new ApiError('down', 502) });
    await vm.load();
    expect(vm.phase).toBe('error');
  });
});
