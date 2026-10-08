import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LabColdChainScreen } from '../LabColdChainScreen';

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

describe('LabColdChainScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, subtitle, and 1 breach held pill', () => {
    render(<LabColdChainScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Cold chain' })).toBeInTheDocument();
    expect(screen.getByText(/Every box logged from collection to bench · 2–8 °C required/i)).toBeInTheDocument();
    expect(screen.getByText(/1 breach held/i)).toBeInTheDocument();
  });

  it('renders all 4 KPI stat cards correctly', () => {
    render(<LabColdChainScreen />);
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Boxes in transit today')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Breached').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Samples held, not run')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Logged end to end')).toBeInTheDocument();
  });

  it('renders 18 sidebar items with Cold chain marked active', () => {
    render(<LabColdChainScreen />);
    const coldChainBtn = screen.getByRole('button', { name: /Cold chain/i });
    expect(coldChainBtn).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('STORE')).toBeInTheDocument();
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();
  });

  it('renders the 4 reference boxes in the table', () => {
    render(<LabColdChainScreen />);
    expect(screen.getByText('BX-4417')).toBeInTheDocument();
    expect(screen.getByText('BX-4416')).toBeInTheDocument();
    expect(screen.getByText('BX-4415')).toBeInTheDocument();
    expect(screen.getByText('BX-4414')).toBeInTheDocument();
    expect(screen.getByText('9.4 °C for 22 min')).toBeInTheDocument();
    expect(screen.getByText('Breached — held')).toBeInTheDocument();
  });

  it('filters boxes using search input', () => {
    render(<LabColdChainScreen />);
    const searchInput = screen.getByRole('textbox', { name: /Search cold chain boxes/i });
    fireEvent.change(searchInput, { target: { value: 'BX-4415' } });

    expect(screen.getByText('BX-4415')).toBeInTheDocument();
    expect(screen.queryByText('BX-4417')).not.toBeInTheDocument();
  });

  it('filters boxes using outcome filter tabs', () => {
    render(<LabColdChainScreen />);
    const breachedTab = screen.getByRole('button', { name: 'Breached' });
    fireEvent.click(breachedTab);

    expect(screen.getByText('BX-4415')).toBeInTheDocument();
    expect(screen.queryByText('BX-4417')).not.toBeInTheDocument();
    expect(screen.queryByText('BX-4414')).not.toBeInTheDocument();
  });

  it('opens Breach details modal on clicking breached box and triggers free recollection', () => {
    render(<LabColdChainScreen />);
    const breachedRow = screen.getByRole('button', { name: /Box BX-4415/i });
    fireEvent.click(breachedRow);

    expect(screen.getByRole('heading', { level: 3, name: /Box Details: BX-4415/i })).toBeInTheDocument();
    expect(screen.getByText(/Clinical Temperature Breach Hold/i)).toBeInTheDocument();
    expect(screen.getByText(/22 minutes above 8.0 °C threshold/i)).toBeInTheDocument();

    const triggerRecollectBtn = screen.getByRole('button', { name: /Trigger Free Student Recollection/i });
    fireEvent.click(triggerRecollectBtn);

    expect(screen.queryByRole('heading', { level: 3, name: /Box Details: BX-4415/i })).not.toBeInTheDocument();
  });

  it('opens In-range box modal and admits samples to lab bench', () => {
    render(<LabColdChainScreen />);
    const inRangeRow = screen.getByRole('button', { name: /Box BX-4417/i });
    fireEvent.click(inRangeRow);

    expect(screen.getByRole('heading', { level: 3, name: /Box Details: BX-4417/i })).toBeInTheDocument();
    expect(screen.getByText(/Continuous 2–8 °C Integrity Verified/i)).toBeInTheDocument();

    const admitBtn = screen.getByRole('button', { name: /Admit to Lab Bench/i });
    fireEvent.click(admitBtn);

    expect(screen.queryByRole('heading', { level: 3, name: /Box Details: BX-4417/i })).not.toBeInTheDocument();
  });

  it('allows logging a new transit cold box through modal', () => {
    render(<LabColdChainScreen />);
    const addBoxBtn = screen.getByRole('button', { name: /Log new transit cold box/i });
    fireEvent.click(addBoxBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Log Transit Cold Box' })).toBeInTheDocument();
    const idInput = screen.getByLabelText(/Cold Box Identifier/i);
    const descInput = screen.getByLabelText(/Transit Route & Description/i);
    const tempInput = screen.getByLabelText(/Logger Temp \(°C\)/i);

    fireEvent.change(idInput, { target: { value: 'BX-9999' } });
    fireEvent.change(descInput, { target: { value: 'Hostel 3 express run · 2 samples' } });
    fireEvent.change(tempInput, { target: { value: '4.9' } });

    const submitBtn = screen.getByRole('button', { name: /Log & Register Box/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('BX-9999')).toBeInTheDocument();
    expect(screen.getByText(/Hostel 3 express run/i)).toBeInTheDocument();
  });

  it('handles sidebar navigation clicks', () => {
    const onNavigate = vi.fn();
    render(<LabColdChainScreen onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledWith('vendor');

    fireEvent.click(screen.getByRole('button', { name: 'Verify student' }));
    expect(onNavigate).toHaveBeenCalledWith('verify');

    fireEvent.click(screen.getByRole('button', { name: /Orders/i }));
    expect(onNavigate).toHaveBeenCalledWith('orders');

    fireEvent.click(screen.getByRole('button', { name: 'Run sheet' }));
    expect(onNavigate).toHaveBeenCalledWith('run-sheet');

    fireEvent.click(screen.getByRole('button', { name: 'Catalogue' }));
    expect(onNavigate).toHaveBeenCalledWith('catalogue');
  });
});
