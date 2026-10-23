import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => true,
}));

import { ApiError } from '@/data/services/http';
import { LanguageProvider, translate } from '@/i18n';
import { axeViolations, describeViolations } from '@/test/axe';
import { rememberPayMethod } from '@/features/payments/data/payMethodMemory';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import type { QuoteLine, Refill, RefillsApi, ReorderQuote } from '../data/refillsApi';
import { RefillsViewModel } from '../viewmodel/RefillsViewModel';
import { ReorderViewModel } from '../viewmodel/ReorderViewModel';
import { M2RefillsView, type M2RefillsLinks } from '../views/M2RefillsView';
import { M2ReorderView, type M2ReorderLinks } from '../views/M2ReorderView';

const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const refill = (over: Partial<Refill> = {}): Refill => ({
  id: 'r1', source: 'ORDER', label: 'Cetirizine 10 mg strip', planId: null, orderId: 'o1', itemId: 'i1',
  packSize: 10, packs: 2, unitsPerDose: 1, dosesPerDay: 1, unitsPerDay: 1, unitsLeft: 4, startedOn: '2026-10-07',
  runsOutOn: '2026-10-27', daysLeft: 4, remindOn: '2026-10-24', remindDaysBefore: 3, enabled: true, snoozedUntil: null,
  canReorder: true, ...over,
});

const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  itemId: 'i1', name: 'Cetirizine 10 mg strip', pack: 'Strip of 10', quantity: 2, state: 'OK', pricePaise: 15000,
  mrpPaise: 18000, stock: 20, requiresPrescription: false, stockAlert: false, ...over,
});

const DELIVERY = { mode: 'delivery' as const, address: 'Room 214, Block C', city: 'Hyderabad', pincode: '500090' };
const quoteOf = (lines: QuoteLine[]): ReorderQuote => ({
  orderId: 'o1', quotedAt: 1_761_200_000, delivery: DELIVERY, lines,
  totalPaise: lines.filter((l) => l.state === 'OK').reduce((sum, l) => sum + (l.pricePaise ?? 0) * l.quantity, 0),
  ready: lines.every((l) => l.state === 'OK'),
});

function fakeApi(over: Partial<RefillsApi> = {}): RefillsApi {
  return {
    list: vi.fn(async () => [refill()]),
    plans: vi.fn(async () => [{ id: 'p1', name: 'Vitamin D3', timesPerDay: 1 }]),
    orderedItems: vi.fn(async () => [{ orderId: 'o1', itemId: 'i1', name: 'Cetirizine 10 mg strip', quantity: 2, orderedAt: 1_760_000_000 }]),
    create: vi.fn(async () => refill({ id: 'r2' })),
    update: vi.fn(async (_id, body) => refill({ ...body })),
    snooze: vi.fn(async () => refill({ snoozedUntil: Date.now() / 1000 + 86400 })),
    adjust: vi.fn(async (_id, unitsLeft) => refill({ unitsLeft })),
    restock: vi.fn(async () => refill({ unitsLeft: 24 })),
    remove: vi.fn(async () => undefined),
    rxStatus: vi.fn(async () => ({ validCount: 0, latestValidUntil: null })),
    quote: vi.fn(async () => quoteOf([line()])),
    placeOrder: vi.fn(async () => ({ id: 'o2', totalPaise: 30000 })),
    watchStock: vi.fn(async () => undefined),
    unwatchStock: vi.fn(async () => undefined),
    ...over,
  };
}

const refillLinks = (): M2RefillsLinks => ({ back: vi.fn(), sos: vi.fn(), reorder: vi.fn(), requestRefill: vi.fn() });
const reorderLinks = (): M2ReorderLinks => ({
  back: vi.fn(), sos: vi.fn(), sendPrescription: vi.fn(), uploadPrescription: vi.fn(), consult: vi.fn(), pharmacist: vi.fn(), track: vi.fn(), orders: vi.fn(),
});
const noPayment = (id: string, amount: number) => new PayStepViewModel(id, amount);

beforeEach(() => { try { localStorage.clear(); } catch { /* no storage */ } });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('RefillsViewModel', () => {
  it('starts a refill from an order with only the student’s own numbers filled in', async () => {
    const api = fakeApi();
    const vm = new RefillsViewModel(api);
    vm.openSetup({ orderId: 'o1', itemId: 'i1' });
    await flush(); await flush();
    expect(vm.setupStep).toBe('counts');
    // Their order quantity is the packs; nothing about the dose is suggested.
    expect(vm.fields.packs).toBe('2');
    expect(vm.fields.perDose).toBe('');
    expect(vm.fields.perDay).toBe('');
    expect(vm.canSave).toBe(false);
    vm.setField('packSize', '10'); vm.setField('perDose', '1'); vm.setField('perDay', '2');
    expect(vm.canSave).toBe(true);
    await vm.saveSetup();
    expect(api.create).toHaveBeenCalledWith({ source: 'ORDER', orderId: 'o1', itemId: 'i1', packSize: 10, packs: 2, unitsPerDose: 1, dosesPerDay: 2, remindDaysBefore: 3 });
    expect(vm.focusId).toBe('r2');
  });

  it('refuses counts outside the registry limits and shows the server’s coded refusal', async () => {
    const api = fakeApi({ create: vi.fn(async () => { throw new ApiError('x', 409, { code: 'ALREADY_TRACKED', values: {} }); }) });
    const vm = new RefillsViewModel(api);
    vm.openSetup();
    await flush();
    vm.pickPlan({ id: 'p1', name: 'Vitamin D3', timesPerDay: 1 });
    expect(vm.fields.perDay).toBe('1');   // the plan's own count
    vm.setField('packSize', '0'); vm.setField('perDose', '1');
    expect(vm.canSave).toBe(false);
    vm.setField('packSize', '30');
    await vm.saveSetup();
    expect(vm.setupError).toEqual({ key: 'refill.msg.ALREADY_TRACKED', vars: {} });
  });

  it('does nothing offline and validates "I still have some"', async () => {
    const api = fakeApi();
    const vm = new RefillsViewModel(api);
    vm.load();
    await flush();
    vm.setOnline(false);
    expect(await vm.snooze(refill())).toBe(false);
    expect(api.snooze).not.toHaveBeenCalled();
    vm.setOnline(true);
    vm.openSheet('adjust', refill());
    vm.setSheetValue('abc');
    await vm.confirmSheet();
    expect(vm.sheetError).toEqual({ key: 'refill.setup.range', vars: { min: 0, max: 200 } });
    vm.setSheetValue('6');
    await vm.confirmSheet();
    expect(api.adjust).toHaveBeenCalledWith('r1', 6);
    expect(vm.sheet).toBeNull();
  });

  it('puts the refill a reminder opened first', async () => {
    const vm = new RefillsViewModel(fakeApi({ list: vi.fn(async () => [refill({ id: 'a' }), refill({ id: 'b' })]) }));
    vm.setFocus('b');
    vm.load();
    await flush();
    expect(vm.items.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('ReorderViewModel', () => {
  it('asks commerce with the order and item ids only, and pays today’s total', async () => {
    await rememberPayMethod('card');
    const api = fakeApi();
    const vm = new ReorderViewModel('o1', ['i1'], api, noPayment);
    await vm.load();
    await flush();
    expect(api.quote).toHaveBeenCalledWith('o1', ['i1']);
    expect(vm.method).toBe('card');
    await vm.place();
    const [items, delivery, expected, key] = vi.mocked(api.placeOrder).mock.calls[0];
    expect(items).toEqual([{ id: 'i1', quantity: 2 }]);
    expect(delivery).toEqual(DELIVERY);
    expect(expected).toBe(30000);
    expect(key).toMatch(/^reorder-/);
    expect(vm.phase).toBe('pay');
    expect(vm.payment?.method).toBe('card');
  });

  it('shows a moved price again instead of charging it', async () => {
    let calls = 0;
    const api = fakeApi({
      quote: vi.fn(async () => quoteOf([line({ pricePaise: calls++ === 0 ? 15000 : 16000 })])),
      placeOrder: vi.fn(async () => { throw new ApiError('moved', 409, { code: 'PRICE_CHANGED', values: { totalPaise: 32000 } }); }),
    });
    const vm = new ReorderViewModel('o1', ['i1'], api, noPayment);
    await vm.load();
    await vm.place();
    expect(vm.phase).toBe('review');
    expect(vm.notice).toEqual({ key: 'reorder.priceChanged' });
    expect(vm.totalPaise).toBe(32000);
  });

  it('fails closed when the prescription check fails and never prices a prescription item in', async () => {
    const api = fakeApi({
      quote: vi.fn(async () => quoteOf([line({ state: 'PRESCRIPTION', requiresPrescription: true })])),
      rxStatus: vi.fn(async () => { throw new ApiError('down', 503); }),
    });
    const vm = new ReorderViewModel('o1', ['i1'], api, noPayment);
    await vm.load();
    expect(vm.validPrescriptionUntil).toBeNull();
    expect(vm.totalPaise).toBe(0);
    expect(vm.canPay).toBe(false);
  });
});

describe('M2RefillsView', () => {
  it('shows counts and dates, never a price, and is axe-clean', async () => {
    const vm = new RefillsViewModel(fakeApi());
    vm.load();
    const links = refillLinks();
    const { container } = wrap(<M2RefillsView vm={vm} links={links} />);
    await waitFor(() => expect(screen.getByTestId('m2-refill-r1')).toBeTruthy());
    expect(container.textContent).toContain(en('refill.row.daysLeft', { count: 4 }));
    expect(container.textContent).not.toContain('₹');
    fireEvent.click(screen.getByTestId('m2-refill-reorder-r1'));
    expect(links.reorder).toHaveBeenCalled();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('offers Ask a pharmacy, not Reorder, for a medicine from Medicines today', async () => {
    const vm = new RefillsViewModel(fakeApi({ list: vi.fn(async () => [refill({ source: 'PLAN', canReorder: false, orderId: null, itemId: null })]) }));
    vm.load();
    wrap(<M2RefillsView vm={vm} links={refillLinks()} />);
    await waitFor(() => expect(screen.getByTestId('m2-refill-request-r1')).toBeTruthy());
    expect(screen.queryByTestId('m2-refill-reorder-r1')).toBeNull();
  });

  it('has a first-time state with one next step', async () => {
    const vm = new RefillsViewModel(fakeApi({ list: vi.fn(async () => []) }));
    vm.load();
    wrap(<M2RefillsView vm={vm} links={refillLinks()} />);
    await waitFor(() => expect(screen.getByTestId('m2-refill-empty')).toBeTruthy());
    expect(screen.getByTestId('m2-refill-add-empty')).toBeTruthy();
  });
});

describe('M2ReorderView', () => {
  it('routes a prescription item to upload or consult and an out-of-stock one to notify or a pharmacist, with no substitute', async () => {
    const api = fakeApi({
      quote: vi.fn(async () => quoteOf([
        line({ itemId: 'rx', name: 'Rx item', state: 'PRESCRIPTION', requiresPrescription: true }),
        line({ itemId: 'oos', name: 'Out item', state: 'OUT_OF_STOCK', stock: 0 }),
        line(),
      ])),
    });
    const vm = new ReorderViewModel('o1', [], api, noPayment);
    void vm.load();
    const links = reorderLinks();
    const { container } = wrap(<M2ReorderView vm={vm} links={links} />);
    await waitFor(() => expect(screen.getByTestId('m2-reorder-rx-upload')).toBeTruthy());
    expect(screen.getByTestId('m2-reorder-rx-consult')).toBeTruthy();
    expect(screen.getByTestId('m2-reorder-watch-oos')).toBeTruthy();
    fireEvent.click(screen.getByTestId('m2-reorder-pharmacist-oos'));
    expect(links.pharmacist).toHaveBeenCalled();
    expect(container.textContent).toContain(en('reorder.oos.body'));
    expect(screen.getByTestId('m2-reorder-total-amount').textContent).toBe('₹300');
    fireEvent.click(screen.getByTestId('m2-reorder-watch-oos'));
    await waitFor(() => expect(api.watchStock).toHaveBeenCalledWith('oos'));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('offers to send an in-date prescription to a pharmacist', async () => {
    const api = fakeApi({
      quote: vi.fn(async () => quoteOf([line({ state: 'PRESCRIPTION', requiresPrescription: true })])),
      rxStatus: vi.fn(async () => ({ validCount: 1, latestValidUntil: 1_790_000_000 })),
    });
    const vm = new ReorderViewModel('o1', ['i1'], api, noPayment);
    void vm.load();
    const links = reorderLinks();
    wrap(<M2ReorderView vm={vm} links={links} />);
    await waitFor(() => expect(screen.getByTestId('m2-reorder-rx-send')).toBeTruthy());
    fireEvent.click(screen.getByTestId('m2-reorder-rx-send'));
    expect(links.sendPrescription).toHaveBeenCalled();
    expect(screen.getByTestId('m2-reorder-not-ready')).toBeTruthy();
  });
});
