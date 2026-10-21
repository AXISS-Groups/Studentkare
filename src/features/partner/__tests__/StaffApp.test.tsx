import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StaffScanVerifyScreen } from '../staff/StaffScanVerifyScreen';
import { StaffHandoverScreen } from '../staff/StaffHandoverScreen';
import { StaffCollectScreen } from '../staff/StaffCollectScreen';
import type { LabOrder } from '../work/labWork';
import { bindCounter, memberIdForAccount, recordMismatch, recordVerified, resetCounterSession, verifiedIn } from '../work/counterSession';
import type { CounterState } from '../work/counterSession';

/** WP-15 staff app phone boards (Tier 1, approved 2026-10-21): ScanVerify, StaffHandover, StaffCollect. */

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'staff-1', fullName: 'Fixture Labs', role: 'VENDOR', partnerKind: 'LAB' } }) }));
const advanceLabOrder = vi.fn();
vi.mock('../work/labWork', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../work/labWork')>()),
  advanceLabOrder: (...args: unknown[]) => advanceLabOrder(...args),
}));

const now = Date.now() / 1000;
const booking = (over: Partial<LabOrder> = {}): LabOrder => ({
  id: 'book-0001-aaaa', patientId: 'acc42', testPanel: ['Vitamin D', 'B12'], collectionMode: 'HOME', slotStart: '', fastingRequired: false,
  collectorName: 'Fixture', collectorId: 'c1', collectionAddress: null, tubeCount: 0, collectedAt: null, handedOverAt: null, sampleId: '',
  status: 'ASSIGNED', criticalFlag: false, criticalNote: '', criticalAcknowledgedAt: null, rejectionReason: '', hasHeldReport: false,
  reviewedAt: null, awaitingDoctorReview: false, createdAt: now, updatedAt: now, nextStates: ['SAMPLE_COLLECTED', 'CANCELLED'], ...over,
});
const verifyStudent = (accountId = 'acc42', name = 'Krishna C.') => {
  bindCounter('staff-1');
  recordVerified({ memberId: memberIdForAccount(accountId), fullName: name, university: '', rollNumber: '', campusStatus: 'VERIFIED', context: 'lab', verifiedAt: Date.now() });
};
const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

beforeEach(() => { advanceLabOrder.mockReset(); resetCounterSession(); setOnline(true); });
afterEach(() => setOnline(true));

describe('counter session', () => {
  it('a verification belongs to the student it was for, and a stop wins over a later match', () => {
    verifyStudent('acc42');
    const read = (): CounterState => ({ staffId: 'staff-1', current: { memberId: 'SK-ACC42', fullName: 'K', university: '', rollNumber: '', campusStatus: 'VERIFIED', context: 'lab', verifiedAt: 1 }, stopped: new Set(), log: [] });
    expect(verifiedIn(read(), 'acc42')).not.toBeNull();
    expect(verifiedIn(read(), 'acc43')).toBeNull();
    expect(verifiedIn({ ...read(), stopped: new Set(['SK-ACC42']) }, 'acc42')).toBeNull();
    recordMismatch('SK-ACC42', 'K', Date.now());
    expect(recordVerified({ memberId: 'SK-ACC42', fullName: 'K', university: '', rollNumber: '', campusStatus: 'VERIFIED', context: 'lab', verifiedAt: Date.now() })).toBe(false);
  });

  it('another staff account starts with nothing', () => {
    verifyStudent('acc42');
    bindCounter('someone-else');
    render(<StaffHandoverScreen onNavigate={vi.fn()} />);
    // The screen binds to staff-1 again, which also starts empty.
    expect(screen.getByText('No student verified on this device.')).toBeInTheDocument();
  });
});

describe('ScanVerify (staff app)', () => {
  it('is the same fail-closed check in the phone frame, keyboard reachable, and continues to the visit’s board', async () => {
    const onNavigate = vi.fn();
    const verify = vi.fn().mockResolvedValue({ memberId: 'SK-ACC42', fullName: 'Krishna C.', university: 'VNR VJIET', rollNumber: '22071A0514', campusStatus: 'VERIFIED' });
    render(<StaffScanVerifyScreen onNavigate={onNavigate} verify={verify} />);
    expect(screen.getByRole('button', { name: 'Back to the console' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Lab' }));
    fireEvent.change(screen.getByRole('textbox', { name: /member number on the pass/i }), { target: { value: 'SK-ACC42' } });
    fireEvent.change(screen.getByRole('textbox', { name: '6-digit code' }), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Compare with the person' }));
    expect(screen.getByRole('img', { name: 'Face check' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Same person' }));
    fireEvent.click(screen.getByRole('button', { name: /Scan the sample tube/ }));
    expect(onNavigate).toHaveBeenCalledWith('staff-collect');
  });
});

describe('StaffHandover (staff app)', () => {
  it('without a verified student it sends you to verify first, and nothing can be handed over', () => {
    const onNavigate = vi.fn();
    render(<StaffHandoverScreen onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Verify the student' }));
    expect(onNavigate).toHaveBeenCalledWith('staff-verify');
    expect(screen.getByRole('button', { name: 'Hand over' })).toBeDisabled();
  });

  it('with a verified student, the photo, the attestation and the handover stay disabled with their reasons', () => {
    verifyStudent('acc42', 'Krishna C.');
    render(<StaffHandoverScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('Krishna C.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take photo of the bag' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /I told them how and when/ })).toBeDisabled();
    const hand = screen.getByRole('button', { name: 'Hand over to Krishna' });
    expect(hand).toBeDisabled();
    expect(hand).toHaveAccessibleDescription(/can’t be recorded from the staff app yet/);
    expect(screen.getByText('Prescription medicines are never handed to a friend.')).toBeInTheDocument();
  });
});

describe('StaffCollect (staff app)', () => {
  it('finds the verified student’s own booking and records the tube label through the lab step', async () => {
    advanceLabOrder.mockResolvedValue({});
    verifyStudent('acc42', 'Krishna C.');
    const source = vi.fn(async () => ({ items: [booking({ id: 'other', patientId: 'acc99', testPanel: ['CBC'] }), booking()], total: 2, critical: 0 }));
    render(<StaffCollectScreen onNavigate={vi.fn()} source={source} />);
    expect(await screen.findByText('Vitamin D + B12')).toBeInTheDocument();
    expect(screen.queryByText('CBC')).toBeNull();
    const collect = screen.getByRole('button', { name: 'Sample collected' });
    expect(collect).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tube label (sample identifier)'), { target: { value: 'T-5521-B' } });
    expect(collect).toBeEnabled();
    fireEvent.click(collect);
    await waitFor(() => expect(advanceLabOrder).toHaveBeenCalledWith('book-0001-aaaa', 'SAMPLE_COLLECTED', { sampleId: 'T-5521-B' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Sample T-5521-B recorded');
  });

  it('a fasting test cannot be collected here (fasting confirmation is not recorded yet)', async () => {
    verifyStudent('acc42');
    render(<StaffCollectScreen onNavigate={vi.fn()} source={async () => ({ items: [booking({ fastingRequired: true })], total: 1, critical: 0 })} />);
    expect(await screen.findByText(/confirming the student has fasted isn’t recorded yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tube label (sample identifier)'), { target: { value: 'T-1' } });
    expect(screen.getByRole('button', { name: 'Sample collected' })).toBeDisabled();
  });

  it('no verified student: no booking is loaded and nothing can be collected', () => {
    const source = vi.fn();
    render(<StaffCollectScreen onNavigate={vi.fn()} source={source} />);
    expect(source).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Sample collected' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Verify the student' })).toBeInTheDocument();
  });

  it('a student stopped at this counter is never treated as verified', async () => {
    verifyStudent('acc42');
    recordMismatch('SK-ACC42', 'Krishna C.', Date.now());
    const source = vi.fn(async () => ({ items: [booking()], total: 1, critical: 0 }));
    render(<StaffCollectScreen onNavigate={vi.fn()} source={source} />);
    expect(screen.getByText('No student verified on this device.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sample collected' })).toBeNull();
  });

  it('offline: the collect step is disabled', async () => {
    setOnline(false);
    verifyStudent('acc42');
    render(<StaffCollectScreen onNavigate={vi.fn()} source={async () => ({ items: [booking()], total: 1, critical: 0 })} />);
    await screen.findByText('Vitamin D + B12');
    fireEvent.change(screen.getByLabelText('Tube label (sample identifier)'), { target: { value: 'T-1' } });
    const collect = screen.getByRole('button', { name: 'Sample collected' });
    expect(collect).toBeDisabled();
    expect(within(collect.parentElement as HTMLElement).getByText(/You’re offline/)).toBeInTheDocument();
  });
});
