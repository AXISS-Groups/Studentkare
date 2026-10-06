import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorSubstitutionScreen } from '../VendorSubstitutionScreen';

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

describe('VendorSubstitutionScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, subtitle, and 1 swap blocked by prescriber pill', () => {
    render(<VendorSubstitutionScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Substitutions' })).toBeInTheDocument();
    expect(screen.getByText(/Bio-equivalent generics · offered, never imposed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 swap blocked by prescriber/i)).toBeInTheDocument();
  });

  it('renders the 4 KPI stat cards with correct calculated values', () => {
    render(<VendorSubstitutionScreen />);
    expect(screen.getByText('Saved for students today')).toBeInTheDocument();
    expect(screen.getByText('₹120')).toBeInTheDocument(); // ₹78 + ₹42
    expect(screen.getAllByText('Accepted').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Declined').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Blocked by prescriber').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table headers and initial rows matching design', () => {
    render(<VendorSubstitutionScreen />);
    expect(screen.getByText('PRESCRIBED')).toBeInTheDocument();
    expect(screen.getByText('GENERIC OFFERED')).toBeInTheDocument();
    expect(screen.getByText('SAVING')).toBeInTheDocument();
    expect(screen.getByText('PRESCRIBER')).toBeInTheDocument();
    expect(screen.getByText('OUTCOME')).toBeInTheDocument();

    expect(screen.getByText('Shelcal 500')).toBeInTheDocument();
    expect(screen.getByText('Calcium carbonate 500 mg')).toBeInTheDocument();
    expect(screen.getByText('₹78 (46%)')).toBeInTheDocument();
    expect(screen.getAllByText('Student accepted').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Augmentin 625')).toBeInTheDocument();
    expect(screen.getByText('Student declined')).toBeInTheDocument();

    expect(screen.getByText('Eltroxin 50 mcg')).toBeInTheDocument();
    expect(screen.getByText('Levothyroxine 50 mcg')).toBeInTheDocument();
    expect(screen.getByText('Swap NOT permitted')).toBeInTheDocument();
    expect(screen.getByText('Dispensed as written')).toBeInTheDocument();

    expect(screen.getByText('Asthalin inhaler')).toBeInTheDocument();
    expect(screen.getByText('No equivalent in stock')).toBeInTheDocument();
  });

  it('filters table by outcome category tabs', () => {
    render(<VendorSubstitutionScreen />);
    const blockedTab = screen.getByRole('button', { name: /^Blocked$/i });
    fireEvent.click(blockedTab);

    expect(screen.getByText('Eltroxin 50 mcg')).toBeInTheDocument();
    expect(screen.queryByText('Shelcal 500')).not.toBeInTheDocument();
    expect(screen.queryByText('Augmentin 625')).not.toBeInTheDocument();
  });

  it('filters table by search query', () => {
    render(<VendorSubstitutionScreen />);
    const searchInput = screen.getByLabelText(/search substitutions/i);
    fireEvent.change(searchInput, { target: { value: 'Augmentin' } });

    expect(screen.getByText('Augmentin 625')).toBeInTheDocument();
    expect(screen.queryByText('Shelcal 500')).not.toBeInTheDocument();
    expect(screen.queryByText('Eltroxin 50 mcg')).not.toBeInTheDocument();
  });

  it('opens propose swap modal and adds a generic substitution', () => {
    render(<VendorSubstitutionScreen />);
    const proposeBtn = screen.getByRole('button', { name: /propose swap/i });
    fireEvent.click(proposeBtn);

    expect(screen.getByRole('heading', { level: 2, name: /propose generic substitution/i })).toBeInTheDocument();

    const brandInput = screen.getByPlaceholderText(/e.g. Augmentin 625/i);
    fireEvent.change(brandInput, { target: { value: 'Crocin 650' } });

    const genericInput = screen.getByPlaceholderText(/e.g. Amoxicillin 500mg/i);
    fireEvent.change(genericInput, { target: { value: 'Paracetamol 650 mg' } });

    const submitBtn = screen.getByRole('button', { name: /record substitution/i });
    fireEvent.click(submitBtn);

    expect(screen.queryByRole('heading', { level: 2, name: /propose generic substitution/i })).not.toBeInTheDocument();
    expect(screen.getByText('Crocin 650')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 650 mg')).toBeInTheDocument();
  });

  it('blocks generic swap if drug is narrow-therapeutic-index (NTI)', () => {
    render(<VendorSubstitutionScreen />);
    const proposeBtn = screen.getByRole('button', { name: /propose swap/i });
    fireEvent.click(proposeBtn);

    const brandInput = screen.getByPlaceholderText(/e.g. Augmentin 625/i);
    fireEvent.change(brandInput, { target: { value: 'Thyronorm 100 mcg' } });

    // Warning message should appear in real time
    expect(screen.getByText(/Narrow Therapeutic Index \(NTI\) Warning/i)).toBeInTheDocument();

    const genericInput = screen.getByPlaceholderText(/e.g. Amoxicillin 500mg/i);
    fireEvent.change(genericInput, { target: { value: 'Levothyroxine 100 mcg' } });

    const submitBtn = screen.getByRole('button', { name: /record substitution/i });
    fireEvent.click(submitBtn);

    // Should be registered with "Dispensed as written"
    expect(screen.getByText('Thyronorm 100 mcg')).toBeInTheDocument();
    const rows = screen.getAllByText('Dispensed as written');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('opens details modal when clicking a row', () => {
    render(<VendorSubstitutionScreen />);
    const shelcalRow = screen.getByText('Shelcal 500');
    fireEvent.click(shelcalRow);

    expect(screen.getByText('Substitution Details')).toBeInTheDocument();
    expect(screen.getAllByText('Calcium carbonate 500 mg').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/DCGI approved monograph formulation/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Substitution Details')).not.toBeInTheDocument();
  });

  it('renders statutory clinical guidance notice at the bottom of the table', () => {
    render(<VendorSubstitutionScreen />);
    expect(
      screen.getByText(/Narrow-therapeutic-index medicines like levothyroxine are dispensed exactly as written/i)
    ).toBeInTheDocument();
  });

  it('handles navigation when sidebar items are clicked', () => {
    const onNavigate = vi.fn();
    render(<VendorSubstitutionScreen onNavigate={onNavigate} />);

    const handoverBtn = screen.getByRole('button', { name: /otp handover/i });
    fireEvent.click(handoverBtn);
    expect(onNavigate).toHaveBeenCalledWith('handover');

    const ordersBtn = screen.getByRole('button', { name: /orders/i });
    fireEvent.click(ordersBtn);
    expect(onNavigate).toHaveBeenCalledWith('orders');
  });
});
