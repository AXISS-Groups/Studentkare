import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { NewRequestViewModel } from '../../viewmodel/RequestsViewModel';
import { ReturnRequestView } from '../ReturnRequestView';
import { ResultRefundView } from '../ResultRefundView';
import { ResultCampBookedView } from '@/features/camp/views/ResultCampBookedView';

const ELIGIBLE = { items: [
  { orderLineId: 'l1', orderId: 'ord55140000', item: 'Sunscreen SPF 50', quantity: 1, pricePaise: 34900, orderedAt: 1_760_000_000 },
  { orderLineId: 'l2', orderId: 'ord55140000', item: 'Daily Multivitamin', quantity: 1, pricePaise: 29900, orderedAt: 1_760_000_000 },
] };

describe('Return or refund', () => {
  it('needs an item and a reason, shows the item’s price as the refund, then the pending result (never a promised refund)', async () => {
    const { request, calls } = fakeRequest({ '/returns/eligible': ELIGIBLE, 'POST /returns': { return: { id: 'ret0212ffff' } } });
    const vm = new NewRequestViewModel('RETURN', request);
    const upload = vi.fn(async () => undefined);
    const done = vi.fn();
    render(<ReturnRequestView vm={vm} links={{ done, pickPhoto: async () => ({ name: 'photo.jpg', upload }) }} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByTestId('return-submit')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Sunscreen SPF 50, ₹349' }));
    expect(screen.getByTestId('return-amount')).toHaveTextContent('₹349');
    fireEvent.click(screen.getByRole('button', { name: 'Damaged or seal broken' }));
    await act(async () => { fireEvent.click(screen.getByTestId('return-photo')); });
    expect(screen.getByRole('button', { name: 'photo.jpg · added' })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Request a return · ₹349' })); });
    expect(calls.find((c) => c.path === '/returns')?.init?.body).toBe(JSON.stringify({ orderLineId: 'l1', reason: 'DAMAGED', note: '' }));
    const result = await screen.findByTestId('result-refund-card');
    expect(result).toHaveTextContent('Return requested');
    expect(result).toHaveTextContent('Up to ₹349, if the return is accepted');
    expect(screen.queryByTestId('result-confetti')).toBeNull();
    expect(upload).toHaveBeenCalledWith('ret0212ffff');
    fireEvent.click(screen.getByRole('button', { name: 'Track this return' }));
    expect(done).toHaveBeenCalled();
  });

  it('says there is nothing to return, with a way back', async () => {
    const { request } = fakeRequest({ '/returns/eligible': { items: [] } });
    const vm = new NewRequestViewModel('RETURN', request);
    const done = vi.fn();
    render(<ReturnRequestView vm={vm} links={{ done }} />);
    await act(async () => { await vm.load(); });
    fireEvent.click(screen.getByRole('button', { name: 'Back to my requests' }));
    expect(done).toHaveBeenCalled();
    // Native: no picker, so no photo row.
    expect(screen.queryByTestId('return-photo')).toBeNull();
  });

  it('offers no receipt for a refund that has not happened', () => {
    render(<ResultRefundView request={{ returnId: 'ret1', item: 'Sunscreen', orderId: 'ord1', pricePaise: 100 }} onBack={vi.fn()} onTrack={vi.fn()} onAnother={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Receipt — available once a refund is issued' })).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('camp booked', () => {
  it('celebrates a booking with the server’s camp, slot and place, and adds it to the calendar', () => {
    const onCalendar = vi.fn();
    render(<ResultCampBookedView studentName="Asha Rao" onBack={vi.fn()} onSeeCamp={vi.fn()} onCalendar={onCalendar}
      booking={{ bookingId: 'c1:s1', camp: { id: 'c1', name: 'Flu shot camp', date: '2026-10-27', location: 'Block C lobby', whatToBring: 'College ID' }, slot: { id: 's1', slotStart: '09:00 AM', slotEnd: '09:15 AM' } }} />);
    const card = screen.getByTestId('result-camp-card');
    expect(card).toHaveTextContent('You’re booked for Flu shot camp');
    expect(card).toHaveTextContent('2026-10-27 · 09:00 AM–09:15 AM · Block C lobby');
    expect(card).toHaveTextContent('No charge for this booking');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(onCalendar).toHaveBeenCalled();
  });
});
