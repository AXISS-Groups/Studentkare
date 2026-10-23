import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { VendorReturnsScreen } from '../VendorReturnsScreen';
import type { PartnerReturn } from '@/features/partner/partnerApi';

const decideReturn = vi.fn();
const markReturnPickedUp = vi.fn();
vi.mock('@/features/partner/partnerApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/partner/partnerApi')>()),
  decideReturn: (...args: unknown[]) => decideReturn(...args),
  markReturnPickedUp: (...args: unknown[]) => markReturnPickedUp(...args),
}));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

const row = (over: Partial<PartnerReturn> & { student?: string } = {}): PartnerReturn => ({
  id: 'r1', orderLineId: 'line-00040188', item: 'Daily Multivitamin Essentials', reason: 'WRONG_ITEM', note: 'Wrong pack size sent',
  hasPhoto: true, status: 'REQUESTED', refundPaise: null, refundStatus: null, decisionNote: null, createdAt: 1_760_000_000, updatedAt: null, ...over,
});

const withStudent = (r: PartnerReturn) => ({ ...r, student: 'Rohith Varma' });

describe('VendorReturns', () => {
  beforeEach(() => { decideReturn.mockReset(); markReturnPickedUp.mockReset(); });

  it('lists this partner’s returns without the student’s name, with the board’s columns and figures', async () => {
    const items = [withStudent(row()), withStudent(row({ id: 'r2', orderLineId: 'line-00040144', item: 'Barrier Care', reason: 'DAMAGED', note: null, hasPhoto: false, status: 'DECLINED', decisionNote: 'Seal intact at handover' })), withStudent(row({ id: 'r3', orderLineId: 'line-00040160', status: 'APPROVED', refundPaise: 29900, hasPhoto: false, note: null }))];
    render(<VendorReturnsScreen source={vi.fn(async () => ({ items }))} />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('#040188')).toBeInTheDocument();
    expect(within(table).getAllByText('Wrong item sent')).toHaveLength(2);
    expect(within(table).getByText('Seal intact at handover')).toBeInTheDocument();
    expect(within(table).getByText('Refund ₹299 to arrange')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'View photo' })).toHaveAttribute('href', expect.stringContaining('/work/returns/r1/photo'));
    expect(screen.queryByText(/Rohith/)).toBeNull();
    expect(screen.getByText('Return rate').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('Refused with a reason').nextElementSibling).toHaveTextContent('1');
  });

  it('approves with a refund in paise, after checking the amount', async () => {
    decideReturn.mockResolvedValue({});
    const source = vi.fn(async () => ({ items: [row()] }));
    render(<VendorReturnsScreen source={source} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve the return of Daily Multivitamin Essentials' }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve return: Daily Multivitamin Essentials' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(await within(dialog).findByText('Enter an amount above ₹0, up to what was paid.')).toBeInTheDocument();
    expect(decideReturn).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Refund amount (₹)'), { target: { value: '149.50' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(decideReturn).toHaveBeenCalledWith('r1', 'APPROVED', 14950, ''));
    await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  });

  it('declining needs a reason the student will see', async () => {
    decideReturn.mockResolvedValue({});
    render(<VendorReturnsScreen source={vi.fn(async () => ({ items: [row()] }))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline the return of Daily Multivitamin Essentials' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));
    expect(await within(dialog).findByText('Tell the student why, in at least a few words.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Why (the student sees this)'), { target: { value: 'Opened medicine cannot be resold.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(decideReturn).toHaveBeenCalledWith('r1', 'DECLINED', 0, 'Opened medicine cannot be resold.'));
  });

  it('marks an approved return picked up', async () => {
    markReturnPickedUp.mockResolvedValue({});
    render(<VendorReturnsScreen source={vi.fn(async () => ({ items: [row({ status: 'APPROVED', refundPaise: 1000 })] }))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Daily Multivitamin Essentials picked up' }));
    await waitFor(() => expect(markReturnPickedUp).toHaveBeenCalledWith('r1'));
  });

  it('opens the returns policy', async () => {
    render(<VendorReturnsScreen source={vi.fn(async () => ({ items: [row()] }))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Returns policy' }));
    expect(await screen.findByRole('dialog', { name: 'Returns policy' })).toHaveTextContent(/at most what was paid/);
  });

  it('empty keeps the hostel visits and refills below; error has retry and reference', async () => {
    const { unmount } = render(<VendorReturnsScreen source={vi.fn(async () => ({ items: [] }))} liveRequests={<p>visits and refills</p>} />);
    expect(await screen.findByRole('heading', { name: 'No returns.' })).toBeInTheDocument();
    expect(screen.getByText('visits and refills')).toBeInTheDocument();
    unmount();
    render(<VendorReturnsScreen source={vi.fn(async () => { throw new Error('down'); })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load returns');
    expect(screen.getByText('Ref RETURNS · VendorReturns')).toBeInTheDocument();
  });
});
