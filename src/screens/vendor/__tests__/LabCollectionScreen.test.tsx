import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LabCollectionScreen } from '../LabCollectionScreen';

vi.mock('@/data/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-vendor',
      fullName: 'Demo Laboratory Staff',
      role: 'VENDOR',
      email: 'lab@studentkare.test',
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/utils/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('LabCollectionScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, subtitle, and Close run button', () => {
    render(<LabCollectionScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Run sheet' })).toBeInTheDocument();
    expect(screen.getByText(/Priya N., phlebotomist · VNR VJIET/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close run/i })).toBeInTheDocument();
  });

  it('renders all 4 KPI stat cards correctly', () => {
    render(<LabCollectionScreen />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Stops today')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('Collected').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getAllByText('Reschedule needed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('11 min')).toBeInTheDocument();
    expect(screen.getByText('Median per stop')).toBeInTheDocument();
  });

  it('renders 18 sidebar items with Run sheet marked active', () => {
    render(<LabCollectionScreen />);
    const runSheetBtn = screen.getByRole('button', { name: /Run sheet/i });
    expect(runSheetBtn).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();
  });

  it('renders the Next Stop card with Ayesha K.', () => {
    render(<LabCollectionScreen />);
    expect(screen.getByText('NEXT STOP')).toBeInTheDocument();
    expect(screen.getByText(/Ayesha K. · Block C 108 · Thyroid profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify on phone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tube step/i })).toBeInTheDocument();
  });

  it('allows verifying student identity via modal', () => {
    render(<LabCollectionScreen />);
    const verifyBtn = screen.getByRole('button', { name: /Verify on phone/i });
    fireEvent.click(verifyBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Verify Student Identity' })).toBeInTheDocument();
    expect(screen.getByText(/Ayesha Khan/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Identity Match/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByText('✓ Verified')).toBeInTheDocument();
  });

  it('allows scanning tube barcode via modal', () => {
    render(<LabCollectionScreen />);
    const tubeStepBtn = screen.getByRole('button', { name: /Tube step/i });
    fireEvent.click(tubeStepBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Scan Sample Tube Barcode' })).toBeInTheDocument();
    const barcodeInput = screen.getByLabelText(/Tube Barcode ID/i);
    fireEvent.change(barcodeInput, { target: { value: 'TB-99881' } });

    const saveBtn = screen.getByRole('button', { name: /Save Tube Barcode/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('✓ Tube TB-99881')).toBeInTheDocument();
  });

  it('filters stops using search input', () => {
    render(<LabCollectionScreen />);
    const searchInput = screen.getByRole('textbox', { name: /Search run sheet stops/i });
    fireEvent.change(searchInput, { target: { value: 'Krishna' } });

    expect(screen.getByText(/Krishna C. · Fasting panel/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rahul M. · Vitamin D/i)).not.toBeInTheDocument();
  });

  it('filters stops using status filter tabs', () => {
    render(<LabCollectionScreen />);
    const collectedTab = screen.getByRole('button', { name: 'Collected' });
    fireEvent.click(collectedTab);

    expect(screen.getByText(/Krishna C. · Fasting panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Imran S. · CBC/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rahul M. · Vitamin D/i)).not.toBeInTheDocument();
  });

  it('opens Stop details modal and allows marking reschedule', () => {
    render(<LabCollectionScreen />);
    const rahulRow = screen.getByRole('button', { name: /Rahul M/i });
    fireEvent.click(rahulRow);

    expect(screen.getByRole('heading', { level: 3, name: /Stop Details: Rahul M./i })).toBeInTheDocument();
    const markRescheduleBtn = screen.getByRole('button', { name: /Mark Not Fasted/i });
    fireEvent.click(markRescheduleBtn);

    expect(screen.queryByRole('heading', { level: 3, name: /Stop Details: Rahul M./i })).not.toBeInTheDocument();
  });

  it('opens close run modal and transitions to cold-chain on confirm', () => {
    const onNavigate = vi.fn();
    render(<LabCollectionScreen onNavigate={onNavigate} />);

    const closeRunBtn = screen.getByRole('button', { name: /Close run/i });
    fireEvent.click(closeRunBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Close Collection Run' })).toBeInTheDocument();
    const sealBtn = screen.getByRole('button', { name: /Seal & Handover to Cold Chain/i });
    fireEvent.click(sealBtn);

    expect(onNavigate).toHaveBeenCalledWith('cold-chain');
  });

  it('handles sidebar navigation clicks', () => {
    const onNavigate = vi.fn();
    render(<LabCollectionScreen onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledWith('vendor');

    fireEvent.click(screen.getByRole('button', { name: 'Verify student' }));
    expect(onNavigate).toHaveBeenCalledWith('verify');

    fireEvent.click(screen.getByRole('button', { name: /Orders/i }));
    expect(onNavigate).toHaveBeenCalledWith('orders');

    fireEvent.click(screen.getByRole('button', { name: 'Cold chain' }));
    expect(onNavigate).toHaveBeenCalledWith('cold-chain');
  });
});
