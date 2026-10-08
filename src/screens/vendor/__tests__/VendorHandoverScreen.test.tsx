import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorHandoverScreen } from '../VendorHandoverScreen';

vi.mock('@/data/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-vendor',
      fullName: 'MedPlus Bachupally',
      role: 'VENDOR',
      email: 'vendor@studentkare.test',
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('VendorHandoverScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, counter pickup subtitle, and 1 refused alert badge', () => {
    render(<VendorHandoverScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'OTP handover' })).toBeInTheDocument();
    expect(screen.getByText(/Counter pickup and block delivery · six digits from the student/i)).toBeInTheDocument();
    expect(screen.getByText(/1 refused/i)).toBeInTheDocument();
  });

  it('renders the "At the counter now" spotlight card with Krishna C. and pills', () => {
    render(<VendorHandoverScreen />);
    expect(screen.getByText(/AT THE COUNTER NOW/i)).toBeInTheDocument();
    expect(screen.getByText(/Krishna C. · order #SK-48120/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified 4:12 pm · photo matched/i)).toBeInTheDocument();
    expect(screen.getByText('✓ Verified')).toBeInTheDocument();
    expect(screen.getByText('✓ Rx matches')).toBeInTheDocument();
    expect(screen.getByText('● Bag photo')).toBeInTheDocument();
    expect(screen.getByText('○ Handed over')).toBeInTheDocument();
  });

  it('renders the 4 KPI stat cards correctly', () => {
    render(<VendorHandoverScreen />);
    expect(screen.getByText('Handovers today')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2); // 1 refused, 1 expired
    expect(screen.getAllByText('Refused').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('OTP expired')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('OTP validity')).toBeInTheDocument();
  });

  it('renders table headers and initial handover rows', () => {
    render(<VendorHandoverScreen />);
    expect(screen.getByText('ORDER')).toBeInTheDocument();
    expect(screen.getByText('COLLECTOR')).toBeInTheDocument();
    expect(screen.getByText('CONTENTS')).toBeInTheDocument();
    expect(screen.getByText('OTP')).toBeInTheDocument();

    expect(screen.getByText('#SK-40218')).toBeInTheDocument();
    expect(screen.getByText('Student · B-214')).toBeInTheDocument();
    expect(screen.getByText('Handed over 16:04')).toBeInTheDocument();

    expect(screen.getByText('#SK-40217')).toBeInTheDocument();
    expect(screen.getAllByText('At counter').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('#SK-40219')).toBeInTheDocument();
    expect(screen.getByText('Friend · named by student')).toBeInTheDocument();

    expect(screen.getByText('#SK-40216')).toBeInTheDocument();
    expect(screen.getByText('Prescription cannot be proxied')).toBeInTheDocument();

    expect(screen.getByText('#SK-40212')).toBeInTheDocument();
    expect(screen.getByText('Expired after 30 min')).toBeInTheDocument();
  });

  it('filters handovers by status buttons', () => {
    render(<VendorHandoverScreen />);
    const refusedFilterBtn = screen.getByRole('button', { name: /refused/i });
    fireEvent.click(refusedFilterBtn);

    expect(screen.getByText('#SK-40216')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40218')).not.toBeInTheDocument();
    expect(screen.queryByText('#SK-40217')).not.toBeInTheDocument();
  });

  it('filters handovers by search query', () => {
    render(<VendorHandoverScreen />);
    const searchInput = screen.getByLabelText(/search handovers/i);
    fireEvent.change(searchInput, { target: { value: 'B-214' } });

    expect(screen.getByText('#SK-40218')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40217')).not.toBeInTheDocument();
  });

  it('opens "Photo & hand over" modal and completes handover flow', () => {
    render(<VendorHandoverScreen />);
    const photoHandoverBtn = screen.getByRole('button', { name: /photo & hand over/i });
    fireEvent.click(photoHandoverBtn);

    expect(screen.getByText(/Counter Handover — #SK-48120/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1: Bag Seal Verification Photo/i)).toBeInTheDocument();

    // Click to capture simulated bag photo
    const captureBox = screen.getByText(/Tap to capture packed bag photo/i);
    fireEvent.click(captureBox);
    expect(screen.getByText(/Bag photo recorded/i)).toBeInTheDocument();

    // Enter OTP
    const otpInput = screen.getByLabelText(/Enter 6-Digit Student Handover OTP/i);
    fireEvent.change(otpInput, { target: { value: '984512' } });

    // Confirm
    const confirmBtn = screen.getByRole('button', { name: /confirm & hand over/i });
    fireEvent.click(confirmBtn);

    // Modal closed and counter order marked done
    expect(screen.queryByText(/Step 1: Bag Seal Verification Photo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Handover completed/i)).toBeInTheDocument();
  });

  it('opens audit modal when clicking a row and handles re-issuing expired OTP', () => {
    render(<VendorHandoverScreen />);
    const expiredRow = screen.getByText('#SK-40212');
    fireEvent.click(expiredRow);

    expect(screen.getByText(/Handover Audit Log — #SK-40212/i)).toBeInTheDocument();
    expect(screen.getByText(/OTP expired after 30 minutes/i)).toBeInTheDocument();

    const reissueBtn = screen.getByRole('button', { name: /re-issue otp to student/i });
    fireEvent.click(reissueBtn);

    expect(screen.queryByText(/Handover Audit Log — #SK-40212/i)).not.toBeInTheDocument();
    expect(screen.getByText('At counter (re-issued)')).toBeInTheDocument();
  });

  it('renders statutory legal rule notice at the bottom of the table', () => {
    render(<VendorHandoverScreen />);
    expect(
      screen.getByText(/A student can name a friend to collect, and that works for over-the-counter items/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A prescription-only medicine is never handed to anyone but the person it was written for/i)
    ).toBeInTheDocument();
  });

  it('handles navigation when sidebar items are clicked', () => {
    const onNavigate = vi.fn();
    render(<VendorHandoverScreen onNavigate={onNavigate} />);

    const ordersBtn = screen.getByRole('button', { name: /orders/i });
    fireEvent.click(ordersBtn);
    expect(onNavigate).toHaveBeenCalledWith('orders');

    const verifyBtn = screen.getByRole('button', { name: /verify student/i });
    fireEvent.click(verifyBtn);
    expect(onNavigate).toHaveBeenCalledWith('verify');
  });

  it('renders counter standby card when initialCounterOrder is null', () => {
    render(<VendorHandoverScreen initialCounterOrder={null} />);
    expect(screen.getByText('COUNTER STANDBY')).toBeInTheDocument();
    expect(screen.getByText('No student at counter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scan arrival pass/i })).toBeInTheDocument();
  });
});

