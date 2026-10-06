import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WebScanVerifyScreen } from '../WebScanVerifyScreen';

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

describe('WebScanVerifyScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Partner brand and Verify student title by default', () => {
    render(<WebScanVerifyScreen />);
    expect(screen.getByText('PARTNER')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Verify student' })).toBeInTheDocument();
    expect(screen.getByText(/MedPlus · Bachupally · counter tablet/i)).toBeInTheDocument();
  });

  it('renders the left navigation sidebar with STORE, LAB, and BUSINESS sections and active Verify student item', () => {
    render(<WebScanVerifyScreen />);
    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();

    const sidebar = screen.getByLabelText('Partner links');
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

  it('simulates a successful QR scan and transitions to Student found state', () => {
    render(<WebScanVerifyScreen />);
    const simScanBtn = screen.getByRole('button', { name: /simulate a scan/i });
    expect(simScanBtn).toBeInTheDocument();

    fireEvent.click(simScanBtn);

    // Fast-forward simulation timer
    act(() => {
      vi.advanceTimersByTime(700);
    });

    // Expect student found card
    expect(screen.getByText('Krishna C.')).toBeInTheDocument();
    expect(screen.getByText(/VNR VJIET · 22071A05/i)).toBeInTheDocument();
    expect(screen.getByText(/Photo on file · 24 Sep 2026/i)).toBeInTheDocument();
  });

  it('handles 6-digit code entry with 000000 simulating expired state', () => {
    render(<WebScanVerifyScreen />);
    const codeInput = screen.getByRole('textbox', { name: /6-digit code/i });
    const checkBtn = screen.getByRole('button', { name: 'Check' });
    
    // Type expired code
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(checkBtn);

    // Expect expired state banner
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('This code has expired')).toBeInTheDocument();
    expect(screen.getByText(/Codes last 30 seconds/i)).toBeInTheDocument();

    // Resetting back to scan
    const scanAgainBtn = screen.getByRole('button', { name: /scan again/i });
    fireEvent.click(scanAgainBtn);
    expect(screen.getByText(/Point at the student’s pass/i)).toBeInTheDocument();
  });

  it('handles 6-digit code entry with valid code transitioning to Student found', () => {
    render(<WebScanVerifyScreen />);
    const codeInput = screen.getByRole('textbox', { name: /6-digit code/i });
    const checkBtn = screen.getByRole('button', { name: 'Check' });

    // Type 6 digits
    fireEvent.change(codeInput, { target: { value: '482910' } });
    fireEvent.click(checkBtn);

    expect(screen.getByText('Krishna C.')).toBeInTheDocument();
  });

  it('navigates to manual lookup when student has no phone, requires ID confirmation', () => {
    render(<WebScanVerifyScreen />);
    const noPhoneBtn = screen.getByRole('button', { name: /student has no phone\? manual check/i });
    fireEvent.click(noPhoneBtn);

    expect(screen.getByText('Manual check')).toBeInTheDocument();

    const rollInput = screen.getByRole('textbox', { name: /roll number from their college id card/i });
    const idCheckbox = screen.getByRole('checkbox', { name: /i’ve seen their physical college id card/i });
    const findBtn = screen.getByRole('button', { name: /find student/i });

    // Disabled initially
    expect(findBtn).toBeDisabled();

    // Fill roll number
    fireEvent.change(rollInput, { target: { value: '22071A0514' } });
    expect(findBtn).toBeDisabled();

    // Check confirmation
    fireEvent.click(idCheckbox);
    expect(findBtn).not.toBeDisabled();

    // Submit
    fireEvent.click(findBtn);
    expect(screen.getByText('Krishna C.')).toBeInTheDocument();
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

  it('runs through full photo verification pipeline: Scan -> Found -> Camera -> Compare -> Verified', () => {
    const onNavigate = vi.fn();
    render(<WebScanVerifyScreen onNavigate={onNavigate} />);

    // Simulate scan
    fireEvent.click(screen.getByRole('button', { name: /simulate a scan/i }));
    expect(screen.getByText('Krishna C.')).toBeInTheDocument();

    // Start live photo
    const photoBtn = screen.getByRole('button', { name: /take a live photo to match/i });
    fireEvent.click(photoBtn);

    // Expect camera view
    expect(screen.getByText(/Face inside the oval · no mask or sunglasses/i)).toBeInTheDocument();
    const captureBtn = screen.getByRole('button', { name: /capture student photo/i });
    fireEvent.click(captureBtn);

    // Expect compare view
    expect(screen.getByText('Strong · 94%')).toBeInTheDocument();
    expect(screen.getByText('On file · 24 Sep')).toBeInTheDocument();
    expect(screen.getByText('Just now')).toBeInTheDocument();

    // Accept match
    const samePersonBtn = screen.getByRole('button', { name: /same person/i });
    fireEvent.click(samePersonBtn);

    // Expect OK / Verified screen
    expect(screen.getByRole('heading', { level: 2, name: /verified · krishna c\./i })).toBeInTheDocument();

    // Continue to dispensing
    const continueBtn = screen.getByRole('button', { name: /continue to handover/i });
    fireEvent.click(continueBtn);
    expect(onNavigate).toHaveBeenCalledWith('dispensing');
  });

  it('handles photo mismatch flow: Scan -> Found -> Camera -> Compare -> Mismatch -> Flag incident', () => {
    render(<WebScanVerifyScreen />);

    // Simulate scan
    fireEvent.click(screen.getByRole('button', { name: /simulate a scan/i }));
    expect(screen.getByText('Krishna C.')).toBeInTheDocument();

    // Camera & capture
    fireEvent.click(screen.getByRole('button', { name: /take a live photo to match/i }));
    fireEvent.click(screen.getByRole('button', { name: /capture student photo/i }));
    expect(screen.getByText('Strong · 94%')).toBeInTheDocument();

    // Reject match
    const notSameBtn = screen.getByRole('button', { name: /not the same/i });
    fireEvent.click(notSameBtn);

    // Expect Mismatch screen
    expect(screen.getByText(/stop — don’t continue/i)).toBeInTheDocument();

    // Select reason and flag
    const reasonBtn = screen.getByRole('button', { name: 'Different person' });
    fireEvent.click(reasonBtn);

    const flagBtn = screen.getByRole('button', { name: /flag and notify the student/i });
    fireEvent.click(flagBtn);

    // Toast triggered
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Flagged · student notified · nothing handed over/i)).toBeInTheDocument();
  });

  it('handles offline mode toggle and situational alert dynamically', () => {
    render(<WebScanVerifyScreen />);

    // Find network status pill button in header
    const networkPill = screen.getByRole('button', { name: /network status:/i });
    expect(networkPill).toBeInTheDocument();

    // Click to simulate going offline
    fireEvent.click(networkPill);

    // Expect situational offline alert banner
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Offline cache active/i)).toBeInTheDocument();

    // Click again to restore online
    fireEvent.click(networkPill);
    expect(screen.queryByText(/Offline cache active/i)).not.toBeInTheDocument();
  });
});
