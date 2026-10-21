import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WebScanVerifyScreen } from '../WebScanVerifyScreen';
import { ApiError } from '@/data/services/http';
import { isStopped, resetCounterSession } from '@/features/partner/work/counterSession';

/**
 * WP-15 WebScanVerify (Tier 1, approved 2026-10-21). The counter check fails
 * closed: only a 200 from POST /identity/verify moves on, the person decides,
 * and "not the same" stops the student for the session.
 */

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'counter-1', fullName: 'MedPlus Bachupally', role: 'VENDOR', partnerKind: 'PHARMACY' } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

const IDENTITY = { memberId: 'SK-ABC123', fullName: 'Asha Rao', university: 'Test University', rollNumber: '22071A0514', campusStatus: 'VERIFIED' as const };
const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

function enterPass(code = '482910', memberId = 'sk-abc123') {
  fireEvent.change(screen.getByRole('textbox', { name: /member number on the pass/i }), { target: { value: memberId } });
  fireEvent.change(screen.getByRole('textbox', { name: '6-digit code' }), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

function expectNothingVerified() {
  expect(screen.queryByText('Asha Rao')).toBeNull();
  expect(screen.queryByText(/LIVE PASS CONFIRMED/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Same person' })).toBeNull();
}

beforeEach(() => { resetCounterSession(); setOnline(true); });
afterEach(() => setOnline(true));

describe('WebScanVerify', () => {
  it('has the navy header, the visit types as a radio group and the counter rules', () => {
    render(<WebScanVerifyScreen verify={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Verify student' })).toBeInTheDocument();
    const types = screen.getByRole('radiogroup', { name: 'Visit type' });
    expect(within(types).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Pharmacy', 'Lab', 'Clinic', 'Camp / van']);
    expect(within(types).getByRole('radio', { name: 'Pharmacy' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('RULES AT THE COUNTER')).toBeInTheDocument();
    // No camera scanner and no "Simulate a scan": the frame says it isn't connected.
    expect(screen.getByRole('img', { name: 'Pass scanner' })).toHaveTextContent(/isn’t connected yet/);
    expect(screen.queryByRole('button', { name: /simulate/i })).toBeNull();
  });

  it('sends the code and member id to the server, then asks the person to decide', async () => {
    const verify = vi.fn().mockResolvedValue(IDENTITY);
    render(<WebScanVerifyScreen verify={verify} />);
    enterPass();
    await waitFor(() => expect(verify).toHaveBeenCalledWith({ code: '482910', memberId: 'SK-ABC123' }));
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    // A live pass is not the person: nothing is verified yet.
    expect(screen.queryByText(/Verified · Asha Rao/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Compare with the person' }));
    expect(screen.getByText('Not available')).toBeInTheDocument();
    const decide = screen.getByRole('group', { name: 'Is this Asha Rao?' });
    const buttons = within(decide).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Not the same', 'Same person']);
    fireEvent.click(within(decide).getByRole('button', { name: 'Same person' }));
    expect(screen.getByRole('status')).toHaveTextContent('Verified · Asha Rao');
    expect(within(screen.getByRole('complementary')).getByText('Asha Rao')).toBeInTheDocument();
  });

  it.each([
    [410, /expired or was already used/],
    [404, /No live pass matches/],
    [429, /Too many checks/],
    [500, /Couldn’t check this pass/],
  ])('a %s from the server stops the counter and verifies nobody', async (status, message) => {
    render(<WebScanVerifyScreen verify={vi.fn().mockRejectedValue(new ApiError('nope', status))} />);
    enterPass();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expectNothingVerified();
  });

  it('a network failure is never a pass', async () => {
    render(<WebScanVerifyScreen verify={vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))} />);
    enterPass();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn’t check this pass/);
    expectNothingVerified();
  });

  it('offline: nothing is sent and nothing is verified', async () => {
    setOnline(false);
    const verify = vi.fn();
    render(<WebScanVerifyScreen verify={verify} />);
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/You’re offline/);
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    expect(verify).not.toHaveBeenCalled();
    expectNothingVerified();
  });

  it('going offline in the middle of a check stops it', async () => {
    render(<WebScanVerifyScreen verify={vi.fn().mockResolvedValue(IDENTITY)} />);
    enterPass();
    await screen.findByText('Asha Rao');
    act(() => { setOnline(false); window.dispatchEvent(new Event('offline')); });
    expect(await screen.findByText('Students can’t be verified until you’re back online. Don’t hand over, collect or open anything.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compare with the person' })).toBeNull();
  });

  it('"Not the same" stops the student for the session, even if the pass scans again', async () => {
    const verify = vi.fn().mockResolvedValue(IDENTITY);
    render(<WebScanVerifyScreen verify={verify} />);
    enterPass();
    fireEvent.click(await screen.findByRole('button', { name: 'Compare with the person' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not the same' }));
    const stop = screen.getByRole('alert');
    expect(stop).toHaveTextContent('Stop — don’t continue');
    expect(within(stop).getByRole('button', { name: 'Flag and notify the student' })).toBeDisabled();
    expect(isStopped('SK-ABC123')).toBe(true);
    fireEvent.click(within(stop).getByRole('button', { name: 'Next student' }));
    enterPass('111222');
    expect(await screen.findByText('Stopped earlier at this counter')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compare with the person' })).toBeNull();
  });

  it('the manual check cannot verify anyone yet (no roll-number lookup)', () => {
    render(<WebScanVerifyScreen verify={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Student has no phone\? Manual check/ }));
    fireEvent.change(screen.getByRole('textbox', { name: /roll number/i }), { target: { value: '22071a0514' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Find student' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Can’t check by roll number here');
    expectNothingVerified();
  });

  it('after a match, continue opens the page for the visit type', async () => {
    const onNavigate = vi.fn();
    render(<WebScanVerifyScreen verify={vi.fn().mockResolvedValue(IDENTITY)} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Lab' }));
    enterPass();
    fireEvent.click(await screen.findByRole('button', { name: 'Compare with the person' }));
    fireEvent.click(screen.getByRole('button', { name: 'Same person' }));
    fireEvent.click(screen.getByRole('button', { name: /Scan the sample tube/ }));
    expect(onNavigate).toHaveBeenCalledWith('run-sheet');
  });

  it('keeps the session in memory only, never in storage (no PHI in client storage)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<WebScanVerifyScreen verify={vi.fn().mockResolvedValue(IDENTITY)} />);
    enterPass();
    fireEvent.click(await screen.findByRole('button', { name: 'Compare with the person' }));
    fireEvent.click(screen.getByRole('button', { name: 'Same person' }));
    expect(setItem.mock.calls.some(([, value]) => String(value).includes('Asha'))).toBe(false);
    setItem.mockRestore();
  });
});

