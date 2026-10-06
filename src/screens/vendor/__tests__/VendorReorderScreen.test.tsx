import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorReorderScreen } from '../VendorReorderScreen';

vi.mock('@/data/AuthContext', () => ({
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

describe('VendorReorderScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, subtitle, and below trigger badge', () => {
    render(<VendorReorderScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Reorder rules' })).toBeInTheDocument();
    expect(screen.getByText(/Automatic purchase orders when stock crosses a floor/i)).toBeInTheDocument();
    expect(screen.getByText(/4 below trigger/i)).toBeInTheDocument();
  });

  it('renders all 4 KPI cards with calculated metrics', () => {
    render(<VendorReorderScreen />);
    expect(screen.getByText('Below trigger')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('Expiring within 60 days')).toBeInTheDocument();
    expect(screen.getByText('Essential items watched')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table headers and initial inventory items', () => {
    render(<VendorReorderScreen />);
    expect(screen.getByText('Salbutamol inhaler')).toBeInTheDocument();
    expect(screen.getByText('ORS sachets')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
    expect(screen.getByText('Daily Multivitamin')).toBeInTheDocument();
    expect(screen.getByText('Insulin, rapid-acting')).toBeInTheDocument();
    expect(screen.getByText('Sunscreen SPF 50')).toBeInTheDocument();
  });

  it('filters rules using status filter tabs', () => {
    render(<VendorReorderScreen />);
    const healthyTab = screen.getByRole('tab', { name: /Healthy/i });
    fireEvent.click(healthyTab);

    expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
    expect(screen.queryByText('Salbutamol inhaler')).not.toBeInTheDocument();
  });

  it('opens add reorder rule modal and adds a new rule', () => {
    render(<VendorReorderScreen />);
    const addBtn = screen.getByRole('button', { name: /Add reorder rule/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('dialog', { name: /Add Automatic Reorder Rule/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Amoxicillin 500mg' } });
    fireEvent.change(screen.getByLabelText(/On Hand/i), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/Trigger Floor/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Order Qty/i), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /Save & activate rule/i }));

    expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
  });

  it('opens restock modal and increases on hand stock', () => {
    render(<VendorReorderScreen />);
    const restockButtons = screen.getAllByRole('button', { name: /Restock/i });
    fireEvent.click(restockButtons[0]);

    expect(screen.getByRole('dialog', { name: /Record Received Stock/i })).toBeInTheDocument();
    const qtyInput = screen.getByLabelText(/Received Quantity to Add/i);
    fireEvent.change(qtyInput, { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Restock/i }));
    expect(screen.getByText(/Restocked 100 units/i)).toBeInTheDocument();
  });

  it('handles batch PO trigger', () => {
    render(<VendorReorderScreen />);
    const batchBtn = screen.getByRole('button', { name: /Raise batch PO/i });
    fireEvent.click(batchBtn);

    expect(screen.getByText(/Batch purchase orders created/i)).toBeInTheDocument();
  });
});
