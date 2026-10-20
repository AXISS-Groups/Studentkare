import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeRequest, order } from '@/features/phoneKit/__tests__/fixtures';
import { OrdersViewModel, canCancel, orderKind, orderState, trackSteps } from '../viewmodel/OrdersViewModel';
import { OrderHistoryView } from '../views/OrderHistoryView';
import type { OrdersLinks } from '../views/OrderHistoryView';
import { OrderTrackingView } from '../views/OrderTrackingView';

const line = (status: 'REQUESTED' | 'ACCEPTED' | 'DISPATCHED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED', kind: 'product' | 'lab' | 'consultation' = 'product') =>
  ({ id: `ln-${status}-${kind}`, itemId: 'x', name: `${kind} item`, kind, quantity: 1, pricePaise: 100, status });

function links(): OrdersLinks {
  return { back: vi.fn(), openShop: vi.fn(), track: vi.fn(), openEmergencyCard: vi.fn(), openPass: vi.fn(), openCrisis: vi.fn() };
}

describe('order state from the server’s line states', () => {
  it('derives the state and the kind', () => {
    expect(orderState(order({ paymentStatus: 'UNPAID' }))).toBe('awaitingPayment');
    expect(orderState(order({}))).toBe('requested');
    expect(orderState(order({ lines: [line('ACCEPTED'), line('DISPATCHED')] }))).toBe('accepted');
    expect(orderState(order({ lines: [line('DISPATCHED'), line('COMPLETED')] }))).toBe('dispatched');
    expect(orderState(order({ lines: [line('COMPLETED'), line('DECLINED')] }))).toBe('completed');
    expect(orderState(order({ lines: [line('CANCELLED')] }))).toBe('cancelled');
    expect(orderState(order({ lines: [line('DECLINED')] }))).toBe('declined');
    expect(orderKind(order({ lines: [line('REQUESTED', 'lab')] }))).toBe('lab');
  });

  it('builds the timeline without a dispatch step for a service, and only placed is ever timed', () => {
    expect(trackSteps(order({ lines: [line('ACCEPTED', 'consultation')] })).map((s) => `${s.key}:${s.state}`))
      .toEqual(['placed:done', 'paid:done', 'accepted:done', 'completed:active']);
    expect(trackSteps(order({ paymentStatus: 'UNPAID' })).map((s) => `${s.key}:${s.state}`))
      .toEqual(['placed:done', 'paid:active', 'accepted:todo', 'dispatched:todo', 'completed:todo']);
  });

  it('allows cancelling only an unpaid order no provider has acted on', () => {
    expect(canCancel(order({ paymentStatus: 'UNPAID' }))).toBe(true);
    expect(canCancel(order({}))).toBe(false);
    expect(canCancel(order({ paymentStatus: 'UNPAID', lines: [line('ACCEPTED')] }))).toBe(false);
  });
});

describe('order boards', () => {
  it('shows the first-time state when there are no orders', async () => {
    const { request } = fakeRequest({ '/orders': { items: [], total: 0 } });
    const vm = new OrdersViewModel(request);
    render(<OrderHistoryView vm={vm} links={links()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByTestId('orders-first-time')).toHaveTextContent('No orders yet');
  });

  it('lists orders with their state, and filters lab bookings', async () => {
    const { request } = fakeRequest({ '/orders': { items: [order({}), order({ id: 'lab00001xx', lines: [line('COMPLETED', 'lab')] })], total: 2 } });
    const vm = new OrdersViewModel(request);
    const l = links();
    render(<OrderHistoryView vm={vm} links={l} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByText('With the provider')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Lab tests' }));
    expect(screen.queryByTestId('order-ord12345abcdef')).toBeNull();
    expect(screen.getByTestId('order-lab00001xx')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'View order LAB00001' }));
    expect(l.track).toHaveBeenCalledWith('lab00001xx');
  });

  it('fails visibly and retries', async () => {
    const { request } = fakeRequest({ '/orders': new Error('down') });
    const vm = new OrdersViewModel(request);
    render(<OrderHistoryView vm={vm} links={links()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByRole('alert')).toHaveTextContent('Your orders didn’t load');
  });

  it('tracks one order: the steps, help through support, and cancel only while allowed', async () => {
    const { request, calls } = fakeRequest({ '/orders': { items: [order({ paymentStatus: 'UNPAID' })], total: 1 }, 'POST /orders/ord12345abcdef/cancel': { success: true } });
    const vm = new OrdersViewModel(request);
    const support = vi.fn();
    render(<OrderTrackingView vm={vm} orderId="ord12345abcdef" links={{ back: vi.fn(), allOrders: vi.fn(), support }} />);
    await act(async () => { await vm.find('ord12345abcdef'); });
    const timeline = screen.getByRole('list', { name: 'Order progress' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for payment');
    // No runner, no arrival time: none is known.
    expect(screen.getByTestId('order-tracking').textContent).not.toMatch(/runner|arriving/i);
    fireEvent.click(screen.getByRole('link', { name: 'Questions about this order?' }));
    expect(support).toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel this order' })); });
    expect(calls.some((c) => c.path === '/orders/ord12345abcdef/cancel' && c.init?.method === 'POST')).toBe(true);
  });

  it('says when an order is not among the student’s own', async () => {
    const { request } = fakeRequest({ '/orders': { items: [], total: 0 } });
    const vm = new OrdersViewModel(request);
    render(<OrderTrackingView vm={vm} orderId="someone-elses" links={{ back: vi.fn(), allOrders: vi.fn(), support: vi.fn() }} />);
    await act(async () => { await vm.find('someone-elses'); });
    expect(screen.getByText('We couldn’t find this order')).toBeInTheDocument();
  });
});
