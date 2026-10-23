import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PartnerStaffScreen } from '../PartnerStaffScreen';
import type { LabCollector } from '@/features/partner/partnerApi';

const partner = { partnerKind: 'LAB' };
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'acct-1', fullName: 'Vijaya Diagnostics', role: 'VENDOR', partnerKind: partner.partnerKind } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));
const addCollector = vi.fn();
const retireCollector = vi.fn();
vi.mock('@/features/partner/partnerApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/partner/partnerApi')>()),
  addCollector: (...args: unknown[]) => addCollector(...args),
  retireCollector: (...args: unknown[]) => retireCollector(...args),
}));

const person = (over: Partial<LabCollector> = {}): LabCollector => ({
  id: 'col-1', accountId: 'a1', labId: 'lab-1', fullName: 'Imran Shaik', identifier: '9876543210', channel: 'WHATSAPP', active: true, createdAt: 1_760_000_000, ...over,
});

describe('PartnerStaff', () => {
  beforeEach(() => { partner.partnerKind = 'LAB'; addCollector.mockReset(); retireCollector.mockReset(); });

  it('a lab sees its own collectors; counts with no source read "—"', async () => {
    render(<PartnerStaffScreen source={vi.fn(async () => ({ items: [person(), person({ id: 'col-2', fullName: 'Deepa Rao', active: false })], total: 2 }))} />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Imran Shaik')).toBeInTheDocument();
    expect(within(table).getAllByText('Sample collector')).toHaveLength(2);
    expect(within(table).getByText('Removed')).toBeInTheDocument();
    expect(within(table).queryByText('42')).toBeNull();
    // Only an active person can be removed.
    expect(within(table).getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
  });

  it('removing asks first, says they are signed out, then deactivates them', async () => {
    retireCollector.mockResolvedValue(person({ active: false }));
    const source = vi.fn(async () => ({ items: [person()], total: 1 }));
    render(<PartnerStaffScreen source={source} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Imran Shaik' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Remove Imran Shaik?' });
    expect(dialog).toHaveTextContent(/signed out of the staff app at once/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(retireCollector).toHaveBeenCalledWith('col-1'));
    await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  });

  it('adds a collector with their own sign-in, after validating the contact', async () => {
    addCollector.mockResolvedValue(person({ id: 'col-9', fullName: 'Sunita M' }));
    render(<PartnerStaffScreen source={vi.fn(async () => ({ items: [person()], total: 1 }))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add staff' }));
    const drawer = await screen.findByRole('dialog', { name: 'Add a sample collector' });
    fireEvent.change(within(drawer).getByLabelText('Full name'), { target: { value: 'Sunita M' } });
    fireEvent.change(within(drawer).getByLabelText('Mobile number'), { target: { value: '12345' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add collector' }));
    expect(await within(drawer).findByText('Enter a 10-digit Indian mobile number.')).toBeInTheDocument();
    expect(addCollector).not.toHaveBeenCalled();
    fireEvent.change(within(drawer).getByLabelText('Mobile number'), { target: { value: '9123456780' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add collector' }));
    await waitFor(() => expect(addCollector).toHaveBeenCalledWith({ fullName: 'Sunita M', identifier: '9123456780', channel: 'WHATSAPP' }));
  });

  it('a pharmacy’s staff are not connected: no rows, Add staff unavailable, the pharmacist rule kept', () => {
    partner.partnerKind = 'PHARMACY';
    const source = vi.fn(async () => ({ items: [], total: 0 }));
    render(<PartnerStaffScreen source={source} />);
    expect(source).not.toHaveBeenCalled();
    expect(screen.getByText('Staff for your partner type aren’t connected yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add staff/ })).toBeDisabled();
    expect(screen.getByText(/only a pharmacist with a council registration can hand over prescription medicines/)).toBeInTheDocument();
    expect(screen.getByText(/remove them the same day/)).toBeInTheDocument();
    for (const fake of [/Ravi K/, /TSPC 45821/, /Sunita/]) expect(screen.queryByText(fake)).toBeNull();
  });

  it('error and empty states', async () => {
    const { unmount } = render(<PartnerStaffScreen source={vi.fn(async () => { throw new Error('down'); })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load your staff');
    unmount();
    render(<PartnerStaffScreen source={vi.fn(async () => ({ items: [], total: 0 }))} />);
    expect(await screen.findByRole('heading', { name: 'No staff yet.' })).toBeInTheDocument();
  });
});
