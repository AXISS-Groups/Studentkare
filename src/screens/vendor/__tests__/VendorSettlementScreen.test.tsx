import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorSettlementScreen } from '../VendorSettlementScreen';

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

describe('VendorSettlementScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders heading, subtitle, and four top summary stat tiles', () => {
    render(<VendorSettlementScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Earnings & settlement' })).toBeInTheDocument();
    expect(screen.getByText(/Campus Pharmacy · VNR VJIET · September 2026/i)).toBeInTheDocument();
    expect(screen.getByText('GROSS THIS MONTH')).toBeInTheDocument();
    expect(screen.getByText('COMMISSION')).toBeInTheDocument();
    expect(screen.getByText('NET PAYABLE')).toBeInTheDocument();
    expect(screen.getByText('HELD')).toBeInTheDocument();
  });

  it('renders weekly payout chart and handles bar click inspection', () => {
    render(<VendorSettlementScreen />);
    expect(screen.getByText('Net payable by week')).toBeInTheDocument();
    expect(screen.getByText('Wk 1')).toBeInTheDocument();
    expect(screen.getByText('Wk 5')).toBeInTheDocument();

    const wk5Label = screen.getByText('Wk 5');
    fireEvent.click(wk5Label);

    expect(screen.getByText(/Week Wk 5: Detailed ledger reconciled with campus payment gateway/i)).toBeInTheDocument();
  });

  it('renders this cycle breakdown and SLA compliance metrics', () => {
    render(<VendorSettlementScreen />);
    expect(screen.getByText('THIS CYCLE')).toBeInTheDocument();
    expect(screen.getByText('Orders fulfilled')).toBeInTheDocument();
    expect(screen.getByText('Gross')).toBeInTheDocument();
    expect(screen.getByText('Platform commission')).toBeInTheDocument();
    expect(screen.getByText('Held in dispute')).toBeInTheDocument();
    expect(screen.getByText('Adjustments')).toBeInTheDocument();

    expect(screen.getByText('FULFILMENT SLA')).toBeInTheDocument();
    expect(screen.getByText('Accepted within 15 min')).toBeInTheDocument();
    expect(screen.getByText('Packed within 2 hrs')).toBeInTheDocument();
    expect(screen.getByText('Delivered in promised slot')).toBeInTheDocument();
  });

  it('triggers statement download with feedback toast', () => {
    render(<VendorSettlementScreen />);
    const downloadBtn = screen.getByRole('button', { name: /Download statement/i });
    fireEvent.click(downloadBtn);

    expect(screen.getByText(/Monthly financial settlement statement downloaded as CSV/i)).toBeInTheDocument();
  });

  it('opens held disputes modal and allows resolving a dispute', () => {
    render(<VendorSettlementScreen />);
    const heldTile = screen.getByRole('button', { name: /HELD:/i });
    fireEvent.click(heldTile);

    expect(screen.getByText(/Orders In Review/i)).toBeInTheDocument();
    expect(screen.getByText(/SK-47901/i)).toBeInTheDocument();
    expect(screen.getByText(/Reason: Package seal damaged reported at handover/i)).toBeInTheDocument();

    const resolveBtn = screen.getAllByRole('button', { name: /Submit POD & Release/i })[0];
    fireEvent.click(resolveBtn);

    expect(screen.getByText(/Proof of delivery submitted for order SK-47901/i)).toBeInTheDocument();
  });

  it('supports cross-navigation via sidebar buttons', () => {
    const onNavigate = vi.fn();
    render(<VendorSettlementScreen onNavigate={onNavigate} />);

    const handoverBtn = screen.getByRole('button', { name: /OTP handover/i });
    fireEvent.click(handoverBtn);
    expect(onNavigate).toHaveBeenCalledWith('handover');

    const performanceBtn = screen.getByRole('button', { name: /Performance/i });
    fireEvent.click(performanceBtn);
    expect(onNavigate).toHaveBeenCalledWith('performance');
  });
});
