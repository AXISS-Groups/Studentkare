import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VendorHomeScreen } from '../VendorHomeScreen';

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

describe('VendorHomeScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Partner console header with no invented business name or security claim', () => {
    render(<VendorHomeScreen />);
    expect(screen.getByText('Partner console')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your pharmacy today' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search patients, orders, results')).toBeInTheDocument();
    // The signed-in account names the partner — not a sample store.
    expect(screen.getByText('Demo Wellness Store')).toBeInTheDocument();
    expect(screen.queryByText(/MedPlus/)).not.toBeInTheDocument();
    expect(screen.queryByText('2FA on')).not.toBeInTheDocument();
  });

  it('renders the left navigation sidebar with STORE, LAB, and BUSINESS sections', () => {
    render(<VendorHomeScreen />);
    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();
    
    const sidebar = screen.getByLabelText('Partner links');
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sample queue/i })).toBeInTheDocument();
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

  it('switches provider type when clicking Lab tab', () => {
    render(<VendorHomeScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Lab' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Your lab today' })).toBeInTheDocument();
    expect(screen.getByText('To collect')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow’s run sheet')).toBeInTheDocument();
    // Switching type must not conjure an incoming booking.
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
    expect(screen.getByRole('heading', { level: 1, name: 'Your pharmacy today' })).toBeInTheDocument();
    expect(screen.queryByText(/refreshed/i)).not.toBeInTheDocument();
  });

  it('switches across all 4 provider types correctly', () => {
    render(<VendorHomeScreen />);
    
    fireEvent.click(screen.getByRole('tab', { name: 'Clinic' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Your clinic today' })).toBeInTheDocument();
    expect(screen.getByText('Today at the clinic')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Wellness centre' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Your wellness centre today' })).toBeInTheDocument();
    expect(screen.getByText('Today’s sessions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Pharmacy' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Your pharmacy today' })).toBeInTheDocument();
  });

  it('says a tool is unavailable instead of pretending to open it', () => {
    render(<VendorHomeScreen initialProviderType="clinic" />);
    fireEvent.click(screen.getByRole('button', { name: /Slots/ }));
    expect(screen.getByText('This section isn’t available yet.')).toBeInTheDocument();
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

  it('navigates to verify screen when clicking Verify student in sidebar', () => {
    const onNavigate = vi.fn();
    render(<VendorHomeScreen onNavigate={onNavigate} />);

    const verifyBtn = screen.getByRole('button', { name: /verify student/i });
    fireEvent.click(verifyBtn);
    expect(onNavigate).toHaveBeenCalledWith('scan-verify');
  });
});

