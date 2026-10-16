import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WebScanVerifyScreen } from '../WebScanVerifyScreen';
import { ApiError } from '../../../data/http';

// Mock AuthContext
vi.mock('../../../data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-vendor',
      fullName: 'Demo Wellness Store',
      role: 'VENDOR',
      email: 'vendor@studentkare.test',
    },
    logout: vi.fn(),
  }),
}));

// Mock workflowRouting
vi.mock('../../../lib/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

// The real ApiError, a mocked request: the screen talks to POST /identity/verify only.
const apiRequest = vi.fn();
vi.mock('../../../data/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data/http')>();
  return { ...actual, apiRequest: (...args: unknown[]) => apiRequest(...args) };
});

const IDENTITY = {
  memberId: 'SK-ABC123',
  fullName: 'Asha Rao',
  university: 'Test University',
  rollNumber: '22071A0514',
  campusStatus: 'VERIFIED',
};

function enterPass(code = '482910', memberId = 'sk-abc123') {
  fireEvent.change(screen.getByRole('textbox', { name: /member number/i }), { target: { value: memberId } });
  fireEvent.change(screen.getByRole('textbox', { name: /6-digit code/i }), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

function expectNothingVerified() {
  expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
  expect(screen.queryByText(/LIVE PASS CONFIRMED/)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { level: 2, name: /verified/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /compare with their college id card/i })).not.toBeInTheDocument();
}

describe('WebScanVerifyScreen', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('renders the Partner brand and Verify student title by default', () => {
    render(<WebScanVerifyScreen />);
    expect(screen.getByText('PARTNER')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Verify student' })).toBeInTheDocument();
    expect(screen.getByText('Partner counter · Demo Wellness Store')).toBeInTheDocument();
    expect(screen.queryByText(/MedPlus/i)).not.toBeInTheDocument();
  });

  it('renders the left navigation sidebar with STORE, LAB, and BUSINESS sections and active Verify student item', () => {
    render(<WebScanVerifyScreen />);
    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();

    const sidebar = screen.getByLabelText('Partner pages');
    expect(sidebar).toBeInTheDocument();

    const verifyBtn = screen.getByRole('button', { name: /verify student/i });
    expect(verifyBtn).toHaveAttribute('aria-current', 'page');
  });

  it('navigates back to home when clicking Home in sidebar', () => {
    const onNavigate = vi.fn();
    render(<WebScanVerifyScreen onNavigate={onNavigate} />);

    const homeBtn = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeBtn);
    expect(onNavigate).toHaveBeenCalledWith('vendor');
  });

  it('allows switching visit context pills (Pharmacy, Lab, Clinic, Camp / van)', () => {
    render(<WebScanVerifyScreen />);
    const labRadio = screen.getByRole('radio', { name: /lab/i });
    fireEvent.click(labRadio);
    expect(labRadio).toHaveAttribute('aria-checked', 'true');

    const clinicRadio = screen.getByRole('radio', { name: /clinic/i });
    fireEvent.click(clinicRadio);
    expect(clinicRadio).toHaveAttribute('aria-checked', 'true');
  });

  it('offers no camera scan or demo shortcut, and says to type the code', () => {
    render(<WebScanVerifyScreen />);
    expect(screen.queryByRole('button', { name: /scan pass with camera|simulate a scan/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no camera scanner on this counter yet/i)).toBeInTheDocument();
  });

  it('verifies a live code with the server and shows identity only, then the person decides', async () => {
    const onNavigate = vi.fn();
    apiRequest.mockResolvedValueOnce(IDENTITY);
    render(<WebScanVerifyScreen onNavigate={onNavigate} />);

    enterPass();

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/identity/verify', {
      method: 'POST',
      body: JSON.stringify({ code: '482910', memberId: 'SK-ABC123' }),
    });
    expect(screen.getByText(/LIVE PASS CONFIRMED/)).toBeInTheDocument();
    expect(screen.getByText('Test University · 22071A0514')).toBeInTheDocument();
    expect(screen.getByText('Campus verified')).toBeInTheDocument();
    expect(screen.getByText(/Identity only/)).toBeInTheDocument();
    // A live pass alone is not "verified": the person at the counter still decides.
    expect(screen.queryByRole('heading', { level: 2, name: /verified/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /compare with their college id card/i }));
    expect(screen.getByText(/no photo on file and no camera here/i)).toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByText(/94%/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /same person/i }));
    expect(screen.getByRole('heading', { level: 2, name: 'Verified · Asha Rao' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue to handover/i }));
    expect(onNavigate).toHaveBeenCalledWith('dispensing');
  });

  it('asks for a new code when the server says the code is stale or reused (410)', async () => {
    apiRequest.mockRejectedValueOnce(new ApiError('This pass code has expired, was already used, or does not match.', 410));
    render(<WebScanVerifyScreen />);

    enterPass();

    expect(await screen.findByText('This code has expired or was already used')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Codes change every 30 seconds and work once/);
    expectNothingVerified();

    fireEvent.click(screen.getByRole('button', { name: /enter the new code/i }));
    expect(screen.getByRole('textbox', { name: /6-digit code/i })).toHaveValue('');
    // Same student, next code: the member number stays.
    expect(screen.getByRole('textbox', { name: /member number/i })).toHaveValue('sk-abc123');
  });

  it.each([
    [404, 'No live pass matches'],
    [429, 'Too many checks just now'],
    [500, 'Couldn’t check this pass'],
    [403, 'Couldn’t check this pass'],
    [0, 'Couldn’t check this pass'],
  ])('fails closed on HTTP %s and never shows a verified student', async (status, title) => {
    apiRequest.mockRejectedValueOnce(new ApiError('nope', status));
    render(<WebScanVerifyScreen />);

    enterPass();

    expect(await screen.findByText(title)).toBeInTheDocument();
    expectNothingVerified();
  });

  it('fails closed on an unexpected error or a malformed reply', async () => {
    apiRequest.mockRejectedValueOnce(new TypeError('boom'));
    const { unmount } = render(<WebScanVerifyScreen />);
    enterPass();
    expect(await screen.findByText('Couldn’t check this pass')).toBeInTheDocument();
    expectNothingVerified();
    unmount();

    apiRequest.mockResolvedValueOnce({ campusStatus: 'VERIFIED' });
    render(<WebScanVerifyScreen />);
    enterPass();
    expect(await screen.findByText('Couldn’t check this pass')).toBeInTheDocument();
    expectNothingVerified();
  });

  it('needs all 6 digits and the member number before asking the server', () => {
    render(<WebScanVerifyScreen />);
    enterPass('4829', 'SK-ABC123');
    expect(screen.getByText('Enter all 6 digits')).toBeInTheDocument();
    enterPass('482910', '');
    expect(screen.getByText(/Enter the member number from the pass/)).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('stops the manual roll-number check: nothing looks a student up that way', () => {
    render(<WebScanVerifyScreen />);
    fireEvent.click(screen.getByRole('button', { name: /student has no phone\? manual check/i }));
    expect(screen.getByText('Manual check')).toBeInTheDocument();

    const findBtn = screen.getByRole('button', { name: /find student/i });
    expect(findBtn).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /roll number from their college id card/i }), { target: { value: '22071A0514' } });
    expect(findBtn).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /i’ve seen their physical college id card/i }));
    expect(findBtn).not.toBeDisabled();
    fireEvent.click(findBtn);

    expect(screen.getByRole('alert')).toHaveTextContent('Can’t check by roll number here');
    expect(screen.queryByText(/22071A0514/)).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('renders all 18 partner console sidebar items across STORE, LAB, and BUSINESS', () => {
    render(<WebScanVerifyScreen />);

    // STORE items
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify student/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /orders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rx review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /substitutions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /otp handover/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /returns/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dispense register/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reorder rules/i })).toBeInTheDocument();

    // LAB items
    expect(screen.getByRole('button', { name: /sample queue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run sheet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cold chain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /release results/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /camp intake/i })).toBeInTheDocument();

    // BUSINESS items
    expect(screen.getByRole('button', { name: /staff & roles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /catalogue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settlement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /performance/i })).toBeInTheDocument();
  });

  it('handles a mismatch: Stop, marked on this screen only and not saved', async () => {
    apiRequest.mockResolvedValueOnce(IDENTITY);
    render(<WebScanVerifyScreen />);

    enterPass();
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /compare with their college id card/i }));
    fireEvent.click(screen.getByRole('button', { name: /not the same/i }));
    expect(screen.getByText(/stop — don’t continue/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Different person' }));
    fireEvent.click(screen.getByRole('button', { name: /mark as stopped/i }));

    // Nothing is sent or saved, and the copy says so.
    expect(screen.getByText(/It isn’t saved and hasn’t been reported to anyone/i)).toBeInTheDocument();
    expect(screen.getByText(/Stopped · nothing handed over · not reported to anyone/i)).toBeInTheDocument();
    expect(screen.queryByText(/student notified/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /call support/i })).not.toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('follows the real network state and refuses to verify while offline', () => {
    render(<WebScanVerifyScreen />);
    expect(screen.getByRole('status', { name: 'Network: online' })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status', { name: 'Network: offline' })).toBeInTheDocument();
    expect(screen.getAllByText(/Students can’t be verified until you’re back online/i).length).toBeGreaterThanOrEqual(1);

    enterPass();
    expect(apiRequest).not.toHaveBeenCalled();
    expectNothingVerified();
    expect(screen.getByRole('button', { name: /back to scanning/i })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status', { name: 'Network: online' })).toBeInTheDocument();
  });
});
