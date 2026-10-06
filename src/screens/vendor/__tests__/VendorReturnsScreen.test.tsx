import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorReturnsScreen } from '../VendorReturnsScreen';

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

vi.mock('@/lib/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

vi.mock('@/lib/utils/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('VendorReturnsScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Partner brand, Returns title, and last 30 days subtitle', () => {
    render(<VendorReturnsScreen />);
    expect(screen.getByText('PARTNER')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Returns' })).toBeInTheDocument();
    expect(screen.getByText(/Campus pharmacy · last 30 days/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view statutory returns policy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record return request at counter/i })).toBeInTheDocument();
  });

  it('renders all 4 stat cards correctly matching the artboard', () => {
    render(<VendorReturnsScreen />);
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Requests this month')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Our error').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Refused with a reason')).toBeInTheDocument();
    expect(screen.getByText('2.1%')).toBeInTheDocument();
    expect(screen.getByText('Return rate')).toBeInTheDocument();
  });

  it('renders the 18 sidebar items with Returns active', () => {
    render(<VendorReturnsScreen />);
    const returnsBtn = screen.getByRole('button', { name: /^returns$/i });
    expect(returnsBtn).toHaveAttribute('aria-current', 'page');
    expect(returnsBtn).toHaveClass('is-active');

    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify student/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cold chain/i })).toBeInTheDocument();
  });

  it('renders initial return records from the reference artboard', () => {
    render(<VendorReturnsScreen />);
    expect(screen.getByText('#SK-40188')).toBeInTheDocument();
    expect(screen.getByText('Daily Multivitamin Essentials')).toBeInTheDocument();
    expect(screen.getByText('Wrong pack size sent')).toBeInTheDocument();

    expect(screen.getByText('#SK-40171')).toBeInTheDocument();
    expect(screen.getByText('Barrier Care Daily Moisturiser')).toBeInTheDocument();

    expect(screen.getByText('#SK-40160')).toBeInTheDocument();
    expect(screen.getByText('Ashwagandha Stress Balance')).toBeInTheDocument();

    expect(screen.getByText('#SK-40144')).toBeInTheDocument();
    expect(screen.getByText('Prescription — D3 60k')).toBeInTheDocument();

    expect(screen.getByText('#SK-40131')).toBeInTheDocument();
    expect(screen.getByText('Complete Health Checkup')).toBeInTheDocument();
  });

  it('filters returns by search query', () => {
    render(<VendorReturnsScreen />);
    const searchInput = screen.getByRole('textbox', { name: /search return requests/i });

    fireEvent.change(searchInput, { target: { value: 'Multivitamin' } });
    expect(screen.getByText('#SK-40188')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40171')).not.toBeInTheDocument();
    expect(screen.queryByText('#SK-40160')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '40144' } });
    expect(screen.getByText('#SK-40144')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40188')).not.toBeInTheDocument();
  });

  it('filters returns using filter tabs', () => {
    render(<VendorReturnsScreen />);
    const ourErrorTab = screen.getByRole('button', { name: 'Our error' });
    fireEvent.click(ourErrorTab);

    // Our errors are #SK-40188 and #SK-40171
    expect(screen.getByText('#SK-40188')).toBeInTheDocument();
    expect(screen.getByText('#SK-40171')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40131')).not.toBeInTheDocument();
    expect(screen.queryByText('#SK-40160')).not.toBeInTheDocument();
    expect(screen.queryByText('#SK-40144')).not.toBeInTheDocument();

    const refusedTab = screen.getByRole('button', { name: 'Refused' });
    fireEvent.click(refusedTab);
    expect(screen.getByText('#SK-40144')).toBeInTheDocument();
    expect(screen.queryByText('#SK-40188')).not.toBeInTheDocument();
  });

  it('opens and closes the statutory returns policy modal', () => {
    render(<VendorReturnsScreen />);
    const policyBtn = screen.getByRole('button', { name: /view statutory returns policy/i });
    fireEvent.click(policyBtn);

    expect(screen.getByRole('heading', { level: 3, name: /campus pharmacy returns & safety policy/i })).toBeInTheDocument();
    expect(screen.getByText(/1\. Prescription Medicines \(Non-Returnable\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Drugs and Cosmetics Rules Rule 65/i)).toBeInTheDocument();

    const understandBtn = screen.getByRole('button', { name: /i understand/i });
    fireEvent.click(understandBtn);
    expect(screen.queryByRole('heading', { level: 3, name: /campus pharmacy returns & safety policy/i })).not.toBeInTheDocument();
  });

  it('opens return assessment modal when clicking a row and allows processing refund', () => {
    render(<VendorReturnsScreen />);
    const row = screen.getByText('#SK-40171');
    fireEvent.click(row);

    const dialog = screen.getByRole('dialog');
    expect(screen.getByRole('heading', { level: 3, name: /return assessment: #sk-40171/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Barrier Care Daily Moisturiser/i).length).toBe(2);
    expect(screen.getByText(/Bottle pump seal cracked in transit/i)).toBeInTheDocument();

    const refundBtn = screen.getByRole('button', { name: /process full refund/i });
    fireEvent.click(refundBtn);

    expect(screen.queryByRole('heading', { level: 3, name: /return assessment: #sk-40171/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Processed 100% refund for #SK-40171/i)).toBeInTheDocument();
  });

  it('opens record return modal, fills form, and records new return', () => {
    render(<VendorReturnsScreen />);
    const recordBtn = screen.getByRole('button', { name: /record return request at counter/i });
    fireEvent.click(recordBtn);

    expect(screen.getByRole('heading', { level: 3, name: /record return request at counter/i })).toBeInTheDocument();

    const orderInput = screen.getByLabelText(/order number/i);
    const itemInput = screen.getByLabelText(/item name/i);
    const reasonInput = screen.getByLabelText(/reason stated by student/i);

    fireEvent.change(orderInput, { target: { value: '#SK-40220' } });
    fireEvent.change(itemInput, { target: { value: 'Vitamin C 500mg Chewable' } });
    fireEvent.change(reasonInput, { target: { value: 'Wrong pack size sent' } });

    const submitBtn = screen.getByRole('button', { name: /record assessment & log/i });
    fireEvent.click(submitBtn);

    expect(screen.queryByRole('heading', { level: 3, name: /record return request at counter/i })).not.toBeInTheDocument();
    expect(screen.getByText('#SK-40220')).toBeInTheDocument();
    expect(screen.getByText('Vitamin C 500mg Chewable')).toBeInTheDocument();
    expect(screen.getByText(/Return #SK-40220 logged/i)).toBeInTheDocument();
  });

  it('triggers onNavigate when sidebar buttons are clicked', () => {
    const handleNavigate = vi.fn();
    render(<VendorReturnsScreen onNavigate={handleNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /home/i }));
    expect(handleNavigate).toHaveBeenCalledWith('vendor');

    fireEvent.click(screen.getByRole('button', { name: /verify student/i }));
    expect(handleNavigate).toHaveBeenCalledWith('verify');

    fireEvent.click(screen.getByRole('button', { name: /orders/i }));
    expect(handleNavigate).toHaveBeenCalledWith('orders');

    fireEvent.click(screen.getByRole('button', { name: /catalogue/i }));
    expect(handleNavigate).toHaveBeenCalledWith('catalogue');

    fireEvent.click(screen.getByRole('button', { name: /cold chain/i }));
    expect(handleNavigate).toHaveBeenCalledWith('cold-chain');

    fireEvent.click(screen.getByRole('button', { name: /run sheet/i }));
    expect(handleNavigate).toHaveBeenCalledWith('run-sheet');
  });
});
