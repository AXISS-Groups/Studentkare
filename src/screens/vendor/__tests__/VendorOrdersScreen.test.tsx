import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorOrdersScreen } from '../VendorOrdersScreen';

vi.mock('@/data/contexts/AuthContext', () => ({
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

vi.mock('@/lib/utils/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('VendorOrdersScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Partner header, Orders title, and 1 blocked pill', () => {
    render(<VendorOrdersScreen />);
    expect(screen.getByText('PARTNER')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByText(/Campus pharmacy · VNR VJIET · handover before 21:00/i)).toBeInTheDocument();
    expect(screen.getByText(/1 blocked/i)).toBeInTheDocument();
  });

  it('renders all 4 stat cards correctly', () => {
    render(<VendorOrdersScreen />);
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Open today')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Awaiting pharmacist')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Out for delivery').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('38 min')).toBeInTheDocument();
    expect(screen.getByText('Median pack time')).toBeInTheDocument();
  });

  it('renders the 18 sidebar items with Orders active and badge 6', () => {
    render(<VendorOrdersScreen />);
    const ordersBtn = screen.getByRole('button', { name: /orders/i });
    expect(ordersBtn).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('6')).toBeInTheDocument();

    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();
  });

  it('renders initial orders list with correct IDs and prescription statuses', () => {
    render(<VendorOrdersScreen />);
    expect(screen.getByText('#SK-40218')).toBeInTheDocument();
    expect(screen.getByText('Block B-214')).toBeInTheDocument();
    expect(screen.getByText('Pack by 16:00')).toBeInTheDocument();

    expect(screen.getByText('#SK-40216')).toBeInTheDocument();
    expect(screen.getByText('Awaiting pharmacist check')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('filters orders by category tab', () => {
    render(<VendorOrdersScreen />);
    const blockedTab = screen.getByRole('tab', { name: /blocked/i });
    fireEvent.click(blockedTab);

    expect(screen.getByText('#SK-40216')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40218')).not.toBeInTheDocument();
  });

  it('searches orders by order number or location', () => {
    render(<VendorOrdersScreen />);
    const searchInput = screen.getByPlaceholderText(/search by order #/i);
    fireEvent.change(searchInput, { target: { value: '40215' } });

    expect(screen.getByText('#SK-40215')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40218')).not.toBeInTheDocument();
  });

  it('opens order details dialog on row click and shows privacy lock on blocked orders', () => {
    render(<VendorOrdersScreen />);
    const blockedRow = screen.getByLabelText(/view details for order #sk-40216/i);
    fireEvent.click(blockedRow);

    expect(screen.getByRole('heading', { level: 2, name: '#SK-40216' })).toBeInTheDocument();
    expect(screen.getByText(/Prescription Verification Gate Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule L privacy/i)).toBeInTheDocument();
  });

  it('navigates to other sidebar routes on click', () => {
    const onNavigate = vi.fn();
    render(<VendorOrdersScreen onNavigate={onNavigate} />);

    const homeBtn = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeBtn);
    expect(onNavigate).toHaveBeenCalledWith('vendor');

    const verifyBtn = screen.getByRole('button', { name: /verify student/i });
    fireEvent.click(verifyBtn);
    expect(onNavigate).toHaveBeenCalledWith('verify');

    const catBtn = screen.getByRole('button', { name: /catalogue/i });
    fireEvent.click(catBtn);
    expect(onNavigate).toHaveBeenCalledWith('catalogue');
  });

  it('displays the compliance note below the table', () => {
    render(<VendorOrdersScreen />);
    expect(
      screen.getByText(/An order awaiting a pharmacist check cannot be packed/i)
    ).toBeInTheDocument();
  });
});
