import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorRxReviewScreen } from '../VendorRxReviewScreen';

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

describe('VendorRxReviewScreen', () => {
  it('renders heading, subtitle, and pharmacist on duty badge', () => {
    render(<VendorRxReviewScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Rx review' })).toBeInTheDocument();
    expect(
      screen.getByText(/Human sign-off before any prescription item is packed/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Pharmacist on duty · R. Kumar, Reg. 11873/i)).toBeInTheDocument();
  });

  it('renders queue items and initial prescription document', () => {
    render(<VendorRxReviewScreen />);
    expect(screen.getByText(/WAITING FOR A PHARMACIST · 4/i)).toBeInTheDocument();
    expect(screen.getByText('RX-2231')).toBeInTheDocument();
    expect(screen.getByText('RX-2229')).toBeInTheDocument();
    expect(screen.getByText('RX-2226')).toBeInTheDocument();
    expect(screen.getByText('RX-2220')).toBeInTheDocument();

    // Doctor information on slip
    expect(screen.getByText('Dr. K. Rao, MBBS')).toBeInTheDocument();
    expect(screen.getByText(/Reg. TSMC 45122 · Sai Clinic, Nizampet · 22\/09\/2026/i)).toBeInTheDocument();
  });

  it('switches active prescription when clicking a queue item', () => {
    render(<VendorRxReviewScreen />);
    const rx2229Btn = screen.getByText('RX-2229');
    fireEvent.click(rx2229Btn);

    expect(screen.getByText('Dr. Ananya Reddy, MD')).toBeInTheDocument();
    expect(screen.getByText(/Care Hospital, Kukatpally/i)).toBeInTheDocument();
  });

  it('toggles checklist items and enables approve button only when all checks pass', () => {
    render(<VendorRxReviewScreen />);
    const approveBtn = screen.getByRole('button', { name: /Approve and pack/i });
    expect(approveBtn).toBeDisabled();

    // Toggle the remaining unchecked items
    const patientCheck = screen.getByRole('checkbox', { name: /Patient matches order/i });
    const allergyCheck = screen.getByRole('checkbox', { name: /Allergy check/i });
    const schedCheck = screen.getByRole('checkbox', { name: /Schedule H items logged/i });

    fireEvent.click(patientCheck);
    fireEvent.click(allergyCheck);
    fireEvent.click(schedCheck);

    expect(approveBtn).not.toBeDisabled();
  });

  it('approves prescription when clicking approve and pack', () => {
    render(<VendorRxReviewScreen />);
    // Check all boxes
    fireEvent.click(screen.getByRole('checkbox', { name: /Patient matches order/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Allergy check/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Schedule H items logged/i }));

    const approveBtn = screen.getByRole('button', { name: /Approve and pack/i });
    fireEvent.click(approveBtn);

    expect(screen.getByText(/RX-2231 approved · sent to packing/i)).toBeInTheDocument();
  });

  it('handles ask the doctor and rejection flows', () => {
    render(<VendorRxReviewScreen />);
    const clarifyBtn = screen.getByRole('button', { name: /Ask the doctor/i });
    fireEvent.click(clarifyBtn);
    expect(screen.getByText(/Question sent to Dr\. K\. Rao.*order on hold/i)).toBeInTheDocument();

    const rejectBtn = screen.getByRole('button', { name: /Reject/i });
    fireEvent.click(rejectBtn);
    expect(screen.getByText(/RX-2231 rejected · student told why/i)).toBeInTheDocument();
  });

  it('supports cross navigation via sidebar buttons', () => {
    const onNavigate = vi.fn();
    render(<VendorRxReviewScreen onNavigate={onNavigate} />);

    const handoverBtn = screen.getByRole('button', { name: /OTP handover/i });
    fireEvent.click(handoverBtn);
    expect(onNavigate).toHaveBeenCalledWith('handover');

    const staffBtn = screen.getByRole('button', { name: /Staff & roles/i });
    fireEvent.click(staffBtn);
    expect(onNavigate).toHaveBeenCalledWith('partner-staff');
  });

  it('allows reloading prescriptions when all prescriptions are rejected', () => {
    render(<VendorRxReviewScreen />);

    // Reject all 4 prescriptions in the queue
    for (let i = 0; i < 4; i++) {
      const rejectBtn = screen.getByRole('button', { name: /Reject/i });
      fireEvent.click(rejectBtn);
    }

    // Now empty state is displayed
    expect(screen.getByText(/No prescriptions waiting for a pharmacist/i)).toBeInTheDocument();
    expect(screen.getByText(/Session decisions/i)).toBeInTheDocument();

    // Click "Reload demo prescriptions"
    const reloadBtn = screen.getByRole('button', { name: /Reload demo prescriptions/i });
    fireEvent.click(reloadBtn);

    // Queue is restored!
    expect(screen.getByText(/WAITING FOR A PHARMACIST · 4/i)).toBeInTheDocument();
    expect(screen.getByText('RX-2231')).toBeInTheDocument();
  });

  it('allows reopening a rejected prescription from the empty state session decisions list', () => {
    render(<VendorRxReviewScreen />);

    // Reject all 4 prescriptions
    for (let i = 0; i < 4; i++) {
      const rejectBtn = screen.getByRole('button', { name: /Reject/i });
      fireEvent.click(rejectBtn);
    }

    // Session decisions list shows Reopen buttons
    const reopenButtons = screen.getAllByRole('button', { name: /Reopen/i });
    expect(reopenButtons.length).toBeGreaterThan(0);

    // Reopen the first one
    fireEvent.click(reopenButtons[0]);

    // Active queue is now 1!
    expect(screen.getByText(/WAITING FOR A PHARMACIST · 1/i)).toBeInTheDocument();
  });

  it('allows simulating an incoming prescription from the empty state', () => {
    render(<VendorRxReviewScreen />);

    // Reject all 4 prescriptions
    for (let i = 0; i < 4; i++) {
      const rejectBtn = screen.getByRole('button', { name: /Reject/i });
      fireEvent.click(rejectBtn);
    }

    // Click Simulate incoming Rx
    const simBtn = screen.getByRole('button', { name: /Simulate incoming Rx/i });
    fireEvent.click(simBtn);

    // Active queue now has the new incoming prescription!
    expect(screen.getByText(/WAITING FOR A PHARMACIST · 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Augmentin 625/i).length).toBeGreaterThan(0);
  });

  it('filters prescriptions in the queue using search input', () => {
    render(<VendorRxReviewScreen />);
    const searchInput = screen.getByRole('searchbox', { name: /Search/i });

    // Type a specific medication name
    fireEvent.change(searchInput, { target: { value: 'Azithromycin' } });

    expect(screen.getByText('RX-2229')).toBeInTheDocument();
    expect(screen.queryByText('RX-2231')).not.toBeInTheDocument();
    expect(screen.queryByText('RX-2226')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('RX-2231')).toBeInTheDocument();
  });

  it('switches between Waiting and Processed queue tabs', () => {
    render(<VendorRxReviewScreen />);

    // Reject one prescription
    const rejectBtn = screen.getByRole('button', { name: /Reject/i });
    fireEvent.click(rejectBtn);

    // Switch to Processed tab
    const processedTab = screen.getByRole('tab', { name: /Processed \(1\)/i });
    fireEvent.click(processedTab);

    expect(screen.getByText(/✗ Rejected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reopen/i })).toBeInTheDocument();

    // Switch back to Waiting tab
    const waitingTab = screen.getByRole('tab', { name: /Waiting \(3\)/i });
    fireEvent.click(waitingTab);

    expect(screen.getByText(/WAITING FOR A PHARMACIST · 3/i)).toBeInTheDocument();
  });

  it('renders different view states (Loading, Empty, Error, Data) without needing a preview toolbar', () => {
    const { rerender } = render(<VendorRxReviewScreen initialViewState="loading" />);
    expect(screen.getByLabelText(/Loading Rx review/i)).toBeInTheDocument();

    rerender(<VendorRxReviewScreen initialViewState="error" />);
    expect(screen.getByText(/Couldn’t load rx review/i)).toBeInTheDocument();

    rerender(<VendorRxReviewScreen initialViewState="empty" />);
    expect(screen.getByText(/No prescriptions waiting for a pharmacist/i)).toBeInTheDocument();

    rerender(<VendorRxReviewScreen initialViewState="data" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Rx review' })).toBeInTheDocument();
  });
});

