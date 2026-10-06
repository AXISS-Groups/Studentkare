import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VendorCampIntakeScreen } from '../VendorCampIntakeScreen';

vi.mock('@/data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-vendor',
      fullName: 'Vijaya Diagnostics Miyapur',
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

describe('VendorCampIntakeScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, subtitle, and held samples badge', () => {
    render(<VendorCampIntakeScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Camp intake' })).toBeInTheDocument();
    expect(screen.getByText(/Batch registration and processing for campus health drives/i)).toBeInTheDocument();
    expect(screen.getByText(/16 samples held/i)).toBeInTheDocument();
  });

  it('renders the fast mode spotlight banner with 212 checked in', () => {
    render(<VendorCampIntakeScreen />);
    expect(screen.getByText(/CAMP CHECK-IN · FAST MODE/i)).toBeInTheDocument();
    expect(screen.getByText(/Flu camp · Block C lobby · 212 of 300 checked in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open fast mode/i })).toBeInTheDocument();
  });

  it('renders 4 KPI stat cards with correct metrics', () => {
    render(<VendorCampIntakeScreen />);
    expect(screen.getByText('Samples this month')).toBeInTheDocument();
    expect(screen.getAllByText('Held on breach').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Batches released')).toBeInTheDocument();
    expect(screen.getByText('Run outside range')).toBeInTheDocument();
    expect(screen.getByText('692')).toBeInTheDocument();
  });

  it('renders batches table with all camp batches', () => {
    render(<VendorCampIntakeScreen />);
    expect(screen.getByText('CMP-0412')).toBeInTheDocument();
    expect(screen.getByText('CMP-0411')).toBeInTheDocument();
    expect(screen.getByText('CMP-0410')).toBeInTheDocument();
    expect(screen.getByText('CMP-0409')).toBeInTheDocument();
    expect(screen.getByText('CMP-0408')).toBeInTheDocument();
    expect(screen.getByText(/Breach at 9.1 °C/i)).toBeInTheDocument();
  });

  it('filters batches using status filter tabs', () => {
    render(<VendorCampIntakeScreen />);
    const breachTab = screen.getByRole('tab', { name: /Held on breach/i });
    fireEvent.click(breachTab);

    expect(screen.getByText('CMP-0409')).toBeInTheDocument();
    expect(screen.queryByText('CMP-0412')).not.toBeInTheDocument();
  });

  it('opens fast check-in modal and records a student intake', () => {
    render(<VendorCampIntakeScreen />);
    const fastBtn = screen.getByRole('button', { name: /Open fast mode/i });
    fireEvent.click(fastBtn);

    expect(screen.getByRole('dialog', { name: /Fast Student Intake/i })).toBeInTheDocument();

    const studentInput = screen.getByLabelText(/Scan Student Digital ID/i);
    const vialInput = screen.getByLabelText(/Scan Sample Vial Barcode/i);

    fireEvent.change(studentInput, { target: { value: '21B01A0588' } });
    fireEvent.change(vialInput, { target: { value: 'SMP-77990-FLU' } });

    fireEvent.click(screen.getByRole('button', { name: /Complete Intake & Print Label/i }));
    expect(screen.getByText(/Checked in student 21B01A0588/i)).toBeInTheDocument();
  });

  it('opens register camp drive modal and creates a new batch', () => {
    render(<VendorCampIntakeScreen />);
    const regBtn = screen.getByRole('button', { name: /Register Camp Drive/i });
    fireEvent.click(regBtn);

    expect(screen.getByRole('dialog', { name: /Register Campus Health Drive Batch/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Test Panel \/ Drive Name/i), { target: { value: 'Monsoon Dengue Screening' } });
    fireEvent.change(screen.getByLabelText(/Target Number of Students/i), { target: { value: '180' } });

    fireEvent.click(screen.getByRole('button', { name: /Register & Generate Barcode Racks/i }));
    expect(screen.getByText(/Registered batch CMP-04/i)).toBeInTheDocument();
  });

  it('opens batch inspection modal for a breach batch and shows safety notice', () => {
    render(<VendorCampIntakeScreen />);
    const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
    fireEvent.click(inspectButtons[3]); // CMP-0409

    expect(screen.getByRole('dialog', { name: /Batch Audit: CMP-0409/i })).toBeInTheDocument();
    expect(screen.getByText(/Safety Audit Notice/i)).toBeInTheDocument();
  });
});
