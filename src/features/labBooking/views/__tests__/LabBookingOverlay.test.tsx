import React, { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PACKAGE, SLOTS, booking } from '../../viewmodel/__tests__/labFixtures';
import { LabBookingOverlay } from '../LabBookingOverlay';

const PAY = '/lab-orders/order-abcdef12/payment';
const routes: Record<string, unknown> = {
  'GET /lab-packages': { items: [PACKAGE] },
  'GET /lab-packages/pkg/slots': { slots: SLOTS },
  'POST /lab-bookings': booking('UNPAID'),
  [`POST ${PAY}`]: {
    configured: true, status: 'CREATED', intentId: 'pi_1', provider: 'mock', testMode: true,
    providerOrderId: 'mock_order_1', amountPaise: 64900, currency: 'INR', expiresAt: 0,
    payable: { kind: 'lab_order', id: 'order-abcdef12' }, checkout: { testCards: [] },
  },
};
const calls: string[] = [];

vi.mock('@/data/services/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/services/http')>();
  return {
    ...actual,
    apiRequest: vi.fn(async (path: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${path}`;
      calls.push(key);
      return routes[key];
    }),
  };
});
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', fullName: 'Krishna C.', role: 'STUDENT' } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

afterEach(() => { calls.length = 0; });

describe('LabBookingOverlay (live-run audit #2)', () => {
  it('goes on to the Pay step under StrictMode, attached to the page', async () => {
    render(<StrictMode><LabBookingOverlay itemId="pkg" onClose={vi.fn()} /></StrictMode>);
    await screen.findByTestId('lab-slot-s-am');
    fireEvent.change(screen.getByLabelText('Hostel block'), { target: { value: 'Block B' } });
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '214' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and pay ₹649' }));
    // screen.* searches document.body: a Pay step rendered into a detached node is not found.
    expect(await screen.findByTestId('pay-step')).toBeInTheDocument();
    expect(screen.getByTestId('lab-booking-overlay')).toBeInTheDocument();
    // One payment request, though StrictMode mounts the Pay step twice (live-run audit #9).
    await waitFor(() => expect(calls.filter((c) => c === `POST ${PAY}`)).toHaveLength(1));
  });

  it('Esc in the slot sheet closes the sheet only; Esc on the page closes the page', async () => {
    const onClose = vi.fn();
    render(<LabBookingOverlay itemId="pkg" onClose={onClose} />);
    const sheet = await screen.findByTestId('lab-sheet');
    fireEvent.keyDown(sheet, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId('lab-booking-overlay'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
