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
    expect(screen.getByText('Camp coordinator · Vijaya Diagnostics Miyapur')).toBeInTheDocument();
    // Computed from the batches (one breach batch), not a hardcoded 16.
    expect(screen.getByText('Batches on hold: 1')).toBeInTheDocument();
    expect(screen.queryByText(/16 samples held/i)).not.toBeInTheDocument();
  });

  it('renders the fast mode spotlight banner without invented check-in counts', () => {
    render(<VendorCampIntakeScreen />);
    expect(screen.getByText(/CAMP CHECK-IN · FAST MODE/i)).toBeInTheDocument();
    expect(screen.getByText('Campus health drive · not started')).toBeInTheDocument();
    expect(screen.queryByText(/212 of 300/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Photo match/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open fast mode/i })).toBeInTheDocument();
  });

  it('renders 4 KPI stat cards with correct metrics', () => {
    render(<VendorCampIntakeScreen />);
    expect(screen.getByText('Samples collected')).toBeInTheDocument();
    expect(screen.getByText('Batches held on breach')).toBeInTheDocument();
    expect(screen.getByText('Batches released')).toBeInTheDocument();
    expect(screen.getByText('Runs outside range · not tracked yet')).toBeInTheDocument();
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

    expect(screen.getByRole('dialog', { name: /Fast student check-in/i })).toBeInTheDocument();
    // No random vial barcode generator: a vial ID must come from the label.
    expect(screen.queryByRole('button', { name: /Auto Vial/i })).not.toBeInTheDocument();

    const studentInput = screen.getByLabelText(/Student ID or roll number/i);
    const vialInput = screen.getByLabelText(/Sample vial barcode/i);

    fireEvent.change(studentInput, { target: { value: '21B01A0588' } });
    fireEvent.change(vialInput, { target: { value: 'SMP-77990-FLU' } });

    fireEvent.click(screen.getByRole('button', { name: /^Check in$/i }));
    expect(screen.getByText(/Checked in 21B01A0588 · vial SMP-77990-FLU on this screen only — not saved/i)).toBeInTheDocument();
    expect(screen.getByText('187 of 210')).toBeInTheDocument();
  });

  it('opens register camp drive modal and creates a new batch', () => {
    render(<VendorCampIntakeScreen />);
    const regBtn = screen.getByRole('button', { name: /Register Camp Drive/i });
    fireEvent.click(regBtn);

    expect(screen.getByRole('dialog', { name: /Register a campus health drive/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Campus$/i), { target: { value: 'CBIT' } });

    fireEvent.change(screen.getByLabelText(/Test panel \/ drive name/i), { target: { value: 'Monsoon Dengue Screening' } });
    fireEvent.change(screen.getByLabelText(/Target number of students/i), { target: { value: '180' } });

    fireEvent.click(screen.getByRole('button', { name: /Add camp drive/i }));
    expect(screen.getByText(/Added LOCAL-6 for CBIT on this screen only — not saved/i)).toBeInTheDocument();
  });

  it('opens batch inspection modal for a breach batch and shows safety notice', () => {
    render(<VendorCampIntakeScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect batch CMP-0409' }));

    expect(screen.getByRole('dialog', { name: /Batch audit: CMP-0409/i })).toBeInTheDocument();
    expect(screen.getByText(/Cold-chain breach:/i)).toBeInTheDocument();
    // No compliance claim and no claim that students were notified.
    expect(screen.queryByText(/ABDM NABL/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Students are not told automatically/i)).toBeInTheDocument();
  });
});

describe('VendorCampIntakeScreen — no fake report release', () => {
  it('does not offer to release reports to student vaults from a processing batch', () => {
    render(<VendorCampIntakeScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect batch CMP-0412' }));
    expect(screen.queryByRole('button', { name: /Release Reports to Student Vaults/i })).not.toBeInTheDocument();
    expect(screen.getByText(/isn’t connected here yet/i)).toBeInTheDocument();
  });
});
