import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { VendorHomeScreen } from '../VendorHomeScreen';

// The partner type comes from the session, as a super admin assigned it.
const partner: { partnerKind: string } = { partnerKind: 'PHARMACY' };
vi.mock('../../../data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-vendor',
      fullName: 'Demo Wellness Store',
      role: 'VENDOR',
      email: 'vendor@studentkare.test',
      partnerKind: partner.partnerKind,
    },
    logout: vi.fn(),
  }),
}));

// Mock workflowRouting
vi.mock('../../../lib/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('VendorHomeScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    partner.partnerKind = 'PHARMACY';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the partner’s own account, never a sample business, licence or 2FA claim', () => {
    render(<VendorHomeScreen />);
    expect(screen.getByText('Partner console')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Demo Wellness Store' })).toBeInTheDocument();
    expect(screen.getByText('Pharmacy partner')).toBeInTheDocument();
    for (const fake of [/MedPlus/, /Bachupally/, /licence/i, /2FA on/, /vendor@studentkare\.test/]) expect(screen.queryByText(fake)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search patients, orders, results')).toBeInTheDocument();
  });

  it('renders 4 KPI cards for Pharmacy by default', () => {
    render(<VendorHomeScreen />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText('RX TO REVIEW')).toBeInTheDocument();
    expect(screen.getByText('OUT FOR DELIVERY')).toBeInTheDocument();
    expect(screen.getByText('ACCEPT RATE')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
  });

  it('handles urgent SLA alert acceptance and triggers unlock toast', () => {
    render(<VendorHomeScreen />);
    const alertBanner = screen.getByRole('alert');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText('New order · 3 items, 1 needs Rx review')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: 'Accept' });
    fireEvent.click(acceptBtn);

    // Banner is dismissed
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Toast is shown
    expect(screen.getByText('Accepted · student details unlocked')).toBeInTheDocument();
  });

  it('handles urgent SLA alert decline and triggers decline toast', () => {
    render(<VendorHomeScreen />);
    const declineBtn = screen.getByRole('button', { name: 'Decline' });
    fireEvent.click(declineBtn);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Declined · offered to the next partner')).toBeInTheDocument();
  });

  it.each([
    ['PHARMACY', 'Pharmacy partner', 'Today’s orders', 'Rx review'],
    ['LAB', 'Lab partner', 'Tomorrow’s run sheet', 'Run sheet'],
    ['CLINIC', 'Clinic partner', 'Today at the clinic', 'Doctors & rooms'],
    ['WELLNESS', 'Wellness centre partner', 'Today’s sessions', 'Timetable'],
  ])('shows a %s partner their own dashboard and tools', (kind, typeLabel, queue, tool) => {
    partner.partnerKind = kind;
    render(<VendorHomeScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Demo Wellness Store' })).toBeInTheDocument();
    expect(screen.getByText(typeLabel)).toBeInTheDocument();
    expect(screen.getByText(queue)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Your tools' })).getByText(tool)).toBeInTheDocument();
  });

  it('only shows the tools of the partner’s own type', () => {
    partner.partnerKind = 'LAB';
    render(<VendorHomeScreen />);
    const tools = within(screen.getByRole('region', { name: 'Your tools' }));
    for (const other of ['Rx review', 'OTP handover', 'Bookings', 'Timetable']) expect(tools.queryByText(other)).not.toBeInTheDocument();
  });

  it('offers the partner no way to switch their type', () => {
    render(<VendorHomeScreen />);
    expect(screen.queryByRole('tablist', { name: /provider type/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    for (const label of ['Lab', 'Clinic', 'Wellness centre']) expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  });

  it.each(['', 'SPA'])('fails closed for a partner whose type is %j: no dashboard, no tools', (kind) => {
    partner.partnerKind = kind;
    render(<VendorHomeScreen />);
    expect(screen.getByRole('heading', { level: 1, name: /isn’t set up yet/i })).toBeInTheDocument();
    expect(screen.queryByText('Your tools')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('filters queue items when typing in the search bar', () => {
    render(<VendorHomeScreen />);
    const searchInput = screen.getByPlaceholderText('Search patients, orders, results');
    
    // Initially contains Paracetamol and Salbutamol
    expect(screen.getByText('Paracetamol 650, ORS ×2')).toBeInTheDocument();
    expect(screen.getByText('Salbutamol inhaler (Rx)')).toBeInTheDocument();

    // Type query matching only Paracetamol
    fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });
    expect(screen.getByText('Paracetamol 650, ORS ×2')).toBeInTheDocument();
    expect(screen.queryByText('Salbutamol inhaler (Rx)')).not.toBeInTheDocument();
  });

  it('renders different view states (Loading, Empty, and Error)', () => {
    const { rerender } = render(<VendorHomeScreen initialViewState="loading" />);
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();

    // Switch to Empty
    rerender(<VendorHomeScreen initialViewState="empty" />);
    expect(screen.getByText(/Nothing in Demo Wellness Store yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check your catalogue' })).toBeInTheDocument();

    // Switch to Error
    rerender(<VendorHomeScreen initialViewState="error" />);
    expect(screen.getByText(/Couldn’t load Demo Wellness Store/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    // Clicking Try Again triggers transition
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    // Recovers back to data state
    expect(screen.getByRole('heading', { level: 1, name: 'Demo Wellness Store' })).toBeInTheDocument();
  });

  it('opens and interacts with the user profile dropdown', () => {
    const onLogout = vi.fn();
    const onSwitchRole = vi.fn();
    render(<VendorHomeScreen onLogout={onLogout} onSwitchRole={onSwitchRole} />);

    const profileTrigger = screen.getByRole('button', { name: /partner account menu/i });
    expect(profileTrigger).toBeInTheDocument();

    fireEvent.click(profileTrigger);

    // Dropdown contains partner identity and role switcher
    expect(screen.getByRole('menu')).toHaveTextContent('Demo Wellness Store');
    expect(screen.getByRole('menuitem', { name: /switch to student portal/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /switch to super admin/i })).toBeInTheDocument();

    // Sign out button works
    const signOutBtn = screen.getByRole('menuitem', { name: /sign out/i });
    fireEvent.click(signOutBtn);
    expect(onLogout).toHaveBeenCalled();
  });

});

