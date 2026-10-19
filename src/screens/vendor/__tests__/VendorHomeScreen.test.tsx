import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VendorHomeScreen } from '../VendorHomeScreen';

// The partner type comes from the session, as a super admin assigned it.
const partner: { partnerKind: string } = { partnerKind: 'PHARMACY' };
vi.mock('../../../data/contexts/AuthContext', () => ({
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
vi.mock('../../../lib/utils/workflowRouting', () => ({
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
    expect(screen.getByText('Pharmacy')).toBeInTheDocument();
    for (const fake of [/MedPlus/, /Bachupally/, /licence/i, /2FA on/]) expect(screen.queryByText(fake)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search patients, orders, results')).toBeInTheDocument();
  });

  it('draws no sidebar of its own: the partner console shell provides it', () => {
    render(<VendorHomeScreen />);
    expect(screen.queryByRole('navigation', { name: 'Partner links' })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows KPI labels with no made-up numbers', () => {
    render(<VendorHomeScreen />);
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Rx to review')).toBeInTheDocument();
    expect(screen.getByText('Out for delivery')).toBeInTheDocument();
    expect(screen.getByText('Accept rate')).toBeInTheDocument();
    expect(screen.queryByText('96%')).not.toBeInTheDocument();
    expect(screen.getAllByText('Not connected yet')).toHaveLength(4);
  });

  it('shows no sample orders and no fake new-order alert', () => {
    render(<VendorHomeScreen />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Paracetamol/)).not.toBeInTheDocument();
    expect(screen.getByText(/Live orders and bookings aren’t connected/)).toBeInTheDocument();
  });

  it.each([
    ['PHARMACY', 'Pharmacy', 'Today’s orders', 'Rx review'],
    ['LAB', 'Lab', 'Tomorrow’s run sheet', 'Run sheet'],
    ['CLINIC', 'Clinic', 'Today at the clinic', 'Doctors & rooms'],
    ['WELLNESS', 'Wellness centre', 'Today’s sessions', 'Timetable'],
  ])('shows a %s partner their own dashboard and tools', (kind, typeLabel, queue, tool) => {
    partner.partnerKind = kind;
    render(<VendorHomeScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Demo Wellness Store' })).toBeInTheDocument();
    expect(screen.getByText(typeLabel)).toBeInTheDocument();
    expect(screen.getByText(queue)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Your tools' })).getByText(tool)).toBeInTheDocument();
    // A type with no live feed must not conjure an incoming booking.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

  it('says honestly when a search has nothing to match', () => {
    render(<VendorHomeScreen />);
    fireEvent.change(screen.getByPlaceholderText('Search patients, orders, results'), { target: { value: 'Paracetamol' } });
    expect(screen.getByText('No items matching “Paracetamol”')).toBeInTheDocument();
  });

  it('renders different view states (Loading, Empty, and Error)', () => {
    const { rerender } = render(<VendorHomeScreen initialViewState="loading" />);
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();

    rerender(<VendorHomeScreen initialViewState="empty" />);
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check your catalogue' })).toBeInTheDocument();

    rerender(<VendorHomeScreen initialViewState="error" />);
    expect(screen.getByText('Couldn’t load your console')).toBeInTheDocument();
    expect(screen.queryByText(/We tried 3 times/)).not.toBeInTheDocument();

    // Help never claims systems are operational.
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Help' }));
    expect(screen.queryByText(/operational/i)).not.toBeInTheDocument();

    // Try again returns to the dashboard without a fake "refreshed" toast.
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Demo Wellness Store' })).toBeInTheDocument();
    expect(screen.queryByText(/refreshed/i)).not.toBeInTheDocument();
  });

  it('says a tool is unavailable instead of pretending to open it', () => {
    render(<VendorHomeScreen initialProviderType="clinic" />);
    fireEvent.click(screen.getByRole('button', { name: /Slots/ }));
    expect(screen.getByText('This section isn’t available yet.')).toBeInTheDocument();
  });

  it('opens the partner scanner at /scan-verify (/verify is the student identity page), once per click', () => {
    partner.partnerKind = 'WELLNESS';
    const onNavigate = vi.fn();
    render(<VendorHomeScreen onNavigate={onNavigate} />);
    fireEvent.click(within(screen.getByRole('region', { name: 'Your tools' })).getByRole('button', { name: /Check-in/i }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('scan-verify');
  });

  it('opens and interacts with the user profile dropdown', () => {
    const onLogout = vi.fn();
    const onSwitchRole = vi.fn();
    render(<VendorHomeScreen onLogout={onLogout} onSwitchRole={onSwitchRole} />);

    const profileTrigger = screen.getByRole('button', { name: /partner account menu/i });
    expect(profileTrigger).toBeInTheDocument();

    fireEvent.click(profileTrigger);

    // Dropdown contains partner identity and role switcher
    expect(within(screen.getByRole('menu')).getByText('Demo Wellness Store')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /switch to student portal/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /switch to super admin/i })).toBeInTheDocument();

    // Sign out button works
    const signOutBtn = screen.getByRole('menuitem', { name: /sign out/i });
    fireEvent.click(signOutBtn);
    expect(onLogout).toHaveBeenCalled();
  });
});
