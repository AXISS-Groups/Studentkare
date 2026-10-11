import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorConsoleScreen, DEMO_CONSOLE_ORDERS } from '../VendorConsoleScreen';

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

describe('VendorConsoleScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders heading, eyebrow, and top stat counters', () => {
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fulfilment queue' })).toBeInTheDocument();
    expect(screen.getByText('Fulfilment fields only')).toBeInTheDocument();
    expect(screen.getByText('TODAY')).toBeInTheDocument();
    expect(screen.getByText('Orders received')).toBeInTheDocument();
    expect(screen.getByText('Packed')).toBeInTheDocument();
    expect(screen.getByText('Blocked on verification')).toBeInTheDocument();
    expect(screen.getByText('Settlement due')).toBeInTheDocument();
  });

  it('renders privacy card and pharmacist alert', () => {
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} />);
    expect(screen.getByText('AWAITING PHARMACIST')).toBeInTheDocument();
    expect(screen.getByText('WHAT YOU CANNOT SEE')).toBeInTheDocument();
    expect(
      screen.getByText(/Full names, diagnoses, lab results, prescription contents, or why anything was ordered/i)
    ).toBeInTheDocument();
  });

  it('renders table columns and initial order rows', () => {
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} />);
    expect(screen.getByText('ORDER')).toBeInTheDocument();
    expect(screen.getByText('ITEMS')).toBeInTheDocument();
    expect(screen.getByText('DROP POINT')).toBeInTheDocument();
    expect(screen.getByText('SLOT')).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();

    // Check sample order items
    expect(screen.getByText('SK-48120')).toBeInTheDocument();
    expect(screen.getByText(/Ashwagandha Stress Balance, Barrier Care Lotion/i)).toBeInTheDocument();
    expect(screen.getAllByText('North Dorm, B').length).toBeGreaterThan(0);
  });

  it('filters rows when clicking tabs', () => {
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} />);
    const toPackTab = screen.getByRole('tab', { name: /To pack/i });
    fireEvent.click(toPackTab);

    // Only orders with 'To pack' should remain
    expect(screen.getByText('SK-48120')).toBeInTheDocument();
    // Blocked order should not appear
    expect(screen.queryByText('SK-48118')).not.toBeInTheDocument();

    const blockedTab = screen.getByRole('tab', { name: /Blocked/i });
    fireEvent.click(blockedTab);
    expect(screen.getByText('SK-48118')).toBeInTheDocument();
    expect(screen.queryByText('SK-48120')).not.toBeInTheDocument();
  });

  it('filters rows by search input', () => {
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} />);
    const searchInput = screen.getByPlaceholderText(/Search orders, initials, drop/i);
    fireEvent.change(searchInput, { target: { value: 'Ashwagandha' } });

    expect(screen.getByText('SK-48120')).toBeInTheDocument();
    expect(screen.queryByText('SK-48119')).not.toBeInTheDocument();
  });

  it('opens order fulfillment modal on order click and updates status', () => {
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} />);
    const orderBtn = screen.getByRole('button', { name: /Order SK-48120/i });
    fireEvent.click(orderBtn);

    // Modal should appear
    expect(screen.getByRole('heading', { level: 3, name: /SK-48120/i })).toBeInTheDocument();
    expect(screen.getByText('Mark Packed & Out')).toBeInTheDocument();

    // Click 'Mark Packed & Out'
    const markOutBtn = screen.getByRole('button', { name: /Mark Packed & Out/i });
    fireEvent.click(markOutBtn);

    // Toast notification should display
    expect(screen.getByText(/Order SK-48120 marked “Out” on this screen only — nothing was sent/i)).toBeInTheDocument();
  });

  it('supports cross navigation when clicking sidebar links', () => {
    const onNavigate = vi.fn();
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} onNavigate={onNavigate} />);

    const handoverBtn = screen.getByRole('button', { name: /OTP handover/i });
    fireEvent.click(handoverBtn);
    expect(onNavigate).toHaveBeenCalledWith('handover');

    const settlementBtn = screen.getByRole('button', { name: /Settlement/i });
    fireEvent.click(settlementBtn);
    expect(onNavigate).toHaveBeenCalledWith('settlement');
  });

  it('never invents a settlement amount or counts, and counts the orders awaiting a pharmacist', () => {
    render(<VendorConsoleScreen initialOrders={DEMO_CONSOLE_ORDERS} />);
    expect(screen.getByText('Settlement due').nextElementSibling?.textContent).toBe('—');
    expect(screen.queryByText('₹4,188')).toBeNull();
    expect(screen.getByText(/2 orders contain a scheduled medicine/i)).toBeInTheDocument();
  });

  it('shows an honest empty queue without demo data or the pharmacist card', () => {
    render(<VendorConsoleScreen />);
    expect(screen.getByText(/No orders to show/i)).toBeInTheDocument();
    expect(screen.getByText(/not connected to live orders yet/i)).toBeInTheDocument();
    expect(screen.queryByText('AWAITING PHARMACIST')).not.toBeInTheDocument();
    expect(screen.queryByText('SK-48120')).not.toBeInTheDocument();
  });
});
