import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VendorRxReviewScreen } from '../VendorRxReviewScreen';
import type { RxReview } from '../VendorRxReviewScreen';

const apiRequest = vi.fn();

vi.mock('@/data/http', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock('@/data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-pharmacy',
      fullName: 'MedPlus Bachupally',
      role: 'VENDOR',
      email: 'pharmacy@studentkare.test',
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

const NOW = Date.now() / 1000;

function review(overrides: Partial<RxReview> = {}): RxReview {
  return {
    dispenseId: 'abcd1234ffff0000',
    receivedAt: NOW - 180,
    prescriberRegNo: 'TSMC 45122',
    issuedAt: NOW - 86400,
    validUntil: NOW + 29 * 86400,
    expired: false,
    items: [
      {
        id: 'item-1', genericName: 'Azithromycin', brandName: '', strength: '500 mg', form: 'tablet',
        dose: '1 tab', frequency: 'OD', durationDays: 3, quantity: 3, scheduleClass: 'H1',
        registerRequired: true, substitutionAllowed: false,
      },
    ],
    ...overrides,
  };
}

const SECOND = review({
  dispenseId: 'eeee5678aaaa1111',
  prescriberRegNo: 'TSMC 88412',
  items: [{
    id: 'item-2', genericName: 'Cetirizine', brandName: '', strength: '10 mg', form: 'tablet', dose: '1 tab',
    frequency: 'OD', durationDays: 5, quantity: 5, scheduleClass: 'OTC', registerRequired: false, substitutionAllowed: true,
  }],
});

function serveQueue(reviews: RxReview[]) {
  apiRequest.mockImplementation((path: string, options?: RequestInit) => {
    if (options?.method === 'POST') return Promise.resolve({ status: 'OK' });
    if (path === '/v1/pharmacy/rx-reviews') return Promise.resolve({ reviews, total: reviews.length });
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

function tickAll() {
  for (const name of [/Doctor registration verified/i, /Prescription date valid/i, /Patient matches order/i, /Allergy check/i, /Schedule H items logged/i]) {
    fireEvent.click(screen.getByRole('checkbox', { name }));
  }
}

const nameField = () => screen.getByLabelText(/Verifying pharmacist’s name/i);

describe('VendorRxReviewScreen', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('reads the live queue and shows only the prescription lines', async () => {
    serveQueue([review(), SECOND]);
    render(<VendorRxReviewScreen />);

    expect(await screen.findByText(/WAITING FOR A PHARMACIST · 2/i)).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/v1/pharmacy/rx-reviews', expect.anything());
    expect(screen.getByRole('heading', { level: 1, name: 'Rx review' })).toBeInTheDocument();
    expect(screen.getByText('ABCD1234')).toBeInTheDocument();
    expect(screen.getByText('Prescriber · Reg. TSMC 45122')).toBeInTheDocument();
    expect(screen.getByText(/1\. Azithromycin 500 mg tablet — 1 tab OD × 3d/)).toBeInTheDocument();
    expect(screen.getByText('Schedule H1 · record in the register')).toBeInTheDocument();
    expect(screen.getByText('No substitution — dispense as written')).toBeInTheDocument();
    // The old "not connected" banner and invented OCR readings are gone.
    expect(screen.queryByText(/isn’t connected to student orders/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/OCR \d+%/)).not.toBeInTheDocument();
  });

  it('claims no store, pharmacist on duty or 2FA it does not know about', async () => {
    serveQueue([review()]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');
    expect(screen.queryByText(/Pharmacist on duty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MedPlus/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2FA on/i)).not.toBeInTheDocument();
  });

  it('starts with every check unticked and needs all five plus a name to approve', async () => {
    serveQueue([review()]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');

    const approve = screen.getByRole('button', { name: /Approve and pack/i });
    for (const box of screen.getAllByRole('checkbox')) expect(box).toHaveAttribute('aria-checked', 'false');
    expect(approve).toBeDisabled();

    tickAll();
    expect(approve).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: 'R. Iyer' } });
    expect(approve).not.toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Allergy check/i }));
    expect(approve).toBeDisabled();
  });

  it('approves through the server with the pharmacist name and every check', async () => {
    serveQueue([review()]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');

    tickAll();
    fireEvent.change(nameField(), { target: { value: 'R. Iyer' } });
    fireEvent.click(screen.getByRole('button', { name: /Approve and pack/i }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/v1/pharmacy/rx-reviews/abcd1234ffff0000/approve', expect.objectContaining({ method: 'POST' })),
    );
    const call = apiRequest.mock.calls.find(([path]) => String(path).endsWith('/approve'));
    const options = call?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(options?.body))).toEqual({
      pharmacistName: 'R. Iyer',
      checks: { prescriberRegistration: true, prescriptionDate: true, patientMatches: true, allergyChecked: true, scheduleLogged: true },
    });
    expect(await screen.findByText(/ABCD1234 verified by R\. Iyer/)).toBeInTheDocument();
  });

  it('shows the server’s refusal and does not record a decision', async () => {
    apiRequest.mockImplementation((_path: string, options?: RequestInit) => {
      if (options?.method === 'POST') return Promise.reject(new Error('This prescription has expired and cannot be verified.'));
      return Promise.resolve({ reviews: [review()], total: 1 });
    });
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');
    tickAll();
    fireEvent.change(nameField(), { target: { value: 'R. Iyer' } });
    fireEvent.click(screen.getByRole('button', { name: /Approve and pack/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/expired and cannot be verified/);
    expect(screen.getByRole('tab', { name: /Processed \(0\)/i })).toBeInTheDocument();
  });

  it('rejects only with a reason, through the server', async () => {
    serveQueue([review()]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');

    fireEvent.click(screen.getByRole('button', { name: /^Reject$/i }));
    const confirm = screen.getByRole('button', { name: /Confirm rejection/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Reason for rejecting/i), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Reason for rejecting/i), { target: { value: 'Strength is illegible.' } });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/v1/pharmacy/rx-reviews/abcd1234ffff0000/reject', expect.objectContaining({
        method: 'POST', body: JSON.stringify({ reason: 'Strength is illegible.' }),
      })),
    );
    expect(await screen.findByText(/ABCD1234 rejected\. The student has been told why/)).toBeInTheDocument();
  });

  it('says honestly that asking the doctor is not available and sends nothing', async () => {
    serveQueue([review()]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');

    fireEvent.click(screen.getByRole('button', { name: /Ask the doctor/i }));

    expect(screen.getByText(/Messaging the prescriber isn’t available here yet\. Nothing was sent/i)).toBeInTheDocument();
    expect(apiRequest.mock.calls.some(([, options]) => (options as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('blocks approval of an expired prescription and says why', async () => {
    serveQueue([review({ expired: true, validUntil: NOW - 60 })]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');

    tickAll();
    fireEvent.change(nameField(), { target: { value: 'R. Iyer' } });

    expect(screen.getByRole('button', { name: /Approve and pack/i })).toBeDisabled();
    expect(screen.getByText(/This prescription has expired, so it can’t be approved/i)).toBeInTheDocument();
    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0);
  });

  it('resets the checks when another prescription is selected', async () => {
    serveQueue([review(), SECOND]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');

    fireEvent.click(screen.getByRole('checkbox', { name: /Allergy check/i }));
    fireEvent.click(screen.getByText('EEEE5678'));

    expect(screen.getByText('Prescriber · Reg. TSMC 88412')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Allergy check/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('filters prescriptions in the queue using search input', async () => {
    serveQueue([review(), SECOND]);
    render(<VendorRxReviewScreen />);
    await screen.findByText('ABCD1234');

    fireEvent.change(screen.getByRole('searchbox', { name: /Search prescriptions/i }), { target: { value: 'cetirizine' } });
    expect(screen.getByText('EEEE5678')).toBeInTheDocument();
    expect(screen.queryByText('ABCD1234')).not.toBeInTheDocument();
  });

  it('shows an honest empty queue', async () => {
    serveQueue([]);
    render(<VendorRxReviewScreen />);
    expect(await screen.findByText(/No prescriptions waiting for a pharmacist/i)).toBeInTheDocument();
    expect(screen.getByText(/When a student sends a prescription to your pharmacy/i)).toBeInTheDocument();
  });

  it('shows the error state when the queue cannot load, and retries', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Cannot connect'));
    render(<VendorRxReviewScreen />);
    expect(await screen.findByText(/Couldn’t load Rx review/i)).toBeInTheDocument();

    serveQueue([review()]);
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(await screen.findByText('ABCD1234')).toBeInTheDocument();
  });

  it('renders the preview states with the page heading in each', () => {
    serveQueue([]);
    const { rerender } = render(<VendorRxReviewScreen initialViewState="loading" />);
    expect(screen.getByLabelText(/Loading Rx review/i)).toBeInTheDocument();

    rerender(<VendorRxReviewScreen initialViewState="error" />);
    expect(screen.getByText(/Couldn’t load Rx review/i)).toBeInTheDocument();

    rerender(<VendorRxReviewScreen initialViewState="empty" />);
    expect(screen.getByText(/No prescriptions waiting for a pharmacist/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Rx review' })).toBeInTheDocument();
  });

  it('supports cross navigation via sidebar buttons', async () => {
    serveQueue([]);
    const onNavigate = vi.fn();
    render(<VendorRxReviewScreen onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /OTP handover/i }));
    expect(onNavigate).toHaveBeenCalledWith('handover');

    fireEvent.click(screen.getByRole('button', { name: /Staff & roles/i }));
    expect(onNavigate).toHaveBeenCalledWith('partner-staff');
    await screen.findByText(/No prescriptions waiting for a pharmacist/i);
  });
});
