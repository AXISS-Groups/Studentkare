import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorReorderScreen, DEMO_REORDER_RULES } from '../VendorReorderScreen';

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
    render(<VendorReorderScreen initialRules={DEMO_REORDER_RULES} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Reorder rules' })).toBeInTheDocument();
    expect(screen.getByText(/Set a stock floor for each item/i)).toBeInTheDocument();
    expect(screen.getByText(/no purchase orders are sent to suppliers yet/i)).toBeInTheDocument();
    expect(screen.getByText(/4 below trigger/i)).toBeInTheDocument();
  });

  it('renders all 4 KPI cards with calculated metrics', () => {
    render(<VendorReorderScreen initialRules={DEMO_REORDER_RULES} />);
    expect(screen.getByText('Below trigger')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('Expiring within 60 days')).toBeInTheDocument();
    expect(screen.getByText('Essential items watched')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table headers and initial inventory items', () => {
    render(<VendorReorderScreen initialRules={DEMO_REORDER_RULES} />);
    expect(screen.getByText('Salbutamol inhaler')).toBeInTheDocument();
    expect(screen.getByText('ORS sachets')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
    expect(screen.getByText('Daily Multivitamin')).toBeInTheDocument();
    expect(screen.getByText('Insulin, rapid-acting')).toBeInTheDocument();
    expect(screen.getByText('Sunscreen SPF 50')).toBeInTheDocument();
  });

  it('filters rules using status filter tabs', () => {
    render(<VendorReorderScreen initialRules={DEMO_REORDER_RULES} />);
    const healthyTab = screen.getByRole('tab', { name: /Healthy/i });
    fireEvent.click(healthyTab);

    expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
    expect(screen.queryByText('Salbutamol inhaler')).not.toBeInTheDocument();
  });

  it('opens add reorder rule modal and adds a new rule', () => {
    render(<VendorReorderScreen initialRules={DEMO_REORDER_RULES} />);
    const addBtn = screen.getByRole('button', { name: /Add reorder rule/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('dialog', { name: 'Add reorder rule' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Amoxicillin 500mg' } });
    fireEvent.change(screen.getByLabelText('On hand'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Trigger floor'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Order qty'), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));

    expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
  });

  it('opens restock modal and increases on hand stock', () => {
    render(<VendorReorderScreen initialRules={DEMO_REORDER_RULES} />);
    const restockButtons = screen.getAllByRole('button', { name: /Restock/i });
    fireEvent.click(restockButtons[0]);

    expect(screen.getByRole('dialog', { name: /Record received stock/i })).toBeInTheDocument();
    const qtyInput = screen.getByLabelText(/Received quantity to add/i);
    fireEvent.change(qtyInput, { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm restock/i }));
    expect(screen.getByText(/Added 100 units .* Not saved yet/i)).toBeInTheDocument();
  });

  it('lists items to order without claiming a PO was sent', () => {
    render(<VendorReorderScreen initialRules={DEMO_REORDER_RULES} />);
    fireEvent.click(screen.getByRole('button', { name: 'List items to order' }));

    expect(screen.getByText(/Nothing was sent to suppliers/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Items to order' })).toBeInTheDocument();
    expect(screen.queryByText(/Dispatched/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PO-BATCH/)).not.toBeInTheDocument();
    expect(screen.queryByText('MedPlus Wholesale')).not.toBeInTheDocument();
  });

  it('marking one item to order invents no PO number', () => {
    render(<VendorReorderScreen initialRules={[{ id: 'x', item: 'ORS sachets', onHand: 2, triggerAt: 10, orderQty: 50, ruleDesc: 'Order 50' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark to order' }));
    expect(screen.getByText(/No order was sent/i)).toBeInTheDocument();
    expect(screen.queryByText(/PO-\d/)).not.toBeInTheDocument();
  });

  it('shows no sample rules when none are passed in', () => {
    render(<VendorReorderScreen />);
    expect(screen.queryByText('Salbutamol inhaler')).not.toBeInTheDocument();
    expect(screen.getByText(/No reorder rules yet/)).toBeInTheDocument();
  });
});
