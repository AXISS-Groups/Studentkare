import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorSettlementScreen } from '../VendorSettlementScreen';

vi.mock('@/data/contexts/AuthContext', () => ({
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

vi.mock('@/lib/utils/workflowRouting', () => ({
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
    expect(screen.getByText(/Your store’s earnings this month/i)).toBeInTheDocument();
    expect(screen.queryByText(/VNR VJIET|MedPlus/i)).not.toBeInTheDocument();
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

    expect(screen.getByText(/Wk 5: ₹4\.6k net · 20 orders fulfilled/i)).toBeInTheDocument();
    expect(screen.queryByText(/reconciled/i)).not.toBeInTheDocument();
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

  it('does not offer a made-up statement download', () => {
    render(<VendorSettlementScreen />);
    expect(screen.getByRole('button', { name: /Download statement/i })).toBeDisabled();
    expect(screen.getByText(/Statements aren’t available yet/i)).toBeInTheDocument();
  });

  it('totals held money from the held orders themselves', () => {
    render(<VendorSettlementScreen initialDisputes={[
      { id: 'SK-1', student: 'A.', items: 'x', amount: '₹490', reason: 'r', date: 'd', status: 'UNDER_REVIEW' },
      { id: 'SK-2', student: 'B.', items: 'y', amount: '₹1,000', reason: 'r', date: 'd', status: 'UNDER_REVIEW' },
    ]} />);
    expect(screen.getByRole('button', { name: 'HELD: ₹1,490' })).toBeInTheDocument();
  });

  it('opens held disputes modal and does not pretend to release a held order', () => {
    render(<VendorSettlementScreen />);
    const heldTile = screen.getByRole('button', { name: /HELD:/i });
    fireEvent.click(heldTile);

    expect(screen.getByText(/Orders In Review/i)).toBeInTheDocument();
    expect(screen.getByText(/SK-47901/i)).toBeInTheDocument();
    expect(screen.getByText(/Reason: Package seal damaged reported at handover/i)).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Submit POD/i })).not.toBeInTheDocument();
    expect(screen.getByText(/isn’t available here yet/i)).toBeInTheDocument();
  });

});
