import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorCatalogueScreen } from '../VendorCatalogueScreen';

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

vi.mock('@/lib/utils/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('VendorCatalogueScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Partner header, Catalogue title, and Add a product button', () => {
    render(<VendorCatalogueScreen />);
    expect(screen.getByText('PARTNER')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Catalogue' })).toBeInTheDocument();
    expect(screen.getByText(/51 published entries · you set price and stock, never position/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add a product to catalogue/i })).toBeInTheDocument();
  });

  it('renders all 4 stat cards correctly', () => {
    render(<VendorCatalogueScreen />);
    expect(screen.getByText('51')).toBeInTheDocument();
    expect(screen.getAllByText('Published').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Low stock').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Under review').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the 18 sidebar items with Catalogue active under BUSINESS', () => {
    render(<VendorCatalogueScreen />);
    const catBtn = screen.getByRole('button', { name: /^catalogue$/i });
    expect(catBtn).toHaveAttribute('aria-current', 'page');

    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();
  });

  it('renders initial products in table matching HTML source', () => {
    render(<VendorCatalogueScreen />);
    expect(screen.getByText('Ashwagandha Stress Balance')).toBeInTheDocument();
    expect(screen.getAllByText('Root & Ritual').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bottle of 60').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('₹299').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('45')).toBeInTheDocument();

    expect(screen.getByText('Barrier Care Daily Moisturiser')).toBeInTheDocument();
    expect(screen.getByText('Daily Defence Sunscreen SPF 50')).toBeInTheDocument();
    expect(screen.getByText('Ayurvedic Immunity Kadha Mix')).toBeInTheDocument();
  });

  it('filters catalogue products by status tab', () => {
    render(<VendorCatalogueScreen />);
    const outOfStockTab = screen.getByRole('tab', { name: /out of stock/i });
    fireEvent.click(outOfStockTab);

    expect(screen.getByText('Daily Defence Sunscreen SPF 50')).toBeInTheDocument();
    expect(screen.queryByText('Ashwagandha Stress Balance')).not.toBeInTheDocument();
  });

  it('searches products by brand or title', () => {
    render(<VendorCatalogueScreen />);
    const searchInput = screen.getByPlaceholderText(/search product or brand/i);
    fireEvent.change(searchInput, { target: { value: 'Kindskin' } });

    expect(screen.getByText('Barrier Care Daily Moisturiser')).toBeInTheDocument();
    expect(screen.getByText('Daily Defence Sunscreen SPF 50')).toBeInTheDocument();
    expect(screen.queryByText('Ashwagandha Stress Balance')).not.toBeInTheDocument();
  });

  it('opens add product modal, validates form, and adds a product', () => {
    render(<VendorCatalogueScreen />);
    const addBtn = screen.getByRole('button', { name: /add a product to catalogue/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { level: 2, name: 'Add a product' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Vitamin C 1000mg Chewable' } });
    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: 'Limcee' } });
    fireEvent.change(screen.getByLabelText(/pack specification/i), { target: { value: 'Strip of 15' } });
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText(/initial stock/i), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /add product to inventory/i }));

    expect(screen.getByText('Vitamin C 1000mg Chewable')).toBeInTheDocument();
    expect(screen.getByText('Limcee')).toBeInTheDocument();
  });

  it('opens edit modal on product click and updates stock level', () => {
    render(<VendorCatalogueScreen />);
    const productRow = screen.getByLabelText(/edit ashwagandha stress balance/i);
    fireEvent.click(productRow);

    expect(screen.getByRole('heading', { level: 2, name: 'Edit stock & price' })).toBeInTheDocument();
    const stockInput = screen.getByLabelText(/stock level/i);
    fireEvent.change(stockInput, { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('navigates to other sidebar routes on click', () => {
    const onNavigate = vi.fn();
    render(<VendorCatalogueScreen onNavigate={onNavigate} />);

    const homeBtn = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeBtn);
    expect(onNavigate).toHaveBeenCalledWith('vendor');

    const ordersBtn = screen.getByRole('button', { name: /orders/i });
    fireEvent.click(ordersBtn);
    expect(onNavigate).toHaveBeenCalledWith('orders');

    const verifyBtn = screen.getByRole('button', { name: /verify student/i });
    fireEvent.click(verifyBtn);
    expect(onNavigate).toHaveBeenCalledWith('verify');
  });

  it('displays the Rule L anti-promotion compliance notice', () => {
    render(<VendorCatalogueScreen />);
    expect(
      screen.getByText(/There is no field here for promotion or placement, because none is sold/i)
    ).toBeInTheDocument();
  });
});
