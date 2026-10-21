import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DispenseRegisterScreen } from '../DispenseRegisterScreen';
import { VendorOrdersScreen } from '../VendorOrdersScreen';
import { VendorHandoverScreen } from '../VendorHandoverScreen';
import { VendorSubstitutionScreen } from '../VendorSubstitutionScreen';
import type { Dispense, DispenseItem, RegisterEntry } from '@/features/partner/work/pharmacyWork';
import { bindCounter, recordMismatch, recordVerified, resetCounterSession } from '@/features/partner/work/counterSession';

/** WP-15 pharmacy boards (Tier 1, approved 2026-10-21): fixtures only, never shipped. */

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'ph-1', fullName: 'Fixture Pharmacy', role: 'VENDOR', partnerKind: 'PHARMACY' } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));
const advanceDispense = vi.fn();
const proposeSubstitution = vi.fn();
vi.mock('@/features/partner/work/pharmacyWork', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/partner/work/pharmacyWork')>()),
  advanceDispense: (...args: unknown[]) => advanceDispense(...args),
  proposeSubstitution: (...args: unknown[]) => proposeSubstitution(...args),
}));

const now = Date.now() / 1000;
const item = (over: Partial<DispenseItem> = {}): DispenseItem => ({ id: 'i1', genericName: 'Cetirizine', brandName: '', strength: '10 mg', form: 'tablet', dose: '1 tablet', frequency: 'daily', quantity: 5, scheduleClass: 'OTC', registerRequired: false, substitutionAllowed: true, ...over });
const dispense = (over: Partial<Dispense> = {}): Dispense => ({
  id: 'disp-0001', prescriptionId: 'p1', patientId: 'acc1', status: 'RX_VERIFIED', verifiedBy: 'R. Kumar', verifiedAt: now - 60, substitutionNote: '', rejectionReason: '',
  delivery: { mode: 'pickup' }, createdAt: now - 3600, updatedAt: now - 60, quoteStatus: 'NONE', nextStates: [],
  prescription: { id: 'p1', prescriberRegNo: 'NMC-TS-1', issuedAt: now - 86400, validUntil: now + 86400, items: [item()] }, ...over,
});
const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

beforeEach(() => { advanceDispense.mockReset(); proposeSubstitution.mockReset(); resetCounterSession(); setOnline(true); });
afterEach(() => setOnline(true));

describe('DispenseRegister', () => {
  const register: RegisterEntry[] = [{ dispenseId: 'reg-aaaa-1111', prescriptionId: 'p9', verifiedBy: 'S. Kulkarni', verifiedAt: now - 100, dispensedAt: now - 50, items: [{ genericName: 'Alprazolam', strength: '0.25 mg', quantity: 10, scheduleClass: 'H1' }] }];

  it('lists the server register with the prescriber’s registration, append-only, with no edit or export', async () => {
    const dispenses = [dispense({ id: 'reg-aaaa-1111', status: 'DELIVERED', prescription: { id: 'p9', prescriberRegNo: 'NMC-TS-71029', issuedAt: now, validUntil: now, items: [] } })];
    render(<DispenseRegisterScreen source={async () => ({ register, dispenses })} />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Alprazolam 0.25 mg × 10')).toBeInTheDocument();
    expect(within(table).getByText('NMC-TS-71029')).toBeInTheDocument();
    expect(within(table).getByText('S. Kulkarni')).toBeInTheDocument();
    expect(screen.getByText(/append-only/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|delete|export|csv|download/i })).toBeNull();
    // No retention claim the server does not enforce.
    expect(screen.queryByText(/three years/i)).toBeNull();
    expect(screen.getByText('Register gaps').nextElementSibling).toHaveTextContent('—');
  });

  it('a proposed swap opens read-only: the prescriber decides, never "Sign and dispense"', async () => {
    const dispenses = [dispense({ id: 'swap-0001', status: 'SUBSTITUTION_PROPOSED', substitutionNote: 'Azithral 500 instead of Azee 500' })];
    render(<DispenseRegisterScreen source={async () => ({ register: [], dispenses })} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Substitutions' }));
    fireEvent.click(screen.getByRole('button', { name: /Open the proposed swap/ }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText(/The prescriber decides a swap, not the pharmacy/)).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: /sign/i })).toBeNull();
  });

  it('fails closed when the register does not load', async () => {
    render(<DispenseRegisterScreen source={async () => { throw new Error('down'); }} />);
    expect(await screen.findByText('Ref RX-REGISTER · DispenseRegister')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('VendorOrders', () => {
  it('Pack is absent for an order awaiting a pharmacist, and shown only when the server offers it', async () => {
    const items = [
      dispense({ id: 'blocked-01', status: 'RX_ISSUED', nextStates: ['RX_VERIFIED', 'REJECTED', 'CANCELLED'] }),
      dispense({ id: 'paid-0002', status: 'ACCEPTED', quoteStatus: 'PAID', nextStates: ['PACKED', 'REJECTED', 'CANCELLED'] }),
    ];
    render(<VendorOrdersScreen source={async () => ({ items })} />);
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Blocked')).toBeInTheDocument();
    expect(within(rows[0]).queryByRole('button', { name: /^Pack/ })).toBeNull();
    expect(within(rows[0]).getByRole('button', { name: /Review the prescription/ })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('button', { name: /^Pack order/ })).toBeEnabled();
    expect(screen.getByText('1 blocked')).toBeInTheDocument();
  });

  it('shows no price on a prescription row (Rule L) and no diagnosis', async () => {
    render(<VendorOrdersScreen source={async () => ({ items: [dispense({ quoteStatus: 'PAID' })] })} />);
    const table = await screen.findByRole('table');
    expect(table.textContent).not.toMatch(/₹/);
    expect(within(table).getByText('Paid')).toBeInTheDocument();
  });

  it('packs through the server; offline it cannot', async () => {
    advanceDispense.mockResolvedValue({});
    const source = vi.fn(async () => ({ items: [dispense({ id: 'paid-0002', status: 'ACCEPTED', quoteStatus: 'PAID', nextStates: ['PACKED'] })] }));
    const { unmount } = render(<VendorOrdersScreen source={source} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Pack order/ }));
    await waitFor(() => expect(advanceDispense).toHaveBeenCalledWith('paid-0002', 'PACKED'));
    unmount();
    setOnline(false);
    render(<VendorOrdersScreen source={source} />);
    expect(await screen.findByRole('button', { name: /^Pack order/ })).toBeDisabled();
  });
});

describe('VendorHandover', () => {
  it('starts from the counter session; handing over is never recorded here', () => {
    render(<VendorHandoverScreen />);
    expect(screen.getByText('Nobody verified at this counter.')).toBeInTheDocument();
    expect(screen.getByText('Handover records aren’t connected yet.')).toBeInTheDocument();
    for (const label of ['Handovers today', 'Refused', 'OTP expired', 'OTP validity']) expect(screen.getByText(label).nextElementSibling).toHaveTextContent('—');
  });

  it('shows the verified student, with the hand-over button disabled and the reason', () => {
    bindCounter('ph-1');
    recordVerified({ memberId: 'SK-ACC1', fullName: 'Asha Rao', university: '', rollNumber: '', campusStatus: 'VERIFIED', context: 'pharmacy', verifiedAt: Date.now() });
    render(<VendorHandoverScreen />);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    const hand = screen.getByRole('button', { name: 'Photo & hand over' });
    expect(hand).toBeDisabled();
    expect(hand).toHaveAccessibleDescription(/can’t be recorded here/);
  });

  it('a student stopped as "not the same person" never shows as at the counter', () => {
    bindCounter('ph-1');
    recordVerified({ memberId: 'SK-ACC1', fullName: 'Asha Rao', university: '', rollNumber: '', campusStatus: 'VERIFIED', context: 'pharmacy', verifiedAt: Date.now() });
    recordMismatch('SK-ACC1', 'Asha Rao', Date.now());
    render(<VendorHandoverScreen />);
    expect(screen.queryByText('Asha Rao')).toBeNull();
    expect(screen.getByText('Nobody verified at this counter.')).toBeInTheDocument();
  });
});

describe('VendorSubstitution', () => {
  it('lists prescribed lines; a no-substitution line can never be offered a swap', async () => {
    const items = [dispense({ prescription: { id: 'p', prescriberRegNo: 'R', issuedAt: now, validUntil: now, items: [
      item({ id: 'ok', genericName: 'Calcium carbonate', brandName: 'Shelcal', strength: '500 mg' }),
      item({ id: 'no', genericName: 'Levothyroxine', brandName: 'Eltroxin', strength: '50 mcg', substitutionAllowed: false }),
    ] } })];
    render(<VendorSubstitutionScreen source={async () => ({ items })} />);
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByRole('button', { name: /Offer a generic for Shelcal 500 mg/ })).toBeInTheDocument();
    expect(within(rows[1]).getByText('Swap NOT permitted')).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button')).toBeNull();
    expect(screen.getByText('Saved for students today').nextElementSibling).toHaveTextContent('—');
    // The board's NTI rule is not on the server, so the page does not claim it.
    expect(screen.queryByText(/narrow-therapeutic/i)).toBeNull();
  });

  it('proposes to the prescriber with the server’s fields', async () => {
    proposeSubstitution.mockResolvedValue({});
    const source = vi.fn(async () => ({ items: [dispense({ id: 'dx', prescription: { id: 'p', prescriberRegNo: 'R', issuedAt: now, validUntil: now, items: [item({ id: 'line1' })] } })] }));
    render(<VendorSubstitutionScreen source={source} />);
    fireEvent.click(await screen.findByRole('button', { name: /Offer a generic/ }));
    const drawer = await screen.findByRole('dialog');
    fireEvent.change(within(drawer).getByLabelText(/Generic you propose/), { target: { value: 'Levocetirizine 5 mg' } });
    fireEvent.change(within(drawer).getByLabelText(/Why you propose it/), { target: { value: 'Prescribed brand out of stock' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Send to the prescriber' }));
    await waitFor(() => expect(proposeSubstitution).toHaveBeenCalledWith('dx', { prescriptionItemId: 'line1', proposedGeneric: 'Levocetirizine 5 mg', proposedBrand: '', reason: 'Prescribed brand out of stock' }));
  });

  it('no offer once the student has started paying', async () => {
    render(<VendorSubstitutionScreen source={async () => ({ items: [dispense({ quoteStatus: 'PAYMENT_STARTED' })] })} />);
    const table = await screen.findByRole('table');
    expect(within(table).queryByRole('button', { name: /Offer a generic/ })).toBeNull();
  });
});
