import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('renders the Partner console header and MedPlus Bachupally by default', () => {
    render(<VendorHomeScreen />);
    expect(screen.getByText('Partner console')).toBeInTheDocument();
    expect(screen.getByText('2FA on')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'MedPlus · Bachupally' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search patients, orders, results')).toBeInTheDocument();
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

  it('switches provider type when clicking Lab tab', () => {
    render(<VendorHomeScreen />);
    const labTab = screen.getByRole('tab', { name: 'Lab' });
    fireEvent.click(labTab);

    expect(screen.getByRole('heading', { level: 1, name: 'Vijaya Diagnostics · Miyapur' })).toBeInTheDocument();
    expect(screen.getByText('TO COLLECT')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow’s run sheet')).toBeInTheDocument();
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
    expect(screen.getByText(/Nothing in MedPlus · Bachupally yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check your catalogue' })).toBeInTheDocument();

    // Switch to Error
    rerender(<VendorHomeScreen initialViewState="error" />);
    expect(screen.getByText(/Couldn’t load MedPlus · Bachupally/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    // Clicking Try Again triggers transition
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    // Recovers back to data state
    expect(screen.getByRole('heading', { level: 1, name: 'MedPlus · Bachupally' })).toBeInTheDocument();
  });

  it('switches across all 4 provider types correctly', () => {
    render(<VendorHomeScreen />);
    
    // Clinic
    fireEvent.click(screen.getByRole('tab', { name: 'Clinic' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Sai Clinic · Nizampet' })).toBeInTheDocument();
    expect(screen.getByText('Today at the clinic')).toBeInTheDocument();

    // Wellness centre
    fireEvent.click(screen.getByRole('tab', { name: 'Wellness centre' }));
    expect(screen.getByRole('heading', { level: 1, name: 'FitHub · campus gym partner' })).toBeInTheDocument();
    expect(screen.getByText('Today’s sessions')).toBeInTheDocument();

    // Back to Pharmacy
    fireEvent.click(screen.getByRole('tab', { name: 'Pharmacy' }));
    expect(screen.getByRole('heading', { level: 1, name: 'MedPlus · Bachupally' })).toBeInTheDocument();
  });

  it('opens and interacts with the user profile dropdown', () => {
    const onLogout = vi.fn();
    const onSwitchRole = vi.fn();
    render(<VendorHomeScreen onLogout={onLogout} onSwitchRole={onSwitchRole} />);

    const profileTrigger = screen.getByRole('button', { name: /partner account menu/i });
    expect(profileTrigger).toBeInTheDocument();

    fireEvent.click(profileTrigger);

    // Dropdown contains partner identity and role switcher
    expect(screen.getByText('Demo Wellness Store')).toBeInTheDocument();
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
    expect(onNavigate).toHaveBeenCalledWith('verify');
  });
});

